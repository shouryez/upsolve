import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, ViewTransition } from "react";
import { ExternalLink, MonitorPlay, Play, Timer } from "lucide-react";
import { INTERVAL_DAYS, topicLabel, topicsOf } from "@upsolve/core";
import {
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  DifficultyTag,
  Skeleton,
  SkeletonCard,
  StatusBadge,
  Tag,
  VerdictChip,
  buttonClasses,
} from "@upsolve/ui";
import { BackLink } from "@/components/back-link";
import { AttemptStrip, KpiStrip } from "@/components/dashboard/lamplight";
import { ProblemActions } from "@/components/daily/problem-actions";
import { dueLabel, ResultTag, reviewUrl } from "@/components/learning";
import {
  PLATFORM_LABEL as MARK_LABEL,
  PlatformMark,
  platformMarkId,
  type PlatformId,
} from "@/components/site-icons";
import { sheetIdentity } from "@/components/sheet-identity";
import { NoteEditor } from "@/components/note-editor";
import { NoteMarkup } from "@/components/note-markup";
import { PLATFORM_LABEL } from "@/components/platform-meta";
import { ManualReview, RetireButton } from "@/components/review-actions";
import { Tabs } from "@/components/tabs";
import { TimeAgo } from "@/components/time-ago";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { getLearning } from "@/lib/learning";
import { getMyGroups } from "@/lib/social-data";
import type { SheetItemLink } from "@upsolve/db";
import { getProblemDetail, getSolveMedian, type ProblemDetail } from "@/lib/problem-data";
import { formatDuration } from "@/lib/sessions-data";
import { proofItStuck } from "@/lib/proof";
import { getProblemFindings } from "@/lib/bug-data";
import { FindingCard } from "@/components/bug-autopsy";
import { watchBefore } from "@/lib/watched";
import { ProofItStuck } from "@/components/proof-it-stuck";
import { localDay, requestNow } from "@/lib/time";
import { LogSolveButton } from "@/components/log-solve";

