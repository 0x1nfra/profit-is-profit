'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { WalletSetupForm } from '@/components/forms/WalletSetupForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SetupPage() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Defensive check - if no wallet connected, redirect to landing
    if (!publicKey) {
      router.push('/');
      return;
    }

    setIsLoading(false);
  }, [publicKey, router]);

  if (isLoading || !publicKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  const connectedAddress = publicKey.toBase58();

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white">Set Up Your Wallets</h1>
          <p className="mt-2 text-lg text-zinc-400">
            Tell us where you trade and where you stash your gains
          </p>
        </div>

        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Wallet Configuration</CardTitle>
            <CardDescription className="text-zinc-400">
              Configure your trading and vault wallets to start tracking profits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WalletSetupForm connectedAddress={connectedAddress} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
