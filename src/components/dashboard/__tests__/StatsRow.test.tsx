import { render, screen } from "@testing-library/react";
import { StatsRow } from "../StatsRow";

const tradingWallet = {
  address: "TRADE000TRADE000TRADE000TRADE000TRADE",
  balanceSol: 1.5,
  balanceUsd: 300,
};

const vaultWallet = {
  address: "VAULT000VAULT000VAULT000VAULT000VAULT",
  balanceSol: 0.5,
  balanceUsd: 100,
};

// These tests FAIL until Plan 03 creates StatsRow.tsx
describe("StatsRow", () => {
  it("renders Trading Wallet card title", () => {
    render(<StatsRow tradingWallet={tradingWallet} vaultWallet={vaultWallet} />);
    expect(screen.getByText("Trading Wallet")).toBeInTheDocument();
  });

  it("renders Vault Wallet card title", () => {
    render(<StatsRow tradingWallet={tradingWallet} vaultWallet={vaultWallet} />);
    expect(screen.getByText("Vault Wallet")).toBeInTheDocument();
  });

  it("renders Wallet Health card title", () => {
    render(<StatsRow tradingWallet={tradingWallet} vaultWallet={vaultWallet} />);
    expect(screen.getByText("Wallet Health")).toBeInTheDocument();
  });

  it("displays trading wallet SOL balance", () => {
    render(<StatsRow tradingWallet={tradingWallet} vaultWallet={vaultWallet} />);
    expect(screen.getByText(/1.5000 SOL/)).toBeInTheDocument();
  });

  it("displays vault wallet SOL balance", () => {
    render(<StatsRow tradingWallet={tradingWallet} vaultWallet={vaultWallet} />);
    expect(screen.getByText(/0.5000 SOL/)).toBeInTheDocument();
  });
});
