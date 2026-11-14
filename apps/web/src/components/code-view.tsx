import { Fragment, type ReactNode } from "react";
import { cn } from "@upsolve/ui";
import { diffRange, highlight, type Token, type TokenKind } from "@/lib/highlight";

// The code in bug autopsies and drills, dressed like an editor: a file tab, coloured
// tokens, and the bug line flagged with a wavy underline and a label, like a linter would.

const KIND: Record<TokenKind, string> = {
  kw: "text-[var(--sky)] font-[600]",
  type: "text-[var(--lime)]",
  fn: "text-ink font-[650]",
  str: "text-[var(--amber)]",
  num: "text-[var(--primary)]",
  com: "text-ink-3 italic",
  op: "text-ink-2",
  plain: "text-ink",
};

const EXT: [RegExp, string][] = [
  [/^py/i, "py"],
  [/^(cpp|c\+\+)/i, "cpp"],
  [/^c$/i, "c"],
  [/^java$/i, "java"],
  [/^(javascript|js)/i, "js"],
  [/^(typescript|ts)/i, "ts"],
  [/^go/i, "go"],
  [/^rust/i, "rs"],
  [/^(csharp|c#)/i, "cs"],
  [/^kotlin/i, "kt"],
  [/^swift/i, "swift"],
];
const LABEL: Record<string, string> = {
  py: "Python",
  cpp: "C++",
  c: "C",
  java: "Java",
  js: "JavaScript",
  ts: "TypeScript",
  go: "Go",
  rs: "Rust",
  cs: "C#",
  kt: "Kotlin",
  swift: "Swift",
};
export const fileExt = (lang: string | null) =>
  EXT.find(([re]) => re.test(lang ?? ""))?.[1] ?? "txt";

/** Tokens cut to the characters [from, to) of their line. */
function sliceTokens(tokens: Token[], from: number, to = Infinity): Token[] {
  const out: Token[] = [];
  let pos = 0;
  for (const t of tokens) {
    const a = pos;
    pos += t.text.length;
    const s = t.text.slice(Math.max(0, from - a), Math.max(0, to - a));
    if (s) out.push({ text: s, kind: t.kind });
  }
  return out;
}

const MARK = {
  bad: "rounded-[3px] bg-[color-mix(in_srgb,var(--bad)_38%,transparent)]",
  ok: "rounded-[3px] bg-[color-mix(in_srgb,var(--ok)_34%,transparent)]",
};

/** Coloured tokens; `mark` (character range) gets a highlight box, e.g. what a drill broke. */
function Tokens({
  tokens,
  mark,
  tone = "bad",
}: {
  tokens: Token[];
  mark?: { start: number; end: number };
  tone?: "bad" | "ok";
}) {
  const parts: { t: Token; marked: boolean }[] = mark
    ? [
        ...sliceTokens(tokens, 0, mark.start).map((t) => ({ t, marked: false })),
        ...sliceTokens(tokens, mark.start, mark.end).map((t) => ({ t, marked: true })),
        ...sliceTokens(tokens, mark.end).map((t) => ({ t, marked: false })),
      ]
    : tokens.map((t) => ({ t, marked: false }));
  return parts.map(({ t, marked }, i) => (
    <span key={i} className={cn(KIND[t.kind], marked && MARK[tone])}>
      {t.text}
    </span>
  ));
}

export type CodeViewProps = {
  code: string;
  lang: string | null;
  /** Shown lines, 1-based and inclusive; the whole file by default. */
  from?: number;
  to?: number;
  /** The bug line: wavy underline, a label pinned to it, the rest dimmed if `focus`. */
  bug?: {
    line: number;
    label?: string;
    tone?: "bad" | "ok";
    chars?: { start: number; end: number };
  };
  focus?: boolean;
  /** A wrong pick, crossed out. */
  struck?: number | null;
  /** Drill mode: lines are buttons. */
  picked?: number | null;
  onPick?: (line: number) => void;
  pickDisabled?: boolean;
  /** Right side of the tab bar. */
  aside?: ReactNode;
  className?: string;
};

export function CodeView({
  code,
  lang,
  from = 1,
  to,
  bug,
  focus,
  struck,
  picked,
  onPick,
  pickDisabled,
  aside,
  className,
}: CodeViewProps) {
  const all = highlight(code, lang);
  const raw = code.split("\n");
  const last = Math.min(all.length, to ?? all.length);
  const ext = fileExt(lang);
  const tone = bug?.tone ?? "bad";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[14px] bg-[color-mix(in_srgb,var(--ink)_5%,var(--surface))] shadow-[inset_0_0_0_1px_var(--line-2)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-line px-3 py-1.5">
        <span className="flex gap-1" aria-hidden="true">
          <span className="size-2 rounded-full bg-[color-mix(in_srgb,var(--rose)_70%,transparent)]" />
          <span className="size-2 rounded-full bg-[color-mix(in_srgb,var(--amber)_70%,transparent)]" />
          <span className="size-2 rounded-full bg-[color-mix(in_srgb,var(--lime)_70%,transparent)]" />
        </span>
        <span className="rounded-[6px] bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-ink-2">
          solution.{ext}
        </span>
        {LABEL[ext] && <span className="text-[11px] text-ink-3">{LABEL[ext]}</span>}
        <span className="ml-auto">{aside}</span>
      </div>
      <div
        role={onPick ? "group" : undefined}
        aria-label={onPick ? "The code. Pick the line with the bug." : undefined}
        className="overflow-x-auto py-1.5 font-mono text-[12.5px] leading-[1.6] [scrollbar-width:thin]"
      >
        <div className="w-max min-w-full">
          {all.slice(from - 1, last).map((tokens, i) => {
            const n = from + i;
            const text = raw[n - 1] ?? "";
            const isBug = bug?.line === n;
            const indent = text.match(/^\s*/)?.[0].length ?? 0;
            const blank = !text.trim();
            const row = (
              <>
                <span
                  className={cn(
                    "relative w-7 shrink-0 pr-1 text-right text-ink-4 select-none",
                    isBug && (tone === "bad" ? "font-[700] text-bad" : "font-[700] text-ok"),
                  )}
                >
                  {isBug && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-1/2 -left-1.5 size-1.5 -translate-y-1/2 rounded-full",
                        tone === "bad" ? "bg-bad" : "bg-ok",
                      )}
                    />
                  )}
                  {n}
                </span>
                <code className="whitespace-pre">
                  {isBug && !blank ? (
                    <>
                      <Tokens tokens={sliceTokens(tokens, 0, indent)} />
                      <span
                        className={cn(
                          "underline decoration-wavy decoration-[1.5px] underline-offset-[5px]",
                          tone === "bad" ? "decoration-[var(--bad)]" : "decoration-[var(--ok)]",
                        )}
                      >
                        <Tokens
                          tokens={sliceTokens(tokens, indent)}
                          tone={tone}
                          mark={
                            bug.chars
                              ? { start: bug.chars.start - indent, end: bug.chars.end - indent }
                              : undefined
                          }
                        />
                      </span>
                    </>
                  ) : (
                    <Tokens tokens={tokens} />
                  )}
                  {!tokens.length && " "}
                </code>
                {isBug && bug.label && (
                  <span
                    className={cn(
                      "code-bug-pin ml-4 inline-flex shrink-0 items-center gap-1 self-center rounded-full px-2 py-px font-sans text-[10.5px] font-[650]",
                      tone === "bad"
                        ? "bg-[color-mix(in_srgb,var(--bad)_18%,transparent)] text-bad"
                        : "bg-[color-mix(in_srgb,var(--ok)_18%,transparent)] text-ok",
                    )}
                  >
                    ◂ {bug.label}
                  </span>
                )}
              </>
            );
            const lineCls = cn(
              "flex min-h-[26px] w-full items-center gap-3 pr-4 pl-2 text-left transition-[opacity,background-color] duration-300",
              isBug &&
                (tone === "bad"
                  ? "code-bug-line"
                  : "bg-[color-mix(in_srgb,var(--ok)_16%,transparent)]"),
              focus && bug && !isBug && "opacity-45",
              struck === n && "opacity-70 [&_code]:line-through [&_code]:decoration-ink-3",
            );
            if (!onPick) {
              return (
                <div key={n} className={lineCls}>
                  {row}
                </div>
              );
            }
            return (
              <button
                key={n}
                type="button"
                disabled={pickDisabled || blank}
                aria-pressed={picked === n}
                aria-label={`Line ${n}: ${text.trim()}`}
                onClick={() => onPick(n)}
                className={cn(
                  lineCls,
                  "min-h-[30px] cursor-pointer disabled:cursor-default",
                  !pickDisabled &&
                    !blank &&
                    "hover:bg-[color-mix(in_srgb,var(--ink)_7%,transparent)]",
                  !pickDisabled &&
                    picked === n &&
                    "bg-[color-mix(in_srgb,var(--sky)_20%,transparent)] shadow-[inset_3px_0_0_var(--sky)]",
                )}
              >
                {row}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** The broken line against the right one, the changed characters marked: a one-line diff. */
export function LineDiff({
  broken,
  fixed,
  lang,
  fixedLabel = "yours",
}: {
  broken: string;
  fixed: string;
  lang: string | null;
  fixedLabel?: string;
}) {
  const d = diffRange(broken, fixed);
  const [b] = highlight(broken, lang);
  const [f] = highlight(fixed, lang);
  const rows = [
    { sign: "−", label: "broken", tokens: b!, mark: { start: d.start, end: d.endA }, tone: "bad" },
    { sign: "+", label: fixedLabel, tokens: f!, mark: { start: d.start, end: d.endB }, tone: "ok" },
  ] as const;
  return (
    <div className="overflow-x-auto rounded-[12px] font-mono text-[12.5px] leading-[1.7] shadow-[inset_0_0_0_1px_var(--line-2)] [scrollbar-width:thin]">
      {rows.map((r) => (
        <Fragment key={r.sign}>
          <div
            className={cn(
              "flex w-max min-w-full items-center gap-3 px-3 py-0.5",
              r.tone === "bad"
                ? "bg-[color-mix(in_srgb,var(--bad)_11%,transparent)]"
                : "bg-[color-mix(in_srgb,var(--ok)_11%,transparent)]",
            )}
          >
            <span className={cn("w-3 font-[700]", r.tone === "bad" ? "text-bad" : "text-ok")}>
              {r.sign}
            </span>
            <span className="w-12 shrink-0 font-sans text-[10.5px] text-ink-3">{r.label}</span>
            <code className="whitespace-pre">
              <Tokens tokens={r.tokens} mark={r.mark} tone={r.tone} />
            </code>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
