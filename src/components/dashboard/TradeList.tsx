"use client";

import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TradeCard } from "./TradeCard";
import type { Doc } from "../../../convex/_generated/dataModel";

interface TradeListProps {
  trades: Doc<"trades">[];
  vaultAddress: string;
  isSyncing: boolean;
  onSync: () => void;
}

/**
 * Section containing the recent trades list. Owns the section header
 * with the contextual "Refresh Trades" button (moved here from the page
 * header per CONTEXT.md decision).
 *
 * Empty state: shows the empty-state message + the same Refresh button
 * since clicking sync is the only way to detect new trades.
 */
export function TradeList({ trades, vaultAddress, isSyncing, onSync }: TradeListProps) {
  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Recent Trades</h2>
        <Button
          onClick={onSync}
          disabled={isSyncing}
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
      </div>

      {trades.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-base text-white font-semibold mb-2">No trades yet</p>
          <p className="text-sm text-zinc-400">
            Sync your wallet to detect closed trades and get cashout recommendations.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {trades.map((trade) => (
            <TradeCard key={trade._id} trade={trade} vaultAddress={vaultAddress} />
          ))}
        </div>
      )}
    </div>
  );
}
