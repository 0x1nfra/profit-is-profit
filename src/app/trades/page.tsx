// =============================================
// Trades Page
// src/app/trades/page.tsx
// =============================================

"use client";

import React, { useEffect, useState } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TradeList } from "@/components/trade/TradeList";
import { Trade } from "@/types";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw, History } from "lucide-react";

export default function TradesPage() {
  useRequireAuth();

  const { walletAddress } = useAuthStore();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTrades = async () => {
    if (!walletAddress) return;

    try {
      setError(null);
      const response = await fetch(`/api/trades?walletAddress=${walletAddress}`);

      if (!response.ok) {
        if (response.status === 401) {
          return;
        }
        throw new Error("Failed to load trades");
      }

      const result = await response.json();

      if (result.success) {
        setTrades(result.data);
      } else {
        throw new Error(result.error?.message || "Failed to load trades");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, [walletAddress]);

  const handleRefreshTrades = async () => {
    if (!walletAddress) return;

    setIsRefreshing(true);
    try {
      const response = await fetch("/api/trades/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      if (response.ok) {
        await fetchTrades();
      }
    } catch {
      // Error will be handled by fetchTrades
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
        await fetchTrades();
      }
    } catch {
      // Handle error silently
    }
  };

  // Calculate trade statistics
  const getTradeStats = () => {
    if (trades.length === 0) return null;

    const wins = trades.filter((t) => t.net_profit_sol > 0).length;
    const losses = trades.filter((t) => t.net_profit_sol < 0).length;
    const totalProfit = trades.reduce((sum, t) => sum + t.net_profit_sol, 0);
    const avgRoi = trades.reduce((sum, t) => sum + t.roi_percent, 0) / trades.length;

    return { wins, losses, totalProfit, avgRoi, total: trades.length };
  };

  const stats = getTradeStats();

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-8 w-48 mb-4" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
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
            <h2 className="text-lg font-semibold mb-2">Failed to Load Trades</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchTrades}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="w-6 h-6" />
            Trade History
          </h1>
          <Button
            variant="outline"
            onClick={handleRefreshTrades}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Syncing..." : "Sync Trades"}
          </Button>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Total Trades</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Win Rate</p>
                <p className="text-2xl font-bold">
                  {stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Net Profit</p>
                <p className={`text-2xl font-bold ${stats.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {stats.totalProfit >= 0 ? "+" : ""}
                  {stats.totalProfit.toFixed(3)} SOL
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Avg ROI</p>
                <p className={`text-2xl font-bold ${stats.avgRoi >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {stats.avgRoi >= 0 ? "+" : ""}
                  {stats.avgRoi.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Trade List */}
        <TradeList
          trades={trades}
          onConfirmCashout={handleConfirmCashout}
          maxDisplay={trades.length} // Show all trades
          showViewAll={false} // No "View All" button on this page
        />
      </div>
    </DashboardLayout>
  );
}
