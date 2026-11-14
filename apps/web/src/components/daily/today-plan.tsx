"use client";

import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useOptimistic,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { ArrowUpRight, CalendarClock, GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, DifficultyTag, ProgressRing, Tag, cn, inputClasses } from "@upsolve/ui";
import {
  addPlanTask,
  removePlanItem,
  reorderPlanItems,
  setPlanItemDone,
} from "@/app/actions/daily";
import { CelebrateOnce, burstFrom } from "@/components/dashboard/celebrate";
import { BudgetRibbon, fmtMin } from "@/components/daily/budget-ribbon";
import { SignalType } from "@/components/fx/signal-type";
import { AnimatedCheckbox } from "@/components/fx/toggles";
import { vanishText } from "@/components/fx/vanish";
import { feel, reducedMotion } from "@/lib/feel";
import type { PlanItem, PlanKind, TodayPlan } from "@/lib/plan";

export const KIND: Record<
  PlanKind,
  {
    label: string;
    tone: "revise" | "primary" | "medium" | "info" | "signal" | "success" | "hard" | "neutral";
  }
> = {
  revision: { label: "Revision", tone: "revise" },
  next: { label: "Next", tone: "success" },
  stretch: { label: "Stretch", tone: "medium" },
  shared: { label: "From a friend", tone: "info" },
  contest: { label: "Upsolve", tone: "info" },
  drill: { label: "Drill", tone: "hard" },
  sheet: { label: "From sheet", tone: "neutral" },
  custom: { label: "Task", tone: "neutral" },
};

/** Each kind's colour on the time budget timeline, matching its badge. */
const TONE_COLOR: Record<(typeof KIND)[PlanKind]["tone"], string> = {
  revise: "var(--revise)",
  primary: "var(--primary)",
  medium: "var(--medium)",
  info: "var(--info)",
  signal: "var(--signal)",
  success: "var(--success)",
  hard: "var(--hard)",
  neutral: "var(--ink-3)",
};

