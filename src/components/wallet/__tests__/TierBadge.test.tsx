// =============================================
// TierBadge Tests
// src/components/wallet/__tests__/TierBadge.test.tsx
// =============================================

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TierBadge } from "../TierBadge";
import { Tier } from "@/types";

describe("TierBadge", () => {
  it("should render tier label only by default", () => {
    render(<TierBadge tier={Tier.GROWTH} />);

    expect(screen.getByText("T3")).toBeInTheDocument();
    expect(screen.queryByText("GROWTH")).not.toBeInTheDocument();
  });

  it("should render tier label and name when showName is true", () => {
    render(<TierBadge tier={Tier.GROWTH} showName />);

    expect(screen.getByText("T3 GROWTH")).toBeInTheDocument();
  });

  it("should render correct labels for all tiers", () => {
    const { rerender } = render(<TierBadge tier={Tier.REBUILD} />);
    expect(screen.getByText("T1")).toBeInTheDocument();

    rerender(<TierBadge tier={Tier.RECOVERY} />);
    expect(screen.getByText("T2")).toBeInTheDocument();

    rerender(<TierBadge tier={Tier.GROWTH} />);
    expect(screen.getByText("T3")).toBeInTheDocument();

    rerender(<TierBadge tier={Tier.AGGRESSIVE} />);
    expect(screen.getByText("T4")).toBeInTheDocument();

    rerender(<TierBadge tier={Tier.MAXIMUM} />);
    expect(screen.getByText("T5")).toBeInTheDocument();
  });

  it("should render correct names for all tiers when showName is true", () => {
    const { rerender } = render(<TierBadge tier={Tier.REBUILD} showName />);
    expect(screen.getByText("T1 REBUILD")).toBeInTheDocument();

    rerender(<TierBadge tier={Tier.RECOVERY} showName />);
    expect(screen.getByText("T2 RECOVERY")).toBeInTheDocument();

    rerender(<TierBadge tier={Tier.GROWTH} showName />);
    expect(screen.getByText("T3 GROWTH")).toBeInTheDocument();

    rerender(<TierBadge tier={Tier.AGGRESSIVE} showName />);
    expect(screen.getByText("T4 AGGRESSIVE")).toBeInTheDocument();

    rerender(<TierBadge tier={Tier.MAXIMUM} showName />);
    expect(screen.getByText("T5 MAXIMUM")).toBeInTheDocument();
  });

  it("should apply correct size classes", () => {
    const { rerender } = render(<TierBadge tier={Tier.GROWTH} size="sm" />);
    const badge = screen.getByText("T3");
    expect(badge.className).toContain("text-xs");

    rerender(<TierBadge tier={Tier.GROWTH} size="md" />);
    expect(badge.className).toContain("text-sm");

    rerender(<TierBadge tier={Tier.GROWTH} size="lg" />);
    expect(badge.className).toContain("text-base");
  });

  it("should have correct color styling for T1 (REBUILD)", () => {
    render(<TierBadge tier={Tier.REBUILD} />);

    const badge = screen.getByText("T1");
    expect(badge).toHaveStyle({
      borderColor: "#EF4444",
      color: "#EF4444",
    });
  });

  it("should have correct color styling for T2 (RECOVERY)", () => {
    render(<TierBadge tier={Tier.RECOVERY} />);

    const badge = screen.getByText("T2");
    expect(badge).toHaveStyle({
      borderColor: "#F97316",
      color: "#F97316",
    });
  });

  it("should have correct color styling for T3 (GROWTH)", () => {
    render(<TierBadge tier={Tier.GROWTH} />);

    const badge = screen.getByText("T3");
    expect(badge).toHaveStyle({
      borderColor: "#EAB308",
      color: "#EAB308",
    });
  });

  it("should have correct color styling for T4 (AGGRESSIVE)", () => {
    render(<TierBadge tier={Tier.AGGRESSIVE} />);

    const badge = screen.getByText("T4");
    expect(badge).toHaveStyle({
      borderColor: "#22C55E",
      color: "#22C55E",
    });
  });

  it("should have correct color styling for T5 (MAXIMUM)", () => {
    render(<TierBadge tier={Tier.MAXIMUM} />);

    const badge = screen.getByText("T5");
    expect(badge).toHaveStyle({
      borderColor: "#10B981",
      color: "#10B981",
    });
  });

  it("should have title attribute with tier description", () => {
    render(<TierBadge tier={Tier.GROWTH} />);

    const badge = screen.getByText("T3");
    expect(badge).toHaveAttribute("title", "Tier 3: GROWTH");
  });
});
