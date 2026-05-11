import { render, screen } from "@testing-library/react";
import { TierBadge } from "../TierBadge";

// These tests FAIL until Plan 03 creates TierBadge.tsx
describe("TierBadge", () => {
  it("renders 'Tier 1 — Critical' for balanceSol=0 (REBUILD tier)", () => {
    render(<TierBadge balanceSol={0} />);
    expect(screen.getByText(/Tier 1 — Critical/)).toBeInTheDocument();
  });

  it("renders 'Tier 5 — Peak' for balanceSol=500 (MAXIMUM tier)", () => {
    render(<TierBadge balanceSol={500} />);
    expect(screen.getByText(/Tier 5 — Peak/)).toBeInTheDocument();
  });

  it("shows losing streak text when losingStreak > 0", () => {
    render(<TierBadge balanceSol={0} losingStreak={3} />);
    expect(screen.getByText(/3-loss streak/)).toBeInTheDocument();
  });

  it("hides losing streak when losingStreak is 0", () => {
    render(<TierBadge balanceSol={0} losingStreak={0} />);
    expect(screen.queryByText(/loss streak/)).not.toBeInTheDocument();
  });

  it("hides losing streak when losingStreak is omitted (default 0)", () => {
    render(<TierBadge balanceSol={0} />);
    expect(screen.queryByText(/loss streak/)).not.toBeInTheDocument();
  });
});
