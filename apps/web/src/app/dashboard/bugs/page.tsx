import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { ArrowRight, Bug, Check, Crosshair } from "lucide-react";
import { Card, CardHeader, CardSub, CardTitle, SkeletonCard } from "@upsolve/ui";
import { FindingCard } from "@/components/bug-autopsy";
import { INSIGHTS_TABS, SectionTabs } from "@/components/orbit/section-tabs";
import { PageHeader } from "@/components/page-header";
import { aiEnabled } from "@/lib/ai";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { BUG_CLASSES } from "@/lib/bug-classes";
import { getBugProfile, type ProblemBugs } from "@/lib/bug-data";
import { getDrillStats } from "@/lib/drills";
import { autopsyPending } from "@/lib/autopsy";
import { userTag } from "@/lib/db";
import { requestNow } from "@/lib/time";

export const metadata: Metadata = { title: "Bug profile" };

export default function BugsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense
        fallback={
          <div className="grid grid-cols-12 gap-3.5">
            <SkeletonCard lines={5} className="col-span-12 h-[300px] xl:col-span-5" />
            <SkeletonCard lines={5} className="col-span-12 h-[300px] xl:col-span-7" />
          </div>
        }
      >
        <BugsContent />
      </Suspense>
    </div>
  );
}

