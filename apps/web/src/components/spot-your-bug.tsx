"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Check, Crosshair, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { Button, cn } from "@upsolve/ui";
import { answerDrill, dropDrill, startDrill } from "@/app/actions/drills";
import { CodeView, LineDiff } from "@/components/code-view";
import { BUG_CLASSES } from "@/lib/bug-classes";
import { diffRange } from "@/lib/highlight";
import type { DrillReveal, PublicDrill } from "@/lib/drills";

const DRILL_MS = 90_000;
const secs = (ms: number) => `${Math.round(ms / 1000)} s`;

const FAIL_TEXT = {
  "no-source": "No accepted solutions saved yet. Solve one on LeetCode with the extension on.",
  limit: "That's today's drills done. Come back tomorrow.",
  ai: "Couldn't make a drill just now. Try again in a minute.",
} as const;

/** Spot your bug (FINAL-FEATURES A3): tap the broken line before the 90 seconds run out. */
export function SpotYourBug({ initial }: { initial: PublicDrill | null }) {
  const [drill, setDrill] = useState(initial);
  const [reveal, setReveal] = useState<DrillReveal | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [left, setLeft] = useState(DRILL_MS);
  const [pending, start] = useTransition();
  const startedAt = useRef(0);
  const sent = useRef(false);

  const submit = useCallback(
    (line: number | null) => {
      if (!drill || sent.current) return;
      sent.current = true;
      const ms = performance.now() - startedAt.current;
      start(async () => {
        const res = await answerDrill(drill.id, line, ms);
        if (!res) {
          sent.current = false;
          toast.error("Couldn't check that. Try again.");
          return;
        }
        setReveal(res);
      });
    },
    [drill],
  );

  useEffect(() => {
    if (!drill || reveal) return;
    // A new drill on screen: its clock starts now.
    startedAt.current = performance.now();
    sent.current = false;
    const t = setInterval(() => {
      const rest = DRILL_MS - (performance.now() - startedAt.current);
      setLeft(Math.max(0, rest));
      if (rest <= 0) {
        clearInterval(t);
        submit(null);
      }
    }, 250);
    return () => clearInterval(t);
  }, [drill, reveal, submit]);

  const next = () =>
    start(async () => {
      const res = await startDrill();
      if (!res.ok) return void toast.error(FAIL_TEXT[res.reason]);
      setReveal(null);
      setPicked(null);
      setLeft(DRILL_MS);
      setDrill(res.drill);
    });

  if (!drill) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-13 text-ink-2">
          You get one of your own accepted solutions with one line broken, the way you usually
          break code. Find the line in 90 seconds.
        </p>
        <Button onClick={next} loading={pending}>
          <Crosshair size={14} aria-hidden="true" /> Start a drill
        </Button>
      </div>
    );
  }

  const urgent = !reveal && left <= 15_000;
  const bugText = reveal ? (drill.code.split("\n")[reveal.bugLine - 1] ?? "") : "";
  const indent = bugText.length - bugText.trimStart().length;
  const changed = reveal?.was ? diffRange(reveal.now, reveal.was) : null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-13 text-ink-2">
        <span className="font-[650] text-ink">{drill.title}</span>
        {reveal ? "" : ". One line is broken. Tap it."}
      </p>
      {drill.failingInput && (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-[10px] border border-line px-3 py-2">
          <span className="flex items-center gap-1.5 text-[11px] text-ink-3">
            <span className="size-1.5 rounded-full bg-bad" aria-hidden="true" />
            Fails on
          </span>
          <code className="font-mono text-[12px] break-all">{drill.failingInput}</code>
        </div>
      )}

      <CodeView
        code={drill.code}
        lang={drill.language}
        picked={picked}
        onPick={setPicked}
        pickDisabled={Boolean(reveal) || pending}
        focus={Boolean(reveal)}
        struck={reveal && !reveal.correct ? reveal.pickedLine : null}
        bug={
          reveal
            ? {
                line: reveal.bugLine,
                label: reveal.correct ? "found it" : BUG_CLASSES[reveal.bugClass].label,
                tone: reveal.correct ? "ok" : "bad",
                chars: changed
                  ? { start: changed.start + indent, end: changed.endA + indent }
                  : undefined,
              }
            : undefined
        }
        aside={
          !reveal ? (
            <span
              className={cn(
                "flex items-center gap-2 font-mono text-[12px] font-[650] tabular-nums",
                urgent ? "text-bad" : "text-ink-2",
              )}
              aria-live={urgent ? "polite" : "off"}
            >
              <span className="hidden h-1 w-16 overflow-hidden rounded-full bg-surface-3 sm:block">
                <span
                  className={cn(
                    "block h-full rounded-full transition-[width] duration-300 ease-linear",
                    urgent ? "bg-bad" : "bg-[var(--sky)]",
                  )}
                  style={{ width: `${(left / DRILL_MS) * 100}%` }}
                />
              </span>
              {Math.ceil(left / 1000)} s
            </span>
          ) : null
        }
      />

      {!reveal ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => submit(picked)}
            disabled={picked === null}
            loading={pending}
            className="min-w-[160px]"
          >
            <Check size={14} aria-hidden="true" />
            {picked === null ? "Tap the broken line" : `Line ${picked} is the bug`}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => submit(null)} disabled={pending}>
            Give up
          </Button>
        </div>
      ) : (
        <RevealPanel
          reveal={reveal}
          language={drill.language}
          pending={pending}
          onNext={next}
          onDrop={() =>
            start(async () => {
              const res = await dropDrill(drill.id);
              if (!res.ok) return void toast.error("Couldn't drop it.");
              toast.success("Dropped. It won't count.");
              const n = await startDrill();
              setReveal(null);
              setPicked(null);
              setLeft(DRILL_MS);
              if (n.ok) setDrill(n.drill);
              else setDrill(null);
            })
          }
        />
      )}
    </div>
  );
}

