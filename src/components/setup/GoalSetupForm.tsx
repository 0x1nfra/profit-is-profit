// =============================================
// Goal Setup Form Component
// src/components/setup/GoalSetupForm.tsx
// =============================================

"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Target, DollarSign } from "lucide-react";
import { DEFAULTS } from "@/lib/constants";

// Validation schema
const goalSetupSchema = z.object({
  monthlyGoal: z
    .number()
    .min(100, "Monthly goal must be at least $100")
    .max(100000, "Monthly goal cannot exceed $100,000")
    .refine(
      (val) => {
        // Check for valid decimal places (max 2)
        const decimalStr = val.toString().split(".")[1];
        return !decimalStr || decimalStr.length <= 2;
      },
      "Maximum 2 decimal places allowed"
    ),
});

export type GoalSetupFormData = z.infer<typeof goalSetupSchema>;

export interface GoalSetupFormProps {
  defaultGoal?: number;
  onSubmit: (data: GoalSetupFormData) => Promise<void>;
  onSkip: () => void;
  isSubmitting?: boolean;
}

export function GoalSetupForm({
  defaultGoal = DEFAULTS.MONTHLY_GOAL_USD,
  onSubmit,
  onSkip,
  isSubmitting = false,
}: GoalSetupFormProps) {
  const form = useForm<GoalSetupFormData>({
    resolver: zodResolver(goalSetupSchema),
    defaultValues: {
      monthlyGoal: defaultGoal,
    },
    mode: "onChange",
  });

  const handleSubmit = async (data: GoalSetupFormData) => {
    console.log("[GoalSetupForm] handleSubmit called with data:", data);
    await onSubmit(data);
    console.log("[GoalSetupForm] onSubmit completed");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Monthly Goal Field */}
        <FormField
          control={form.control}
          name="monthlyGoal"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Monthly Goal (USD)
              </FormLabel>
              <FormDescription>
                Target amount to secure in your vault each month
              </FormDescription>
              <FormControl>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min={100}
                    max={100000}
                    placeholder="Enter monthly goal..."
                    className="pl-9"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? "" : Number(value));
                    }}
                    disabled={isSubmitting}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            type="submit"
            disabled={!form.formState.isValid || isSubmitting}
            className="w-full"
            onClick={() => console.log("[GoalSetupForm] Button clicked! Valid:", form.formState.isValid)}
          >
            {isSubmitting ? "Saving..." : "Complete Setup"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            disabled={isSubmitting}
            className="w-full"
          >
            Skip for Now
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default GoalSetupForm;
