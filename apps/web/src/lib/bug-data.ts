import "server-only";
import { sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { isBugClass, type BugClass } from "@/lib/bug-classes";
import { db, userTag } from "@/lib/db";

// Reads for WA autopsy and the bug profile (FINAL-FEATURES A2).

export type Finding = {
  submissionId: string;
  problemId: string | null;
  title: string;
  verdict: string;
  language: string | null;
  bugClass: BugClass;
  /** True when the user changed the class themselves. */
  corrected: boolean;
  explanation: string;
  line: number | null;
  code: string | null;
  failingInput: string | null;
  expected: string | null;
  actual: string | null;
  at: number;
};

type Row = Omit<Finding, "bugClass" | "corrected" | "at"> & {
  bugClass: string;
  userClass: string | null;
  at: number;
};

const toFinding = (r: Row): Finding | null => {
  const cls = r.userClass ?? r.bugClass;
  if (!isBugClass(cls)) return null;
  return { ...r, bugClass: cls, corrected: r.userClass !== null, at: Number(r.at) };
};

const SELECT = sql`
  select bf.submission_id as "submissionId", pp.problem_id as "problemId",
         coalesce(p.title, pp.title) as title, s.verdict, s.language,
         bf.bug_class as "bugClass", bf.user_class as "userClass", bf.explanation, bf.line,
         sc.code, sc.failing_input as "failingInput", sc.expected, sc.actual,
         (extract(epoch from s.submitted_at) * 1000)::float8 as at
  from bug_findings bf
  join submissions s on s.id = bf.submission_id
  join platform_problems pp on pp.id = s.platform_problem_id
  left join problems p on p.id = pp.problem_id
  left join submission_code sc on sc.submission_id = bf.submission_id`;

/** Autopsies of one problem's failed submissions, newest first. */
export async function getProblemFindings(userId: string, problemId: string): Promise<Finding[]> {
  "use cache";
  cacheTag(userTag(userId));
  cacheLife("minutes");
  const rows = (await db().execute(sql`
    ${SELECT}
    where bf.user_id = ${userId} and pp.problem_id = ${problemId}
    order by s.submitted_at desc limit 20`)) as unknown as Row[];
  return rows.map(toFinding).filter((f): f is Finding => f !== null);
}

export type ProblemBugs = {
  problemId: string | null;
  title: string;
  fails: { submissionId: string; verdict: string; bugClass: BugClass; at: number }[];
  /** You have an accepted submission for it. */
  solved: boolean;
  last: number;
};

export type BugProfile = {
  total: number;
  /** Per class, most frequent first: all time and in the last 30 days. */
  classes: { bugClass: BugClass; count: number; recent: number }[];
  recent: Finding[];
  /** Problem by problem: every autopsied failure, oldest first, and whether you got it later. */
  problems: ProblemBugs[];
  /** Failed submissions with code that haven't been examined yet (AI off or pending). */
  pending: number;
};

export async function getBugProfile(userId: string, now: number): Promise<BugProfile> {
  "use cache";
  cacheTag(userTag(userId));
  cacheLife("minutes");
  const [rows, pending, solvedRows] = await Promise.all([
    db().execute(sql`
      ${SELECT}
      where bf.user_id = ${userId}
      order by s.submitted_at desc limit 500`),
    db().execute(sql`
      select count(*)::int as n from submission_code sc
      join submissions s on s.id = sc.submission_id
      where sc.user_id = ${userId} and s.verdict in ('WA', 'TLE', 'RE', 'MLE')
        and not exists (select 1 from bug_findings bf where bf.submission_id = sc.submission_id)`),
    db().execute(sql`
      select distinct pp.problem_id as id from submissions s
      join platform_problems pp on pp.id = s.platform_problem_id
      where s.user_id = ${userId} and s.verdict = 'AC' and pp.problem_id is not null
        and pp.problem_id in (
          select pp2.problem_id from bug_findings bf
          join submissions s2 on s2.id = bf.submission_id
          join platform_problems pp2 on pp2.id = s2.platform_problem_id
          where bf.user_id = ${userId})`),
  ]);
  const solved = new Set((solvedRows as unknown as { id: string }[]).map((r) => r.id));
  const findings = (rows as unknown as Row[])
    .map(toFinding)
    .filter((f): f is Finding => f !== null);
  const since = now - 30 * 86_400_000;
  const by = new Map<BugClass, { count: number; recent: number }>();
  for (const f of findings) {
    const c = by.get(f.bugClass) ?? { count: 0, recent: 0 };
    c.count++;
    if (f.at >= since) c.recent++;
    by.set(f.bugClass, c);
  }
  const byProblem = new Map<string, ProblemBugs>();
  for (const f of findings) {
    const key = f.problemId ?? `t:${f.title}`;
    const p = byProblem.get(key) ?? {
      problemId: f.problemId,
      title: f.title,
      fails: [],
      solved: f.problemId ? solved.has(f.problemId) : false,
      last: f.at,
    };
    p.fails.unshift({
      submissionId: f.submissionId,
      verdict: f.verdict,
      bugClass: f.bugClass,
      at: f.at,
    });
    p.last = Math.max(p.last, f.at);
    byProblem.set(key, p);
  }
  return {
    total: findings.length,
    problems: [...byProblem.values()].sort((a, b) => b.last - a.last).slice(0, 30),
    classes: [...by]
      .map(([bugClass, c]) => ({ bugClass, ...c }))
      .sort((a, b) => b.count - a.count || b.recent - a.recent),
    recent: findings.slice(0, 12),
    pending: (pending as unknown as { n: number }[])[0]?.n ?? 0,
  };
}

/** The user's most frequent bug classes, for the extension's pre-submit checklist. */
export async function topBugClasses(
  userId: string,
  limit = 3,
): Promise<{ bugClass: BugClass; n: number }[]> {
  "use cache";
  cacheTag(userTag(userId));
  cacheLife("minutes");
  const rows = (await db().execute(sql`
    select coalesce(user_class, bug_class) as c, count(*)::int as n
    from bug_findings where user_id = ${userId}
    group by 1 order by n desc limit ${limit}`)) as unknown as { c: string; n: number }[];
  return rows.flatMap((r) => (isBugClass(r.c) ? [{ bugClass: r.c, n: r.n }] : []));
}

/** How many submissions' code we hold for the user (Settings). */
export async function savedCodeCount(userId: string): Promise<number> {
  const [r] = (await db().execute(sql`
    select count(*)::int as n from submission_code where user_id = ${userId}`)) as unknown as {
    n: number;
  }[];
  return r?.n ?? 0;
}
