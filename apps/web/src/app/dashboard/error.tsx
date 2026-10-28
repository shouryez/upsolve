"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { Button, ErrorState, buttonClasses } from "@upsolve/ui";

/** Friendly error screen for any dashboard page, with a retry that re-renders the segment. */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="surface-card w-full max-w-[520px] rounded-[24px]">
        <ErrorState
          mascot="thinking"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="signal" size="sm" onClick={reset}>
                <RotateCw size={14} aria-hidden="true" data-nudge="spin" /> Try again
              </Button>
              <Link
                href="/dashboard"
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                Back to overview
              </Link>
            </div>
          }
        >
          It&apos;s usually a hiccup reaching the database. Your data is safe; trying again normally
          fixes it.
          {error.digest && (
            <span className="mt-2 block font-mono text-11 text-ink-3">ref {error.digest}</span>
          )}
        </ErrorState>
      </div>
    </div>
  );
}
