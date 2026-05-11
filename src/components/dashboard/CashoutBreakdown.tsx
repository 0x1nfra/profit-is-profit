"use client";

import { Button } from "@/components/ui/button";
import type { Doc } from "../../../convex/_generated/dataModel";

interface CashoutBreakdownProps {
  trade: Doc<"trades">;
  onCashOut: () => void;
}

/**
 * Expanded breakdown panel showing how the cashout was calculated.
 * Reads display fields directly from the trade record (computed in convex/sync.ts):
 *   tierAtTrade, baseCashoutPercent, roiBonusPercent, streakMultiplier,
 *   goalBoostMultiplier, finalCashoutPercent, recommendedCashoutSol
 *
 * The "Cash Out" button is rendered only when status === "pending"
 * (winning trades not yet confirmed). For confirmed trades, the button
 * is hidden and the parent TradeCard shows a "Cashed Out" badge instead.
 */
export function CashoutBreakdown({ trade, onCashOut }: CashoutBreakdownProps) {
  return (
    <div className="border-t border-zinc-800 bg-zinc-900 rounded-b-lg p-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Tier {trade.tierAtTrade} base</span>
          <span className="text-white">{trade.baseCashoutPercent}%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">ROI bonus ({trade.roiPercent.toFixed(1)}%)</span>
          <span className="text-white">+{trade.roiBonusPercent}%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Streak ({trade.losingStreakAtTrade} losses)</span>
          <span className="text-white">×{trade.streakMultiplier}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Goal boost</span>
          <span className="text-white">×{trade.goalBoostMultiplier}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold border-t border-zinc-800 pt-2 mt-2">
          <span className="text-zinc-300">Take off the table</span>
          <span className="text-white">
            {trade.recommendedCashoutSol.toFixed(4)} SOL ({trade.finalCashoutPercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {trade.status === "pending" && (
        <Button
          onClick={onCashOut}
          className="mt-8 w-full bg-white text-black hover:bg-zinc-200"
        >
          Cash Out {trade.recommendedCashoutSol.toFixed(4)} SOL
        </Button>
      )}
    </div>
  );
}