/** Rough minutes per item, for the time budget (a revision is quicker than a fresh medium). */
function estimate(item: PlanItem): number {
  if (item.kind === "revision") return 15;
  if (item.difficulty === "easy") return 20;
  if (item.difficulty === "medium") return 35;
  if (item.difficulty === "hard") return 55;
  return 30;
}
const BUDGET_EVENT = "dsakaro:budget";
function subscribeBudget(cb: () => void) {
  window.addEventListener(BUDGET_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(BUDGET_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
function readBudget(key: string): number | null {
  try {
    const v = Number(localStorage.getItem(key));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}
/** The add-task placeholder cycles through ideas while the box is empty. */
const IDEAS = [
  "Add your own task, e.g. OS notes ch. 4",
  "Revise DP on grids",
  "Watch Striver's graph intro",
  "Mock interview with a friend",
  "Re-read my sliding window notes",
];

type Op = { id: string; done?: boolean; removed?: boolean } | { add: PlanItem };

/** "Yesterday", or "Tue, 28 Oct": when a rolled-over item was planned. */
function dayLabel(day: string, today: string) {
  const diff = Math.round((Date.parse(today) - Date.parse(day)) / 86_400_000);
  if (diff === 1) return "Yesterday";
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * Today's to-do list: only what you added (suggestions, sheet items, your own tasks).
 * Problem items tick themselves when you solve them (the extension or a sync reports
 * Accepted) or tick them on a sheet; anything can be ticked by hand. Unfinished items roll
 * over to the next day with the date they were planned for.
 */
export function TodayPlanList({
  plan,
  compact = false,
  action,
  hideSummary = false,
}: {
  plan: TodayPlan;
  compact?: boolean;
  /** The page shows its own progress line, so skip the ring and summary row. */
  hideSummary?: boolean;
  /** Shown beside the summary, e.g. the "Add from sheet" button. */
  action?: ReactNode;
}) {
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [idea, setIdea] = useState(0);
  useEffect(() => {
    if (title || reducedMotion()) return;
    const t = window.setInterval(() => setIdea((n) => (n + 1) % IDEAS.length), 3500);
    return () => clearInterval(t);
  }, [title]);
  const [allItems, apply] = useOptimistic(plan.items, (state, op: Op) => {
    if ("add" in op) return [...state, op.add];
    if (op.removed) return state.filter((i) => i.id !== op.id);
    return state.map((i) => (i.id === op.id ? { ...i, done: op.done ?? i.done } : i));
  });
  // Removed items hide at once and are deleted when the Undo toast closes.
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  // An order you dragged the list into, applied over the server's until it refreshes.
  const [order, setOrder] = useState<string[] | null>(null);
  const visible = allItems.filter((i) => !hidden.has(i.id));
  const items = order
    ? [...visible].sort((a, b) => {
        const x = order.indexOf(a.id);
        const y = order.indexOf(b.id);
        return (x < 0 ? 1e9 : x) - (y < 0 ? 1e9 : y);
      })
    : visible;
  const done = items.filter((i) => i.done).length;
  // "I have an hour today": items past the budget are dimmed under a divider. Kept per day.
  const budgetKey = `dsakaro:budget:${plan.day}`;
  const budget = useSyncExternalStore(
    subscribeBudget,
    () => readBudget(budgetKey),
    () => null,
  );
  const setBudget = (v: number | null) => {
    try {
      if (v) localStorage.setItem(budgetKey, String(v));
      else localStorage.removeItem(budgetKey);
    } catch {}
    window.dispatchEvent(new Event(BUDGET_EVENT));
  };
  const left = items.filter((i) => !i.done);
  const leftMin = left.reduce((n, i) => n + estimate(i), 0);
  const beyond = new Set<string>();
  let cutId: string | null = null;
  if (budget) {
    let used = 0;
    for (const i of left) {
      used += estimate(i);
      if (used > budget) {
        cutId ??= i.id;
        beyond.add(i.id);
      }
    }
  }
  const carried = items.filter((i) => i.day < plan.day && !i.done).length;
  const shown = compact ? items.slice(0, 6) : items;
  // The item you're on: on the full list it opens up with its actions.
  const currentId = compact ? null : (items.find((i) => !i.done)?.id ?? null);

  // ---- Drag to reorder (FLIP: rows glide to their new place). Keyboard: arrows on a grip.
  const rows = useRef(new Map<string, HTMLLIElement>());
  const before = useRef<Map<string, number> | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  // Phones: swipe a row right to tick it, left to skip it (FRONTEND-PLAN §7.7).
  const swipeStart = useRef<{ id: string; x: number; y: number; passed: boolean } | null>(null);
  const [swipe, setSwipe] = useState<{ id: string; dx: number } | null>(null);
  const onSwipeDown = (item: PlanItem, e: PointerEvent<HTMLLIElement>) => {
    if (e.pointerType !== "touch" || compact) return;
    // Grips reorder; buttons, links and boxes keep their own taps.
    if ((e.target as Element).closest("[data-grip], button, a, input")) return;
    swipeStart.current = { id: item.id, x: e.clientX, y: e.clientY, passed: false };
  };
  const onSwipeMove = (e: PointerEvent<HTMLLIElement>) => {
    const s = swipeStart.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    // Mostly vertical: it's a scroll, not a swipe.
    if (Math.abs(e.clientY - s.y) > Math.abs(dx) && Math.abs(dx) < 16) return;
    if (Math.abs(dx) > 90 && !s.passed) {
      s.passed = true;
      feel.tick();
    }
    setSwipe({ id: s.id, dx: Math.max(-140, Math.min(140, dx)) });
  };
  const onSwipeEnd = (item: PlanItem, el: HTMLElement) => {
    const s = swipeStart.current;
    swipeStart.current = null;
    const dx = swipe?.id === item.id ? swipe.dx : 0;
    setSwipe(null);
    if (!s) return;
    if (dx > 90 && !item.auto) toggle(item, el);
    else if (dx < -90) remove(item);
  };
  const snapshot = () => {
    const m = new Map<string, number>();
    rows.current.forEach((el, id) => m.set(id, el.getBoundingClientRect().top));
    before.current = m;
  };
  const idsKey = items.map((i) => i.id).join(",");
  useLayoutEffect(() => {
    const prev = before.current;
    before.current = null;
    if (!prev || reducedMotion()) return;
    rows.current.forEach((el, id) => {
      const top = prev.get(id);
      if (top === undefined) return;
      const d = top - el.getBoundingClientRect().top;
      if (Math.abs(d) > 1)
        el.animate([{ transform: `translateY(${d}px)` }, { transform: "none" }], {
          duration: 240,
          easing: "cubic-bezier(.2,.8,.2,1)",
        });
    });
  }, [idsKey]);
  const moveTo = (id: string, to: number) => {
    const ids = items.map((i) => i.id);
    const from = ids.indexOf(id);
    if (from < 0 || to === from || to < 0 || to >= ids.length) return false;
    snapshot();
    ids.splice(to, 0, ...ids.splice(from, 1));
    setOrder(ids);
    feel.tick();
    return true;
  };
  const persist = (ids: string[]) => {
    const real = ids.filter((id) => !id.startsWith("tmp-"));
    if (real.length < 2) return;
    start(async () => {
      const res = await reorderPlanItems(real);
      if (!res.ok) toast.error(res.error);
    });
  };
  const onGripDown = (id: string, e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragId(id);
  };
  const onGripMove = (id: string, e: PointerEvent<HTMLButtonElement>) => {
    if (dragId !== id) return;
    // The slot is the number of other rows whose middle sits above the pointer.
    let to = 0;
    items.forEach((it) => {
      if (it.id === id) return;
      const el = rows.current.get(it.id);
      if (el && e.clientY > el.getBoundingClientRect().top + el.offsetHeight / 2) to++;
    });
    moveTo(id, to);
  };
  const onGripUp = (id: string) => {
    if (dragId !== id) return;
    setDragId(null);
    if (order) persist(items.map((i) => i.id));
  };
  const onGripKey = (id: string, e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const ids = items.map((i) => i.id);
    const from = ids.indexOf(id);
    const to = from + (e.key === "ArrowUp" ? -1 : 1);
    if (moveTo(id, to)) {
      ids.splice(to, 0, ...ids.splice(from, 1));
      persist(ids);
      // Keep focus on the grip that moved.
      requestAnimationFrame(() =>
        rows.current.get(id)?.querySelector<HTMLButtonElement>("[data-grip]")?.focus(),
      );
    }
  };

  function toggle(item: PlanItem, el: HTMLElement) {
    if (item.auto) return; // solved today: stays done
    const next = !item.done;
    if (next) void burstFrom(el);
    start(async () => {
      apply({ id: item.id, done: next });
      const res = await setPlanItemDone(item.id, next);
      if (!res.ok) toast.error(res.error);
    });
  }

  function remove(item: PlanItem) {
    setHidden((h) => new Set(h).add(item.id));
    let settled = false;
    const commit = () => {
      if (settled) return;
      settled = true;
      start(async () => {
        const res = await removePlanItem(item.id);
        if (!res.ok) {
          toast.error(res.error);
          setHidden((h) => {
            const n = new Set(h);
            n.delete(item.id);
            return n;
          });
        }
      });
    };
    toast(`Removed “${item.title}”`, {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          settled = true;
          setHidden((h) => {
            const n = new Set(h);
            n.delete(item.id);
            return n;
          });
        },
      },
      onAutoClose: commit,
      onDismiss: commit,
    });
  }

  function add() {
    const t = title.trim();
    if (!t) return;
    vanishText(input.current);
    setTitle("");
    start(async () => {
      apply({
        add: {
          id: `tmp-${t}`,
          kind: "custom",
          title: t,
          url: null,
          detail: null,
          problemId: null,
          difficulty: null,
          done: false,
          auto: false,
          day: plan.day,
        },
      });
      const res = await addPlanTask(t);
      if (!res.ok) toast.error(res.error);
    });
    input.current?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length > 0 && done === items.length && <CelebrateOnce id={`plan-${plan.day}`} />}
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-3",
          (compact || hideSummary) && "hidden",
        )}
      >
        <ProgressRing
          total={Math.max(1, items.length)}
          size={compact ? 64 : 84}
          stroke={compact ? 7 : 9}
          segments={[{ label: "Done", value: done, color: "var(--signal-mark)" }]}
          aria-label={`${done} of ${items.length} done today`}
        >
          <span className={cn("num", compact ? "text-17" : "text-20")}>
            {done}
            <span className="text-ink-3">/{items.length}</span>
          </span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="text-15 font-[600]">
            {items.length === 0 ? (
              "Nothing planned yet"
            ) : done === items.length ? (
              <SignalType
                text="All done. Great day."
                trigger="mount"
                once={`plan-done-${plan.day}`}
                glowColor="var(--signal)"
                interference={0}
                clickCycle={false}
                instability={0}
              />
            ) : (
              `${items.length - done} left today`
            )}
          </p>
          <p className="text-12 text-ink-3">
            {items.length === 0
              ? compact
                ? "Pick from suggestions and your sheets on Today."
                : "Add suggestions or sheet problems, or write your own task below."
              : carried > 0
                ? `${carried} rolled over from earlier. Problems tick themselves when you solve or tick them.`
                : "Problems tick themselves when you solve them or tick them on a sheet."}
          </p>
        </div>
        {action}
      </div>

      {!compact && left.length > 0 && (
        <BudgetRibbon
          budget={budget}
          onChange={setBudget}
          segments={left.map((i) => ({
            title: i.title,
            min: estimate(i),
            color: TONE_COLOR[KIND[i.kind].tone],
          }))}
          leftMin={leftMin}
        />
      )}

      <ul className="flex flex-col gap-1.5">
        {shown.map((item) => (
          <li
            key={item.id}
            ref={(el) => {
              if (el) rows.current.set(item.id, el);
              else rows.current.delete(item.id);
            }}
            onPointerDown={(e) => onSwipeDown(item, e)}
            onPointerMove={onSwipeMove}
            onPointerUp={(e) => onSwipeEnd(item, e.currentTarget)}
            onPointerCancel={(e) => onSwipeEnd(item, e.currentTarget)}
            data-swipe={
              swipe?.id === item.id && Math.abs(swipe.dx) > 24
                ? swipe.dx > 0
                  ? "done"
                  : "skip"
                : undefined
            }
            data-swipe-label={
              swipe?.id === item.id
                ? swipe.dx > 0
                  ? item.done
                    ? "Undo"
                    : "Done ✓"
                  : "Skip"
                : undefined
            }
            style={
              swipe?.id === item.id ? ({ "--dx": `${swipe.dx}px` } as CSSProperties) : undefined
            }
            data-cut={
              item.id === cutId ? `Past your ${fmtMin(budget ?? 0)}, these can wait` : undefined
            }
            className={cn(
              "data-[cut]:mt-7 data-[cut]:before:absolute data-[cut]:before:-top-6 data-[cut]:before:left-2.5 data-[cut]:before:text-12 data-[cut]:before:font-[600] data-[cut]:before:text-ink-3 data-[cut]:before:content-[attr(data-cut)]",
              beyond.has(item.id) && "opacity-55",
              "group/item relative isolate flex touch-pan-y flex-wrap items-center gap-3 rounded-[12px] border border-transparent px-2.5 py-2 transition-colors hover:border-line hover:bg-surface-2/60 [&>*]:translate-x-[var(--dx,0px)]",
              item.id === currentId && "border-line bg-surface-2/60",
              dragId === item.id &&
                "z-10 scale-[1.015] border-line-2 bg-surface-2 shadow-e2 transition-[transform,box-shadow]",
              "first:[&>.rail]:top-1/2 last:[&>.rail]:bottom-1/2",
            )}
          >
            {/* The day as a path: a rail joins the checkboxes, lime where it's done. */}
            <span
              aria-hidden="true"
              className={cn(
                "rail absolute top-0 bottom-0 left-[20px] -z-10 w-[2px]",
                item.done ? "bg-signal/70" : "bg-line-2",
              )}
            />
            {!compact && (
              <button
                type="button"
                data-grip=""
                data-cursor="grab"
                aria-label={`Move ${item.title}: drag, or use the arrow keys`}
                onPointerDown={(e) => onGripDown(item.id, e)}
                onPointerMove={(e) => onGripMove(item.id, e)}
                onPointerUp={() => onGripUp(item.id)}
                onPointerCancel={() => onGripUp(item.id)}
                onKeyDown={(e) => onGripKey(item.id, e)}
                className="-ml-1.5 grid h-7 w-4 shrink-0 cursor-grab touch-none place-items-center rounded text-ink-4 opacity-0 transition-opacity group-hover/item:opacity-100 focus-visible:opacity-100 active:cursor-grabbing pointer-coarse:opacity-60"
              >
                <GripVertical size={13} aria-hidden="true" />
              </button>
            )}
            <AnimatedCheckbox
              checked={item.done}
              disabled={item.auto || pending}
              aria-label={`${item.done ? "Undo" : "Done"}: ${item.title}`}
              title={item.auto ? "Solved today" : undefined}
              onClick={(e) => toggle(item, e.currentTarget)}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                {item.problemId ? (
                  <Link
                    href={`/dashboard/problems/${item.problemId}`}
                    className={cn(
                      "truncate text-[13.5px] font-[550] hover:underline",
                      item.done && "line-through decoration-ink-4",
                    )}
                  >
                    {item.title}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "truncate text-[13.5px] font-[550]",
                      item.done && "line-through decoration-ink-4",
                    )}
                  >
                    {item.title}
                  </span>
                )}
                {item.difficulty && !compact && <DifficultyTag difficulty={item.difficulty} />}
                {item.id === currentId && (
                  <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-mint-soft px-2 text-11 font-[650] text-signal-text">
                    Up next
                  </span>
                )}
              </span>
              {(item.detail || item.day < plan.day) && (
                <span className="flex min-w-0 items-center gap-1.5 text-11 text-ink-3">
                  {item.day < plan.day && (
                    <span
                      title={`Planned for ${dayLabel(item.day, plan.day)}, rolled over`}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 font-[550]",
                        item.done ? "text-ink-3" : "text-medium",
                      )}
                    >
                      <CalendarClock size={11} aria-hidden="true" />
                      {dayLabel(item.day, plan.day)}
                    </span>
                  )}
                  {item.detail && <span className="truncate">{item.detail}</span>}
                </span>
              )}
            </span>
            <span className="hidden sm:inline-flex">
              <Tag tone={KIND[item.kind].tone} className="h-5 px-1.5 text-11">
                {KIND[item.kind].label}
              </Tag>
            </span>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${item.title}`}
                className="grid size-7 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
              >
                <ArrowUpRight size={14} />
              </a>
            )}
            {item.id === currentId && (
              <span className="order-last flex w-full flex-wrap gap-1.5 pt-1 pl-8">
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="glass-control inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-[600] text-ink transition-transform hover:-translate-y-px"
                  >
                    Open problem
                  </a>
                )}
                {!item.auto && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={(e) => toggle(item, e.currentTarget)}
                    className="inline-flex h-8 items-center rounded-full px-3.5 text-[12.5px] font-[600] text-signal-text shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--signal)_40%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--signal)_12%,transparent)]"
                  >
                    Mark done
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(item)}
                  className="inline-flex h-8 items-center rounded-full px-3.5 text-[12.5px] font-[550] text-ink-3 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] hover:text-ink"
                >
                  Skip
                </button>
              </span>
            )}
            {!compact && (
              <button
                type="button"
                aria-label={`Remove ${item.title}`}
                onClick={() => remove(item)}
                className="grid size-7 shrink-0 place-items-center rounded-full text-ink-4 opacity-0 transition-[opacity,color] group-hover/item:opacity-100 hover:text-bad focus-visible:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            )}
          </li>
        ))}
        {compact && items.length === 0 && (
          <li>
            <Link
              href="/dashboard/today"
              className="inline-flex items-center gap-1 px-2.5 text-12 font-[550] text-ink-2 underline-offset-4 hover:text-ink hover:underline"
            >
              Plan today <ArrowUpRight size={12} aria-hidden="true" />
            </Link>
          </li>
        )}
        {compact && items.length > shown.length && (
          <li className="px-2.5 text-12 text-ink-3">
            +{items.length - shown.length} more ·{" "}
            <Link href="/dashboard/today" className="underline hover:text-ink">
              open Today
            </Link>
          </li>
        )}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex gap-2"
      >
        <label htmlFor={`task-${compact ? "c" : "f"}`} className="sr-only">
          Add a task
        </label>
        <input
          id={`task-${compact ? "c" : "f"}`}
          ref={input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={140}
          placeholder={IDEAS[idea]}
          className={inputClasses({ className: "h-[38px] flex-1" })}
        />
        <Button
          type="submit"
          variant="secondary"
          size="icon"
          aria-label="Add task"
          disabled={!title.trim()}
        >
          <Plus size={16} data-nudge="plus" />
        </Button>
      </form>
    </div>
  );
}
