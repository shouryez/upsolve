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

export type BudgetSegment = { title: string; min: number; color: string };

/**
 * The time budget as a timeline you drag (FRONTEND-PLAN §8 Today 3). Each remaining item is
 * a block as long as its rough estimate; blocks that fit before the handle stay lit, the
 * rest fade as "can wait", and the "these can wait" line on the list moves as you drag.
 * Snaps every 15 minutes. Keyboard: arrows ±15 min, Home/End, Delete for no limit.
 */
export function BudgetRibbon({
  budget,
  onChange,
  segments,
  leftMin,
}: {
  budget: number | null;
  onChange: (v: number | null) => void;
  /** Remaining items in list order. */
  segments: BudgetSegment[];
  leftMin: number;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.min(480, Math.max(240, Math.ceil((leftMin + 30) / 60) * 60));
  const pct = (m: number) => `${(Math.min(m, max) / max) * 100}%`;
  const ends = segments.reduce<number[]>((a, s) => [...a, (a.at(-1) ?? 0) + s.min], []);
  const fits = budget ? ends.filter((e) => e <= budget).length : ends.length;
  const last = useRef(budget);

  const set = (v: number | null) => {
    if (v === last.current) return;
    last.current = v;
    feel.tick();
    onChange(v);
  };
  const fromX = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    const raw = ((clientX - r.left) / r.width) * max;
    return Math.min(max, Math.max(SNAP, Math.round(raw / SNAP) * SNAP));
  };
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag(true);
    set(fromX(e.clientX));
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) set(fromX(e.clientX));
    else if (e.pointerType === "mouse") setHover(fromX(e.clientX));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const v = budget ?? max;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowUp"
        ? Math.min(max, v + SNAP)
        : e.key === "ArrowLeft" || e.key === "ArrowDown"
          ? Math.max(SNAP, v - SNAP)
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

  const minute = useSyncExternalStore(subscribeMinute, nowMinute, () => 0);
  const doneBy = budget && minute ? CLOCK.format((minute + budget) * 60_000) : null;
  const spare = budget ? budget - (ends[fits - 1] ?? 0) : 0;
  const showBubble = budget !== null;

  return (
    <div className="surface-inset flex flex-col gap-3 rounded-[16px] px-4 pt-3 pb-2.5">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-11 font-[600] tracking-[0.06em] text-ink-3 uppercase">Time today</p>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span
              className={cn(
                "tnum text-[22px] leading-tight font-[700] tracking-[-0.02em]",
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
                  <span className="tnum font-[650] text-ink-2">{fmtHm(leftMin)}</span>. Drag to set
                  your time.
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
                "tnum h-7 rounded-full px-2.5 text-12 font-[600] transition-colors",
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
              "grid h-7 w-8 place-items-center rounded-full transition-colors",
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
        data-cursor="grab"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={() => setDrag(false)}
        onPointerCancel={() => setDrag(false)}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKey}
        className="group/rib relative mt-6 h-9 cursor-pointer touch-none rounded-[10px] outline-none select-none focus-visible:ring-2 focus-visible:ring-[var(--signal-mark)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--surface)]"
      >
        {/* Rail with the hour grid */}
        <span className="absolute inset-x-0 top-1/2 h-5 -translate-y-1/2 rounded-[7px] bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]" />
        {Array.from({ length: Math.floor(max / 60) - 1 }, (_, k) => (
          <span
            key={k}
            aria-hidden="true"
            className="absolute top-0 bottom-0 w-px bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]"
            style={{ left: pct((k + 1) * 60) }}
          />
        ))}

        {/* One block per remaining item, as long as its estimate */}
        {segments.map((s, k) => {
          const start = ends[k]! - s.min;
          const lit = !budget || ends[k]! <= budget;
          return (
            <span
              key={k}
              title={`${s.title} · about ${fmtHm(s.min)}`}
              aria-hidden="true"
              className="absolute top-1/2 h-5 -translate-y-1/2 rounded-[6px] transition-[opacity,filter] duration-200"
              style={{
                left: `calc(${pct(start)} + 1.5px)`,
                width: `calc(${pct(Math.min(s.min, Math.max(0, max - start)))} - 3px)`,
                background: lit
                  ? `linear-gradient(180deg, color-mix(in srgb, ${s.color} 92%, white 8%), ${s.color})`
                  : `repeating-linear-gradient(135deg, color-mix(in srgb, ${s.color} 26%, transparent) 0 4px, color-mix(in srgb, ${s.color} 10%, transparent) 4px 8px)`,
                opacity: lit ? (budget ? 1 : 0.55) : 1,
                boxShadow: lit && budget ? "inset 0 1px 0 rgba(255,255,255,0.18)" : undefined,
              }}
            />
          );
        })}

        {/* Hover preview (mouse) */}
        {hover !== null && !drag && hover !== budget && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-1 -bottom-1 w-px bg-ink-3"
            style={{ left: pct(hover) }}
          >
            <span className="tnum absolute top-[-22px] left-1/2 -translate-x-1/2 rounded-[6px] bg-surface-3 px-1.5 py-px text-[10.5px] font-[600] whitespace-nowrap text-ink-2">
              {fmtHm(hover)}
            </span>
          </span>
        )}

        {/* Handle with its value */}
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-1/2 -translate-x-1/2 -translate-y-1/2",
            !drag && "transition-[left] duration-200 ease-out",
          )}
          style={{ left: budget ? pct(budget) : "100%" }}
        >
          {showBubble && (
            <span
              className={cn(
                "tnum absolute bottom-[calc(100%+8px)] rounded-[8px] bg-ink px-2 py-0.5 text-[11.5px] font-[700] whitespace-nowrap text-[var(--surface)] shadow-e2 transition-transform duration-150",
                // Kept inside the card at either end of the track.
                budget! / max > 0.9
                  ? "right-[-6px]"
                  : budget! / max < 0.1
                    ? "left-[-6px]"
                    : "left-1/2 -translate-x-1/2",
                drag ? "scale-110" : "scale-100",
              )}
            >
              {fmtHm(budget!)}
              <span
                className={cn(
                  "absolute top-full size-0 border-x-[5px] border-t-[5px] border-x-transparent border-t-[var(--ink)]",
                  budget! / max > 0.9
                    ? "right-[4px]"
                    : budget! / max < 0.1
                      ? "left-[4px]"
                      : "left-1/2 -translate-x-1/2",
                )}
              />
            </span>
          )}
          <span
            className={cn(
              "block h-9 w-[7px] rounded-full shadow-e2 transition-[transform,background-color] duration-150",
              budget
                ? "bg-ink ring-2 ring-[var(--surface)]"
                : "bg-surface-3 shadow-[inset_0_0_0_1px_var(--line-3)]",
              drag ? "scale-y-110" : "group-hover/rib:scale-y-105",
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
              "absolute -translate-x-1/2",
              k === Math.floor(max / 60) - 1 && "-translate-x-full",
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
