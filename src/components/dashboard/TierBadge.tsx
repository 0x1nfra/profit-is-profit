"use client";

import { Badge } from "@/components/ui/badge";
import { calculateTier, getTierConfig } from "@/lib/tier-calculator";
import { Tier } from "@/types";

/**
 * User-facing tier labels (from CONTEXT.md decisions).
 * These differ from internal `TIER_CONFIG.name` (REBUILD, RECOVERY, etc.) —
 * the codebase uses internal names; users see the friendlier labels below.
 */
const TIER_LABELS: Record<Tier, string> = {
  [Tier.REBUILD]: "Critical",
  [Tier.RECOVERY]: "Caution",
  [Tier.GROWTH]: "Stable",
  [Tier.AGGRESSIVE]: "Healthy",
  [Tier.MAXIMUM]: "Peak",
};

interface TierBadgeProps {
  balanceSol: number;
  losingStreak?: number;
}

/**
 * Renders the wallet health tier as a colored badge with description and
 * optional losing-streak warning. Tier is computed from `balanceSol` via
 * the pure `calculateTier` function (no DB lookup).
 */
export function TierBadge({ balanceSol, losingStreak = 0 }: TierBadgeProps) {
  const tier = calculateTier(balanceSol);
  const config = getTierConfig(tier);
  const label = TIER_LABELS[tier];

  return (
    <div className="space-y-1">
      <Badge
        className="text-white font-semibold border-transparent text-sm"
        style={{ backgroundColor: config.color }}
      >
        Tier {tier} — {label}
      </Badge>
      <p className="text-sm text-zinc-400">{config.description}</p>
      {losingStreak > 0 && (
        <p className="text-sm text-orange-400">{losingStreak}-loss streak</p>
      )}
    </div>
  );
}
