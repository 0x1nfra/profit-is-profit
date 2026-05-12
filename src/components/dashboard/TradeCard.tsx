"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CashoutBreakdown } from "./CashoutBreakdown";
import { CashoutModal } from "./CashoutModal";
import type { Doc } from "../../../convex/_generated/dataModel";

interface TradeCardProps {
  trade: Doc<"trades">;
  vaultAddress: string;
}

function truncateMint(mint: string): string {
  return `${mint.slice(0, 6)}...${mint.slice(-4)}`;
}

/**
 * Single trade row in the dashboard list. Three render states:
 *   - Pending win: full opacity, recommended cashout shown in yellow,
 *     click expands the breakdown panel which has a Cash Out button
 *   - Confirmed win: full opacity, "Cashed Out" badge, click still expands
 *     to show breakdown (read-only)
 *   - Loss: opacity-50, "Loss" badge, expansion disabled
 *
 * Each card owns its own expanded + cashoutOpen state — multiple cards
 * can be expanded simultaneously (per UI-SPEC, expansion is instant, no
 * accordion-style mutual exclusion required for MVP).
 */
export function TradeCard({ trade, vaultAddress }: TradeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [cashoutOpen, setCashoutOpen] = useState(false);

  const isLoss = trade.netProfitSol <= 0;
  const isConfirmed = trade.status === "confirmed";
  const isPendingWin = !isLoss && trade.status === "pending";

  const tokenLabel = trade.tokenSymbol ?? truncateMint(trade.tokenMint);
  const profitSign = trade.netProfitSol >= 0 ? "+" : "";

  return (
    <>
      <div
        className={cn(
          "rounded-lg border border-zinc-800 bg-zinc-950 transition-opacity",
          isLoss && "opacity-50"
        )}
      >
        <button
          type="button"
          onClick={() => !isLoss && setExpanded((e) => !e)}
          disabled={isLoss}
          className="w-full text-left p-4"
          aria-expanded={expanded}
        >
          <div className="flex justify-between items-center">
            <span className="font-mono text-sm text-zinc-300">{tokenLabel}</span>
            <div className="flex items-center gap-2">
              {isLoss && (
                <Badge variant="outline" className="text-red-400 border-red-400/30 text-sm">
                  Loss
                </Badge>
              )}
              {isConfirmed && !isLoss && (
                <Badge className="bg-green-900/50 text-green-300 border-green-800 text-sm">
                  Cashed Out
                </Badge>
              )}
              {isPendingWin && (
                <span className="text-yellow-400 text-sm font-semibold">
                  {trade.recommendedCashoutSol.toFixed(4)} SOL
                </span>
              )}
              {!isLoss && (
                expanded
                  ? <ChevronUp className="h-4 w-4 text-zinc-500" />
                  : <ChevronDown className="h-4 w-4 text-zinc-500" />
              )}
            </div>
          </div>
          <div className="flex gap-4 mt-1 text-sm text-zinc-400">
            <span>{profitSign}{trade.netProfitSol.toFixed(4)} SOL</span>
            <span>{trade.roiPercent.toFixed(1)}% ROI</span>
          </div>
        </button>

        {expanded && !isLoss && (
          <CashoutBreakdown trade={trade} onCashOut={() => setCashoutOpen(true)} />
        )}
      </div>

      <CashoutModal
        open={cashoutOpen}
        onOpenChange={setCashoutOpen}
        trade={trade}
        vaultAddress={vaultAddress}
      />
    </>
  );
}
