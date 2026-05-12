"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TierBadge } from "./TierBadge";
import { calculateTier, getTierConfig } from "@/lib/tier-calculator";

interface WalletDisplay {
  address: string;
  balanceSol: number;
  balanceUsd: number;
}

interface StatsRowProps {
  tradingWallet: WalletDisplay;
  vaultWallet: WalletDisplay;
  losingStreak?: number;
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Top-of-dashboard 3-column stats grid:
 *   col 1: TierCard — wallet health tier (from trading balance)
 *   col 2: TradingWalletCard — SOL + USD balance + truncated address
 *   col 3: VaultWalletCard — same shape as trading
 *
 * Tier color is rendered as a left border on the tier card so the tier
 * still feels visually prominent without being wider than the balance cards.
 */
export function StatsRow({ tradingWallet, vaultWallet, losingStreak = 0 }: StatsRowProps) {
  const tier = calculateTier(tradingWallet.balanceSol);
  const tierColor = getTierConfig(tier).color;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Tier Card */}
      <Card
        className="bg-zinc-950 border-zinc-800 border-l-4"
        style={{ borderLeftColor: tierColor }}
      >
        <CardHeader>
          <CardTitle className="text-sm text-zinc-300">Wallet Health</CardTitle>
        </CardHeader>
        <CardContent>
          <TierBadge balanceSol={tradingWallet.balanceSol} losingStreak={losingStreak} />
        </CardContent>
      </Card>

      {/* Trading Wallet Card */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-300">Trading Wallet</CardTitle>
          <p className="text-sm text-zinc-500 font-mono">
            {truncateAddress(tradingWallet.address)}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="text-3xl font-semibold text-white">
              {tradingWallet.balanceSol.toFixed(4)} SOL
            </p>
            <p className="text-base text-zinc-400">
              ${tradingWallet.balanceUsd.toFixed(2)} USD
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Vault Wallet Card */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-300">Vault Wallet</CardTitle>
          <p className="text-sm text-zinc-500 font-mono">
            {truncateAddress(vaultWallet.address)}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="text-3xl font-semibold text-white">
              {vaultWallet.balanceSol.toFixed(4)} SOL
            </p>
            <p className="text-base text-zinc-400">
              ${vaultWallet.balanceUsd.toFixed(2)} USD
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