async function BugsContent() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to see your bug profile.</p>;
  const [profile, drills] = await Promise.all([
    getBugProfile(user.id, requestNow()),
    getDrillStats(user.id),
  ]);
  if (profile.pending > 0 && aiEnabled()) {
    const userId = user.id;
    after(async () => {
      if (await autopsyPending(userId)) revalidateTag(userTag(userId), { expire: 0 });
    });
  }
  const top = profile.classes[0];
  const max = Math.max(1, ...profile.classes.map((c) => c.count));

  return (
    <div className="flex flex-col gap-5">
      <SectionTabs tabs={INSIGHTS_TABS} />
      <PageHeader
        eyebrow="Bug profile"
        title={
          <>
            The bugs you <em>actually</em> make
          </>
        }
        subtitle="Every Wrong Answer, time limit or runtime error the extension saw, sorted into what went wrong. Your top ones also show in the pre-submit checklist."
      />

      {aiEnabled() && (
        <Link
          href="/dashboard/bugs/drill"
          className="surface-inset group flex flex-wrap items-center gap-3 rounded-[16px] px-4 py-3.5 transition-colors hover:bg-surface-2"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-3 text-ink">
            <Crosshair size={16} aria-hidden="true" />
          </span>
          <span className="min-w-[200px] flex-1">
            <span className="block text-14 font-[650]">Spot your bug</span>
            <span className="block text-13 text-ink-2">
              {drills.total
                ? `You've caught ${drills.caught} of ${drills.total}. The ones you miss come back more often.`
                : "Your own accepted code with one of your usual bugs put in. Find it in 90 seconds."}
            </span>
          </span>
          <ArrowRight
            size={16}
            className="text-ink-3 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      )}

      {profile.total === 0 ? (
        <Card className="p-[22px]">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-3 text-ink-3">
              <Bug size={16} aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-14 font-[600]">No autopsies yet.</p>
              <p className="text-13 text-ink-2">
                {!aiEnabled()
                  ? "Bug autopsy is switching on soon. Your failed submissions are being saved, so they'll be examined then."
                  : profile.pending > 0
                    ? `${profile.pending} failed submission${profile.pending === 1 ? " is" : "s are"} being examined. Refresh in a minute.`
                    : "Solve on LeetCode with the extension on. The next Wrong Answer gets an autopsy: the bug, the line and what to check next time."}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-12 gap-3.5">
          <Card className="col-span-12 p-[22px] xl:col-span-5">
            <CardHeader>
              <CardTitle>What goes wrong</CardTitle>
              <CardSub className="font-mono">{profile.total} autopsies</CardSub>
            </CardHeader>
            {top && (
              <div className="mb-4 rounded-[14px] bg-[color-mix(in_srgb,var(--bad)_9%,transparent)] px-4 py-3">
                <p className="text-13 text-ink-2">
                  <span className="font-[650] text-ink">{BUG_CLASSES[top.bugClass].label}</span> is
                  your most common bug: {top.count} time{top.count === 1 ? "" : "s"}
                  {top.recent ? `, ${top.recent} in the last 30 days` : ""}.
                </p>
                <p className="mt-1 text-13 text-ink">{BUG_CLASSES[top.bugClass].advice}</p>
              </div>
            )}
            <ul className="flex flex-col gap-2.5">
              {profile.classes.map((c) => (
                <li key={c.bugClass} className="flex flex-col gap-1">
                  <span className="flex items-baseline justify-between gap-2 text-13">
                    <span>{BUG_CLASSES[c.bugClass].label}</span>
                    <span className="tnum text-12 text-ink-3">
                      <span className="font-[600] text-ink">{c.count}</span>
                      {c.recent ? ` · ${c.recent} recent` : ""}
                      {drills.byClass[c.bugClass]
                        ? ` · drills ${drills.byClass[c.bugClass]!.caught}/${drills.byClass[c.bugClass]!.caught + drills.byClass[c.bugClass]!.missed}`
                        : ""}
                    </span>
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-surface-3">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${(c.count / max) * 100}%`,
                        background:
                          c.bugClass === top?.bugClass
                            ? "var(--bad)"
                            : "color-mix(in srgb, var(--bad) 45%, transparent)",
                      }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <ProblemTrails problems={profile.problems} />
          <Card className="col-span-12 p-[22px] xl:col-span-7">
            <CardHeader>
              <CardTitle>Latest autopsies</CardTitle>
              <CardSub>change a class if it&apos;s wrong</CardSub>
            </CardHeader>
            <div className="flex flex-col gap-2.5">
              {profile.recent.map((f) => (
                <FindingCard key={f.submissionId} finding={f} showTitle />
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

const VERDICT_COLOR: Record<string, string> = {
  WA: "var(--v-wa)",
  TLE: "var(--v-tle)",
  RE: "var(--v-err)",
  MLE: "var(--v-tle)",
};
const DAY = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });

/** Problem by problem: each failed try in order, its bug, and whether you got there. */
function ProblemTrails({ problems }: { problems: ProblemBugs[] }) {
  if (!problems.length) return null;
  return (
    <Card className="order-last col-span-12 p-[22px]">
      <CardHeader>
        <CardTitle>Problem by problem</CardTitle>
        <CardSub>every failed try, in order</CardSub>
      </CardHeader>
      <ul className="flex flex-col divide-y divide-line">
        {problems.map((p) => {
          const kinds = new Set(p.fails.map((f) => f.bugClass)).size;
          const title = p.problemId ? (
            <Link
              href={`/dashboard/problems/${p.problemId}#bug-autopsy`}
              className="font-[650] underline-offset-2 hover:underline"
            >
              {p.title}
            </Link>
          ) : (
            <span className="font-[650]">{p.title}</span>
          );
          return (
            <li
              key={p.problemId ?? p.title}
              className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 md:flex-row md:items-center md:gap-4"
            >
              <div className="min-w-0 md:w-[260px] md:shrink-0">
                <p className="truncate text-14">{title}</p>
                <p className="text-12 text-ink-3">
                  {p.fails.length} failed {p.fails.length === 1 ? "try" : "tries"}
                  {kinds > 1 ? ` · ${kinds} kinds of bug` : ""} · {DAY.format(p.last)}
                </p>
              </div>
              <ol className="flex flex-wrap items-center gap-y-2" aria-label="Tries in order">
                {p.fails.map((f, i) => (
                  <li key={f.submissionId} className="flex items-center">
                    {i > 0 && <span className="h-px w-3 bg-line-3" aria-hidden="true" />}
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-1 text-[11.5px]"
                      style={{
                        background: `color-mix(in srgb, ${VERDICT_COLOR[f.verdict] ?? "var(--ink-3)"} 13%, transparent)`,
                      }}
                      title={`${f.verdict} · ${DAY.format(f.at)}`}
                    >
                      <span
                        className="rounded-full px-1.5 font-mono text-[10px] font-[700]"
                        style={{
                          color: VERDICT_COLOR[f.verdict] ?? "var(--ink-2)",
                          background: `color-mix(in srgb, ${VERDICT_COLOR[f.verdict] ?? "var(--ink-3)"} 20%, transparent)`,
                        }}
                      >
                        {f.verdict}
                      </span>
                      {BUG_CLASSES[f.bugClass].label}
                    </span>
                  </li>
                ))}
                <li className="flex items-center">
                  <span className="h-px w-3 bg-line-3" aria-hidden="true" />
                  {p.solved ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--ok)_16%,transparent)] px-2.5 py-0.5 text-[11.5px] font-[650] text-ok">
                      <Check size={12} aria-hidden="true" /> Accepted
                    </span>
                  ) : (
                    <span className="rounded-full border border-dashed border-line-3 px-2.5 py-0.5 text-[11.5px] text-ink-3">
                      not yet
                    </span>
                  )}
                </li>
              </ol>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
