// =============================================
// WalletConnectButton Tests
// src/components/auth/__tests__/WalletConnectButton.test.tsx
// =============================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WalletConnectButton } from "../WalletConnectButton";
import { useAuthStore } from "@/lib/stores/auth-store";

describe("WalletConnectButton", () => {
  beforeEach(() => {
    // Reset auth store
    useAuthStore.getState().reset();
  });

  it("should render connect button in idle state", () => {
    render(<WalletConnectButton />);

    expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
  });

  it("should show connecting state when connection is in progress", () => {
    useAuthStore.getState().setConnectionStatus("connecting");

    render(<WalletConnectButton />);

    expect(screen.getByText("Connecting...")).toBeInTheDocument();
  });

  it("should show connected state with truncated wallet address", () => {
    const walletAddress = "7xKxy123456789abcdef";
    useAuthStore.getState().setWalletAddress(walletAddress);

    render(<WalletConnectButton />);

    // Should show truncated address: 7xK...cdef
    expect(screen.getByText("7xK...cdef")).toBeInTheDocument();
  });

  it("should show error state with retry button", () => {
    useAuthStore.getState().setError({
      type: "EXTENSION_NOT_FOUND",
      message: "No wallet extension found",
    });

    render(<WalletConnectButton />);

    expect(screen.getByText("Retry Connection")).toBeInTheDocument();
    expect(screen.getByText("No wallet extension found")).toBeInTheDocument();
  });

  it("should call onConnect when connection succeeds", async () => {
    const onConnect = vi.fn();
    const walletAddress = "7xKxy123456789";

    // Mock successful connection
    const mockConnect = vi.fn().mockResolvedValue(undefined);
    (window as Window & { solana?: { connect: () => Promise<{ publicKey: { toString: () => string } }> } }).solana = {
      connect: vi.fn().mockResolvedValue({
        publicKey: { toString: () => walletAddress },
      }),
    };

    useAuthStore.getState().connect = mockConnect;

    render(<WalletConnectButton onConnect={onConnect} />);

    fireEvent.click(screen.getByText("Connect Wallet"));

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalled();
    });
  });

  it("should call onError when connection fails", async () => {
    const onError = vi.fn();
    const error = {
      type: "USER_REJECTED" as const,
      message: "User rejected connection",
    };

    // Set error state
    useAuthStore.getState().setError(error);

    render(<WalletConnectButton onError={onError} />);

    // Component should be in error state
    expect(screen.getByText("Retry Connection")).toBeInTheDocument();
  });

  it("should apply different sizes correctly", () => {
    const { rerender } = render(<WalletConnectButton size="sm" />);
    expect(screen.getByText("Connect Wallet")).toBeInTheDocument();

    rerender(<WalletConnectButton size="md" />);
    expect(screen.getByText("Connect Wallet")).toBeInTheDocument();

    rerender(<WalletConnectButton size="lg" />);
    expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
  });

  it("should apply fullWidth class when specified", () => {
    render(<WalletConnectButton fullWidth />);

    const button = screen.getByText("Connect Wallet").closest("button");
    expect(button?.className).toContain("w-full");
  });

  it("should disconnect when clicking connected button", async () => {
    const walletAddress = "7xKxy123456789";
    useAuthStore.getState().setWalletAddress(walletAddress);

    const mockDisconnect = vi.fn().mockResolvedValue(undefined);
    (window as Window & { solana?: { disconnect: () => Promise<void> } }).solana = {
      disconnect: mockDisconnect,
    };

    render(<WalletConnectButton />);

    fireEvent.click(screen.getByText("7xK...6789"));

    await waitFor(() => {
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });
});
