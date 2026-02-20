'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useWalletStore } from '@/lib/stores/wallet-store';
import { signOut } from '@/lib/supabase';
import type { AuthVerifyRequest, AuthVerifyResponse } from '@/types/wallet';
import bs58 from 'bs58';

export default function LandingPage() {
  const router = useRouter();
  const { publicKey, signMessage, disconnect } = useWallet();
  const { connectedAddress, isSetupComplete, setConnected, reset, isSessionValid } = useWalletStore();

  const [isVerifying, setIsVerifying] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Auto-reconnect logic on mount
  useEffect(() => {
    const checkAutoReconnect = async () => {
      // Wait a bit for wallet adapter to settle
      await new Promise(resolve => setTimeout(resolve, 500));

      if (publicKey && connectedAddress) {
        const currentAddress = publicKey.toBase58();

        // Check if wallet address matches stored address
        if (currentAddress !== connectedAddress) {
          // Wallet switched in extension
          toast.error('Wallet changed, please sign in again');
          await disconnect();
          reset();
          setIsCheckingSession(false);
          return;
        }

        // Check session validity
        if (isSessionValid()) {
          // Session valid - show reconnect toast and redirect
          const truncated = `${currentAddress.slice(0, 4)}...${currentAddress.slice(-4)}`;
          toast.success(`Reconnected as ${truncated}`);

          // Redirect based on setup status
          if (isSetupComplete) {
            router.push('/dashboard');
          } else {
            router.push('/setup');
          }
        } else {
          // Session expired
          toast.warning('Session expired, please reconnect');
          await disconnect();
          reset();
        }
      }

      setIsCheckingSession(false);
    };

    checkAutoReconnect();
  }, [publicKey, connectedAddress, disconnect, reset, isSessionValid, isSetupComplete, router]);

  // Wallet connection handler
  useEffect(() => {
    const handleConnection = async () => {
      // Skip if no wallet connected or already verifying or still checking session
      if (!publicKey || isVerifying || isCheckingSession) return;

      // Skip if already connected to this address with valid session
      if (connectedAddress === publicKey.toBase58() && isSessionValid()) {
        return;
      }

      // Skip if this is an auto-reconnect scenario
      if (connectedAddress === publicKey.toBase58()) {
        return;
      }

      setIsVerifying(true);

      try {
        // Generate verification message
        const message = `Sign in to Profit is Profit\n\nTimestamp: ${Date.now()}`;
        const messageBytes = new TextEncoder().encode(message);

        // Request signature from wallet
        if (!signMessage) {
          throw new Error('Wallet does not support message signing');
        }

        const signature = await signMessage(messageBytes);

        // Encode signature with bs58
        const signatureBase58 = bs58.encode(signature);
        const publicKeyBase58 = publicKey.toBase58();

        // Prepare request payload
        const payload: AuthVerifyRequest = {
          publicKey: publicKeyBase58,
          message: Array.from(messageBytes),
          signature: signatureBase58,
        };

        // Send to verification API
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const result: AuthVerifyResponse = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Verification failed');
        }

        // Success - update store
        setConnected(publicKeyBase58);

        // Redirect to setup (routing logic for dashboard is in Plan 02)
        router.push('/setup');
      } catch (error) {
        console.error('Authentication error:', error);

        // Show error toast
        if (error instanceof Error) {
          if (error.message.includes('User rejected')) {
            toast.error('Signature request rejected');
          } else {
            toast.error(`Authentication failed: ${error.message}`);
          }
        } else {
          toast.error('Authentication failed');
        }

        // Disconnect wallet on failure
        await disconnect();
        reset();
      } finally {
        setIsVerifying(false);
      }
    };

    handleConnection();
  }, [publicKey, signMessage, disconnect, connectedAddress, isSessionValid, isVerifying, isCheckingSession, setConnected, reset, router]);

  // Disconnect handler
  const handleDisconnect = async () => {
    try {
      // Call signout API to clear cookies
      await fetch('/api/auth/signout', { method: 'POST' });

      await disconnect();
      await signOut();
      reset();
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Error disconnecting wallet');
    }
  };

  // Show loading state during session check
  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-zinc-400">Checking session...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
      <main className="flex flex-col items-center justify-center gap-8 text-center">
        {/* App name */}
        <h1 className="text-5xl font-bold tracking-tight text-white md:text-6xl">
          Profit is Profit
        </h1>

        {/* Value prop */}
        <div className="max-w-2xl space-y-4">
          <p className="text-xl text-zinc-300 md:text-2xl">
            Stop giving back your gains.
          </p>
          <p className="text-lg text-zinc-400">
            Automatically calculate how much to take off the table after every winning trade.
          </p>
        </div>

        {/* Connect button or disconnect */}
        <div className="mt-8">
          {publicKey && connectedAddress ? (
            <button
              onClick={handleDisconnect}
              className="rounded-lg bg-red-600 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              Disconnect Wallet
            </button>
          ) : (
            <div className="flex flex-col gap-4">
              <WalletMultiButton className="!bg-white !text-black hover:!bg-zinc-200 !rounded-lg !px-8 !py-4 !text-lg !font-semibold !transition-colors" />
              {isVerifying && (
                <p className="text-sm text-zinc-400">
                  Waiting for signature...
                </p>
              )}
            </div>
          )}
        </div>

        {/* Degen-friendly footer text */}
        <p className="mt-16 text-sm text-zinc-500">
          Built for degens who want to keep their gains
        </p>
      </main>
    </div>
  );
}
