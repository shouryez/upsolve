import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, CircleCheck, CircleX, History, Info, Play, RotateCcw } from "lucide-react";
import { INTERVAL_DAYS, topicLabel, topicsOf } from "@upsolve/core";
import {
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  DifficultyTag,
  EmptyState,
  ProgressRing,
  Skeleton,
  SkeletonCard,
  StatusBadge,
  StrengthLadder,
  Tag,
  buttonClasses,
  cn,
} from "@upsolve/ui";
import { CelebrateOnce } from "@/components/dashboard/celebrate";
import { NumberTicker } from "@/components/fx/number-ticker";
import { dueLabel, ResultTag, reviewUrl, UpcomingStrip } from "@/components/learning";
import { Dot, PAGE_GLOW, PageHeader } from "@/components/page-header";
import { PLATFORM_LABEL } from "@/components/platform-meta";
import { ManualReview, RetireButton } from "@/components/review-actions";
import { TimeAgo } from "@/components/time-ago";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import {
  getLearning,
  getTopicTargets,
  masteryOf,
  reviewHistory,
  revisionQueue,
  type QueueEntry,
} from "@/lib/learning";
import { localDate, localDay, requestNow } from "@/lib/time";

export const metadata: Metadata = { title: "Revision" };

const DAY_MS = 86_400_000;
const WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];
const icon = (Icon: typeof RotateCcw) => <Icon size={14} strokeWidth={2} />;

export default function RevisionPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<RevisionSkeleton />}>
        <RevisionContent />
      </Suspense>
    </div>
  );
}

