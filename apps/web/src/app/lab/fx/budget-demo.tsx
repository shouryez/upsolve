"use client";

import { useState } from "react";
import { BudgetRibbon } from "@/components/daily/budget-ribbon";

const SEGMENTS = [
  { title: "Koko Eating Bananas", min: 15, color: "var(--revise)" },
  { title: "Search in Rotated Sorted Array", min: 35, color: "var(--success)" },
  { title: "Median of Two Sorted Arrays", min: 55, color: "var(--medium)" },
  { title: "Course Schedule", min: 35, color: "var(--info)" },
  { title: "OS notes ch. 4", min: 30, color: "var(--ink-3)" },
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
