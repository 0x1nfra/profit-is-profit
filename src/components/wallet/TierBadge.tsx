// =============================================
// Tier Badge Component
// src/components/wallet/TierBadge.tsx
// =============================================

"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tier } from "@/types";

export interface TierBadgeProps {
  tier: Tier;
  showName?: boolean;
  size?: "sm" | "md" | "lg";
}

const tierConfig: Record<
  Tier,
  { label: string; name: string; lightColor: string; darkColor: string }
> = {
  [Tier.REBUILD]: {
    label: "T1",
    name: "REBUILD",
    lightColor: "#DC2626", // Red
    darkColor: "#EF4444",
  },
  [Tier.RECOVERY]: {
    label: "T2",
    name: "RECOVERY",
    lightColor: "#EA580C", // Orange
    darkColor: "#F97316",
  },
  [Tier.GROWTH]: {
    label: "T3",
    name: "GROWTH",
    lightColor: "#CA8A04", // Yellow
    darkColor: "#EAB308",
  },
  [Tier.AGGRESSIVE]: {
    label: "T4",
    name: "AGGRESSIVE",
    lightColor: "#16A34A", // Green
    darkColor: "#22C55E",
  },
  [Tier.MAXIMUM]: {
    label: "T5",
    name: "MAXIMUM",
    lightColor: "#059669", // Emerald
    darkColor: "#10B981",
  },
};

const sizeClasses = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
  lg: "text-base px-3 py-1.5",
};

export function TierBadge({ tier, showName = false, size = "md" }: TierBadgeProps) {
  const config = tierConfig[tier];

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold border-2",
        sizeClasses[size],
        "dark:bg-opacity/20"
      )}
      style={{
        borderColor: config.darkColor,
        color: config.darkColor,
        backgroundColor: `${config.darkColor}15`, // 15 = ~8% opacity in hex
      }}
      title={`Tier ${tier}: ${config.name}`}
    >
      {showName ? `${config.label} ${config.name}` : config.label}
    </Badge>
  );
}

export default TierBadge;
