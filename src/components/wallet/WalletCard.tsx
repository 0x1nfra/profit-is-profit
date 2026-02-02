// =============================================
// Wallet Card Component
// src/components/wallet/WalletCard.tsx
// =============================================

"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TierBadge } from "./TierBadge";
import { cn } from "@/lib/utils";
import {
  Wallet,
  RefreshCw,
  Copy,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Tier } from "@/types";

export interface WalletCardProps {
  wallet: {
    type: "trading" | "vault";
    address: string;
    balanceSol: number;
    balanceUsd: number;
    tier?: Tier;
    lastSyncedAt?: string;
  };
  onRefresh?: () => void;
  isRefreshing?: boolean;
  error?: string | null;
}

export function WalletCard({
  wallet,
  onRefresh,
  isRefreshing = false,
  error,
}: WalletCardProps) {
  const [copied, setCopied] = React.useState(false);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy errors
    }
  };

  const formatBalance = (value: number) => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 4,
    });
  };

  const formatUsd = (value: number) => {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatLastSynced = (dateString?: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const isTrading = wallet.type === "trading";
  const hasLowBalance = isTrading && wallet.balanceSol < 1;

  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        error && "border-destructive",
        hasLowBalance && !error && "border-yellow-500/50"
      )}
    >
      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 bg-background/95 flex flex-col items-center justify-center gap-3 z-10">
          <AlertCircle className="w-8 h-8 text-destructive" />
          <p className="text-sm text-destructive font-medium">
            Failed to fetch balance
          </p>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              Retry
            </Button>
          )}
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet
              className={cn(
                "w-5 h-5",
                isTrading ? "text-blue-500" : "text-green-500"
              )}
            />
            <CardTitle className="text-base">
              {isTrading ? "Trading Wallet" : "Vault Wallet"}
            </CardTitle>
          </div>

          {/* Tier Badge (Trading only) */}
          {isTrading && wallet.tier !== undefined && (
            <TierBadge tier={wallet.tier} showName size="sm" />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Balance Display */}
        <div className="space-y-1">
          {isRefreshing ? (
            <>
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
              <div className="h-5 w-16 bg-muted animate-pulse rounded" />
            </>
          ) : (
            <>
              <p
                className={cn(
                  "text-3xl font-bold tracking-tight",
                  hasLowBalance && "text-yellow-600"
                )}
              >
                {formatBalance(wallet.balanceSol)} SOL
              </p>
              <p className="text-muted-foreground">
                {formatUsd(wallet.balanceUsd)}
              </p>
            </>
          )}
        </div>

        {/* Address & Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-mono">
              {truncateAddress(wallet.address)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCopy}
            >
              {copied ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Refresh Button (Trading only) */}
          {isTrading && onRefresh && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {formatLastSynced(wallet.lastSyncedAt)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={cn("w-4 h-4", isRefreshing && "animate-spin")}
                />
              </Button>
            </div>
          )}
        </div>

        {/* Low Balance Warning */}
        {hasLowBalance && (
          <Badge variant="outline" className="w-full justify-center">
            <AlertCircle className="w-3 h-3 mr-1" />
            Low balance - Consider adding funds
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

export default WalletCard;