function RevealPanel({
  reveal,
  language,
  pending,
  onNext,
  onDrop,
}: {
  reveal: DrillReveal;
  language: string | null;
  pending: boolean;
  onNext: () => void;
  onDrop: () => void;
}) {
  const meta = BUG_CLASSES[reveal.bugClass];
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-[14px] px-4 py-3",
        reveal.correct
          ? "bg-[color-mix(in_srgb,var(--ok)_10%,transparent)]"
          : "bg-[color-mix(in_srgb,var(--bad)_9%,transparent)]",
      )}
      role="status"
    >
      <p className="flex items-center gap-2 text-14 font-[650]">
        {reveal.correct ? (
          <Check size={16} className="text-ok" aria-hidden="true" />
        ) : (
          <X size={16} className="text-bad" aria-hidden="true" />
        )}
        {reveal.correct
          ? `Caught it in ${secs(reveal.ms)}.`
          : reveal.pickedLine === null
            ? `Time's up. It was line ${reveal.bugLine}.`
            : `Not line ${reveal.pickedLine}. It was line ${reveal.bugLine}.`}
        <span className="text-12 font-[500] text-ink-3">{meta.label}</span>
      </p>
      <p className="text-13 text-ink-2">{reveal.explanation}</p>
      {reveal.was && <LineDiff broken={reveal.now} fixed={reveal.was} lang={language} />}
      <p className="text-12 text-ink-3">
        <span className="font-[600] text-ink-2">Next time:</span> {meta.advice}
      </p>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button size="sm" onClick={onNext} loading={pending}>
          <RotateCcw size={13} aria-hidden="true" /> Next drill
        </Button>
        <Button size="sm" variant="ghost" onClick={onDrop} disabled={pending}>
          This isn&apos;t a bug
        </Button>
      </div>
    </div>
  );
}
