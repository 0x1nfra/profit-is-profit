// =============================================
// useRequireAuth Hook
// src/hooks/useRequireAuth.ts
// =============================================

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";

export function useRequireAuth() {
  const router = useRouter();
  const { isAuthenticated, connectionStatus, isHydrated } = useAuthStore();

  useEffect(() => {
    // Only redirect after the store has been hydrated from localStorage
    // and we're not in a connecting state and not authenticated
    if (isHydrated && connectionStatus !== "connecting" && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, connectionStatus, isHydrated, router]);

  return {
    isAuthenticated,
    isLoading: connectionStatus === "connecting" || !isHydrated,
    isHydrated,
  };
}

export default useRequireAuth;