export const metadata: Metadata = { title: "Problem" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DAY_MS = 86_400_000;
const LINK_MARK: Partial<Record<SheetItemLink["site"], PlatformId>> = {
  takeuforward: "tuf",
  neetcode: "neetcode",
  youtube: "youtube",
  article: "article",
};
const INDEPENDENCE = { solo: "solo", hint: "used a hint", solution: "saw the solution" } as const;
const SITE_LABEL: Record<SheetItemLink["site"], string> = {
  leetcode: "LeetCode",
  geeksforgeeks: "GFG",
  takeuforward: "takeUforward",
  neetcode: "NeetCode",
  source: "Source",
  youtube: "Video explanation",
  article: "Article",
};

export default function ProblemPage({ params }: PageProps<"/dashboard/problems/[id]">) {
  return (
    <div className="flex flex-col gap-6">
      <BackLink fallback="/dashboard/revision" fallbackLabel="Revision" />
      <Suspense
        fallback={
          <div className="flex flex-col gap-6">
            <Skeleton className="h-10 w-96" />
            <div className="grid grid-cols-12 gap-3.5">
              <SkeletonCard lines={8} className="col-span-12 h-[480px] xl:col-span-8" />
              <SkeletonCard lines={4} className="col-span-12 h-[300px] xl:col-span-4" />
            </div>
          </div>
        }
      >
        <ProblemContent params={params} />
      </Suspense>
    </div>
  );
}

async function ProblemContent({
  params,
}: {
  params: PageProps<"/dashboard/problems/[id]">["params"];
}) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to see your problems.</p>;

  const [detail, learning, profile, myGroups, median, findings] = await Promise.all([
    getProblemDetail(user.id, id),
    getLearning(user.id),
    getProfile(user.id),
    getMyGroups(user.id),
    getSolveMedian(id),
    getProblemFindings(user.id, id),
  ]);
  if (!detail) notFound();
  // Watched it? Prove it (A1): a solve right after watching the explanation video counts as
  // having seen the solution, whatever was answered.
  const videoFor = new Map(
    detail.sessions.map((x) => [
      x.id,
      x.outcome === "solved" ? watchBefore(x.endedAt.getTime(), detail.watches) : null,
    ]),
  );
  const problem = {
    ...detail,
    sessions: detail.sessions.map((x) =>
      videoFor.get(x.id) ? { ...x, independence: "solution" as const } : x,
    ),
  };
  const watchedSolve = problem.sessions
    .filter((x) => videoFor.get(x.id))
    .sort((a, b) => b.at.getTime() - a.at.getTime())[0];
  const review = learning.find((p) => p.problemId === id) ?? null;
  const now = requestNow();
  const { end: endOfToday } = localDay(profile?.timezone ?? "Asia/Kolkata", now);
  const topics = topicsOf(problem.topics).map(topicLabel);
  const mistakes = countMistakes(problem.sessions);
  const solvedTimes = problem.sessions
    .filter((x) => x.outcome === "solved" && x.activeMs > 30_000)
    .map((x) => x.activeMs);
  const solvedBest = solvedTimes.length ? Math.min(...solvedTimes) : null;
  const proof = proofItStuck(
    problem.sessions
      .filter((x) => x.outcome === "solved")
      .map((x) => ({ at: x.at.getTime(), activeMs: x.activeMs, independence: x.independence })),
  );
  const solveUrl = problem.versions[0]?.url ?? problem.sheets[0]?.links[0]?.url ?? null;
  const firstVersion = problem.versions[0];
  const firstMark = firstVersion ? platformMarkId(firstVersion.platform) : null;
  const status = review
    ? review.state.retired
      ? "solved"
      : review.state.dueAt <= endOfToday
        ? Math.floor((now - review.state.dueAt) / DAY_MS) >= 1
          ? "overdue"
          : "revise"
        : "solved"
    : problem.submissions.length + problem.sessions.length > 0
      ? "attempted"
      : "todo";
  // The latest wrap-up you wrote after a solve.
  const wrap = [...problem.sessions]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .reduce<{ pattern: string | null; takeaway: string | null }>(
      (w, x) => ({ pattern: w.pattern ?? x.pattern, takeaway: w.takeaway ?? x.takeaway }),
      { pattern: null, takeaway: null },
    );
  const maxActive = Math.max(1, ...problem.sessions.map((x) => x.activeMs));
  const extraLinks = problem.sheets
    .flatMap((x) => x.links)
    .filter(
      (l, i, all) =>
        ["takeuforward", "neetcode", "youtube", "article"].includes(l.site) &&
        all.findIndex((y) => y.url === l.url) === i,
    );
  // The latest timed attempt, for the strip at the top.
  const lastSession = problem.sessions.reduce<(typeof problem.sessions)[number] | null>(
    (a, b) => (!a || b.at > a.at ? b : a),
    null,
  );
  const totalActive = problem.sessions.reduce((n, x) => n + x.activeMs, 0);
  const VERDICT_LABEL: Record<string, string> = {
    AC: "Accepted",
    WA: "Wrong answer",
    TLE: "Time limit",
    MLE: "Memory limit",
    RE: "Runtime error",
    CE: "Compile error",
    OTHER: "Other",
  };
  const timeline = [
    ...problem.sessions.map((s) => ({ kind: "session" as const, at: s.at, s })),
    ...problem.submissions.map((s) => ({ kind: "submission" as const, at: s.at, s })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <>
      {problem.sheets[0] && (
        <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-[12.5px] text-ink-3">
          <Link href="/dashboard/sheets" className="hover:text-ink">
            Sheets
          </Link>
          <span>/</span>
          <Link href={`/dashboard/sheets/${problem.sheets[0].slug}`} className="hover:text-ink">
            {problem.sheets[0].name}
          </Link>
          <span>/</span>
          <span>{problem.sheets[0].step}</span>
        </nav>
      )}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="mb-2.5 text-[13.5px] text-ink-3">Problem</p>
          <ViewTransition name={`problem-${problem.id}`} share="morph" default="none">
            <h1 className="font-display text-[clamp(32px,3.4vw,48px)] leading-[1.02] text-balance">
              {problem.title}
            </h1>
          </ViewTransition>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            {problem.difficulty && <DifficultyTag difficulty={problem.difficulty} />}
            {topics.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <ProblemActions
            problemId={problem.id}
            title={problem.title}
            groups={myGroups.map((g) => ({ id: g.id, name: g.name }))}
          />
          <LogSolveButton problemId={problem.id} title={problem.title} />
          {firstVersion && (
            <a
              href={firstVersion.url}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses({ variant: "secondary", className: "group" })}
            >
              {firstMark && <PlatformMark site={firstMark} size={15} />}
              Open on {PLATFORM_LABEL[firstVersion.platform]}
            </a>
          )}
          {solveUrl && (
            <a
              href={review && !review.state.retired ? reviewUrl(solveUrl) : solveUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses({ variant: "signal" })}
            >
              <Play size={14} aria-hidden="true" /> {review ? "Re-solve" : "Solve it"}{" "}
              <ButtonArrow />
            </a>
          )}
        </div>
      </header>

      <KpiStrip
        items={[
          {
            label: "Time on it",
            value: Math.round(totalActive / 60_000),
            unit: "min",
            note: `${problem.sessions.length} sitting${problem.sessions.length === 1 ? "" : "s"}`,
          },
          {
            label: "Submissions",
            value: problem.submissions.length,
            note: `${problem.submissions.filter((x) => x.verdict === "AC").length} accepted`,
          },
          {
            label: "How you solved it",
            value: lastSession?.independence ? INDEPENDENCE[lastSession.independence] : "—",
            note: lastSession?.independence ? "your honest answer" : "not answered yet",
          },
          {
            label: "Next revision",
            value: review
              ? review.state.retired
                ? "Done"
                : dueLabel(review.state.dueAt, now, endOfToday)
              : "—",
            note: review
              ? review.state.retired
                ? "graduated"
                : `rung ${Math.min(6, review.state.step + 1)} of 6`
              : "after your first solve",
          },
        ]}
      />

      {watchedSolve && videoFor.get(watchedSolve.id) && (
        <div className="surface-inset flex items-start gap-3 rounded-[16px] px-4 py-3">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--amber)_16%,transparent)] text-medium">
            <MonitorPlay size={15} aria-hidden="true" />
          </span>
          <p className="text-13 text-ink-2">
            <span className="font-[600] text-ink">Watched it? Prove it.</span> You watched the
            explanation video{" "}
            {watchedGap(watchedSolve.endedAt.getTime() - videoFor.get(watchedSolve.id)!.at)} this
            solve, so it counts as having seen the solution.{" "}
            {review && !review.state.retired
              ? `A solo re-solve is on your revision list (${dueLabel(review.state.dueAt, now, endOfToday)}).`
              : "Solve it again on your own to make it yours."}
          </p>
        </div>
      )}

      {lastSession && (
        <Card className="p-[22px]">
          <CardHeader>
            <CardTitle>Latest attempt</CardTitle>
            <CardSub>
              <TimeAgo date={lastSession.at} />
            </CardSub>
          </CardHeader>
          <AttemptStrip
            start={lastSession.at.getTime()}
            activeMs={lastSession.activeMs}
            timeZone={profile?.timezone ?? "Asia/Kolkata"}
            submissions={problem.submissions.map((x) => ({
              at: x.at.getTime(),
              ok: x.verdict === "AC",
              label: VERDICT_LABEL[x.verdict] ?? x.verdict,
            }))}
          />
          <p className="mt-2 text-12 text-ink-3">
            Amber is time the extension counted; hatched is time after it, until your last
            submission.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-12 gap-3.5">
        <div className="col-span-12 flex flex-col gap-3.5 xl:col-span-8">
          <Card className="p-[22px]">
            <CardHeader>
              <CardTitle>Your wrap-up</CardTitle>
              <CardSub>goes into your Notebook</CardSub>
            </CardHeader>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div className="surface-inset rounded-[12px] p-3.5">
                <p className="text-12 font-[600] text-ink-3">Pattern</p>
                <p className="mt-1.5 font-[600]">{wrap.pattern ?? topics[0] ?? "Not noted yet"}</p>
              </div>
              <div className="surface-inset rounded-[12px] p-3.5">
                <p className="text-12 font-[600] text-bad">What went wrong</p>
                <p className="mt-1.5 text-[13.5px]">
                  {mistakes.length
                    ? mistakes
                        .map(([t, n]) => `${t.replace(/-/g, " ")}${n > 1 ? ` ×${n}` : ""}`)
                        .join(", ")
                    : "Nothing tagged."}
                </p>
              </div>
            </div>
            {wrap.takeaway && (
              <div className="mb-4">
                <p className="text-12 font-[600] text-ink-3">Key idea</p>
                <p className="mt-1.5 text-14">{wrap.takeaway}</p>
              </div>
            )}
            <NoteEditor problemId={problem.id} initial={problem.note?.body ?? ""} />
          </Card>

          {findings.length > 0 && (
            <Card className="scroll-mt-20 p-[22px]" id="bug-autopsy">
              <CardHeader>
                <CardTitle>Bug autopsy</CardTitle>
                <CardSub>
                  why {findings.length === 1 ? "a submission" : `${findings.length} submissions`}{" "}
                  failed ·{" "}
                  <Link href="/dashboard/bugs" className="underline underline-offset-2">
                    your bug profile
                  </Link>
                </CardSub>
              </CardHeader>
              <div className="flex flex-col gap-2.5">
                {findings.slice(0, 5).map((f) => (
                  <FindingCard key={f.submissionId} finding={f} />
                ))}
              </div>
            </Card>
          )}
          <Card>
            <Tabs
              items={[
                {
                  id: "attempts",
                  label: "Attempts",
                  count: problem.submissions.length + problem.sessions.length,
                  content: (
                    <>
                      {timeline.length === 0 ? (
                        <div className="flex flex-col items-center py-8 text-center">
                          <span className="mb-3 grid size-11 place-items-center glass-control rounded-[14px] text-ink-2">
                            <Timer size={18} aria-hidden="true" />
                          </span>
                          <p className="text-15 font-[600]">
                            No attempts <em className="text-ink-3 not-italic">yet.</em>
                          </p>
                          <p className="mt-1 max-w-[42ch] text-13 text-ink-2">
                            Open it with the extension connected and the timer starts on its own.
                          </p>
                        </div>
                      ) : (
                        <ol className="trace-beam relative ml-2 border-l border-line-2">
                          {timeline.slice(0, 60).map((t) =>
                            t.kind === "session" ? (
                              <li key={`s-${t.s.id}`} className="relative py-3 pl-5">
                                <span
                                  aria-hidden="true"
                                  className={`absolute top-[17px] -left-[5px] size-[9px] rounded-full border-2 border-surface ${t.s.outcome === "solved" ? "bg-signal shadow-[0_0_8px_var(--signal)]" : "bg-[var(--sky)]"}`}
                                />
                                <p className="flex flex-wrap items-center gap-2 text-[13.5px]">
                                  <span className="font-medium">
                                    {t.s.mode === "review" ? "Review session" : "Timed session"}
                                  </span>
                                  <span className="tnum text-12 text-ink-2">
                                    {formatDuration(t.s.activeMs)} active · {t.s.submits} submit
                                    {t.s.submits === 1 ? "" : "s"}
                                  </span>
                                  {t.s.outcome === "solved" ? (
                                    <Tag tone="success" mono>
                                      solved
                                    </Tag>
                                  ) : (
                                    <Tag mono>{t.s.outcome === "open" ? "open" : "left"}</Tag>
                                  )}
                                  {t.s.independence && (
                                    <Tag mono>{INDEPENDENCE[t.s.independence]}</Tag>
                                  )}
                                </p>
                                <span className="mt-2 flex h-1.5 max-w-[320px] overflow-hidden rounded-full bg-line">
                                  <span
                                    className="h-full origin-left animate-[grow-x_700ms_var(--ease-out)_backwards] rounded-full bg-[var(--sky)]"
                                    style={{
                                      width: `${Math.max(3, (t.s.activeMs / maxActive) * 100)}%`,
                                    }}
                                  />
                                </span>
                                {t.s.takeaway && (
                                  <p className="mt-2 text-13">
                                    <span className="mr-1.5 text-signal-text">→</span>
                                    {/* Blurred until hovered or focused: recall it first. */}
                                    <span
                                      tabIndex={0}
                                      title="Your key insight: try to recall it, then hover"
                                      className="insight-blur"
                                    >
                                      {t.s.takeaway}
                                    </span>
                                  </p>
                                )}
                                {t.s.note && (
                                  <NoteMarkup
                                    text={t.s.note}
                                    className="mt-2 border-l-2 border-line-3 pl-2.5 text-ink-2"
                                  />
                                )}
                                <p className="mt-0.5 tnum text-12 text-ink-3">
                                  <TimeAgo date={t.s.at} />
                                  {t.s.mistakeTags.length > 0 && ` · ${t.s.mistakeTags.join(", ")}`}
                                </p>
                              </li>
                            ) : (
                              <li
                                key={`u-${t.s.id}`}
                                className="relative flex flex-wrap items-center gap-2 py-1.5 pl-5"
                              >
                                <span
                                  aria-hidden="true"
                                  className="absolute top-[13px] -left-[3.5px] size-1.5 rounded-full bg-line-3"
                                />
                                <VerdictChip verdict={t.s.verdict} />
                                <span className="tnum text-12 text-ink-3">
                                  {PLATFORM_LABEL[t.s.platform]}
                                  {t.s.language ? ` · ${t.s.language}` : ""}
                                  {t.s.runtimeMs !== null ? ` · ${t.s.runtimeMs} ms` : ""} ·{" "}
                                  <TimeAgo date={t.s.at} />
                                </span>
                              </li>
                            ),
                          )}
                        </ol>
                      )}
                    </>
                  ),
                },
              ]}
            />
          </Card>
        </div>

        <div className="col-span-12 flex flex-col gap-3.5 xl:col-span-4">
          {proof && (
            <Card>
              <CardHeader>
                <CardTitle>Proof it stuck</CardTitle>
                <CardSub>first solve vs latest</CardSub>
              </CardHeader>
              <ProofItStuck proof={proof} />
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>On the ladder</CardTitle>
              {review && !review.state.retired && (
                <CardSub>rung {Math.min(6, review.state.step + 1)} of 6</CardSub>
              )}
              {review && <RetireButton problemId={problem.id} retired={review.state.retired} />}
            </CardHeader>
            {!review ? (
              <p className="text-[13px] text-ink-2">
                Scheduled after your first Accepted: tomorrow if you needed the solution, in 3 days
                with a hint, in a week solo.
              </p>
            ) : (
              <>
                <div className="grid h-[70px] grid-cols-6 items-end gap-1">
                  {[0, 1, 2, 3, 4, 5].map((i) => {
                    const on = !review.state.retired && i === Math.min(5, review.state.step);
                    return (
                      <span
                        key={i}
                        className="rounded-[5px_5px_2px_2px]"
                        style={{
                          height: 18 + i * 10,
                          background:
                            on || (review.state.retired && i === 5)
                              ? "var(--signal)"
                              : "var(--line-2)",
                          boxShadow: on
                            ? "0 6px 16px -6px color-mix(in srgb, var(--signal) 55%, transparent)"
                            : undefined,
                        }}
                      />
                    );
                  })}
                </div>
                <div className="mt-1.5 grid grid-cols-6 text-center tnum text-11 text-ink-3">
                  {INTERVAL_DAYS.map((d) => (
                    <span key={d}>{d}d</span>
                  ))}
                </div>
                <p className="mt-2.5 text-12 text-ink-3">
                  {review.state.retired
                    ? "Graduated: it won't come back unless you restore it."
                    : `${dueLabel(review.state.dueAt, now, endOfToday)[0]!.toUpperCase()}${dueLabel(review.state.dueAt, now, endOfToday).slice(1)}. Pass it and it moves to ${INTERVAL_DAYS[Math.min(5, review.state.step + 1)]} days.`}
                </p>
                {!review.state.retired && (
                  <div className="mt-3.5">
                    <p className="mb-2 text-12 text-ink-3">Revised it without the extension?</p>
                    <ManualReview problemId={problem.id} />
                  </div>
                )}
                {review.state.history.length > 0 && (
                  <ul className="mt-3.5 border-t border-line pt-1.5">
                    {[...review.state.history]
                      .reverse()
                      .slice(0, 8)
                      .map((h) => (
                        <li key={h.at} className="flex items-center justify-between gap-2 py-1.5">
                          <ResultTag entry={h} />
                          <span className="tnum text-12 text-ink-3">
                            <TimeAgo date={new Date(h.at)} />
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Solve on</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 gap-2">
              {problem.versions.map((v) => {
                const mark = platformMarkId(v.platform);
                return (
                  <ResourceTile
                    key={v.url}
                    href={v.url}
                    label={PLATFORM_LABEL[v.platform]}
                    site={mark}
                  />
                );
              })}
              {extraLinks.map((l) => {
                const mark = LINK_MARK[l.site] ?? null;
                return (
                  <ResourceTile
                    key={l.url}
                    href={l.url}
                    label={mark ? MARK_LABEL[mark] : SITE_LABEL[l.site]}
                    site={mark}
                    wide={l.site === "youtube"}
                  />
                );
              })}
            </div>
          </Card>

          {problem.sheets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>In your sheets</CardTitle>
              </CardHeader>
              <ul className="flex flex-col gap-2">
                {problem.sheets.map((s) => {
                  const { color, mono } = sheetIdentity(s.slug, s.name);
                  return (
                    <li key={s.slug}>
                      <Link
                        href={`/dashboard/sheets/${s.slug}`}
                        className="group/sh flex items-center gap-3 rounded-[14px] p-2 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)]"
                      >
                        <span
                          className="grid h-8 min-w-8 place-items-center rounded-[10px] border px-1 tnum text-[11px] font-[700]"
                          style={{
                            color,
                            borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
                            background: `color-mix(in srgb, ${color} 14%, transparent)`,
                          }}
                        >
                          {mono}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-13 font-[600] group-hover/sh:underline">
                            {s.name}
                          </span>
                          <span className="block truncate text-11 text-ink-3">{s.step}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {median && solvedBest !== null && (
            <Card>
              <CardHeader>
                <CardTitle>Your time vs everyone</CardTitle>
                <CardSub>{median.solvers} solvers</CardSub>
              </CardHeader>
              <TimeVsMedian mine={solvedBest} median={median.medianMs} />
            </Card>
          )}

          {problem.similar.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Same idea</CardTitle>
                <CardSub>not solved yet</CardSub>
              </CardHeader>
              {/* A snap carousel: swipe, scroll or tab through. */}
              <ul className="-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
                {problem.similar.map((sim) => (
                  <li key={sim.id} className="w-[72%] shrink-0 snap-start">
                    <Link
                      href={`/dashboard/problems/${sim.id}`}
                      className="surface-inset group/sim flex h-full flex-col justify-between gap-4 rounded-[16px] p-3.5 transition-[border-color,transform] duration-[var(--dur-base)] hover:-translate-y-0.5 hover:border-line-2"
                    >
                      <span
                        aria-hidden="true"
                        className="h-1 w-10 rounded-full"
                        style={{
                          background: sim.difficulty ? `var(--${sim.difficulty})` : "var(--line-3)",
                        }}
                      />
                      <span className="line-clamp-2 text-14 font-[600] group-hover/sim:underline">
                        {sim.title}
                      </span>
                      <span className="flex items-center justify-between">
                        {sim.difficulty ? <DifficultyTag difficulty={sim.difficulty} /> : <span />}
                        <ButtonArrow />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

/** "just before", "3 hours before", "a day before". */
function watchedGap(ms: number) {
  const h = Math.round(ms / 3_600_000);
  return h < 1 ? "just before" : h < 24 ? `${h} hour${h === 1 ? "" : "s"} before` : "a day before";
}

function countMistakes(sessions: ProblemDetail["sessions"]): [string, number][] {
  const counts = new Map<string, number>();
  for (const s of sessions) for (const t of s.mistakeTags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]);
}

/** "Solve on" logo tile: monochrome mark, brand colour on hover. */
function ResourceTile({
  href,
  label,
  site,
  wide,
}: {
  href: string;
  label: string;
  site: PlatformId | null;
  wide?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`surface-inset group flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-13 font-[550] transition-[border-color,transform] duration-[var(--dur-base)] hover:-translate-y-0.5 hover:border-line-2 ${wide ? "col-span-2" : ""}`}
    >
      {site ? (
        <PlatformMark site={site} size={18} className="text-ink-2" />
      ) : (
        <ExternalLink size={15} aria-hidden="true" className="text-ink-3" />
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ExternalLink
        size={12}
        aria-hidden="true"
        className="text-ink-4 transition-colors group-hover:text-ink-2"
      />
    </a>
  );
}

/**
 * Your best solve time against everyone's median (FRONTEND-PLAN §8 Problem 2): a soft bell
 * curve that draws in, with the median and your marker on it.
 */
function TimeVsMedian({ mine, median }: { mine: number; median: number }) {
  const W = 260;
  const H = 70;
  const span = Math.max(mine, median) * 2;
  const x = (ms: number) => Math.min(W, (ms / span) * W);
  // A log-normal-ish curve peaked at the median (illustrative shape, real positions).
  const pts = Array.from({ length: 49 }, (_, i) => {
    const t = (i / 48) * span;
    const z = Math.log(Math.max(1, t) / median) / 0.55;
    return `${((i / 48) * W).toFixed(1)},${(H - Math.exp((-z * z) / 2) * (H - 6)).toFixed(1)}`;
  });
  const faster = mine <= median;
  const pct = Math.round((Math.abs(median - mine) / median) * 100);
  return (
    <div className="flex flex-col gap-2">
      <svg viewBox={`0 -4 ${W} ${H + 18}`} className="w-full overflow-visible" aria-hidden="true">
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke="var(--ink)"
          strokeOpacity=".35"
          strokeWidth="1.5"
          pathLength={100}
          strokeDasharray="100"
          className="animate-[draw_1100ms_var(--ease-out)_backwards]"
        />
        <line
          x1={x(median)}
          x2={x(median)}
          y1={0}
          y2={H}
          stroke="var(--ink)"
          strokeOpacity=".3"
          strokeDasharray="3 3"
        />
        <text x={x(median)} y={H + 14} textAnchor="middle" fontSize="10" fill="var(--ink-3)">
          median {formatDuration(median)}
        </text>
        <line x1={x(mine)} x2={x(mine)} y1={0} y2={H} stroke="var(--signal-mark)" strokeWidth="2" />
        <circle cx={x(mine)} cy={4} r="5" fill="var(--signal-mark)" />
      </svg>
      <p className="text-13 text-ink-2">
        Your best: <span className="font-[650] text-ink">{formatDuration(mine)}</span>,{" "}
        {pct < 5
          ? "right at the median."
          : faster
            ? `${pct}% faster than the median.`
            : `${pct}% slower than the median.`}
      </p>
    </div>
  );
}
