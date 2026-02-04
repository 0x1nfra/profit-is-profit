// =============================================
// Goals Page
// src/app/goals/page.tsx
// =============================================

"use client";

import React, { useEffect, useState } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GoalProgress } from "@/components/goal/GoalProgress";
import { GoalSetupForm } from "@/components/setup/GoalSetupForm";
import { GoalSettings } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw, Target, Edit2, CheckCircle2, X } from "lucide-react";

export default function GoalsPage() {
  useRequireAuth();

  const [goalSettings, setGoalSettings] = useState<GoalSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchGoalSettings = async () => {
    try {
      setError(null);
      setSaveSuccess(false);
      const response = await fetch("/api/goals");

      if (!response.ok) {
        if (response.status === 401) {
          return;
        }
        throw new Error("Failed to load goal settings");
      }

      const result = await response.json();

      if (result.success) {
        setGoalSettings(result.goalSettings);
      } else {
        throw new Error(result.error?.message || "Failed to load goal settings");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoalSettings();
  }, []);

  const handleUpdateGoal = async (data: { monthlyGoal: number }) => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);

      const response = await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyGoalUsd: data.monthlyGoal }),
      });

      if (!response.ok) {
        throw new Error("Failed to update goal");
      }

      const result = await response.json();

      if (result.success) {
        setGoalSettings(result.goalSettings);
        setIsEditing(false);
        setSaveSuccess(true);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        throw new Error(result.error?.message || "Failed to update goal");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAcceptBoost = async () => {
    // TODO: Implement boost acceptance
    console.log("Accept boost");
  };

  const handleDeclineBoost = async () => {
    // TODO: Implement boost decline
    console.log("Decline boost");
  };

  // Calculate current week of month
  const getCurrentWeek = () => {
    const now = new Date();
    return Math.ceil(now.getDate() / 7);
  };

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-8 w-48 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-6 w-32" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout>
        <Card className="border-destructive">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Failed to Load Goals</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchGoalSettings}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // No data state
  if (!goalSettings) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No goal settings available</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // Calculate boost suggestion if behind pace
  const monthlyGoal = goalSettings.monthly_goal_usd;
  const currentProgress = goalSettings.current_month_progress_usd;
  const progressPercent = Math.min(100, Math.round((currentProgress / monthlyGoal) * 100));
  const weekNumber = getCurrentWeek();
  const weeklyPace = monthlyGoal / 4;
  const isOnTrack = currentProgress >= weeklyPace * weekNumber;
  
  let boostSuggestion;
  if (!isOnTrack && progressPercent < 100) {
    const gapAmount = weeklyPace * weekNumber - currentProgress;
    let suggestedBoostPercent = 5;
    if (gapAmount > 200) {
      suggestedBoostPercent = 20;
    } else if (gapAmount > 100) {
      suggestedBoostPercent = 15;
    } else if (gapAmount > 50) {
      suggestedBoostPercent = 10;
    }
    
    boostSuggestion = {
      gapAmount: Math.round(gapAmount),
      suggestedBoostPercent,
    };
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" />
            Monthly Goals
          </h1>
          {saveSuccess && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Goal updated successfully
            </div>
          )}
        </div>

        {/* Goal Progress */}
        <GoalProgress
          monthlyGoal={monthlyGoal}
          currentProgress={currentProgress}
          weekNumber={weekNumber}
          boostSuggestion={boostSuggestion}
          onAcceptBoost={handleAcceptBoost}
          onDeclineBoost={handleDeclineBoost}
        />

        {/* Goal Settings */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-5 h-5" />
                Goal Settings
              </CardTitle>
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8"
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit Goal
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <GoalSetupForm
                  defaultGoal={monthlyGoal}
                  onSubmit={handleUpdateGoal}
                  onSkip={() => setIsEditing(false)}
                  isSubmitting={isSaving}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="w-full"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-accent rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Monthly Goal</p>
                    <p className="text-2xl font-bold">
                      ${monthlyGoal.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-accent rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Current Progress</p>
                    <p className="text-2xl font-bold">
                      ${currentProgress.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-accent rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Current Month</p>
                    <p className="text-lg font-medium">
                      {goalSettings.current_month}
                    </p>
                  </div>
                  <div className="bg-accent rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Boost Status</p>
                    <p className="text-lg font-medium">
                      {goalSettings.boost_active 
                        ? `Active (+${goalSettings.boost_percent}%)` 
                        : "Inactive"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
