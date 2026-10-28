import type { ReactNode } from "react";
import { cn } from "../cn";
import { Stacky, type StackyMood } from "./stacky";

/** Pixel-shimmer placeholder. Give it the size and radius of the content it stands in for. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("skeleton-pixel block", className)} />;
}

/** A card-shaped skeleton: header line, a big number, lines of text. */
export function SkeletonCard({ className, lines = 2 }: { className?: string; lines?: number }) {
  return (
    <div aria-hidden="true" className={cn("surface-card rounded-lg p-[18px]", className)}>
      <div className="mb-5 flex items-center gap-2.5">
        <Skeleton className="size-7 rounded-[9px]" />
        <Skeleton className="h-3.5 w-28" />
      </div>
      <Skeleton className="mb-4 h-9 w-24 rounded-md" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("mb-2 h-3", i % 2 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/**
 * The pixel motif as an illustration: a scatter of squares around an icon tile, a few
 * of them lit. Deterministic (no randomness) so server and client agree.
 */
function PixelHalo() {
  const cells = [
    [0, 1],
    [1, 0],
    [5, 0],
    [6, 1],
    [0, 4],
    [6, 4],
    [1, 5],
    [5, 5],
    [2, 6],
    [4, 6],
    [3, 0],
    [0, 2],
    [6, 3],
    [2, 5],
  ] as const;
  const lit = new Set([1, 6, 11]);
  return (
    <span className="absolute inset-0 grid grid-cols-7 grid-rows-7 gap-[3px]">
      {cells.map(([x, y], i) => (
        <i
          key={i}
          className={cn(
            "rounded-[2px]",
            lit.has(i) ? "bg-signal/80 shadow-[0_0_8px_var(--signal)]" : "bg-line-2",
          )}
          style={{ gridColumn: x + 1, gridRow: y + 1 }}
        />
      ))}
    </span>
  );
}

/**
 * Designed empty state: pixel illustration (or Stacky, when `mascot` is set), a title
 * (pass an <em> for the serif accent), one sentence, and one action (a real link or button).
 */
export function EmptyState({
  icon,
  mascot,
  title,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  mascot?: StackyMood;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-8 text-center", className)}>
      {mascot ? (
        <Stacky mood={mascot} size={96} className="mb-4" />
      ) : (
        <span aria-hidden="true" className="relative mb-5 grid size-[86px] place-items-center">
          <PixelHalo />
          <span className="relative grid size-11 place-items-center rounded-[13px] border border-line-2 bg-surface-2 text-ink-2 shadow-e2">
            {icon}
          </span>
        </span>
      )}
      <p className="text-16 font-[600] tracking-[-0.015em] [&_em]:font-display [&_em]:text-[1.15em] [&_em]:font-normal">
        {title}
      </p>
      {children && (
        <p className="mt-1.5 max-w-[44ch] text-13 leading-relaxed text-ink-2">{children}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Friendly error card with the verdict joke and a retry slot; `mascot` puts Stacky on top. */
export function ErrorState({
  title = "Wrong answer.",
  mascot,
  children,
  action,
  className,
}: {
  title?: ReactNode;
  mascot?: StackyMood;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-10 text-center", className)}>
      {mascot && <Stacky mood={mascot} size={110} className="mb-4" />}
      <span className="mb-4 inline-flex h-6 items-center gap-1.5 rounded-full border border-v-wa/30 bg-v-wa/12 px-2.5 font-mono text-11 text-v-wa">
        <span className="size-1.5 rounded-full bg-current" /> Verdict: WA
      </span>
      <p className="font-display text-36 leading-none">{title}</p>
      {children && <p className="mt-3 max-w-[44ch] text-14 text-ink-2">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Keyboard key hint, e.g. <Kbd>Ctrl K</Kbd>. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 items-center rounded-[5px] border border-line border-b-line-2 bg-surface-2 px-1.5 font-mono text-[10.5px] text-ink-3",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
