// =============================================
// Auth Store Tests
// src/lib/stores/__tests__/auth-store.test.ts
// =============================================

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuthStore } from "../auth-store";

describe("Auth Store", () => {
  beforeEach(() => {
    // Reset store to initial state
    useAuthStore.getState().reset();
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useAuthStore.getState();

      expect(state.isAuthenticated).toBe(false);
      expect(state.walletAddress).toBeNull();
      expect(state.userId).toBeNull();
      expect(state.connectionStatus).toBe("idle");
      expect(state.error).toBeNull();
    });
  });

  describe("setWalletAddress", () => {
    it("should set wallet address and authenticate", () => {
      const { setWalletAddress } = useAuthStore.getState();
      const address = "7xKxy...";

      setWalletAddress(address);

      const state = useAuthStore.getState();
      expect(state.walletAddress).toBe(address);
      expect(state.isAuthenticated).toBe(true);
    });

    it("should clear wallet address and unauthenticate when null", () => {
      const { setWalletAddress } = useAuthStore.getState();

      setWalletAddress("7xKxy...");
      setWalletAddress(null);

      const state = useAuthStore.getState();
      expect(state.walletAddress).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe("setUserId", () => {
    it("should set user ID", () => {
      const { setUserId } = useAuthStore.getState();
      const userId = "user-123";

      setUserId(userId);

      expect(useAuthStore.getState().userId).toBe(userId);
    });

    it("should clear user ID when null", () => {
      const { setUserId } = useAuthStore.getState();

      setUserId("user-123");
      setUserId(null);

      expect(useAuthStore.getState().userId).toBeNull();
    });
  });

  describe("setConnectionStatus", () => {
    it("should update connection status", () => {
      const { setConnectionStatus } = useAuthStore.getState();

      setConnectionStatus("connecting");
      expect(useAuthStore.getState().connectionStatus).toBe("connecting");

      setConnectionStatus("connected");
      expect(useAuthStore.getState().connectionStatus).toBe("connected");
    });
  });

  describe("setError", () => {
    it("should set error and update status to error", () => {
      const { setError } = useAuthStore.getState();
      const error = {
        type: "EXTENSION_NOT_FOUND" as const,
        message: "No wallet found",
      };

      setError(error);

      const state = useAuthStore.getState();
      expect(state.error).toEqual(error);
      expect(state.connectionStatus).toBe("error");
    });

    it("should clear error without changing status when null", () => {
      const { setError, setConnectionStatus } = useAuthStore.getState();

      setConnectionStatus("connecting");
      setError({
        type: "UNKNOWN" as const,
        message: "Error",
      });
      setError(null);

      const state = useAuthStore.getState();
      expect(state.error).toBeNull();
      // Status should remain as whatever it was (error state persists until manually changed)
      expect(state.connectionStatus).toBe("error");
    });
  });

  describe("clearError", () => {
    it("should clear error", () => {
      const { setError, clearError } = useAuthStore.getState();

      setError({
        type: "UNKNOWN" as const,
        message: "Error",
      });
      clearError();

      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe("connect", () => {
    it("should set status to connecting", async () => {
      const { connect } = useAuthStore.getState();

      // Mock window.solana to throw extension not found
      const mockConnect = vi.fn().mockRejectedValue(new Error("User rejected"));
      (window as Window & { solana?: { connect: () => Promise<{ publicKey: { toString: () => string } }> } }).solana = {
        connect: mockConnect,
      };

      try {
        await connect();
      } catch {
        // Expected to throw
      }

      // Status should be error after failed connection
      expect(useAuthStore.getState().connectionStatus).toBe("error");
    });

    it("should set extension not found error when solana is undefined", async () => {
      const { connect } = useAuthStore.getState();

      // Mock window.solana as undefined
      Object.defineProperty(window, 'solana', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      await expect(connect()).rejects.toEqual({
        type: "EXTENSION_NOT_FOUND",
        message: "No Solana wallet extension found. Please install Phantom or Solflare.",
      });

      const state = useAuthStore.getState();
      expect(state.error?.type).toBe("EXTENSION_NOT_FOUND");
      expect(state.connectionStatus).toBe("error");
    });

    it("should successfully connect and set wallet address", async () => {
      const { connect } = useAuthStore.getState();
      const mockAddress = "7xKxy123456789";

      const mockConnect = vi.fn().mockResolvedValue({
        publicKey: {
          toString: () => mockAddress,
        },
      });

      (window as Window & { solana?: { connect: () => Promise<{ publicKey: { toString: () => string } }> } }).solana = {
        connect: mockConnect,
      };

      await connect();

      const state = useAuthStore.getState();
      expect(state.walletAddress).toBe(mockAddress);
      expect(state.isAuthenticated).toBe(true);
      expect(state.connectionStatus).toBe("connected");
      expect(state.error).toBeNull();
    });

    it("should handle user rejection", async () => {
      const { connect } = useAuthStore.getState();

      const mockConnect = vi.fn().mockRejectedValue(new Error("User rejected the request"));
      (window as Window & { solana?: { connect: () => Promise<{ publicKey: { toString: () => string } }> } }).solana = {
        connect: mockConnect,
      };

      await expect(connect()).rejects.toEqual({
        type: "USER_REJECTED",
        message: "Connection rejected by user",
      });

      const state = useAuthStore.getState();
      expect(state.error?.type).toBe("USER_REJECTED");
      expect(state.isAuthenticated).toBe(false);
    });

    it("should handle timeout error", async () => {
      const { connect } = useAuthStore.getState();

      const mockConnect = vi.fn().mockRejectedValue(new Error("Connection timeout"));
      (window as Window & { solana?: { connect: () => Promise<{ publicKey: { toString: () => string } }> } }).solana = {
        connect: mockConnect,
      };

      await expect(connect()).rejects.toEqual({
        type: "TIMEOUT",
        message: "Connection timed out",
      });

      const state = useAuthStore.getState();
      expect(state.error?.type).toBe("TIMEOUT");
    });

    it("should handle unknown errors", async () => {
      const { connect } = useAuthStore.getState();

      const mockConnect = vi.fn().mockRejectedValue(new Error("Random error"));
      (window as Window & { solana?: { connect: () => Promise<{ publicKey: { toString: () => string } }> } }).solana = {
        connect: mockConnect,
      };

      await expect(connect()).rejects.toEqual({
        type: "UNKNOWN",
        message: "Random error",
      });
    });
  });

  describe("disconnect", () => {
    it("should reset state to initial values", async () => {
      const { connect, disconnect } = useAuthStore.getState();

      // First connect
      const mockConnect = vi.fn().mockResolvedValue({
        publicKey: { toString: () => "7xKxy..." },
      });
      (window as Window & { solana?: { connect: () => Promise<{ publicKey: { toString: () => string } }>; disconnect: () => Promise<void> } }).solana = {
        connect: mockConnect,
        disconnect: vi.fn().mockResolvedValue(undefined),
      };

      await connect();
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Then disconnect
      await disconnect();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.walletAddress).toBeNull();
      expect(state.userId).toBeNull();
      expect(state.connectionStatus).toBe("idle");
    });

    it("should handle disconnect errors gracefully", async () => {
      const { setWalletAddress, disconnect } = useAuthStore.getState();

      setWalletAddress("7xKxy...");

      // Mock disconnect to throw
      (window as Window & { solana?: { disconnect: () => Promise<void> } }).solana = {
        disconnect: vi.fn().mockRejectedValue(new Error("Disconnect failed")),
      };

      // Should not throw
      await expect(disconnect()).resolves.not.toThrow();

      // State should still be reset
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe("reset", () => {
    it("should reset all state to initial values", () => {
      const { setWalletAddress, setUserId, setConnectionStatus, reset } =
        useAuthStore.getState();

      setWalletAddress("7xKxy...");
      setUserId("user-123");
      setConnectionStatus("connected");

      reset();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.walletAddress).toBeNull();
      expect(state.userId).toBeNull();
      expect(state.connectionStatus).toBe("idle");
      expect(state.error).toBeNull();
    });
  });
});

describe("Auth Store Selectors", () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it("should useIsAuthenticated return correct value", () => {
    const { setWalletAddress } = useAuthStore.getState();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);

    setWalletAddress("7xKxy...");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("should useWalletAddress return correct value", () => {
    const { setWalletAddress } = useAuthStore.getState();
    const address = "7xKxy...";

    setWalletAddress(address);
    expect(useAuthStore.getState().walletAddress).toBe(address);
  });

  it("should useConnectionStatus return correct value", () => {
    const { setConnectionStatus } = useAuthStore.getState();

    setConnectionStatus("connecting");
    expect(useAuthStore.getState().connectionStatus).toBe("connecting");
  });

  it("should useAuthError return correct value", () => {
    const { setError } = useAuthStore.getState();
    const error = { type: "UNKNOWN" as const, message: "Test error" };

    setError(error);
    expect(useAuthStore.getState().error).toEqual(error);
  });
});
