"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Settings, LogOut, RefreshCw, Loader2 } from "lucide-react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const router = useRouter();
  const { disconnect } = useWallet();
  const [isSyncing, setIsSyncing] = useState(false);

  // Convex reactive queries — auto-update when DB changes
  const wallets = useQuery(api.wallets.getUserWallets);
  const trades = useQuery(api.trades.getUserTrades, { limit: 50 });
  const syncTrades = useAction(api.sync.syncWalletTrades);

  const isLoading = wallets === undefined;
  const tradingWallet = wallets?.find((w) => w.walletType === "trading");
  const vaultWallet = wallets?.find((w) => w.walletType === "vault");

  // Handle not authenticated (wallets query returns null when not authed)
  if (wallets === null) {
    router.push("/");
    return null;
  }

  // Handle setup not complete (wallets array is empty)
  if (!isLoading && wallets !== null && wallets.length === 0) {
    router.push("/setup");
    return null;
  }

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
      await disconnect();
      router.push("/");
      toast.success("Wallet disconnected");
    } catch (error) {
      console.error("Disconnect error:", error);
      toast.error("Error disconnecting wallet");
    }
  };

  const truncateAddress = (address: string) =>
    `${address.slice(0, 4)}...${address.slice(-4)}`;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-zinc-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="mt-1 text-zinc-400">Your wallet balances and profit tracking</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSync}
              disabled={isSyncing || !tradingWallet}
              variant="outline"
              className="border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Trades
                </>
              )}
            </Button>
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
        </div>

        {/* Wallet Balance Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {tradingWallet && (
            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg text-zinc-300">Trading Wallet</CardTitle>
                <p className="text-sm text-zinc-500">{truncateAddress(tradingWallet.address)}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-white">
                    {tradingWallet.balanceSol.toFixed(4)} SOL
                  </p>
                  <p className="text-lg text-zinc-400">
                    ${tradingWallet.balanceUsd.toFixed(2)} USD
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {vaultWallet && (
            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg text-zinc-300">Vault Wallet</CardTitle>
                <p className="text-sm text-zinc-500">{truncateAddress(vaultWallet.address)}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-white">
                    {vaultWallet.balanceSol.toFixed(4)} SOL
                  </p>
                  <p className="text-lg text-zinc-400">
                    ${vaultWallet.balanceUsd.toFixed(2)} USD
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Trades (placeholder for Phase 3) */}
        {trades && trades.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-xl font-semibold text-white">Recent Trades</h2>
            <p className="text-zinc-400">{trades.length} closed trade{trades.length > 1 ? "s" : ""} synced</p>
          </div>
        )}
      </div>
    </div>
  );
}
