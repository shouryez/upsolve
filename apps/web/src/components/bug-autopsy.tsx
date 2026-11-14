"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bug, ChevronDown, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@upsolve/ui";
import { correctFinding } from "@/app/actions/bugs";
import { CodeView } from "@/components/code-view";
import { BUG_CLASSES, type BugClass } from "@/lib/bug-classes";
import type { Finding } from "@/lib/bug-data";
import { diffRange } from "@/lib/highlight";

export const VERDICT: Record<string, { label: string; short: string; color: string }> = {
  WA: { label: "Wrong answer", short: "WA", color: "var(--v-wa)" },
  TLE: { label: "Time limit", short: "TLE", color: "var(--v-tle)" },
  RE: { label: "Runtime error", short: "RE", color: "var(--v-err)" },
  MLE: { label: "Memory limit", short: "MLE", color: "var(--v-tle)" },
};
const DATE = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });
const CLIP = 400;
const clip = (v: string) => (v.length > CLIP ? `${v.slice(0, CLIP)}…` : v);

export function VerdictTag({ verdict }: { verdict: string }) {
  const v = VERDICT[verdict];
  return (
    <span
      title={v?.label ?? verdict}
      className="rounded-[6px] px-1.5 py-px font-mono text-[10.5px] font-[700]"
      style={{
        color: v?.color ?? "var(--ink-2)",
        background: `color-mix(in srgb, ${v?.color ?? "var(--ink-3)"} 15%, transparent)`,
      }}
    >
      {v?.short ?? verdict}
    </span>
  );
}

function IoBox({
  label,
  value,
  mark,
  tone,
}: {
  label: string;
  value: string;
  mark?: { start: number; end: number };
  tone?: "bad" | "ok";
}) {
  const v = clip(value);
  return (
    <div className="min-w-0">
      <p className="mb-1 flex items-center gap-1.5 text-[11px] text-ink-3">
        {tone && (
          <span
            className={cn("size-1.5 rounded-full", tone === "bad" ? "bg-bad" : "bg-ok")}
            aria-hidden="true"
          />
        )}
        {label}
      </p>
      <pre className="max-h-28 overflow-auto rounded-[8px] bg-surface-2 px-2 py-1.5 font-mono text-[11.5px] whitespace-pre-wrap [scrollbar-width:thin]">
        {mark && mark.end > mark.start ? (
          <>
            {v.slice(0, mark.start)}
            <mark
              className={cn(
                "rounded-[3px] text-ink",
                tone === "bad"
                  ? "bg-[color-mix(in_srgb,var(--bad)_35%,transparent)]"
                  : "bg-[color-mix(in_srgb,var(--ok)_30%,transparent)]",
              )}
            >
              {v.slice(mark.start, mark.end)}
            </mark>
            {v.slice(mark.end)}
          </>
        ) : (
          v
        )}
      </pre>
    </div>
  );
}

/** Expected against your output, the point where they part marked in both. */
function TestCase({ finding }: { finding: Finding }) {
  const { failingInput, expected, actual } = finding;
  if (!failingInput && !expected && !actual) return null;
  const d = expected && actual ? diffRange(clip(expected), clip(actual)) : null;
  return (
    <div className="grid gap-2 rounded-[12px] border border-line p-2.5 sm:grid-cols-3">
      {failingInput && <IoBox label="Failing input" value={failingInput} />}
      {expected && (
        <IoBox
          label="Expected"
          value={expected}
          tone="ok"
          mark={d ? { start: d.start, end: d.endA } : undefined}
        />
      )}
      {actual && (
        <IoBox
          label="Your output"
          value={actual}
          tone="bad"
          mark={d ? { start: d.start, end: d.endB } : undefined}
        />
      )}
    </div>
  );
}

/** One failed submission's autopsy: the bug class, where, why, and the failing test. */
export function FindingCard({ finding, showTitle }: { finding: Finding; showTitle?: boolean }) {
  const [cls, setCls] = useState<BugClass>(finding.bugClass);
  const [all, setAll] = useState(false);
  const [pending, start] = useTransition();
  const meta = BUG_CLASSES[cls];
  const total = finding.code?.split("\n").length ?? 0;
  const line = finding.line;
  const short = total <= 14;
  const from = all || short || !line ? 1 : Math.max(1, line - 3);
  const to = all || short || !line ? total : Math.min(total, line + 3);

  return (
    <article className="surface-inset flex flex-col gap-3 rounded-[16px] p-3.5">
      <header className="flex flex-wrap items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-[color-mix(in_srgb,var(--bad)_14%,transparent)] text-bad">
          <Bug size={14} aria-hidden="true" />
        </span>
        <span className="text-14 font-[650]">{meta.label}</span>
        <VerdictTag verdict={finding.verdict} />
        <span className="text-12 text-ink-3">
          {showTitle &&
            (finding.problemId ? (
              <Link
                href={`/dashboard/problems/${finding.problemId}#bug-autopsy`}
                className="text-ink-2 underline-offset-2 hover:text-ink hover:underline"
              >
                {finding.title}
              </Link>
            ) : (
              finding.title
            ))}
          {showTitle ? " · " : ""}
          {DATE.format(finding.at)}
        </span>
        <label className="ml-auto flex items-center gap-1.5 text-11 text-ink-3">
          <span className="sr-only sm:not-sr-only">Not right?</span>
          <select
            value={cls}
            disabled={pending}
            onChange={(e) => {
              const next = e.target.value as BugClass;
              setCls(next);
              start(async () => {
                const res = await correctFinding(finding.submissionId, next);
                if (res.ok) toast.success("Bug class updated");
                else {
                  setCls(finding.bugClass);
                  toast.error("Couldn't update it");
                }
              });
            }}
            className="h-7 rounded-[8px] border border-line-2 bg-surface-2 px-1.5 text-12 text-ink"
          >
            {(Object.keys(BUG_CLASSES) as BugClass[]).map((k) => (
              <option key={k} value={k}>
                {BUG_CLASSES[k].label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <p className="text-13 text-ink-2">{finding.explanation}</p>

      {finding.code && (
        <CodeView
          code={finding.code}
          lang={finding.language}
          from={from}
          to={to}
          bug={line ? { line, label: meta.label } : undefined}
          aside={
            !short && line ? (
              <button
                type="button"
                onClick={() => setAll((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] text-ink-3 hover:text-ink"
              >
                {all ? "Around the bug" : `All ${total} lines`}
                <ChevronDown
                  size={12}
                  className={cn("transition-transform", all && "rotate-180")}
                  aria-hidden="true"
                />
              </button>
            ) : line ? (
              <span className="text-[11px] text-ink-3">line {line}</span>
            ) : null
          }
        />
      )}

      <TestCase finding={finding} />

      <p className="flex items-start gap-2 rounded-[10px] bg-[color-mix(in_srgb,var(--amber)_9%,transparent)] px-3 py-2 text-12 text-ink-2">
        <Lightbulb size={14} className="mt-px shrink-0 text-[var(--amber)]" aria-hidden="true" />
        <span>
          <span className="font-[650] text-ink">Next time:</span> {meta.advice}
        </span>
      </p>
    </article>
  );
}
