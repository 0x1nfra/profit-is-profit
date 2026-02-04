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

// Onboarding is disabled - always return true
export function useRequireSetup() {
  return {
    hasSetup: true,
    isLoading: false,
  };
}

export default useRequireSetup;
