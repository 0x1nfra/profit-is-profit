// =============================================
// Setup Progress Component
// src/components/setup/SetupProgress.tsx
// =============================================

"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface SetupProgressProps {
  currentStep: 1 | 2;
  totalSteps: number;
  stepLabels: string[];
}

export function SetupProgress({
  currentStep,
  totalSteps,
  stepLabels,
}: SetupProgressProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-2">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isPending = stepNumber > currentStep;

          return (
            <React.Fragment key={stepNumber}>
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                    isCompleted &&
                      "bg-primary text-primary-foreground border-2 border-primary",
                    isCurrent &&
                      "bg-primary text-primary-foreground border-2 border-primary ring-2 ring-primary/30",
                    isPending &&
                      "bg-background text-muted-foreground border-2 border-muted"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{stepNumber}</span>
                  )}
                </div>
                {/* Step Label */}
                <span
                  className={cn(
                    "mt-2 text-sm font-medium transition-colors",
                    isCompleted && "text-primary",
                    isCurrent && "text-foreground",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {stepLabels[index]}
                </span>
              </div>

              {/* Connector Line (except for last step) */}
              {stepNumber < totalSteps && (
                <div className="flex-1 mx-4 h-0.5 relative">
                  <div className="absolute inset-0 bg-muted" />
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 bg-primary transition-all duration-300",
                      isCompleted ? "w-full" : "w-0"
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Counter */}
      <p className="text-center text-sm text-muted-foreground mt-4">
        Step {currentStep} of {totalSteps}
      </p>
    </div>
  );
}

export default SetupProgress;
