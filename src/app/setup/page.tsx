// =============================================
// Setup Page
// src/app/setup/page.tsx
// =============================================

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { WalletSetupForm } from "@/components/setup/WalletSetupForm";
import { GoalSetupForm } from "@/components/setup/GoalSetupForm";
import { SetupProgress } from "@/components/setup/SetupProgress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { WalletSetupFormData } from "@/components/setup/WalletSetupForm";
import { GoalSetupFormData } from "@/components/setup/GoalSetupForm";

export default function SetupPage() {
  useRequireAuth();
  const router = useRouter();
  const { walletAddress } = useAuthStore();
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleWalletSubmit = async (data: WalletSetupFormData) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const response = await fetch("/api/wallets/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradingWalletAddress: data.tradingWallet,
          vaultWalletAddress: data.vaultWallet,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to save wallets");
      }

      // Move to step 2
      setCurrentStep(2);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoalSubmit = async (data: GoalSetupFormData) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const response = await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyGoalUsd: data.monthlyGoal,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to save goal");
      }

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setIsSubmitting(false);
    }
  };

  const handleSkipGoal = async () => {
    setIsSubmitting(true);

    try {
      // Use default goal (400) when skipping
      const response = await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyGoalUsd: 400,
        }),
      });

      if (response.ok) {
        router.push("/dashboard");
      } else {
        // Still redirect even if API fails - goal is optional
        router.push("/dashboard");
      }
    } catch {
      // Redirect anyway on error
      router.push("/dashboard");
    }
  };

  const { isHydrated } = useAuthStore();

  // Show loading while store is hydrating from localStorage
  if (!isHydrated || !walletAddress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-md mx-auto space-y-8">
        {/* Progress Indicator */}
        <SetupProgress
          currentStep={currentStep}
          totalSteps={2}
          stepLabels={["Wallets", "Goals"]}
        />

        {/* Setup Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 ? "Configure Wallets" : "Set Your Goal"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Server Error */}
            {serverError && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Wallet Setup */}
            {currentStep === 1 && (
              <WalletSetupForm
                onSubmit={handleWalletSubmit}
                isSubmitting={isSubmitting}
                serverError={serverError}
              />
            )}

            {/* Step 2: Goal Setup */}
            {currentStep === 2 && (
              <GoalSetupForm
                onSubmit={handleGoalSubmit}
                onSkip={handleSkipGoal}
                isSubmitting={isSubmitting}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
