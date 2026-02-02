// =============================================
// Goal Progress Component
// src/components/goal/GoalProgress.tsx
// =============================================

"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Target,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  TrendingUp,
} from "lucide-react";

export interface GoalProgressProps {
  monthlyGoal: number;
  currentProgress: number;
  weekNumber: number;
  boostSuggestion?: {
    gapAmount: number;
    suggestedBoostPercent: number;
  };
  onAcceptBoost?: () => void;
  onDeclineBoost?: () => void;
}

export function GoalProgress({
  monthlyGoal,
  currentProgress,
  weekNumber,
  boostSuggestion,
  onAcceptBoost,
  onDeclineBoost,
}: GoalProgressProps) {
  const progressPercent = Math.min(
    100,
    Math.round((currentProgress / monthlyGoal) * 100)
  );
  const isOnTrack = progressPercent >= (weekNumber / 4) * 100;
  const isGoalMet = currentProgress >= monthlyGoal;

  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const getStatusMessage = () => {
    if (isGoalMet) {
      return {
        icon: <Trophy className="w-5 h-5 text-yellow-500" />,
        text: "Goal achieved! Great work this month!",
        color: "text-yellow-600",
      };
    }

    if (isOnTrack) {
      return {
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
        text: `On track! ${formatCurrency(
          currentProgress
        )} of ${formatCurrency(monthlyGoal)}`,
        color: "text-green-600",
      };
    }

    const gap = monthlyGoal * (weekNumber / 4) - currentProgress;
    return {
      icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
      text: `${formatCurrency(gap)} behind pace`,
      color: "text-orange-600",
    };
  };

  const status = getStatusMessage();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-5 h-5" />
            Monthly Goal Progress
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            Week {weekNumber} of 4
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progressPercent} className="h-3" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {formatCurrency(currentProgress)}
            </span>
            <span className="text-muted-foreground">
              {formatCurrency(monthlyGoal)}
            </span>
          </div>
        </div>

        {/* Status Message */}
        <div className="flex items-center gap-2">
          {status.icon}
          <span className={cn("font-medium", status.color)}>{status.text}</span>
        </div>

        {/* Boost Suggestion */}
        {boostSuggestion && !isGoalMet && (
          <div className="bg-accent rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Behind Monthly Pace</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You&apos;re {formatCurrency(boostSuggestion.gapAmount)} behind
                  your {formatCurrency(monthlyGoal)} goal.
                </p>
                <p className="text-sm mt-2">
                  Boost cashouts by +{boostSuggestion.suggestedBoostPercent}%
                  this week?
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {onAcceptBoost && (
                <Button
                  size="sm"
                  onClick={onAcceptBoost}
                  className="flex-1"
                >
                  Accept Boost
                </Button>
              )}
              {onDeclineBoost && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDeclineBoost}
                  className="flex-1"
                >
                  Decline
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GoalProgress;
