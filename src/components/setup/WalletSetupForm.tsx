// =============================================
// Wallet Setup Form Component
// src/components/setup/WalletSetupForm.tsx
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
import { Wallet, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Validation schema
const walletSetupSchema = z
  .object({
    tradingWallet: z
      .string()
      .min(32, "Solana address must be at least 32 characters")
      .max(44, "Solana address must be at most 44 characters")
      .regex(/^[A-HJ-NP-Za-km-z1-9]+$/, "Invalid Solana address format"),
    vaultWallet: z
      .string()
      .min(32, "Solana address must be at least 32 characters")
      .max(44, "Solana address must be at most 44 characters")
      .regex(/^[A-HJ-NP-Za-km-z1-9]+$/, "Invalid Solana address format"),
  })
  .refine((data) => data.tradingWallet !== data.vaultWallet, {
    message: "Trading and vault wallets must be different",
    path: ["vaultWallet"],
  });

export type WalletSetupFormData = z.infer<typeof walletSetupSchema>;

export interface WalletSetupFormProps {
  onSubmit: (data: WalletSetupFormData) => Promise<void>;
  isSubmitting?: boolean;
  serverError?: string | null;
}

export function WalletSetupForm({
  onSubmit,
  isSubmitting = false,
  serverError,
}: WalletSetupFormProps) {
  const form = useForm<WalletSetupFormData>({
    resolver: zodResolver(walletSetupSchema),
    defaultValues: {
      tradingWallet: "",
      vaultWallet: "",
    },
    mode: "onChange",
  });

  const handleSubmit = async (data: WalletSetupFormData) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Trading Wallet Field */}
        <FormField
          control={form.control}
          name="tradingWallet"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Trading Wallet
              </FormLabel>
              <FormDescription>
                The wallet you use for active trading (e.g., Phantom)
              </FormDescription>
              <FormControl>
                <Input
                  placeholder="Enter your Solana wallet address..."
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Vault Wallet Field */}
        <FormField
          control={form.control}
          name="vaultWallet"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Vault Wallet
              </FormLabel>
              <FormDescription>
                A separate wallet for securing profits (recommended: hardware
                wallet or separate app)
              </FormDescription>
              <FormControl>
                <Input
                  placeholder="Enter your vault wallet address..."
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Server Error Alert */}
        {serverError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={!form.formState.isValid || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "Saving..." : "Continue"}
        </Button>
      </form>
    </Form>
  );
}

export default WalletSetupForm;
