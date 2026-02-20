'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAddress } from '@solana/addresses';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Info } from 'lucide-react';
import { useWalletStore } from '@/lib/stores/wallet-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Zod schema for wallet setup form
const walletSetupSchema = z.object({
  tradingWallet: z
    .string()
    .min(1, 'Trading wallet is required')
    .refine((val) => {
      try {
        return isAddress(val);
      } catch {
        return false;
      }
    }, 'Invalid Solana address'),
  vaultWallet: z
    .string()
    .min(1, 'Vault wallet is required')
    .refine((val) => {
      try {
        return isAddress(val);
      } catch {
        return false;
      }
    }, 'Invalid Solana address'),
  confirmTrading: z.boolean().refine(val => val === true, 'Please confirm this is your trading wallet'),
}).refine(
  (data) => data.tradingWallet !== data.vaultWallet,
  {
    message: 'Vault wallet must differ from trading wallet',
    path: ['vaultWallet'],
  }
);

type WalletSetupFormData = {
  tradingWallet: string;
  vaultWallet: string;
  confirmTrading: boolean;
};

interface WalletSetupFormProps {
  connectedAddress: string;
}

export function WalletSetupForm({ connectedAddress }: WalletSetupFormProps) {
  const router = useRouter();
  const { setSetupComplete } = useWalletStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<WalletSetupFormData>({
    resolver: zodResolver(walletSetupSchema),
    mode: 'onChange',
    defaultValues: {
      tradingWallet: connectedAddress,
      vaultWallet: '',
      confirmTrading: false,
    },
  });

  const onSubmit = async (data: WalletSetupFormData) => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/wallets/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tradingWallet: data.tradingWallet,
          vaultWallet: data.vaultWallet,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save wallets');
      }

      // Update store to mark setup as complete
      setSetupComplete(true);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Wallet setup error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save wallets');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Trading Wallet Field */}
      <div className="space-y-2">
        <Label htmlFor="tradingWallet" className="text-zinc-200">
          Trading Wallet
        </Label>
        <Input
          id="tradingWallet"
          {...register('tradingWallet')}
          placeholder="Your trading wallet address"
          className="bg-zinc-900 border-zinc-700 text-white"
        />
        {errors.tradingWallet && (
          <p className="text-sm text-red-500">{errors.tradingWallet.message}</p>
        )}

        {/* Confirmation checkbox */}
        <div className="flex items-start gap-2 mt-2">
          <input
            type="checkbox"
            id="confirmTrading"
            {...register('confirmTrading')}
            className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-white focus:ring-2 focus:ring-white focus:ring-offset-0"
          />
          <label htmlFor="confirmTrading" className="text-sm text-zinc-400 cursor-pointer">
            Confirm this is your trading wallet
          </label>
        </div>
        {errors.confirmTrading && (
          <p className="text-sm text-red-500">{errors.confirmTrading.message}</p>
        )}
      </div>

      {/* Vault Wallet Field */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="vaultWallet" className="text-zinc-200">
            Vault Wallet
          </Label>
          <div className="group relative">
            <Info className="h-4 w-4 text-zinc-500 cursor-help" />
            <div className="absolute left-0 top-6 z-10 hidden w-64 rounded-md bg-zinc-800 p-3 text-xs text-zinc-200 shadow-lg group-hover:block">
              Your vault wallet is where profits are safely stored. Use a separate wallet you don't trade from.
            </div>
          </div>
        </div>
        <Input
          id="vaultWallet"
          {...register('vaultWallet')}
          placeholder="Your vault wallet address"
          className="bg-zinc-900 border-zinc-700 text-white"
        />
        {errors.vaultWallet && (
          <p className="text-sm text-red-500">{errors.vaultWallet.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!isValid || isSubmitting}
        className="w-full bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Saving...' : 'Save Wallets'}
      </Button>
    </form>
  );
}
