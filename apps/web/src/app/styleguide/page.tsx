import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CircleCheck, Flame, Inbox, Plus, Puzzle, RefreshCw, RotateCcw, Timer } from "lucide-react";
import {
  Aurora,
  Button,
  ButtonArrow,
  Card,
  CardHeader,
  CardTitle,
  CornerArrow,
  CounterChip,
  DifficultyTag,
  DotGrid,
  EmptyState,
  ErrorState,
  GlowOrb,
  Grain,
  Kbd,
  LevelChip,
  LinearProgress,
  LogoMark,
  ProgressRing,
  SegmentedProgress,
  SkeletonCard,
  SpotlightTracker,
  StackyCard,
  Starfield,
  StatusBadge,
  StrengthLadder,
  Tag,
  ThemeToggle,
  Tooltip,
  VerdictChip,
  VerifiedChip,
  WeakestChip,
} from "@upsolve/ui";
import { KpiCard } from "@/components/dashboard/widgets";
import { AnimatedBeam, Marquee, Meteors, StreakFlame } from "@/components/fx/decor";
import { Magnetic, TiltCard } from "@/components/fx/pointer";
import { DecodeText, TextReveal } from "@/components/fx/text";
import { PlatformMark } from "@/components/site-icons";
import { Tabs } from "@/components/tabs";
import { ChartsSection } from "./charts-section";
import { ShellSection } from "./shell-section";
import {
  ButtonStatesDemo,
  FieldsDemo,
  ModalDemo,
  SegmentedDemo,
  SwitchDemo,
  TickerDemo,
  ToastDemo,
  TogglesDemo,
} from "./demos";

export const metadata: Metadata = { title: "Styleguide", robots: { index: false } };

// Dev-only review page: every token and component in every state. Sample data only.

// Literal class names so Tailwind generates them.
const SWATCH_GROUPS: [string, [string, string][]][] = [
  [
    "Surfaces",
    [
      ["bg", "bg-bg"],
      ["bg-2", "bg-bg-2"],
      ["surface", "bg-surface"],
      ["surface-2", "bg-surface-2"],
      ["surface-3", "bg-surface-3"],
      ["surface-4", "bg-surface-4"],
      ["inset", "bg-surface-inset"],
    ],
  ],
  [
    "Ink",
    [
      ["ink", "bg-ink"],
      ["ink-2", "bg-ink-2"],
      ["ink-3", "bg-ink-3"],
      ["ink-4", "bg-ink-4"],
    ],
  ],
  [
    "Brand roles",
    [
      ["signal · CTA", "bg-signal"],
      ["primary · data", "bg-primary"],
      ["violet · focus", "bg-violet"],
      ["ember · streak", "bg-ember"],
    ],
  ],
  [
    "Difficulty",
    [
      ["easy", "bg-easy"],
      ["medium", "bg-medium"],
      ["hard", "bg-hard"],
    ],
  ],
  [
    "Status",
    [
      ["solved", "bg-success"],
      ["revise", "bg-revise"],
      ["overdue", "bg-overdue"],
      ["attempted", "bg-attempted"],
      ["info", "bg-info"],
    ],
  ],
  [
    "Verdicts",
    [
      ["AC", "bg-v-ac"],
      ["WA", "bg-v-wa"],
      ["TLE", "bg-v-tle"],
      ["CE", "bg-v-ce"],
      ["MLE / RE", "bg-v-err"],
    ],
  ],
  [
    "Heatmap ramp",
    [
      ["0", "bg-heat-0"],
      ["1", "bg-heat-1"],
      ["2", "bg-heat-2"],
      ["3", "bg-heat-3"],
      ["4", "bg-heat-4"],
    ],
  ],
  [
    "Chart palette",
    [
      ["1", "bg-chart-1"],
      ["2", "bg-chart-2"],
      ["3", "bg-chart-3"],
      ["4", "bg-chart-4"],
      ["5", "bg-chart-5"],
      ["6", "bg-chart-6"],
      ["7", "bg-chart-7"],
      ["8", "bg-chart-8"],
    ],
  ],
];
const STEPS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];
const SCALES: [string, string[]][] = [
  [
    "primary",
    [
      "bg-primary-50",
      "bg-primary-100",
      "bg-primary-200",
      "bg-primary-300",
      "bg-primary-400",
      "bg-primary-500",
      "bg-primary-600",
      "bg-primary-700",
      "bg-primary-800",
      "bg-primary-900",
      "bg-primary-950",
    ],
  ],
  [
    "violet",
    [
      "bg-violet-50",
      "bg-violet-100",
      "bg-violet-200",
      "bg-violet-300",
      "bg-violet-400",
      "bg-violet-500",
      "bg-violet-600",
      "bg-violet-700",
      "bg-violet-800",
      "bg-violet-900",
      "bg-violet-950",
    ],
  ],
  [
    "signal",
    [
      "bg-signal-50",
      "bg-signal-100",
      "bg-signal-200",
      "bg-signal-300",
      "bg-signal-400",
      "bg-signal-500",
      "bg-signal-600",
      "bg-signal-700",
      "bg-signal-800",
      "bg-signal-900",
      "bg-signal-950",
    ],
  ],
];
const TYPE_SCALE: [string, string][] = [
  ["88", "text-88"],
  ["64", "text-64"],
  ["48", "text-48"],
  ["36", "text-36"],
  ["30", "text-30"],
  ["24", "text-24"],
  ["20", "text-20"],
  ["18", "text-18"],
  ["16", "text-16"],
  ["14", "text-14"],
  ["13", "text-13"],
  ["12", "text-12"],
  ["11", "text-11"],
];
const ELEVATION: [string, string][] = [
  ["e0", "shadow-e0"],
  ["e1 card", "shadow-e1"],
  ["e2 hover", "shadow-e2"],
  ["e3 popover", "shadow-e3"],
  ["e4 modal", "shadow-e4"],
];

