// =============================================
// Auth Store - Zustand state management for authentication
// src/lib/stores/auth-store.ts
// =============================================

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WalletError =
  | { type: "EXTENSION_NOT_FOUND"; message: string }
  | { type: "USER_REJECTED"; message: string }
  | { type: "WRONG_NETWORK"; message: string; currentNetwork: string }
  | { type: "TIMEOUT"; message: string }
  | { type: "UNKNOWN"; message: string };

export type ConnectionStatus =
  | "idle"
  | "detecting"
  | "select_wallet"
  | "connecting"
  | "connected"
  | "error";

export interface AuthState {
  // Core state
  isAuthenticated: boolean;
  walletAddress: string | null;
  userId: string | null;

  // Connection state
  connectionStatus: ConnectionStatus;
  error: WalletError | null;
  
  // Hydration state
  isHydrated: boolean;

  // Actions
  setWalletAddress: (address: string | null) => void;
  setUserId: (userId: string | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setError: (error: WalletError | null) => void;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  isAuthenticated: false,
  walletAddress: null,
  userId: null,
  connectionStatus: "idle" as ConnectionStatus,
  error: null,
  isHydrated: false, // Track if store has been rehydrated from localStorage
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setWalletAddress: (address) => {
        set({
          walletAddress: address,
          isAuthenticated: !!address,
        });
      },

      setUserId: (userId) => {
        set({ userId });
      },

      setConnectionStatus: (status) => {
        set({ connectionStatus: status });
      },

      setError: (error) => {
        set({
          error,
          connectionStatus: error ? "error" : get().connectionStatus,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      connect: async () => {
        set({ connectionStatus: "connecting", error: null });

        try {
          // Check if window.solana is available (Phantom, Solflare, etc.)
          const solana = (window as Window & { solana?: { connect: () => Promise<{ publicKey: { toString: () => string } }>; isPhantom?: boolean } }).solana;

          if (!solana) {
            const error: WalletError = {
              type: "EXTENSION_NOT_FOUND",
              message:
                "No Solana wallet extension found. Please install Phantom or Solflare.",
            };
            set({ error, connectionStatus: "error" });
            throw error;
          }

          // Request connection
          const response = await solana.connect();
          const walletAddress = response.publicKey.toString();

          set({
            walletAddress,
            isAuthenticated: true,
            connectionStatus: "connected",
            error: null,
          });

          // Set a cookie so middleware can detect authenticated state
          // This bridges the gap between localStorage (client) and cookies (middleware)
          document.cookie = `pisp-wallet-auth=true; path=/; max-age=604800`; // 7 days
          
        } catch (err) {
          let error: WalletError;

          if (err instanceof Error) {
            if (err.message.includes("User rejected")) {
              error = {
                type: "USER_REJECTED",
                message: "Connection rejected by user",
              };
            } else if (err.message.includes("timeout")) {
              error = {
                type: "TIMEOUT",
                message: "Connection timed out",
              };
            } else {
              error = {
                type: "UNKNOWN",
                message: err.message,
              };
            }
          } else {
            error = {
              type: "UNKNOWN",
              message: "An unknown error occurred",
            };
          }

          set({
            error,
            connectionStatus: "error",
            isAuthenticated: false,
            walletAddress: null,
          });

          throw error;
        }
      },

      disconnect: async () => {
        try {
          const solana = (window as Window & { solana?: { disconnect: () => Promise<void> } }).solana;
          if (solana?.disconnect) {
            await solana.disconnect();
          }
        } catch {
          // Ignore disconnect errors
        }

        // Clear the auth cookie
        document.cookie = "pisp-wallet-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

        set({
          ...initialState,
        });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: "pisp-auth-storage",
      partialize: (state) => ({
        walletAddress: state.walletAddress,
        isAuthenticated: state.isAuthenticated,
        userId: state.userId,
      }),
      onRehydrateStorage: (state) => {
        // Mark store as hydrated after rehydration from localStorage
        return (newState, error) => {
          if (!error && newState) {
            newState.isHydrated = true;
          }
        };
      },
    }
  )
);

// Selector hooks for better performance
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);
export const useWalletAddress = () =>
  useAuthStore((state) => state.walletAddress);
export const useConnectionStatus = () =>
  useAuthStore((state) => state.connectionStatus);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useAuthHydrated = () => useAuthStore((state) => state.isHydrated);
