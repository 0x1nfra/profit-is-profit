// =============================================
// Dashboard Page
// src/app/dashboard/page.tsx
// =============================================

"use client";

import React, { useEffect, useState } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useRequireSetup } from "@/hooks/useRequireSetup";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { WalletCard } from "@/components/wallet/WalletCard";
import { GoalProgress } from "@/components/goal/GoalProgress";
import { TradeList } from "@/components/trade/TradeList";
import { DashboardData } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function DashboardPage() {
  useRequireAuth();
  useRequireSetup();

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const response = await fetch("/api/dashboard");

      if (!response.ok) {
        if (response.status === 401) {
          // Unauthorized - will be handled by useRequireAuth
          return;
        }
        throw new Error("Failed to load dashboard data");
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error?.message || "Failed to load data");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefreshWallet = async () => {
    setIsRefreshing(true);
    // Refresh trades and balances
    try {
      const response = await fetch("/api/trades/refresh", {
        method: "POST",
      });

      if (response.ok) {
        await fetchDashboardData();
      }
    } catch {
      // Error will be handled by fetchDashboardData
    }
  };

  const handleConfirmCashout = async (tradeId: string) => {
    try {
      const response = await fetch("/api/cashouts/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeId }),
      });

      if (response.ok) {
        await fetchDashboardData();
      }
    } catch {
      // Handle error
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-32 mb-4" />
                <Skeleton className="h-12 w-24 mb-2" />
                <Skeleton className="h-6 w-20" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-32 mb-4" />
                <Skeleton className="h-12 w-24 mb-2" />
                <Skeleton className="h-6 w-20" />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-8 w-48 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-6 w-32" />
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
            <h2 className="text-lg font-semibold mb-2">Failed to Load Dashboard</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchDashboardData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // No data state
  if (!data) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No dashboard data available</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const { wallets, goalProgress, recentTrades, userState } = data;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Wallet Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WalletCard
            wallet={{
              type: "trading",
              address: wallets.trading.address,
              balanceSol: wallets.trading.balance_sol,
              balanceUsd: wallets.trading.balance_usd,
              tier: wallets.trading.current_tier || undefined,
              lastSyncedAt: wallets.trading.last_synced_at || undefined,
            }}
            onRefresh={handleRefreshWallet}
            isRefreshing={isRefreshing}
          />
          <WalletCard
            wallet={{
              type: "vault",
              address: wallets.vault.address,
              balanceSol: wallets.vault.balance_sol,
              balanceUsd: wallets.vault.balance_usd,
            }}
          />
        </div>

        {/* Goal Progress */}
        <GoalProgress
          monthlyGoal={goalProgress.monthlyGoal}
          currentProgress={goalProgress.currentProgress}
          weekNumber={1}
          boostSuggestion={goalProgress.boostSuggestion}
        />

        {/* Recent Trades */}
        <TradeList
          trades={recentTrades}
          onConfirmCashout={handleConfirmCashout}
          maxDisplay={5}
          showViewAll
        />
      </div>
    </DashboardLayout>
  );
}
