// =============================================
// useRequireSetup Hook
// src/hooks/useRequireSetup.ts
// =============================================

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";

async function checkSetupStatus(): Promise<boolean> {
  try {
    const response = await fetch("/api/dashboard");
    if (response.ok) {
      const data = await response.json();
      return data.success && data.data?.wallets?.trading && data.data?.wallets?.vault;
    }
    return false;
  } catch {
    return false;
  }
}

export function useRequireSetup() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [hasSetup, setHasSetup] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSetup = useCallback(async () => {
    if (isAuthenticated) {
      try {
        const completed = await checkSetupStatus();
        setHasSetup(completed);
      } catch {
        setHasSetup(false);
      }
    }
    setIsLoading(false);
  }, [isAuthenticated]);

  useEffect(() => {
    // Use requestAnimationFrame to avoid setState in render
    requestAnimationFrame(() => {
      checkSetup();
    });
  }, [checkSetup]);

  useEffect(() => {
    if (isLoading) return;

    // If authenticated but no setup, redirect to setup
    if (isAuthenticated && hasSetup === false) {
      router.push("/setup");
    }

    // If setup complete but on setup page, redirect to dashboard
    if (isAuthenticated && hasSetup === true && typeof window !== "undefined") {
      if (window.location.pathname === "/setup") {
        router.push("/dashboard");
      }
    }
  }, [isLoading, isAuthenticated, hasSetup, router]);

  return {
    hasSetup,
    isLoading,
  };
}

export default useRequireSetup;
