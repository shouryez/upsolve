"use client";

import { useState } from "react";
import { BudgetRibbon } from "@/components/daily/budget-ribbon";

const SEGMENTS = [
  { id: "s0", title: "Koko Eating Bananas", min: 15, color: "var(--revise)" },
  { id: "s1", title: "Search in Rotated Sorted Array", min: 35, color: "var(--success)" },
  { id: "s2", title: "Median of Two Sorted Arrays", min: 55, color: "var(--medium)" },
  { id: "s3", title: "Course Schedule", min: 35, color: "var(--info)" },
  { id: "s4", title: "OS notes ch. 4", min: 30, color: "var(--ink-3)" },
];

/** The Today time budget with sample items, for the lab. */
export function BudgetDemo({ initial }: { initial: number | null }) {
  const [budget, setBudget] = useState(initial);
  return (
    <BudgetRibbon
      budget={budget}
      onChange={setBudget}
      segments={SEGMENTS}
      leftMin={SEGMENTS.reduce((n, s) => n + s.min, 0)}
    />
  );
}
