// =============================================
// useRequireSetup Tests
// src/hooks/__tests__/useRequireSetup.test.ts
// =============================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useRequireSetup } from "../useRequireSetup";
import { useAuthStore } from "@/lib/stores/auth-store";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock global fetch
global.fetch = vi.fn();

describe("useRequireSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().reset();
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();
  });

  it("should return hasSetup as null initially", () => {
    const { result } = renderHook(() => useRequireSetup());

    expect(result.current.hasSetup).toBe(null);
    expect(result.current.isLoading).toBe(true);
  });

  it("should set hasSetup to true when API returns valid setup", async () => {
    useAuthStore.getState().setWalletAddress("test-address");

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          wallets: {
            trading: { id: "1" },
            vault: { id: "2" },
          },
        },
      }),
    });

    const { result } = renderHook(() => useRequireSetup());

    await waitFor(() => {
      expect(result.current.hasSetup).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should set hasSetup to false when API returns invalid setup", async () => {
    useAuthStore.getState().setWalletAddress("test-address");

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          wallets: {
            trading: null,
            vault: { id: "2" },
          },
        },
      }),
    });

    const { result } = renderHook(() => useRequireSetup());

    await waitFor(() => {
      expect(result.current.hasSetup).toBe(false);
    });
  });

  it("should redirect to /setup when authenticated but no setup", async () => {
    useAuthStore.getState().setWalletAddress("test-address");

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          wallets: {
            trading: null,
            vault: null,
          },
        },
      }),
    });

    renderHook(() => useRequireSetup());

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/setup");
    });
  });

  it("should handle API errors gracefully", async () => {
    useAuthStore.getState().setWalletAddress("test-address");

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error")
    );

    const { result } = renderHook(() => useRequireSetup());

    await waitFor(() => {
      expect(result.current.hasSetup).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should not check setup when not authenticated", async () => {
    const { result } = renderHook(() => useRequireSetup());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should call /api/dashboard to check setup status", async () => {
    useAuthStore.getState().setWalletAddress("test-address");

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          wallets: {
            trading: { id: "1" },
            vault: { id: "2" },
          },
        },
      }),
    });

    renderHook(() => useRequireSetup());

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/dashboard");
    });
  });
});
