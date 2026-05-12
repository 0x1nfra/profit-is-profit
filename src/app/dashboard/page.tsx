"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useWalletStore } from "@/lib/stores/wallet-store";
import { Settings, LogOut } from "lucide-react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { StatsRow } from "@/components/dashboard/StatsRow";
import { TradeList } from "@/components/dashboard/TradeList";
import { GoalProgress } from "@/components/dashboard/GoalProgress";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULTS } from "@/lib/constants";

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-4 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { disconnect } = useWallet();
  const { reset } = useWalletStore();
  const [isSyncing, setIsSyncing] = useState(false);

  // Convex reactive queries — auto-update when DB changes
  const wallets = useQuery(api.wallets.getUserWallets);
  const trades = useQuery(api.trades.getUserTrades, { limit: 10 });
  const syncTrades = useAction(api.sync.syncWalletTrades);
  const userState = useQuery(api.userState.getUserState);
  const goalSettings = useQuery(api.goalSettings.getGoalSettings);

  const isLoading =
    wallets === undefined ||
    trades === undefined ||
    userState === undefined ||
    goalSettings === undefined;

  const tradingWallet = wallets?.find((w) => w.walletType === "trading");
  const vaultWallet = wallets?.find((w) => w.walletType === "vault");

  // Handle not authenticated (wallets query returns null when not authed)
  // Must sign out first to clear pisp-auth cookie, otherwise middleware
  // redirects back to /dashboard and we loop indefinitely.
  useEffect(() => {
    if (wallets === null) {
      fetch("/api/auth/signout", { method: "POST" }).finally(() => {
        router.push("/");
      });
    }
  }, [wallets, router]);

  // Handle setup not complete (wallets array is empty)
  useEffect(() => {
    if (!isLoading && wallets !== null && wallets !== undefined && wallets.length === 0) {
      router.push("/setup");
    }
  }, [wallets, isLoading, router]);

  const handleSync = async () => {
    if (!tradingWallet || isSyncing) return;
    setIsSyncing(true);

    try {
      const result = await syncTrades({ walletAddress: tradingWallet.address });

      if (result.newTradesCount > 0) {
        const profitSign = result.totalProfitSol >= 0 ? "+" : "";
        toast.success(
          `Found ${result.newTradesCount} new closed trade${result.newTradesCount > 1 ? "s" : ""} (${profitSign}${result.totalProfitSol.toFixed(4)} SOL)`
        );
      } else {
        toast.info("No new closed trades found");
      }
      // No manual refetch needed — useQuery subscriptions update automatically
    } catch (error) {
      console.error("Sync error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to sync trades", {
        action: { label: "Retry", onClick: () => handleSync() },
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      window.dispatchEvent(new CustomEvent("pisp-auth-change"));
      reset();
      await disconnect();
      router.push("/");
      toast.success("Wallet disconnected");
    } catch (error) {
      console.error("Disconnect error:", error);
      toast.error("Error disconnecting wallet");
    }
  };

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        {/* Header row: Settings + Sign Out */}
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="icon"
            className="border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleDisconnect}
            variant="outline"
            className="border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect
          </Button>
        </div>

        {/* Stats Row: Tier + Trading Wallet + Vault Wallet */}
        {tradingWallet && vaultWallet && (
          <StatsRow
            tradingWallet={tradingWallet}
            vaultWallet={vaultWallet}
            losingStreak={userState?.currentLosingStreak ?? 0}
          />
        )}

        {/* Monthly Goal Progress (DASH-06 — minimal Phase 3 scope) */}
        <GoalProgress
          currentProgressUsd={goalSettings?.currentMonthProgressUsd ?? 0}
          monthlyGoalUsd={goalSettings?.monthlyGoalUsd ?? DEFAULTS.MONTHLY_GOAL_USD}
        />

        {/* Trade List with Sync Button (DASH-04, DASH-05) */}
        <TradeList
          trades={trades ?? []}
          vaultAddress={vaultWallet?.address ?? ""}
          isSyncing={isSyncing}
          onSync={handleSync}
        />
      </div>
    </div>
  );
}