export default function Styleguide() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="min-h-dvh bg-bg-2">
      <SpotlightTracker />
      <header className="glass sticky top-0 z-40 flex items-center justify-between border-b border-line px-6 py-3">
        <span className="font-mono text-[12px] tracking-[.08em] text-ink-3 uppercase">
          DsaKaro · styleguide (dev only)
        </span>
        <ThemeToggle />
      </header>
      <main id="main" className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 py-10 sm:px-6">
        <Section title="Colour roles">
          <div className="grid gap-6 md:grid-cols-2">
            {SWATCH_GROUPS.map(([group, items]) => (
              <div key={group}>
                <p className="mb-2 label-mono">{group}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map(([name, cls]) => (
                    <div key={name} className="w-[76px] text-12">
                      <div className={`h-11 rounded-[10px] border border-line ${cls}`} />
                      <span className="mt-1 block truncate font-mono text-ink-3">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-2">
            {SCALES.map(([name, classes]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="w-14 label-mono">{name}</span>
                <div className="flex flex-1 overflow-hidden rounded-[10px] border border-line">
                  {classes.map((cls, i) => (
                    <div key={cls} className={`h-9 flex-1 ${cls}`} title={`${name}-${STEPS[i]}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Surfaces and elevation">
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {ELEVATION.map(([name, cls]) => (
              <div
                key={name}
                className={`grid h-24 place-items-center rounded-[20px] border border-line bg-surface font-mono text-12 text-ink-2 ${cls}`}
              >
                {name}
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="surface-hero relative overflow-hidden rounded-[20px] p-5">
              <Grain />
              <p className="relative label-mono text-white/70">Hero tier</p>
              <p className="relative mt-3 num text-48">412</p>
            </div>
            <div className="surface-card rounded-[20px] p-5">
              <p className="label-mono">Standard tier</p>
              <p className="mt-3 num text-48">47</p>
            </div>
            <div className="surface-inset rounded-[20px] p-5">
              <p className="label-mono">Inset tier</p>
              <p className="mt-3 num text-48">5</p>
            </div>
          </div>
        </Section>

        <Section title="Textures">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TextureTile label="Grain">
              <Grain />
            </TextureTile>
            <TextureTile label="Dot grid">
              <DotGrid />
            </TextureTile>
            <TextureTile label="Aurora" dark>
              <Aurora />
            </TextureTile>
            <TextureTile label="Starfield + glow orb" dark>
              <Starfield />
              <GlowOrb size={160} className="-right-10 -bottom-16" />
            </TextureTile>
          </div>
        </Section>

        <Section title="Type">
          <div className="flex flex-col gap-1">
            {TYPE_SCALE.map(([size, cls]) => (
              <div key={size} className="flex items-baseline gap-4">
                <span className="w-8 shrink-0 label-mono">{size}</span>
                <span className={`${cls} truncate font-[550]`}>
                  Revision, <em className="font-display font-normal">five today.</em>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-end gap-8">
            <p className="num text-64">
              1,034
              <span className="ml-1 font-display text-30 font-normal text-ink-3 italic">
                solved
              </span>
            </p>
            <p className="label-mono">Label · mono 11 · +0.06em</p>
            <p className="tnum text-14 text-ink-2">tabular 0 1 2 3 4 5 6 7 8 9 · slashed 0</p>
          </div>
        </Section>

        <Section title="Buttons">
          <Row>
            {(
              [
                "signal",
                "primary",
                "indigo",
                "secondary",
                "outline",
                "ghost",
                "danger",
                "success",
                "link",
              ] as const
            ).map((v) => (
              <Button key={v} variant={v}>
                {v} <ButtonArrow />
              </Button>
            ))}
          </Row>
          <Row>
            <Button size="sm">Small</Button>
            <Button>Medium</Button>
            <Button size="lg" variant="signal">
              Large
            </Button>
            <Button size="icon" variant="secondary" aria-label="Sync">
              <RefreshCw size={16} data-nudge="spin" />
            </Button>
            <Button size="icon" variant="secondary" aria-label="Add">
              <Plus size={16} data-nudge="plus" />
            </Button>
            <Button disabled>Disabled</Button>
            <Button loading>Saving</Button>
            <ButtonStatesDemo />
          </Row>
          <Row>
            <Magnetic>
              <Button size="lg" variant="signal">
                <span data-magnetic-label className="inline-flex items-center gap-2">
                  Magnetic hero CTA <ButtonArrow />
                </span>
              </Button>
            </Magnetic>
          </Row>
        </Section>

        <Section title="Badges and chips">
          <Row>
            <DifficultyTag difficulty="easy" />
            <DifficultyTag difficulty="medium" />
            <DifficultyTag difficulty="hard" />
          </Row>
          <Row>
            <StatusBadge status="solved" />
            <StatusBadge status="revise" />
            <StatusBadge status="overdue" label="Overdue 9d" pulse />
            <StatusBadge status="attempted" />
            <StatusBadge status="todo" />
          </Row>
          <Row>
            {(["AC", "WA", "TLE", "CE", "MLE", "RE"] as const).map((v) => (
              <VerdictChip key={v} verdict={v} />
            ))}
            <span className="text-ink-4">·</span>
            <LevelChip level="Basic" />
            <LevelChip level="Core" />
            <LevelChip level="Pro" />
            <CounterChip n={6} />
            <VerifiedChip />
            <WeakestChip />
            <Tag className="cursor-pointer hover:border-line-3 hover:text-ink">Sliding window</Tag>
            <Kbd>Ctrl K</Kbd>
            <Tooltip content="Stage 2 of 6 · next review in 3 days">
              <Button variant="outline" size="sm">
                Hover me
              </Button>
            </Tooltip>
          </Row>
          <Row>
            <StrengthLadder stage={2} dueLabel="next review in 3 days" />
            <StrengthLadder stage={4} overdue dueLabel="overdue 2 days" />
            <StrengthLadder stage={6} />
            <StrengthLadder stage={3} compact />
          </Row>
        </Section>

        <Section title="Progress">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-6">
              <LinearProgress value={212} max={495} label="212 / 495" aria-label="A2Z progress" />
              <LinearProgress
                value={46}
                max={120}
                goal={0.5}
                color="var(--signal)"
                aria-label="Focus minutes"
              />
              <LinearProgress value={0} max={9} aria-label="Empty section" />
              <SegmentedProgress
                segments={[
                  { label: "Easy", value: 120, color: "var(--easy)" },
                  { label: "Medium", value: 210, color: "var(--medium)" },
                  { label: "Hard", value: 64, color: "var(--hard)" },
                ]}
              />
              <SegmentedProgress
                total={60}
                segments={[
                  { label: "AC", value: 31, color: "var(--v-ac)" },
                  { label: "WA", value: 14, color: "var(--v-wa)" },
                  { label: "TLE", value: 6, color: "var(--v-tle)" },
                ]}
              />
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <ProgressRing
                total={495}
                segments={[
                  { label: "Easy", value: 60, color: "var(--easy)" },
                  { label: "Medium", value: 110, color: "var(--medium)" },
                  { label: "Hard", value: 42, color: "var(--hard)" },
                ]}
              >
                <span className="num text-30">43%</span>
                <span className="text-11 text-ink-3">212 / 495</span>
              </ProgressRing>
              <ProgressRing
                sweep={270}
                total={120}
                size={120}
                segments={[{ label: "Minutes", value: 46, color: "var(--signal)" }]}
              >
                <span className="num text-24">46</span>
                <span className="text-11 text-ink-3">of 120 min</span>
              </ProgressRing>
              <ProgressRing total={5} size={96} stroke={8} segments={[]}>
                <span className="num text-20">0/5</span>
              </ProgressRing>
            </div>
          </div>
        </Section>

        <Section title="Controls">
          <div className="flex flex-col gap-6">
            <SegmentedDemo />
            <Tabs
              items={[
                {
                  id: "a",
                  label: "Attempts",
                  count: 5,
                  content: <p className="text-ink-2">Attempts panel</p>,
                },
                { id: "b", label: "Notes", content: <p className="text-ink-2">Notes panel</p> },
              ]}
            />
            <SwitchDemo />
            <TogglesDemo />
            <FieldsDemo />
            <Row>
              <ToastDemo />
              <ModalDemo />
            </Row>
          </div>
        </Section>

        <Section title="Cards">
          <div className="grid gap-3.5 md:grid-cols-3">
            <Card tier="hero" beam>
              <CardHeader>
                <CardTitle icon={<CircleCheck size={14} />} className="text-white">
                  Hero · beam · grain
                </CardTitle>
              </CardHeader>
              <p className="num text-48">412</p>
              <p className="mt-2 text-13 text-white/70">One per page.</p>
            </Card>
            <Card interactive spotlight glow="var(--easy)">
              <CardHeader>
                <CardTitle icon={<Inbox size={14} />} tint="var(--easy)">
                  Standard · spotlight
                </CardTitle>
                <CornerArrow />
              </CardHeader>
              <p className="text-13 text-ink-2">
                Lifts 4px, the light follows the cursor and lights the nearest border.
              </p>
            </Card>
            <Card tier="inset">
              <CardTitle>Inset</CardTitle>
              <p className="mt-2 text-13 text-ink-2">Recessed, for nested content.</p>
            </Card>
          </div>
          <div className="mt-3.5 grid gap-3.5 md:grid-cols-3">
            <TiltCard className="rounded-lg">
              <Card className="h-full">
                <CardTitle tint="var(--violet)" icon={<Flame size={14} />}>
                  Tilt card
                </CardTitle>
                <p data-tilt-layer className="mt-3 num text-36">
                  3D
                </p>
              </Card>
            </TiltCard>
            <Card className="flex items-center gap-4">
              <StreakFlame streak={0} />
              <StreakFlame streak={4} />
              <StreakFlame streak={12} />
              <StreakFlame streak={47} />
            </Card>
            <Card>
              <TickerDemo />
            </Card>
          </div>
          <div className="mt-3.5 grid grid-cols-12 gap-3.5">
            <KpiCard
              feature
              className="col-span-12 sm:col-span-6 xl:col-span-3"
              title="Solved"
              icon={<CircleCheck size={14} />}
              value={412}
              unit="problems"
              href="/dashboard"
              spark={[1, 0, 3, 2, 5, 0, 1, 4, 2, 6, 3, 0, 2, 5]}
              foot="↑ 12 new this week (sample)"
            />
            <KpiCard
              className="col-span-12 sm:col-span-6 xl:col-span-3"
              title="Streak"
              icon={<Flame size={14} className="text-ember" />}
              value={47}
              unit="days"
              href="/dashboard"
              foot="sample"
            />
            <KpiCard
              className="col-span-12 sm:col-span-6 xl:col-span-3"
              title="To revise"
              icon={<RotateCcw size={14} />}
              value={5}
              unit="today"
              href="/dashboard"
              foot="sample"
            />
            <KpiCard
              className="col-span-12 sm:col-span-6 xl:col-span-3"
              title="Focus"
              icon={<Timer size={14} />}
              value={14.2}
              decimals={1}
              unit="h this week"
              href="/dashboard"
              foot="sample"
            />
          </div>
        </Section>

        <Section title="Effects">
          <div className="grid gap-3.5 md:grid-cols-2">
            <Card className="overflow-hidden p-6">
              <TextReveal
                as="p"
                text="Every problem you solve,"
                accent="remembered."
                className="text-36 font-[550] tracking-[-0.03em]"
              />
              <p className="mt-4 text-24">
                <DecodeText text="Verdict: Accepted" className="font-mono" />
              </p>
            </Card>
            <Card className="p-4">
              <AnimatedBeam
                height={180}
                nodes={[
                  {
                    id: "lc",
                    label: "LeetCode",
                    icon: <PlatformMark site="leetcode" size={20} brand />,
                    x: 10,
                    y: 30,
                  },
                  {
                    id: "gfg",
                    label: "GFG",
                    icon: <PlatformMark site="gfg" size={20} brand />,
                    x: 10,
                    y: 75,
                  },
                  { id: "ext", label: "Extension", icon: <Puzzle size={18} />, x: 45, y: 52 },
                  { id: "up", label: "DsaKaro", icon: <LogoMark size={20} />, x: 85, y: 52 },
                ]}
                edges={[
                  ["lc", "ext"],
                  ["gfg", "ext"],
                  ["ext", "up"],
                ]}
              />
            </Card>
            <div className="relative h-48 overflow-hidden rounded-lg border border-line bg-[#08080b]">
              <Starfield />
              <Meteors count={5} />
              <span className="absolute bottom-3 left-3 label-mono text-white/70">
                Starfield + meteors
              </span>
            </div>
            <Card className="flex items-center">
              <Marquee speed={24}>
                {["Striver A2Z", "Striver SDE", "NeetCode 150", "Blind 75", "Grind 75"].map((s) => (
                  <span key={s} className="font-display text-30 whitespace-nowrap text-ink-2">
                    {s}
                  </span>
                ))}
              </Marquee>
            </Card>
          </div>
        </Section>

        <ShellSection Section={Section} />

        <ChartsSection Section={Section} />

        <Section title="Feedback states">
          <div className="grid gap-3.5 md:grid-cols-3">
            <SkeletonCard lines={3} />
            <Card>
              <EmptyState
                icon={<Inbox size={18} />}
                title={
                  <>
                    No problems <em>yet.</em>
                  </>
                }
                action={
                  <Button variant="signal" size="sm">
                    Start with Two Sum <ButtonArrow />
                  </Button>
                }
              >
                Connect a platform or follow a sheet to get going.
              </EmptyState>
            </Card>
            <Card>
              <ErrorState
                action={
                  <Button variant="secondary" size="sm">
                    <RefreshCw size={14} data-nudge="spin" /> Try again
                  </Button>
                }
              >
                Something broke loading this card.
              </ErrorState>
            </Card>
          </div>
        </Section>

        <Section title="Mascot">
          <p className="max-w-[70ch] text-14 text-ink-2">
            Stacky: a stack of clay plates with the logo&apos;s ring nodes for eyes and the lime top
            pointer on its head. Pass <code className="font-mono text-12">mascot</code> to
            EmptyState or ErrorState, or render <code className="font-mono text-12">Stacky</code>{" "}
            directly.
          </p>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-7">
            <StackyCard mood="idle">idle · nothing yet</StackyCard>
            <StackyCard mood="accepted">accepted · all caught up</StackyCard>
            <StackyCard mood="due">due · revision waiting</StackyCard>
            <StackyCard mood="streak">streak</StackyCard>
            <StackyCard mood="thinking">thinking · no match, errors</StackyCard>
            <StackyCard mood="sleepy">sleepy · nothing due today</StackyCard>
            <StackyCard mood="celebrate">celebrate · sheet complete</StackyCard>
          </div>
        </Section>
      </main>
    </div>
  );
}

function TextureTile({
  label,
  dark,
  children,
}: {
  label: string;
  dark?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`relative h-36 overflow-hidden rounded-[20px] border border-line ${dark ? "bg-[#08080b]" : "bg-surface"}`}
    >
      {children}
      <span className={`absolute bottom-3 left-3 label-mono ${dark ? "text-white/70" : ""}`}>
        {label}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 label-mono">{title}</h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="mb-3 flex flex-wrap items-center gap-2.5">{children}</div>;
}
