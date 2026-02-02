// =============================================
// WalletCard Tests
// src/components/wallet/__tests__/WalletCard.test.tsx
// =============================================

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WalletCard } from "../WalletCard";
import { Tier } from "@/types";

describe("WalletCard", () => {
  const mockRefresh = vi.fn();

  const tradingWallet = {
    type: "trading" as const,
    address: "7xKxy123456789abcdef",
    balanceSol: 2.5,
    balanceUsd: 375.0,
    tier: Tier.GROWTH,
    lastSyncedAt: new Date().toISOString(),
  };

  const vaultWallet = {
    type: "vault" as const,
    address: "Vault123456789abcdef",
    balanceSol: 12.3,
    balanceUsd: 1845.0,
  };

  it("should render trading wallet with correct title", () => {
    render(<WalletCard wallet={tradingWallet} />);

    expect(screen.getByText("Trading Wallet")).toBeInTheDocument();
  });

  it("should render vault wallet with correct title", () => {
    render(<WalletCard wallet={vaultWallet} />);

    expect(screen.getByText("Vault Wallet")).toBeInTheDocument();
  });

  it("should display balance in SOL and USD", () => {
    render(<WalletCard wallet={tradingWallet} />);

    expect(screen.getByText("2.5 SOL")).toBeInTheDocument();
    expect(screen.getByText("$375.00")).toBeInTheDocument();
  });

  it("should show truncated wallet address", () => {
    render(<WalletCard wallet={tradingWallet} />);

    expect(screen.getByText("7xKxy...cdef")).toBeInTheDocument();
  });

  it("should render tier badge for trading wallet", () => {
    render(<WalletCard wallet={tradingWallet} />);

    expect(screen.getByText("T3 GROWTH")).toBeInTheDocument();
  });

  it("should not render tier badge for vault wallet", () => {
    render(<WalletCard wallet={vaultWallet} />);

    expect(screen.queryByText(/T[1-5]/)).not.toBeInTheDocument();
  });

  it("should show refresh button for trading wallet", () => {
    render(<WalletCard wallet={tradingWallet} onRefresh={mockRefresh} />);

    // RefreshCw icon should be present
    const refreshButton = screen.getAllByRole("button")[1]; // Second button is refresh
    expect(refreshButton).toBeInTheDocument();
  });

  it("should not show refresh button for vault wallet", () => {
    render(<WalletCard wallet={vaultWallet} onRefresh={mockRefresh} />);

    // Should only have copy button, not refresh
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(1); // Only copy button
  });

  it("should call onRefresh when refresh button clicked", () => {
    render(<WalletCard wallet={tradingWallet} onRefresh={mockRefresh} />);

    const refreshButton = screen.getAllByRole("button")[1];
    fireEvent.click(refreshButton);

    expect(mockRefresh).toHaveBeenCalled();
  });

  it("should show loading state when isRefreshing is true", () => {
    render(
      <WalletCard wallet={tradingWallet} onRefresh={mockRefresh} isRefreshing />
    );

    // Should show skeleton/loading state (animate-pulse elements)
    const pulseElements = document.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("should show error state when error prop is provided", () => {
    render(
      <WalletCard
        wallet={tradingWallet}
        onRefresh={mockRefresh}
        error="Failed to fetch"
      />
    );

    expect(screen.getByText("Failed to fetch balance")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("should show low balance warning for trading wallet below 1 SOL", () => {
    const lowBalanceWallet = {
      ...tradingWallet,
      balanceSol: 0.5,
    };

    render(<WalletCard wallet={lowBalanceWallet} />);

    expect(
      screen.getByText("Low balance - Consider adding funds")
    ).toBeInTheDocument();
  });

  it("should not show low balance warning for vault wallet", () => {
    const lowBalanceVault = {
      ...vaultWallet,
      balanceSol: 0.5,
    };

    render(<WalletCard wallet={lowBalanceVault} />);

    expect(
      screen.queryByText("Low balance - Consider adding funds")
    ).not.toBeInTheDocument();
  });

  it("should show last synced time for trading wallet", () => {
    render(<WalletCard wallet={tradingWallet} onRefresh={mockRefresh} />);

    expect(screen.getByText(/ago|Just now/)).toBeInTheDocument();
  });

  it("should format zero balance correctly", () => {
    const zeroBalanceWallet = {
      ...tradingWallet,
      balanceSol: 0,
      balanceUsd: 0,
    };

    render(<WalletCard wallet={zeroBalanceWallet} />);

    expect(screen.getByText("0.0 SOL")).toBeInTheDocument();
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });
});
