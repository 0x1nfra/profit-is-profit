// =============================================
// Trade List Component
// src/components/trade/TradeList.tsx
// =============================================

"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { Trade, TradeStatus, Tier } from "@/types";

export interface TradeListProps {
  trades: Trade[];
  maxDisplay?: number;
  showViewAll?: boolean;
  onConfirmCashout?: (tradeId: string) => void;
  onOverrideCashout?: (tradeId: string, amount: number) => void;
}

const tierNames: Record<Tier, string> = {
  [Tier.REBUILD]: "REBUILD",
  [Tier.RECOVERY]: "RECOVERY",
  [Tier.GROWTH]: "GROWTH",
  [Tier.AGGRESSIVE]: "AGGRESSIVE",
  [Tier.MAXIMUM]: "MAXIMUM",
};

export function TradeList({
  trades,
  maxDisplay = 5,
  showViewAll = true,
  onConfirmCashout,
  onOverrideCashout,
}: TradeListProps) {
  const displayedTrades = trades.slice(0, maxDisplay);
  const hasMoreTrades = trades.length > maxDisplay;

  const formatSol = (value: number) => {
    return `${value.toFixed(3)} SOL`;
  };

  const formatUsd = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  const formatRoi = (roi: number) => {
    const sign = roi >= 0 ? "+" : "";
    return `${sign}${roi.toFixed(1)}%`;
  };

  // Empty state
  if (trades.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Trades Yet</h3>
          <p className="text-muted-foreground mb-4">
            Complete a trade to see cashout recommendations here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Recent Trades
          </CardTitle>
          {showViewAll && (
            <Button variant="ghost" size="sm" className="h-8">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {displayedTrades.map((trade) => {
          const isWin = trade.net_profit_sol > 0;
          const isPending = trade.status === TradeStatus.PENDING;

          return (
            <div
              key={trade.id}
              className={cn(
                "border rounded-lg p-4 space-y-3",
                isWin ? "bg-green-50/50" : "bg-red-50/50",
                "dark:bg-transparent"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isWin ? (
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-500" />
                  )}
                  <span className="font-semibold">
                    {trade.token_symbol || "Unknown Token"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={isWin ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {formatRoi(trade.roi_percent)} ROI
                  </Badge>
                </div>
              </div>

              {/* Profit/Loss Info */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {isWin ? "Profit:" : "Loss:"}
                </span>
                <span
                  className={cn(
                    "font-medium",
                    isWin ? "text-green-600" : "text-red-600"
                  )}
                >
                  {formatSol(trade.net_profit_sol)} (
                  {formatUsd(trade.net_profit_sol * 150)})
                </span>
              </div>

              {/* Win Trade: Cashout Recommendation */}
              {isWin && (
                <div className="bg-background border rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Recommended Cashout
                  </p>

                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">
                      {formatSol(trade.recommended_cashout_sol)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {trade.final_cashout_percent.toFixed(1)}% of profit
                    </span>
                  </div>

                  {/* Breakdown */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>
                        Base: {trade.base_cashout_percent}% | Bonus: +
                        {trade.roi_bonus_percent}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        Tier: {tierNames[trade.tier_at_trade]} | Streak: {" "}
                        {trade.losing_streak_at_trade === 0
                          ? "None"
                          : `${trade.losing_streak_at_trade} loss`}
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  {isPending && onConfirmCashout && (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => onConfirmCashout(trade.id)}
                    >
                      Confirm Cashout
                    </Button>
                  )}

                  {trade.status === TradeStatus.CONFIRMED && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      Cashout confirmed
                    </div>
                  )}

                  {trade.status === TradeStatus.OVERRIDDEN && (
                    <div className="text-sm text-muted-foreground">
                      Custom amount: {formatSol(trade.actual_cashout_sol || 0)}
                    </div>
                  )}
                </div>
              )}

              {/* Loss Trade: Streak Warning */}
              {!isWin && trade.losing_streak_at_trade > 0 && (
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    Losing streak: {trade.losing_streak_at_trade}{" "}
                    {trade.losing_streak_at_trade === 1 ? "loss" : "losses"}
                  </span>
                </div>
              )}

              {!isWin && (
                <p className="text-sm text-muted-foreground">
                  No cashout on losses
                </p>
              )}
            </div>
          );
        })}

        {/* Show more indicator */}
        {hasMoreTrades && (
          <p className="text-center text-sm text-muted-foreground">
            +{trades.length - maxDisplay} more trades
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default TradeList;
