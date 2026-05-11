import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TradeCard } from "../TradeCard";
import type { Doc } from "../../../../convex/_generated/dataModel";

// Minimal trade factory — only fields TradeCard actually reads
function makeTrade(overrides: Partial<Doc<"trades">>): Doc<"trades"> {
  return {
    _id: "trade1" as Doc<"trades">["_id"],
    _creationTime: 0,
    userId: "user1",
    tradingWalletId: "wallet1" as Doc<"trades">["tradingWalletId"],
    tokenMint: "AAAA1111BBBB",
    tokenSymbol: "SOL",
    totalEntrySol: 1,
    totalExitSol: 1.5,
    netProfitSol: 0.5,
    roiPercent: 50,
    totalFeesSol: 0.001,
    tierAtTrade: 2,
    losingStreakAtTrade: 0,
    baseCashoutPercent: 15,
    roiBonusPercent: 10,
    streakMultiplier: 1.0,
    goalBoostMultiplier: 1.0,
    finalCashoutPercent: 25,
    recommendedCashoutSol: 0.125,
    status: "pending",
    positionClosedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Doc<"trades">;
}

const VAULT = "VAULT000VAULT000VAULT000";

// These tests FAIL until Plan 04 creates TradeCard.tsx
describe("TradeCard", () => {
  it("renders token symbol in collapsed state", () => {
    render(<TradeCard trade={makeTrade({})} vaultAddress={VAULT} />);
    expect(screen.getByText("SOL")).toBeInTheDocument();
  });

  it("renders 'Loss' badge for losing trades (netProfitSol <= 0)", () => {
    render(<TradeCard trade={makeTrade({ netProfitSol: -0.5, status: "confirmed" })} vaultAddress={VAULT} />);
    expect(screen.getByText("Loss")).toBeInTheDocument();
  });

  it("renders 'Cashed Out' badge for confirmed winning trades", () => {
    render(<TradeCard trade={makeTrade({ status: "confirmed" })} vaultAddress={VAULT} />);
    expect(screen.getByText("Cashed Out")).toBeInTheDocument();
  });

  it("renders recommended cashout SOL for pending winning trades", () => {
    render(<TradeCard trade={makeTrade({ status: "pending", recommendedCashoutSol: 0.125 })} vaultAddress={VAULT} />);
    expect(screen.getByText(/0.1250 SOL/)).toBeInTheDocument();
  });
});
