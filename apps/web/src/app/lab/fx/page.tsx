import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@upsolve/ui";
import { BadgeShelf } from "@/components/badges";
import { DailyChart, WeekCompare } from "@/components/charts/daily-linked";
import { SessionReceipt } from "@/components/daily/session-receipt";
import { HallOrbit } from "@/components/hall-orbit";
import { HoloCard } from "@/components/holo-card";
import { PracticeCalendar, type CalDay } from "@/components/practice-calendar";
import { deriveBadges } from "@/lib/badges";
import { ProofItStuck } from "@/components/proof-it-stuck";
import { SpotYourBug } from "@/components/spot-your-bug";
import { FindingCard } from "@/components/bug-autopsy";
import { CodeView, LineDiff } from "@/components/code-view";
import { SplitFlapCountdown } from "@/components/fx/split-flap";
import { CurveHover } from "@/components/memory-curve";
import { NoteMarkup } from "@/components/note-markup";
import { RestDayCard } from "@/components/daily/rest-day-card";
import { RatingChart } from "@/components/rating-chart";
import { SheetConstellation } from "@/components/sheet-progress";
import { BookCover } from "@/components/sheet-identity";

export const metadata: Metadata = { title: "Effects lab", robots: { index: false } };

const DAY = 86_400_000;
const LAB_CAL: Record<string, CalDay> = Object.fromEntries(
  Array.from({ length: 30 }, (_, i) => {
    const d = `2026-11-${String(i + 1).padStart(2, "0")}`;
    const past = i + 1 < 13;
    return [
      d,
      {
        solved: past && i % 3 ? ["Koko Eating Bananas", "Merge Intervals"] : [],
        solvedCount: past && i % 3 ? (i % 4) + 1 : 0,
        revised: past ? i % 3 : 0,
        due: !past && i % 2 ? ["Two Sum", "LRU Cache"] : [],
        dueCount: !past && i % 2 ? (i % 5) + 1 : 0,
        contests: i % 7 === 0 ? [{ name: "Weekly Contest 476", time: "8:00 am" }] : [],
      } satisfies CalDay,
    ];
  }),
);
const LAB_DAYS = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.UTC(2026, 9, 13 + i)).toISOString().slice(0, 10),
  ac: (i * 7) % 5,
  wa: (i * 3) % 3,
  other: i % 4 === 0 ? 1 : 0,
}));

/**
 * Dev-only bench for the FRONTEND-PLAN effects that live on signed-in pages, with fake data,
 * so they can be screenshot without an account. Production builds 404 unless DSAKARO_LAB=1
 * is set at build time.
 */
