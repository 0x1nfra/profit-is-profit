// =============================================
// WalletConnectButton Component
// src/components/auth/WalletConnectButton.tsx
// =============================================

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  useAuthStore,
  type WalletError,
  type ConnectionStatus,
} from "@/lib/stores/auth-store";
import { Wallet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WalletConnectButtonProps {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
  onConnect?: (walletAddress: string) => void;
  onError?: (error: WalletError) => void;
}

const sizeClasses = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-base",
  lg: "h-12 px-6 text-lg",
};

const variantClasses = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
};

export function WalletConnectButton({
  size = "md",
  variant = "primary",
  fullWidth = false,
  onConnect,
  onError,
}: WalletConnectButtonProps) {
  const {
    isAuthenticated,
    walletAddress,
    connectionStatus,
    error,
    connect,
    disconnect,
    clearError,
  } = useAuthStore();

  const handleConnect = async () => {
    clearError();

    try {
      await connect();
      const currentAddress = useAuthStore.getState().walletAddress;
      if (currentAddress && onConnect) {
        onConnect(currentAddress);
      }
    } catch (err) {
      if (onError && err && typeof err === "object" && "type" in err) {
        onError(err as WalletError);
      }
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  const truncateAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Connected state
  if (isAuthenticated && walletAddress) {
    return (
      <Button
        onClick={handleDisconnect}
        className={cn(
          sizeClasses[size],
          "bg-green-600 text-white hover:bg-green-700",
          fullWidth && "w-full"
        )}
      >
        <CheckCircle2 className="mr-2 h-4 w-4" />
        <span>{truncateAddress(walletAddress)}</span>
      </Button>
    );
  }

  // Connecting state
  if (connectionStatus === "connecting") {
    return (
      <Button
        disabled
        className={cn(
          sizeClasses[size],
          variantClasses[variant],
          fullWidth && "w-full",
          "opacity-70"
        )}
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span>Connecting...</span>
      </Button>
    );
  }

  // Error state
  if (connectionStatus === "error" && error) {
    return (
      <div className="flex flex-col gap-2">
        <Button
          onClick={handleConnect}
          className={cn(
            sizeClasses[size],
            "bg-red-600 text-white hover:bg-red-700",
            fullWidth && "w-full"
          )}
        >
          <AlertCircle className="mr-2 h-4 w-4" />
          <span>Retry Connection</span>
        </Button>
        <p className="text-xs text-red-600">{error.message}</p>
      </div>
    );
  }

  // Default / Idle state
  return (
    <Button
      onClick={handleConnect}
      className={cn(
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && "w-full"
      )}
    >
      <Wallet className="mr-2 h-4 w-4" />
      <span>Connect Wallet</span>
    </Button>
  );
}

export default WalletConnectButton;
