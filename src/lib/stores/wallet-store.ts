// =============================================
// Profit is Profit (P is P) - Wallet Store
// src/lib/stores/wallet-store.ts
// =============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface WalletState {
  // State
  connectedAddress: string | null;
  isSetupComplete: boolean;
  lastAuthAt: number | null;
  sessionExpiry: number | null;

  // Actions
  setConnected: (address: string) => void;
  setSetupComplete: (complete: boolean) => void;
  isSessionValid: () => boolean;
  reset: () => void;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      // Initial state
      connectedAddress: null,
      isSetupComplete: false,
      lastAuthAt: null,
      sessionExpiry: null,

      // Set connected wallet address and create session
      setConnected: (address: string) => {
        const now = Date.now();
        set({
          connectedAddress: address,
          lastAuthAt: now,
          sessionExpiry: now + SEVEN_DAYS_MS,
        });
      },

      // Set setup completion status
      setSetupComplete: (complete: boolean) => {
        set({ isSetupComplete: complete });
      },

      // Check if session is still valid
      isSessionValid: () => {
        const { sessionExpiry } = get();
        if (!sessionExpiry) return false;
        return sessionExpiry > Date.now();
      },

      // Reset all state (used on disconnect)
      reset: () => {
        set({
          connectedAddress: null,
          isSetupComplete: false,
          lastAuthAt: null,
          sessionExpiry: null,
        });
      },
    }),
    {
      name: 'pisp-wallet-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
