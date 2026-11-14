"use client";

import {
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Infinity as InfinityIcon } from "lucide-react";
import { cn } from "@upsolve/ui";
import { feel } from "@/lib/feel";

const SNAP = 15;
/** Within this share of the track, the handle is pulled onto the end of an item. */
const MAGNET = 0.022;
export const fmtMin = (m: number) =>
  m < 60 ? `${m} min` : `${m % 60 ? (m / 60).toFixed(1) : m / 60} h`;
/** "1 h 30 m": the value on the handle, easier to read at a glance than 1.5 h. */
const fmtHm = (m: number) =>
  m < 60 ? `${m} m` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60} m` : `${m / 60} h`;
const CLOCK = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });
const PRESETS = [30, 60, 120, 180];

/** The current minute, for "done by": ticks every 30 s, 0 on the server. */
function subscribeMinute(cb: () => void) {
  const t = window.setInterval(cb, 30_000);
  return () => clearInterval(t);
}
const nowMinute = () => Math.floor(Date.now() / 60_000);

export type BudgetSegment = {
  id: string;
  title: string;
  min: number;
  color: string;
  /** "Revision", "Next", ...: shown in the block's tooltip. */
  label?: string;
};

/**
 * The time budget as a timeline you drag (FRONTEND-PLAN §8 Today 3). Each remaining item is
 * a block as long as its rough estimate; blocks that fit before the handle stay lit, the
 * rest fade as "can wait", and the "these can wait" line on the list moves as you drag.
 *
 * Drag anywhere: snaps every 15 minutes, and the handle is pulled onto the end of an item
 * when you're close. Click a block to stop right after it. Hovering a block lights its row
 * in the list (and a row lights its block, via `spot`). Keyboard: arrows ±15 min,
 * PageUp/PageDown ±1 h, Home/End, Delete for no limit.
 */
export function BudgetRibbon({
  budget,
  onChange,
  segments,
  leftMin,
  spot = null,
  onSpot,
}: {
  budget: number | null;
  onChange: (v: number | null) => void;
  /** Remaining items in list order. */
  segments: BudgetSegment[];
  leftMin: number;
  /** The item hovered in the list, lit on the timeline. */
  spot?: string | null;
  onSpot?: (id: string | null) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const press = useRef<{ x: number; seg: number | null; moved: boolean } | null>(null);
  const [drag, setDrag] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [hoverSeg, setHoverSeg] = useState<number | null>(null);
  const [pop, setPop] = useState<{ i: number; n: number } | null>(null);
  const max = Math.min(480, Math.max(240, Math.ceil((leftMin + 30) / 60) * 60));
  const pct = (m: number) => `${(Math.min(m, max) / max) * 100}%`;
  const ends = segments.reduce<number[]>((a, s) => [...a, (a.at(-1) ?? 0) + s.min], []);
  const fitsAt = (b: number | null) => (b ? ends.filter((e) => e <= b).length : ends.length);
  const fits = fitsAt(budget);
  const last = useRef(budget);
  const minute = useSyncExternalStore(subscribeMinute, nowMinute, () => 0);

  const set = (v: number | null) => {
    if (v === last.current) return;
    const before = fitsAt(last.current);
    const after = fitsAt(v);
    last.current = v;
    // A block coming into your time pops; landing on an item's end feels firmer.
    if (v !== null && after > before) {
      setPop((p) => ({ i: after - 1, n: (p?.n ?? 0) + 1 }));
      feel.soft();
    } else if (v !== null && ends.includes(v)) feel.soft();
    else feel.tick();
    onChange(v);
  };

  const minutesAt = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    return Math.min(max, Math.max(0, ((clientX - r.left) / r.width) * max));
  };
  const valueAt = (clientX: number) => {
    const raw = minutesAt(clientX);
    const near = ends.find((e) => e <= max && Math.abs(e - raw) <= max * MAGNET);
    if (near !== undefined) return near;
    return Math.min(max, Math.max(SNAP, Math.round(raw / SNAP) * SNAP));
  };
  const segAt = (clientX: number) => {
    const m = minutesAt(clientX);
    const i = ends.findIndex((e) => m <= e);
    return i >= 0 && m >= ends[i]! - segments[i]!.min ? i : null;
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    press.current = { x: e.clientX, seg: segAt(e.clientX), moved: false };
    setDrag(true);
    setHover(null);
    // A press on a block waits: a click there means "stop after this one".
    if (press.current.seg === null) set(valueAt(e.clientX));
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (p && e.currentTarget.hasPointerCapture(e.pointerId)) {
      if (!p.moved && Math.abs(e.clientX - p.x) > 4) p.moved = true;
      if (p.moved) set(valueAt(e.clientX));
      return;
    }
    if (e.pointerType !== "mouse") return;
    const seg = segAt(e.clientX);
    setHoverSeg(seg);
    setHover(seg === null ? valueAt(e.clientX) : null);
    onSpot?.(seg === null ? null : segments[seg]!.id);
  };
  const onUp = () => {
    const p = press.current;
    press.current = null;
    setDrag(false);
    if (p && !p.moved && p.seg !== null) set(ends[p.seg]!);
  };
  const onLeave = () => {
    setHover(null);
    setHoverSeg(null);
    onSpot?.(null);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const v = budget ?? max;
    const step = (d: number) => Math.min(max, Math.max(SNAP, Math.round((v + d) / SNAP) * SNAP));
    const next =
      e.key === "ArrowRight" || e.key === "ArrowUp"
        ? step(SNAP)
        : e.key === "ArrowLeft" || e.key === "ArrowDown"
          ? step(-SNAP)
          : e.key === "PageUp"
            ? step(60)
            : e.key === "PageDown"
              ? step(-60)
              : e.key === "Home"
                ? SNAP
                : e.key === "End"
                  ? max
                  : e.key === "Delete" || e.key === "Backspace"
                    ? null
                    : undefined;
    if (next === undefined) return;
    e.preventDefault();
    set(next);
  };

  const doneBy = budget && minute ? CLOCK.format((minute + budget) * 60_000) : null;
  const spare = budget ? budget - (ends[fits - 1] ?? 0) : 0;
  const preview = hover !== null && !drag && hover !== budget ? hover : null;
  const lit = (k: number) => !budget || ends[k]! <= budget;
  const spotIndex = spot ? segments.findIndex((s) => s.id === spot) : -1;
  const active = drag ? null : (hoverSeg ?? (spotIndex >= 0 ? spotIndex : null));
  const edge = (v: number) => (v / max > 0.9 ? "end" : v / max < 0.1 ? "start" : "mid");

  return (
    <div className="surface-inset flex flex-col gap-3 rounded-[16px] px-4 pt-3 pb-2.5">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-11 font-[600] tracking-[0.06em] text-ink-3 uppercase">Time today</p>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span
              key={budget ?? "none"}
              className={cn(
                "tnum animate-[budget-in_.22s_ease-out] text-[22px] leading-tight font-[700] tracking-[-0.02em]",
                budget ? "text-ink" : "text-ink-3",
              )}
            >
              {budget ? fmtHm(budget) : "No limit"}
            </span>
            <span className="text-12 text-ink-3">
              {budget ? (
                <>
                  fits <span className="tnum font-[650] text-ink-2">{fits}</span> of {ends.length}
                  {doneBy ? ` · done by ${doneBy}` : ""}
                  {fits === ends.length && spare >= SNAP ? ` · ${fmtHm(spare)} spare` : ""}
                </>
              ) : (
                <>
                  all {ends.length} take about{" "}
                  <span className="tnum font-[650] text-ink-2">{fmtHm(leftMin)}</span>. Drag, or tap
                  a block to stop after it.
                </>
              )}
            </span>
          </p>
        </div>
        <div
          className="flex items-center gap-0.5 rounded-full bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] p-0.5"
          role="group"
          aria-label="Quick picks"
        >
          {PRESETS.filter((p) => p <= max).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => set(p)}
              aria-pressed={budget === p}
              className={cn(
                "tnum h-7 rounded-full px-2.5 text-12 font-[600] transition-[color,background-color,transform] active:scale-95",
                budget === p ? "bg-surface text-ink shadow-e1" : "text-ink-3 hover:text-ink",
              )}
            >
              {p < 60 ? `${p}m` : `${p / 60}h`}
            </button>
          ))}
          <button
            type="button"
            onClick={() => set(null)}
            aria-pressed={budget === null}
            aria-label="No limit"
            title="No limit"
            className={cn(
              "grid h-7 w-8 place-items-center rounded-full transition-[color,background-color,transform] active:scale-95",
              budget === null ? "bg-surface text-ink shadow-e1" : "text-ink-3 hover:text-ink",
            )}
          >
            <InfinityIcon size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-label="Time you have today"
        aria-valuemin={SNAP}
        aria-valuemax={max}
        aria-valuenow={budget ?? max}
        aria-valuetext={budget ? `${fmtHm(budget)}, fits ${fits} of ${ends.length}` : "No limit"}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={onLeave}
        onKeyDown={onKey}
        className={cn(
          "group/rib relative mt-7 h-10 touch-none rounded-[10px] outline-none select-none focus-visible:ring-2 focus-visible:ring-[var(--signal-mark)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--surface)]",
          drag ? "cursor-grabbing" : "cursor-pointer",
        )}
      >
        {/* Rail with the hour grid */}
        <span className="absolute inset-x-0 top-1/2 h-5 -translate-y-1/2 rounded-[7px] bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]" />
        {Array.from({ length: Math.floor(max / 60) - 1 }, (_, k) => (
          <span
            key={k}
            aria-hidden="true"
            className="absolute top-0.5 bottom-0.5 w-px bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]"
            style={{ left: pct((k + 1) * 60) }}
          />
        ))}

        {/* One block per remaining item, as long as its estimate */}
        {segments.map((s, k) => {
          const start = ends[k]! - s.min;
          const on = lit(k);
          const wouldFit = preview !== null && ends[k]! <= preview;
          const isActive = active === k;
          return (
            <span
              key={`${s.id}-${pop?.i === k ? pop.n : 0}`}
              aria-hidden="true"
              className={cn(
                "absolute top-1/2 h-5 -translate-y-1/2 rounded-[6px] transition-[opacity,transform,box-shadow,height] duration-200 ease-out",
                pop?.i === k && "animate-[seg-pop_.34s_cubic-bezier(.3,1.6,.5,1)]",
                isActive && "z-[1] h-7",
              )}
              style={{
                left: `calc(${pct(start)} + 1.5px)`,
                width: `calc(${pct(Math.min(s.min, Math.max(0, max - start)))} - 3px)`,
                background: on
                  ? `linear-gradient(180deg, color-mix(in srgb, ${s.color} 90%, white 10%), ${s.color})`
                  : `repeating-linear-gradient(135deg, color-mix(in srgb, ${s.color} 26%, transparent) 0 4px, color-mix(in srgb, ${s.color} 10%, transparent) 4px 8px)`,
                opacity: on ? (budget ? 1 : 0.6) : wouldFit ? 0.85 : 1,
                boxShadow: isActive
                  ? `0 0 0 2px var(--surface), 0 0 0 3.5px ${s.color}, 0 6px 16px -6px ${s.color}`
                  : on && budget
                    ? "inset 0 1px 0 rgba(255,255,255,0.18)"
                    : wouldFit
                      ? `inset 0 0 0 1.5px ${s.color}`
                      : undefined,
              }}
            />
          );
        })}

        {/* Tooltip for the block under the mouse, or the one hovered in the list */}
        {active !== null && !drag && segments[active] && (
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute top-[calc(100%+6px)] z-[3] w-max max-w-[240px] animate-[budget-in_.15s_ease-out] rounded-[10px] bg-surface-3 px-2.5 py-1.5 text-left shadow-e2",
              edge(ends[active]! - segments[active]!.min / 2) === "end"
                ? "right-0"
                : edge(ends[active]! - segments[active]!.min / 2) === "start"
                  ? "left-0"
                  : "-translate-x-1/2",
            )}
            style={
              edge(ends[active]! - segments[active]!.min / 2) === "mid"
                ? { left: pct(ends[active]! - segments[active]!.min / 2) }
                : undefined
            }
          >
            <span className="block truncate text-12 font-[650] text-ink">
              {segments[active]!.title}
            </span>
            <span className="block text-[11px] text-ink-3">
              {segments[active]!.label ? `${segments[active]!.label} · ` : ""}about{" "}
              {fmtHm(segments[active]!.min)} · ends at {fmtHm(ends[active]!)}
              {hoverSeg !== null && (
                <span className="text-ink-2">
                  {budget === ends[active] ? " · your stop" : " · click to stop after it"}
                </span>
              )}
            </span>
          </span>
        )}

        {/* Hover preview in the gaps (mouse) */}
        {preview !== null && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-1 -bottom-1 w-px bg-ink-3"
            style={{ left: pct(preview) }}
          >
            <span
              className={cn(
                "tnum absolute top-[-24px] rounded-[6px] bg-surface-3 px-1.5 py-px text-[10.5px] font-[600] whitespace-nowrap text-ink-2",
                edge(preview) === "end"
                  ? "right-0"
                  : edge(preview) === "start"
                    ? "left-0"
                    : "left-1/2 -translate-x-1/2",
              )}
            >
              {fmtHm(preview)} · fits {fitsAt(preview)}
            </span>
          </span>
        )}

        {/* Handle with its value */}
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2",
            !drag && "transition-[left] duration-300 ease-[cubic-bezier(.3,1.3,.5,1)]",
          )}
          style={{ left: budget ? pct(budget) : "100%" }}
        >
          {budget !== null && (active === null || drag) && (
            <span
              className={cn(
                "tnum absolute bottom-[calc(100%+8px)] rounded-[8px] bg-ink px-2 py-0.5 text-[11.5px] font-[700] whitespace-nowrap text-[var(--surface)] shadow-e2 transition-transform duration-150",
                edge(budget) === "end"
                  ? "right-[-6px] origin-bottom-right"
                  : edge(budget) === "start"
                    ? "left-[-6px] origin-bottom-left"
                    : "left-1/2 origin-bottom -translate-x-1/2",
                drag ? "scale-110" : "scale-100",
              )}
            >
              {fmtHm(budget)}
              {drag && (
                <span className="ml-1.5 font-[600] opacity-70">
                  {fits}/{ends.length}
                </span>
              )}
              <span
                className={cn(
                  "absolute top-full size-0 border-x-[5px] border-t-[5px] border-x-transparent border-t-[var(--ink)]",
                  edge(budget) === "end"
                    ? "right-[4px]"
                    : edge(budget) === "start"
                      ? "left-[4px]"
                      : "left-1/2 -translate-x-1/2",
                )}
              />
            </span>
          )}
          <span
            className={cn(
              "block h-10 w-2 rounded-full shadow-e2 transition-[transform,background-color,width] duration-150",
              budget
                ? "bg-ink ring-2 ring-[var(--surface)]"
                : "bg-surface-3 shadow-[inset_0_0_0_1px_var(--line-3)]",
              drag ? "w-2.5 scale-y-110" : "group-hover/rib:scale-y-105",
              budget !== null && ends.includes(budget) && "ring-[3px]",
            )}
          />
        </span>
      </div>

      <div className="tnum relative h-4 text-11 text-ink-4" aria-hidden="true">
        <span className="absolute left-0">0</span>
        {Array.from({ length: Math.floor(max / 60) }, (_, k) => (
          <span
            key={k}
            className={cn(
              "absolute",
              k === Math.floor(max / 60) - 1 ? "-translate-x-full" : "-translate-x-1/2",
            )}
            style={{ left: pct((k + 1) * 60) }}
          >
            {k + 1}h
          </span>
        ))}
      </div>
    </div>
  );
}