async function RevisionContent() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to see your revision queue.</p>;

  const [profile, problems, targets] = await Promise.all([
    getProfile(user.id),
    getLearning(user.id),
    getTopicTargets(),
  ]);
  const tz = profile?.timezone ?? "Asia/Kolkata";
  const now = requestNow();
  const { end: endOfToday } = localDay(tz, now);
  const mastery = masteryOf(problems, targets, now);
  const queue = revisionQueue(problems, mastery, { tz, cap: profile?.reviewCap ?? 5, now });
  const history = reviewHistory(problems, 25);
  const retired = problems.filter((p) => p.state.retired);
  const recent = history.filter((h) => h.at > now - 30 * DAY_MS);
  const passRate = recent.length
    ? Math.round((recent.filter((h) => h.result === "pass").length / recent.length) * 100)
    : null;

  const left = queue.today.length;
  const todayTotal = left + queue.reviewedToday;
  const countWord = (n: number) => WORDS[n] ?? String(n);
  const first = queue.today[0];

  // History grouped by week (display only).
  const groups: { label: string; items: typeof history }[] = [];
  for (const h of history) {
    const ago = Math.floor((now - h.at) / DAY_MS);
    const label = ago < 7 ? "This week" : ago < 14 ? "Last week" : "Earlier";
    const g = groups.at(-1);
    if (g?.label === label) g.items.push(h);
    else groups.push({ label, items: [h] });
  }

  return (
    <>
      <PageHeader
        eyebrow="Revision · spaced repetition"
        glow={PAGE_GLOW.revision}
        title={
          problems.length === 0 ? (
            <>
              Revision, <em>soon.</em>
            </>
          ) : left > 0 ? (
            <>
              Revision, <em>{countWord(left)} today.</em>
            </>
          ) : (
            <>
              Revision, <em>all clear.</em>
            </>
          )
        }
        subtitle={
          problems.length === 0 ? (
            "Every problem you solve is scheduled here."
          ) : (
            <>
              <span>
                {queue.reviewedToday} of {Math.max(todayTotal, queue.cap)} done today
              </span>
              <Dot />
              <span>{queue.reviewedWeek} this week</span>
              {passRate !== null && (
                <>
                  <Dot />
                  <span>{passRate}% passed</span>
                </>
              )}
            </>
          )
        }
      />

      {problems.length === 0 ? (
        <Card>
          <EmptyState
            mascot="idle"
            title={
              <>
                Solve something <em>first.</em>
              </>
            }
            action={
              <Link href="/dashboard/sheets" className={buttonClasses({ variant: "signal" })}>
                Pick a sheet <ButtonArrow />
              </Link>
            }
          >
            Every problem you solve on a connected platform is scheduled here: tomorrow if you
            needed the solution, a week out if you solved it alone.
          </EmptyState>
        </Card>
      ) : (
        <div className="stagger-in grid grid-cols-12 gap-3.5">
          {/* Hero: today's queue */}
          <Card tier="hero" beam={left > 0} className="col-span-12 lg:col-span-5">
            <div className="flex items-center gap-5">
              <ProgressRing
                total={Math.max(1, todayTotal)}
                size={136}
                stroke={12}
                className="[&_circle:first-of-type]:stroke-white/15"
                segments={[
                  { label: "Done today", value: queue.reviewedToday, color: "var(--signal)" },
                ]}
                aria-label={`${queue.reviewedToday} of ${todayTotal} reviewed today`}
              >
                <span className="num text-36">
                  <NumberTicker value={queue.reviewedToday} />
                  <span className="text-[.55em] text-white/55">/{todayTotal}</span>
                </span>
                <span className="text-11 text-white/65">done today</span>
              </ProgressRing>
              <div className="min-w-0">
                <p className="label-mono text-white/60">Today&apos;s queue</p>
                <p className="mt-1 text-20 leading-tight font-[600]">
                  {left > 0 ? (
                    <>
                      {left} left, <em className="font-display font-normal">keep going.</em>
                    </>
                  ) : queue.reviewedToday > 0 ? (
                    <>
                      All caught <em className="font-display font-normal">up.</em>
                    </>
                  ) : (
                    <>
                      Nothing <em className="font-display font-normal">due.</em>
                    </>
                  )}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-12">
                  {passRate !== null && (
                    <span className="tnum rounded-full bg-white/15 px-2 py-0.5">
                      {passRate}% pass rate
                    </span>
                  )}
                  {queue.backlog > 0 && (
                    <Link
                      href="/dashboard/settings#learning"
                      className="tnum rounded-full bg-white/10 px-2 py-0.5 text-white/80 hover:bg-white/20"
                    >
                      {queue.backlog} waiting over the cap · change
                    </Link>
                  )}
                </div>
              </div>
            </div>
            {first && (
              <a
                href={reviewUrl(first.url)}
                target="_blank"
                rel="noreferrer"
                className={buttonClasses({ variant: "signal", className: "mt-5 w-full" })}
              >
                <Play size={14} aria-hidden="true" /> Start with {first.title} <ButtonArrow />
              </a>
            )}
            {left === 0 && queue.reviewedToday > 0 && (
              <CelebrateOnce id={`queue-${localDate(tz, now)}`} />
            )}
          </Card>

          {/* Stats */}
          <div className="col-span-12 grid grid-cols-2 gap-3.5 lg:col-span-7">
            <MiniStat label="This week" value={queue.reviewedWeek} unit="reviews" />
            <MiniStat
              label="Pass rate"
              value={passRate ?? 0}
              unit={passRate === null ? "no reviews yet" : "% · 30 days"}
              tone={
                passRate === null ? undefined : passRate >= 70 ? "var(--success)" : "var(--medium)"
              }
            />
            <MiniStat label="Waiting" value={queue.backlog} unit="over today's cap" />
            <MiniStat
              label="Scheduled"
              value={problems.length - retired.length}
              unit={retired.length ? `${retired.length} retired` : "problems"}
            />
          </div>

          {/* Due today */}
          <Card className="col-span-12 xl:col-span-8">
            <CardHeader>
              <CardTitle icon={icon(RotateCcw)} tint="var(--violet)">
                Due today
              </CardTitle>
              <Link
                href="/dashboard/settings#learning"
                className="tnum text-12 text-ink-3 hover:text-ink"
              >
                {queue.cap} a day · change
              </Link>
            </CardHeader>
            {left === 0 ? (
              <EmptyState
                mascot={queue.reviewedToday > 0 ? "accepted" : "sleepy"}
                title={
                  queue.reviewedToday > 0 ? (
                    <>
                      All caught <em>up.</em>
                    </>
                  ) : (
                    <>
                      Nothing due <em>today.</em>
                    </>
                  )
                }
              >
                {queue.backlog > 0
                  ? `${queue.backlog} more are waiting; they come back tomorrow, oldest and weakest first.`
                  : `${queue.upcoming[0] ?? 0} due tomorrow. Come back then.`}
              </EmptyState>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {queue.today.map((p, i) => (
                  <ReviewRow key={p.problemId} p={p} now={now} endOfToday={endOfToday} index={i} />
                ))}
              </ul>
            )}
          </Card>

          <div className="col-span-12 flex flex-col gap-3.5 xl:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle icon={icon(CalendarDays)} tint="var(--violet)">
                  Coming up
                </CardTitle>
                <CardSub>next 14 days</CardSub>
              </CardHeader>
              <UpcomingStrip upcoming={queue.upcoming} now={now} />
            </Card>

            <details className="surface-card group/how rounded-lg p-[18px]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-14 font-[600] [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2.5">
                  <span className="grid size-7 place-items-center rounded-[9px] border border-line bg-surface-2 text-ink-2">
                    <Info size={14} aria-hidden="true" />
                  </span>
                  How revision works
                </span>
                <span className="text-ink-3 transition-transform duration-[var(--dur-base)] group-open/how:rotate-45">
                  +
                </span>
              </summary>
              <div className="mt-4 flex flex-col gap-4">
                <ol className="flex items-end justify-between gap-1">
                  {INTERVAL_DAYS.map((d, i) => (
                    <li key={d} className="flex flex-1 flex-col items-center gap-1.5">
                      <span
                        className="w-full rounded-[6px] bg-violet/70"
                        style={{ height: 10 + i * 8, opacity: 0.35 + i * 0.13 }}
                      />
                      <span className="tnum font-mono text-11 text-ink-2">{d}d</span>
                    </li>
                  ))}
                </ol>
                <p className="text-13 leading-relaxed text-ink-2">
                  <span className="font-[600] text-ink">Re-solve</span> opens the problem with the
                  extension in review mode: a solo Accepted moves it a step out, a hint moves it
                  back, seeing the solution resets it. No extension? Grade yourself; those reviews
                  stop at 16 days.
                </p>
              </div>
            </details>
          </div>

          {/* History */}
          <Card className="col-span-12">
            <CardHeader>
              <CardTitle icon={icon(History)}>History</CardTitle>
              <CardSub>latest reviews</CardSub>
            </CardHeader>
            {history.length === 0 ? (
              <p className="text-13 text-ink-2">Your reviews show up here.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {groups.map((g) => (
                  <section key={g.label}>
                    <p className="mb-1.5 label-mono">{g.label}</p>
                    <ul>
                      {g.items.map((h) => {
                        const ok = h.result === "pass";
                        return (
                          <li
                            key={`${h.problem.problemId}-${h.at}`}
                            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[10px] px-2 py-2 transition-colors hover:bg-surface-2/70"
                          >
                            {ok ? (
                              <CircleCheck size={15} aria-hidden="true" className="text-success" />
                            ) : (
                              <CircleX
                                size={15}
                                aria-hidden="true"
                                className={h.result === "fail" ? "text-hard" : "text-medium"}
                              />
                            )}
                            <Link
                              href={`/dashboard/problems/${h.problem.problemId}`}
                              className="min-w-0 flex-1 truncate text-[13.5px] font-medium hover:underline"
                            >
                              {h.problem.title}
                            </Link>
                            <ResultTag entry={h} />
                            <span className="tnum w-16 text-right text-11 text-ink-3">
                              <TimeAgo date={new Date(h.at)} />
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </Card>

          {retired.length > 0 && (
            <Card tier="inset" className="col-span-12">
              <CardHeader>
                <CardTitle>Retired</CardTitle>
                <CardSub>not scheduled</CardSub>
              </CardHeader>
              <ul>
                {retired.map((p) => (
                  <li key={p.problemId} className="flex items-center gap-3 py-1.5">
                    <Link
                      href={`/dashboard/problems/${p.problemId}`}
                      className="min-w-0 flex-1 truncate text-[13.5px] hover:underline"
                    >
                      {p.title}
                    </Link>
                    <RetireButton problemId={p.problemId} retired />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </>
  );
}

function MiniStat({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: number;
  unit: string;
  tone?: string;
}) {
  return (
    <Card className="flex flex-col justify-between gap-3">
      <p className="label-mono">{label}</p>
      <p className="num text-36" style={tone ? { color: tone } : undefined}>
        <NumberTicker value={value} />
        <small className="ml-1.5 font-display text-[.45em] font-normal tracking-normal text-ink-3 italic">
          {unit}
        </small>
      </p>
    </Card>
  );
}

function ReviewRow({
  p,
  now,
  endOfToday,
  index,
}: {
  p: QueueEntry;
  now: number;
  endOfToday: number;
  index: number;
}) {
  const topics = topicsOf(p.topics).slice(0, 2).map(topicLabel);
  const solves = p.state.history.length + 1;
  const overdue = Math.floor((now - p.state.dueAt) / DAY_MS);
  return (
    <li
      className="surface-inset flex flex-col gap-3 rounded-[16px] p-3.5 transition-[border-color] duration-[var(--dur-base)] hover:border-line-2 sm:flex-row sm:items-center"
      style={{ animation: `rise-in 420ms var(--ease-out) ${index * 50}ms backwards` }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/problems/${p.problemId}`}
            className="truncate text-15 font-[600] tracking-[-0.01em] hover:underline"
          >
            {p.title}
          </Link>
          {p.difficulty && <DifficultyTag difficulty={p.difficulty} />}
          {overdue >= 1 && (
            <StatusBadge status="overdue" label={`${overdue}d overdue`} pulse={overdue > 7} />
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-12 text-ink-3">
          <StrengthLadder
            stage={p.state.step + 1}
            compact
            overdue={overdue >= 1}
            dueLabel={dueLabel(p.state.dueAt, now, endOfToday)}
          />
          <span>
            last solved <TimeAgo date={new Date(p.state.lastAt)} />
          </span>
          {solves > 1 && <span className="tnum">· {solves}×</span>}
          {topics.map((t) => (
            <Tag key={t} className="h-5 px-1.5 text-11">
              {t}
            </Tag>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <a
          href={reviewUrl(p.url)}
          target="_blank"
          rel="noreferrer"
          className={buttonClasses({ variant: "secondary", size: "sm", className: "h-[34px]" })}
          title={`Open on ${PLATFORM_LABEL[p.platform]} with the timer in review mode`}
        >
          <Play size={13} aria-hidden="true" /> Re-solve
        </a>
        <ManualReview problemId={p.problemId} />
        <RetireButton problemId={p.problemId} retired={false} />
      </div>
    </li>
  );
}

function RevisionSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-10 w-72" />
      </div>
      <div className={cn("grid grid-cols-12 gap-3.5")}>
        <SkeletonCard lines={3} className="col-span-12 h-[230px] lg:col-span-5" />
        <SkeletonCard lines={2} className="col-span-12 h-[230px] lg:col-span-7" />
        <SkeletonCard lines={6} className="col-span-12 h-[360px] xl:col-span-8" />
        <SkeletonCard lines={4} className="col-span-12 h-[360px] xl:col-span-4" />
      </div>
    </div>
  );
}