export default function FxLab() {
  if (process.env.NODE_ENV === "production" && process.env.DSAKARO_LAB !== "1") notFound();
  // Fixed, so the page can prerender; the countdown below targets a date ahead of it.
  const now = Date.UTC(2026, 10, 11, 12);
  const steps = [
    { name: "Step 1: Basics", done: 31, total: 31 },
    { name: "Step 2: Sorting", done: 7, total: 7 },
    { name: "Step 3: Arrays", done: 24, total: 40 },
    { name: "Step 4: Binary search", done: 9, total: 32 },
    { name: "Step 5: Strings", done: 3, total: 15 },
    { name: "Step 6: Linked list", done: 0, total: 31 },
    { name: "Step 7: Recursion", done: 0, total: 25 },
    { name: "Step 8: Bit manipulation", done: 0, total: 18 },
  ];
  const points = Array.from({ length: 14 }, (_, i) => ({
    at: now - (14 - i) * 9 * DAY,
    rating: Math.round(1180 + i * 38 + Math.sin(i * 1.7) * 70),
    name: `Codeforces Round ${880 + i * 3} (Div. 2)`,
  }));
  return (
    <main id="main" className="mx-auto flex w-[min(1100px,100%-32px)] flex-col gap-6 py-10">
      <h1 className="font-display text-[40px]">Effects lab</h1>
      <Card>
        <CardHeader>
          <CardTitle>Practice calendar</CardTitle>
        </CardHeader>
        <PracticeCalendar days={LAB_CAL} today="2026-11-13" minMonth="2026-06" maxMonth="2026-12" />
      </Card>
      <Card className="flex items-center gap-6">
        <HallOrbit
          label="Hostel B"
          size={160}
          members={["a", "b", "c", "d", "e", "f", "g"].map((id, i) => ({
            userId: id,
            name: id,
            avatar: null,
            dayStart: 0,
            doneMs: 0,
            live: i < 3 ? { startedAt: 0, pausedAt: null, pausedMs: 0 } : null,
          }))}
        />
        <p className="text-14 text-ink-2">Study hall orbit: 3 studying inside, 4 idle outside.</p>
      </Card>
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Submissions per day (scrub)</CardTitle>
          </CardHeader>
          <DailyChart days={LAB_DAYS} />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>This week vs last</CardTitle>
          </CardHeader>
          <WeekCompare days={LAB_DAYS} />
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Split-flap countdown</CardTitle>
        </CardHeader>
        <SplitFlapCountdown to={Date.UTC(2027, 0, 1, 5, 17, 9)} />
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sheet map</CardTitle>
          </CardHeader>
          <SheetConstellation steps={steps} />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rating scrubber</CardTitle>
          </CardHeader>
          <RatingChart points={points} stroke="#9db5e8" />
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <div className="group/book">
          <BookCover
            slug="striver-a2z"
            name="Striver A2Z DSA"
            author="Striver"
            done={142}
            total={455}
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Memory curve (hover the row)</CardTitle>
          </CardHeader>
          <ul>
            <CurveHover
              as="li"
              curve={{ lastAt: now - 6 * DAY, dueAt: now + DAY, now }}
              className="surface-inset rounded-[16px] p-4 text-14"
            >
              Koko Eating Bananas · ring 3 · due tomorrow
            </CurveHover>
          </ul>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-[300px_minmax(0,1fr)]">
        <HoloCard
          name="Shourya Chouhan"
          handle="shourya"
          streak={46}
          solved={{ total: 412, easy: 160, medium: 208, hard: 44 }}
          topics={["Arrays", "Binary search", "Graphs"]}
          levels={Array.from({ length: 364 }, (_, i) => ((i * 7) % 11 > 4 ? (i * 3) % 5 : 0))}
        />
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
          </CardHeader>
          <BadgeShelf
            className="lg:grid-cols-4"
            badges={deriveBadges({
              days: Array.from({ length: 364 }, (_, i) => (i > 300 ? 1 : i % 3)),
              solved: 162,
              solvedDates: Array.from(
                { length: 162 },
                (_, i) => Date.UTC(2026, 3, 1) + i * 86_400_000,
              ),
              now: Date.UTC(2026, 10, 13),
              platformsSolved: ["leetcode", "codeforces"],
              retired: 12,
              sheetsFinished: 0,
              topicsMastered: ["Arrays"],
              contests: 6,
              nightSolves: 14,
              earlySolves: 2,
              bestRecallRun: 5,
            })}
          />
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Note markup</CardTitle>
        </CardHeader>
        <NoteMarkup text={LAB_NOTE} />
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Proof it stuck</CardTitle>
        </CardHeader>
        <ProofItStuck
          proof={{
            first: { at: Date.UTC(2026, 10, 2), activeMs: 42 * 60_000, independence: "hint" },
            latest: { at: Date.UTC(2026, 10, 9), activeMs: 11 * 60_000, independence: "solo" },
            days: 7,
            verdict: "stuck",
          }}
        />
      </Card>
      <Card className="w-full max-w-[760px] p-[22px]" id="spot-your-bug">
        <CardHeader>
          <CardTitle>Spot your bug</CardTitle>
        </CardHeader>
        <SpotYourBug
          initial={{
            id: "00000000-0000-4000-8000-000000000000",
            title: "Koko Eating Bananas",
            language: "python3",
            failingInput: "piles = [3, 6, 7, 11], h = 8",
            code: "class Solution:\n    def minEatingSpeed(self, piles: List[int], h: int) -> int:\n        lo, hi = 1, max(piles)\n        while lo < hi:\n            mid = (lo + hi) // 2\n            hours = sum((p + mid - 1) // mid for p in piles)\n            if hours >= h:\n                hi = mid\n            else:\n                lo = mid + 1\n        return lo",
          }}
        />
      </Card>
      <Card className="w-full max-w-[760px] p-[22px]">
        <CardHeader>
          <CardTitle>Bug autopsy</CardTitle>
        </CardHeader>
        <FindingCard
          showTitle
          finding={{
            submissionId: "00000000-0000-4000-8000-000000000001",
            problemId: null,
            title: "Maximum Product Subarray",
            verdict: "WA",
            language: "cpp",
            bugClass: "overflow",
            corrected: false,
            explanation:
              "prod is an int, so multiplying three values of 100000 wraps around before it reaches the long long you return.",
            line: 4,
            code: "class Solution {\npublic:\n    long long maxProduct(vector<int>& nums) {\n        int prod = 1; // running product\n        long long best = LLONG_MIN;\n        for (int x : nums) {\n            prod *= x;\n            best = max(best, (long long) prod);\n        }\n        return best;\n    }\n};",
            failingInput: "nums = [100000, 100000, 100000]",
            expected: "1000000000000000",
            actual: "-1530494976",
            at: Date.UTC(2026, 10, 12),
          }}
        />
      </Card>
      <Card className="w-full max-w-[760px] p-[22px]">
        <CardHeader>
          <CardTitle>Drill reveal</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-3">
          <CodeView
            code={
              "class Solution:\n    def minEatingSpeed(self, piles: List[int], h: int) -> int:\n        lo, hi = 1, max(piles)\n        while lo < hi:\n            mid = (lo + hi) // 2\n            hours = sum((p + mid - 1) // mid for p in piles)\n            if hours >= h:\n                hi = mid\n            else:\n                lo = mid + 1\n        return lo"
            }
            lang="python3"
            focus
            struck={8}
            bug={{ line: 7, label: "Wrong comparison", chars: { start: 21, end: 23 } }}
          />
          <LineDiff broken="if hours >= h:" fixed="if hours <= h:" lang="python3" />
        </div>
      </Card>
      <RestDayCard streak={46} tomorrow="2026-11-14" />
      <Card>
        <CardHeader>
          <CardTitle>Session receipt</CardTitle>
        </CardHeader>
        <SessionReceipt
          label="Striver A2Z · Binary search"
          at={now}
          wall={84 * 60_000}
          focusMs={71 * 60_000}
          awayMs={9 * 60_000}
          switches={14}
          goal={3}
          contents={{
            problems: [
              {
                title: "Koko Eating Bananas",
                url: "a",
                platform: "leetcode",
                difficulty: "medium",
                outcome: "solved",
                activeMs: 18 * 60_000,
                independence: "solo",
                at: now,
              },
              {
                title: "Search in Rotated Sorted Array",
                url: "b",
                platform: "leetcode",
                difficulty: "medium",
                outcome: "solved",
                activeMs: 22 * 60_000,
                independence: "hint",
                at: now,
              },
              {
                title: "Median of Two Sorted Arrays",
                url: "c",
                platform: "leetcode",
                difficulty: "hard",
                outcome: "open",
                activeMs: 25 * 60_000,
                independence: null,
                at: now,
              },
            ],
            videos: [{ title: "BS-1", url: "v", sheet: null, watchedMs: 600_000, at: now }],
            ticks: [],
          }}
        />
      </Card>
    </main>
  );
}

const LAB_NOTE =
  "Approach: binary search on the answer `k`, see https://leetcode.com/problems/koko-eating-bananas/\n\n```cpp\n// smallest k that finishes in h hours\nint minEatingSpeed(vector<int>& piles, int h) {\n  int lo = 1, hi = *max_element(piles.begin(), piles.end());\n  while (lo < hi) {\n    int k = lo + (hi - lo) / 2;\n    long t = 0;\n    for (int p : piles) t += (p + k - 1) / k;\n    if (t <= h) hi = k; else lo = k + 1;\n  }\n  return lo;\n}\n```\n\n```python\ndef ok(k): return sum((p + k - 1) // k for p in piles) <= h  # ceil\n```\nMistake to remember: `long` for t, it overflows.";
