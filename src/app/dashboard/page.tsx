'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Settings, LogOut, RefreshCw, Loader2 } from 'lucide-react';
import { useWalletStore } from '@/lib/stores/wallet-store';
import { signOut } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface WalletBalance {
  address: string;
  sol: number;
  usd: number;
}

interface WalletData {
  id: string;
  address: string;
  wallet_type: 'trading' | 'vault';
}

export default function DashboardPage() {
  const router = useRouter();
  const { disconnect } = useWallet();
  const { reset, connectedAddress } = useWalletStore();

  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [balances, setBalances] = useState<Map<string, WalletBalance>>(new Map());
  const [isLoadingWallets, setIsLoadingWallets] = useState(true);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync trades from Helius
  const handleSync = async () => {
    const tradingWallet = wallets.find(w => w.wallet_type === 'trading');
    if (!tradingWallet || isSyncing) return;

    setIsSyncing(true);
    try {
      const response = await fetch('/api/trades/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: tradingWallet.address }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Sync failed');
      }

      // Toast notification per user decision
      if (result.closedTradesCount > 0) {
        const profitSign = result.totalProfitSol >= 0 ? '+' : '';
        toast.success(
          `Found ${result.closedTradesCount} new closed trade${result.closedTradesCount > 1 ? 's' : ''} (${profitSign}${result.totalProfitSol.toFixed(4)} SOL)`
        );
      } else {
        toast.info('No new closed trades found');
      }

      // Refresh balances after sync
      const addresses = wallets.map(w => w.address).join(',');
      const balanceResponse = await fetch(`/api/wallets/balances?addresses=${addresses}`);
      const balanceResult = await balanceResponse.json();

      if (balanceResponse.ok && balanceResult.success) {
        const balanceMap = new Map<string, WalletBalance>();
        balanceResult.balances.forEach((balance: WalletBalance) => {
          balanceMap.set(balance.address, balance);
        });
        setBalances(balanceMap);
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to sync trades',
        {
          action: {
            label: 'Retry',
            onClick: () => handleSync(),
          },
        }
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // Fetch user wallets via API
  useEffect(() => {
    const fetchWallets = async () => {
      if (!connectedAddress) {
        router.push('/');
        return;
      }

      try {
        setIsLoadingWallets(true);
        setError(null);

        const response = await fetch(`/api/wallets/user?address=${connectedAddress}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to fetch wallets');
        }

        if (!result.wallets || result.wallets.length === 0) {
          // No wallets found - user hasn't completed setup
          router.push('/setup');
          return;
        }

        setWallets(result.wallets);
      } catch (err) {
        console.error('Error fetching wallets:', err);
        setError(err instanceof Error ? err.message : 'Failed to load wallets');
        toast.error('Failed to load wallets');
      } finally {
        setIsLoadingWallets(false);
      }
    };

    fetchWallets();
  }, [connectedAddress, router]);

  // Fetch balances once wallets are loaded
  useEffect(() => {
    const fetchBalances = async () => {
      if (wallets.length === 0) return;

      try {
        setIsLoadingBalances(true);
        setError(null);

        // Build addresses query param
        const addresses = wallets.map(w => w.address).join(',');

        const response = await fetch(`/api/wallets/balances?addresses=${addresses}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to fetch balances');
        }

        // Map balances by address for easy lookup
        const balanceMap = new Map<string, WalletBalance>();
        result.balances.forEach((balance: WalletBalance) => {
          balanceMap.set(balance.address, balance);
        });

        setBalances(balanceMap);
      } catch (err) {
        console.error('Error fetching balances:', err);
        setError(err instanceof Error ? err.message : 'Failed to load balances');
        toast.error('Failed to load balances');
      } finally {
        setIsLoadingBalances(false);
      }
    };

    fetchBalances();
  }, [wallets]);

  // Auto-sync trades when balances are loaded
  useEffect(() => {
    const tradingWallet = wallets.find(w => w.wallet_type === 'trading');
    if (tradingWallet && !isLoadingBalances && !isSyncing && balances.size > 0) {
      handleSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets, isLoadingBalances]);

  const handleDisconnect = async () => {
    try {
      // Call signout API to clear cookies
      await fetch('/api/auth/signout', { method: 'POST' });

      await disconnect();
      await signOut();
      reset();
      toast.success('Wallet disconnected');
      router.push('/');
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Error disconnecting wallet');
    }
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (isLoadingWallets) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-zinc-400">Loading dashboard...</div>
      </div>
    );
  }

  if (error && wallets.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        <Card className="w-full max-w-md bg-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-zinc-400">{error}</p>
            <Button onClick={handleRetry} className="w-full bg-white text-black hover:bg-zinc-200">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tradingWallet = wallets.find(w => w.wallet_type === 'trading');
  const vaultWallet = wallets.find(w => w.wallet_type === 'vault');

  return (
    <div className="min-h-screen bg-black px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="mt-1 text-zinc-400">Your wallet balances and profit tracking</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              variant="outline"
              className="border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Trades
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleDisconnect}
              variant="outline"
              className="border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          </div>
        </div>

        {/* Wallet Balance Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Trading Wallet Card */}
          {tradingWallet && (
            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg text-zinc-300">Trading Wallet</CardTitle>
                <p className="text-sm text-zinc-500">
                  {truncateAddress(tradingWallet.address)}
                </p>
              </CardHeader>
              <CardContent>
                {isLoadingBalances ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <p className="text-3xl font-bold text-white">
                        {balances.get(tradingWallet.address)?.sol.toFixed(4) || '0.0000'} SOL
                      </p>
                    </div>
                    <div>
                      <p className="text-lg text-zinc-400">
                        ${balances.get(tradingWallet.address)?.usd.toFixed(2) || '0.00'} USD
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Vault Wallet Card */}
          {vaultWallet && (
            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg text-zinc-300">Vault Wallet</CardTitle>
                <p className="text-sm text-zinc-500">
                  {truncateAddress(vaultWallet.address)}
                </p>
              </CardHeader>
              <CardContent>
                {isLoadingBalances ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <p className="text-3xl font-bold text-white">
                        {balances.get(vaultWallet.address)?.sol.toFixed(4) || '0.0000'} SOL
                      </p>
                    </div>
                    <div>
                      <p className="text-lg text-zinc-400">
                        ${balances.get(vaultWallet.address)?.usd.toFixed(2) || '0.00'} USD
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Error message if balances failed but wallets loaded */}
        {error && wallets.length > 0 && (
          <div className="mt-6">
            <Card className="bg-zinc-950 border-red-900/50">
              <CardContent className="pt-6">
                <p className="text-sm text-red-400">{error}</p>
                <Button
                  onClick={handleRetry}
                  className="mt-4 bg-white text-black hover:bg-zinc-200"
                  size="sm"
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
