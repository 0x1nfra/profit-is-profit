"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { Copy, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Doc } from "../../../convex/_generated/dataModel";

interface CashoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trade: Doc<"trades">;
  vaultAddress: string;
}

/**
 * Confirmation dialog for manual cashout. User has already transferred SOL
 * out-of-band; this mutation logs the confirmation and updates Convex
 * wallet balances optimistically (the next sync reconciles with on-chain truth).
 *
 * UX states:
 *   - idle: confirm button active
 *   - confirming: button disabled, Loader2 spinner, text "Confirming..."
 *   - success: modal closes, toast.success
 *   - error: modal stays open, toast.error, button resets
 */
export function CashoutModal({ open, onOpenChange, trade, vaultAddress }: CashoutModalProps) {
  const confirmCashout = useMutation(api.trades.confirmCashout);
  const [isConfirming, setIsConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(vaultAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await confirmCashout({
        tradeId: trade._id,
        actualCashoutSol: trade.recommendedCashoutSol,
      });
      toast.success(`Cashout confirmed — ${trade.recommendedCashoutSol.toFixed(4)} SOL logged`);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to confirm cashout. Try again."
      );
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Confirm Cashout</DialogTitle>
          <DialogDescription className="text-zinc-400 text-sm">
            Transfer SOL to your vault wallet, then confirm below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-8">
          {/* Amount row */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Amount</span>
            <span className="text-base text-white font-semibold font-mono">
              {trade.recommendedCashoutSol.toFixed(4)} SOL
            </span>
          </div>

          {/* Vault address row */}
          <div className="flex flex-col gap-2">
            <span className="text-sm text-zinc-400">Vault wallet</span>
            <div className="flex items-center gap-2 bg-zinc-900 rounded p-3">
              <span className="font-mono text-sm text-zinc-300 flex-1 break-all">
                {vaultAddress}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy vault address"
                className="text-zinc-400 hover:text-white p-1"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
            variant="outline"
            className="border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            Go Back
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              "I’ve transferred the SOL — Confirm Cashout"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
