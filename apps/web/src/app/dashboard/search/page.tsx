import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Check } from "lucide-react";
import {
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  DifficultyTag,
  EmptyState,
  SkeletonCard,
  Tag,
} from "@upsolve/ui";
import { PAGE_GLOW, PageHeader } from "@/components/page-header";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { search } from "@/lib/search-data";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage({ searchParams }: PageProps<"/dashboard/search">) {
  return (
    <div className="flex flex-col gap-5">
      <Suspense fallback={<SkeletonCard lines={8} className="h-[420px]" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({
  searchParams,
}: {
  searchParams: PageProps<"/dashboard/search">["searchParams"];
}) {
  const raw = (await searchParams).q;
  const q = (typeof raw === "string" ? raw : "").trim().slice(0, 100);
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to search.</p>;

  const title = (
    <PageHeader
      eyebrow="Search"
      glow={PAGE_GLOW.overview}
      title={
        q ? (
          <>
            Results for <em>“{q}”</em>
          </>
        ) : (
          <>
            Search, <em>anything.</em>
          </>
        )
      }
      subtitle={q ? undefined : "Press Ctrl K anywhere, or type in the box above."}
    />
  );
  if (q.length < 2) return title;

  const r = await search(user.id, q);
  const empty = r.problems.length + r.sheets.length + r.topics.length === 0;

  return (
    <>
      {title}
      {empty ? (
        <Card>
          <EmptyState
            mascot="thinking"
            title={
              <>
                Nothing <em>matches.</em>
              </>
            }
          >
            Try part of a problem title, like &ldquo;subarray&rdquo; or &ldquo;linked list&rdquo;.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid grid-cols-12 gap-3.5">
          <Card className="col-span-12 xl:col-span-8">
            <CardHeader>
              <CardTitle>Problems</CardTitle>
              <CardSub>{r.problems.length === 30 ? "first 30" : r.problems.length}</CardSub>
            </CardHeader>
            {r.problems.length === 0 ? (
              <p className="text-[13px] text-ink-2">No problems match.</p>
            ) : (
              <ul>
                {r.problems.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 border-t border-dashed border-line-2 py-2.5 first:border-t-0 first:pt-0"
                  >
                    <span
                      aria-label={p.solved ? "Solved" : undefined}
                      className={
                        p.solved
                          ? "grid size-[18px] shrink-0 place-items-center rounded-[5px] bg-success text-[#06210f]"
                          : "size-[18px] shrink-0 rounded-[5px] border-[1.5px] border-line-3 bg-surface-2"
                      }
                    >
                      {p.solved && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                    </span>
                    <Link
                      href={`/dashboard/problems/${p.id}`}
                      className="min-w-0 flex-1 truncate text-[13.5px] font-medium hover:underline"
                    >
                      {p.title}
                    </Link>
                    {p.sheets > 0 && (
                      <span className="hidden font-mono text-[11px] text-ink-3 sm:inline">
                        in {p.sheets} sheet{p.sheets === 1 ? "" : "s"}
                      </span>
                    )}
                    {p.difficulty ? <DifficultyTag difficulty={p.difficulty} /> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <div className="col-span-12 flex flex-col gap-3.5 xl:col-span-4">
            {r.sheets.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Sheets</CardTitle>
                </CardHeader>
                <ul>
                  {r.sheets.map((s) => (
                    <li
                      key={s.slug}
                      className="border-t border-dashed border-line-2 py-2 first:border-t-0 first:pt-0"
                    >
                      <Link
                        href={`/dashboard/sheets/${s.slug}`}
                        className="text-[13.5px] font-medium hover:underline"
                      >
                        {s.name}
                      </Link>
                      {s.author && (
                        <p className="font-mono text-[11px] text-ink-3">by {s.author}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {r.topics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Topics</CardTitle>
                  <CardSub>your mastery</CardSub>
                </CardHeader>
                <div className="flex flex-wrap gap-1.5">
                  {r.topics.map((t) => (
                    <Link key={t.id} href="/dashboard/analytics#mastery">
                      <Tag className="hover:border-ink-3">{t.label}</Tag>
                    </Link>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  );
}
