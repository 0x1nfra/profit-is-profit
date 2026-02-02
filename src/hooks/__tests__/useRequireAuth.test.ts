// =============================================
// useRequireAuth Tests
// src/hooks/__tests__/useRequireAuth.test.ts
// =============================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRequireAuth } from "../useRequireAuth";
import { useAuthStore } from "@/lib/stores/auth-store";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("useRequireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().reset();
  });

  it("should return isAuthenticated false when not authenticated", () => {
    const { result } = renderHook(() => useRequireAuth());

    expect(result.current.isAuthenticated).toBe(false);
  });

  it("should return isAuthenticated true when authenticated", () => {
    useAuthStore.getState().setWalletAddress("test-address");

    const { result } = renderHook(() => useRequireAuth());

    expect(result.current.isAuthenticated).toBe(true);
  });

  it("should redirect to / when not authenticated", () => {
    renderHook(() => useRequireAuth());

    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("should not redirect when authenticated", () => {
    useAuthStore.getState().setWalletAddress("test-address");

    renderHook(() => useRequireAuth());

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("should return isLoading true when connecting", () => {
    useAuthStore.getState().setConnectionStatus("connecting");

    const { result } = renderHook(() => useRequireAuth());

    expect(result.current.isLoading).toBe(true);
  });

  it("should return isLoading false when not connecting", () => {
    useAuthStore.getState().setConnectionStatus("idle");

    const { result } = renderHook(() => useRequireAuth());

    expect(result.current.isLoading).toBe(false);
  });

  it("should not redirect when in connecting state even if not authenticated", () => {
    useAuthStore.getState().setConnectionStatus("connecting");

    renderHook(() => useRequireAuth());

    expect(mockPush).not.toHaveBeenCalled();
  });
});
