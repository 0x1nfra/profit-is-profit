// =============================================
// TradeList Tests
// src/components/trade/__tests__/TradeList.test.tsx
// =============================================

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TradeList } from "../TradeList";
import { Trade, TradeStatus, Tier } from "@/types";

describe("TradeList", () => {
  const mockConfirm = vi.fn();

  const createMockTrade = (
    id: string,
    isWin: boolean,
    status: TradeStatus = TradeStatus.PENDING
  ): Trade => ({
    id,
    user_id: "user-1",
    token_mint: "token-1",
    token_symbol: isWin ? "$ROCK" : "$PEPE",
    total_entry_sol: 2.0,
    total_exit_sol: isWin ? 4.5 : 1.5,
    net_profit_sol: isWin ? 2.5 : -0.5,
    roi_percent: isWin ? 125 : -25,
    tier_at_trade: Tier.GROWTH,
    losing_streak_at_trade: isWin ? 0 : 1,
    base_cashout_percent: 25,
    roi_bonus_percent: isWin ? 20 : 0,
    streak_multiplier: 1.0,
    goal_boost_multiplier: 1.0,
    final_cashout_percent: isWin ? 45 : 0,
    recommended_cashout_sol: isWin ? 1.125 : 0,
    status,
    position_closed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });

  it("should render empty state when no trades", () => {
    render(<TradeList trades={[]} />);

    expect(screen.getByText("No Trades Yet")).toBeInTheDocument();
    expect(
      screen.getByText("Complete a trade to see cashout recommendations here.")
    ).toBeInTheDocument();
  });

  it("should render win trade with token symbol", () => {
    const trades = [createMockTrade("1", true)];
    render(<TradeList trades={trades} />);

    expect(screen.getByText("$ROCK")).toBeInTheDocument();
  });

  it("should render loss trade with token symbol", () => {
    const trades = [createMockTrade("2", false)];
    render(<TradeList trades={trades} />);

    expect(screen.getByText("$PEPE")).toBeInTheDocument();
  });

  it("should display correct ROI for win trade", () => {
    const trades = [createMockTrade("1", true)];
    render(<TradeList trades={trades} />);

    expect(screen.getByText("+125.0% ROI")).toBeInTheDocument();
  });

  it("should display correct ROI for loss trade", () => {
    const trades = [createMockTrade("2", false)];
    render(<TradeList trades={trades} />);

    expect(screen.getByText("-25.0% ROI")).toBeInTheDocument();
  });

  it("should show profit amount for win trade", () => {
    const trades = [createMockTrade("1", true)];
    render(<TradeList trades={trades} />);

    expect(screen.getByText(/2\.500 SOL/)).toBeInTheDocument();
    expect(screen.getByText(/\$375\.00/)).toBeInTheDocument();
  });

  it("should show loss amount for loss trade", () => {
    const trades = [createMockTrade("2", false)];
    render(<TradeList trades={trades} />);

    expect(screen.getByText(/-0\.500 SOL/)).toBeInTheDocument();
  });

  it("should show cashout recommendation for win trade", () => {
    const trades = [createMockTrade("1", true)];
    render(<TradeList trades={trades} />);

    expect(screen.getByText("Recommended Cashout")).toBeInTheDocument();
    expect(screen.getByText("1.125 SOL")).toBeInTheDocument();
    expect(screen.getByText("45.0% of profit")).toBeInTheDocument();
  });

  it("should show losing streak warning for loss trade", () => {
    const trades = [createMockTrade("2", false)];
    render(<TradeList trades={trades} />);

    expect(screen.getByText(/Losing streak: 1 loss/)).toBeInTheDocument();
  });

  it("should show confirm cashout button for pending win trades", () => {
    const trades = [createMockTrade("1", true, TradeStatus.PENDING)];
    render(<TradeList trades={trades} onConfirmCashout={mockConfirm} />);

    expect(screen.getByText("Confirm Cashout")).toBeInTheDocument();
  });

  it("should call onConfirmCashout when button clicked", () => {
    const trades = [createMockTrade("trade-123", true, TradeStatus.PENDING)];
    render(<TradeList trades={trades} onConfirmCashout={mockConfirm} />);

    const button = screen.getByText("Confirm Cashout");
    fireEvent.click(button);

    expect(mockConfirm).toHaveBeenCalledWith("trade-123");
  });

  it("should show confirmed status for confirmed trades", () => {
    const trades = [createMockTrade("1", true, TradeStatus.CONFIRMED)];
    render(<TradeList trades={trades} onConfirmCashout={mockConfirm} />);

    expect(screen.getByText("Cashout confirmed")).toBeInTheDocument();
    expect(screen.queryByText("Confirm Cashout")).not.toBeInTheDocument();
  });

  it("should show overridden status for overridden trades", () => {
    const trade = {
      ...createMockTrade("1", true, TradeStatus.OVERRIDDEN),
      actual_cashout_sol: 0.8,
    };
    render(<TradeList trades={[trade]} onConfirmCashout={mockConfirm} />);

    expect(screen.getByText(/Custom amount: 0\.800 SOL/)).toBeInTheDocument();
  });

  it("should show View All button when showViewAll is true", () => {
    const trades = [createMockTrade("1", true)];
    render(<TradeList trades={trades} showViewAll />);

    expect(screen.getByText("View All")).toBeInTheDocument();
  });

  it("should not show View All button when showViewAll is false", () => {
    const trades = [createMockTrade("1", true)];
    render(<TradeList trades={trades} showViewAll={false} />);

    expect(screen.queryByText("View All")).not.toBeInTheDocument();
  });

  it("should limit displayed trades to maxDisplay", () => {
    const trades = [
      createMockTrade("1", true),
      createMockTrade("2", true),
      createMockTrade("3", true),
      createMockTrade("4", true),
      createMockTrade("5", true),
      createMockTrade("6", true),
    ];
    render(<TradeList trades={trades} maxDisplay={3} />);

    // Should show +3 more trades indicator
    expect(screen.getByText("+3 more trades")).toBeInTheDocument();
  });

  it("should show tier and streak information", () => {
    const trades = [createMockTrade("1", true)];
    render(<TradeList trades={trades} />);

    expect(screen.getByText(/Tier: GROWTH/)).toBeInTheDocument();
    expect(screen.getByText(/Streak: None/)).toBeInTheDocument();
  });

  it("should show base and bonus percentages", () => {
    const trades = [createMockTrade("1", true)];
    render(<TradeList trades={trades} />);

    expect(screen.getByText(/Base: 25% \| Bonus: \+20%/)).toBeInTheDocument();
  });

  it("should handle unknown token symbol gracefully", () => {
    const trade = {
      ...createMockTrade("1", true),
      token_symbol: null,
    };
    render(<TradeList trades={[trade]} />);

    expect(screen.getByText("Unknown Token")).toBeInTheDocument();
  });

  it("should show no cashout message for loss trades", () => {
    const trades = [createMockTrade("2", false)];
    render(<TradeList trades={trades} />);

    expect(screen.getByText("No cashout on losses")).toBeInTheDocument();
  });
});
