"use client";

import { Progress } from "@/components/ui/progress";

interface GoalProgressProps {
  currentProgressUsd: number;
  monthlyGoalUsd: number;
}

/**
 * Minimal monthly goal progress display (DASH-06 — Phase 3 scope only).
 * Phase 4 will replace this with full goal management UI (editing, weekly pace,
 * boost suggestions). For Phase 3 we render a single line + progress bar.
 */
export function GoalProgress({ currentProgressUsd, monthlyGoalUsd }: GoalProgressProps) {
  const percent = monthlyGoalUsd > 0
    ? Math.min(100, Math.round((currentProgressUsd / monthlyGoalUsd) * 100))
    : 0;

  return (
    <div className="space-y-2">
      <p className="text-sm text-zinc-400">
        Goal: ${currentProgressUsd.toFixed(0)} / ${monthlyGoalUsd.toFixed(0)} this month
      </p>
      <Progress value={percent} className="bg-zinc-800" />
    </div>
  );
}
