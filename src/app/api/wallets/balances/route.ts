// =============================================
// Profit is Profit (P is P) - Wallet Balances API
// src/app/api/wallets/balances/route.ts
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from '@solana/addresses';
import { getSolBalance } from '@/lib/helius-client';

interface BalanceData {
  address: string;
  sol: number;
  usd: number;
}

interface BalancesResponse {
  success: boolean;
  balances?: BalanceData[];
  error?: string;
}

/**
 * Fetches SOL price from a public API
 */
async function getSolPriceUsd(): Promise<number> {
  try {
    // Use CoinGecko public API (no auth required)
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      {
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch SOL price');
    }

    const data = await response.json();
    return data.solana?.usd || 0;
  } catch (error) {
    console.error('Error fetching SOL price:', error);
    // Fallback price if API fails
    return 150; // TODO: Use a better fallback or cached price
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get addresses from query params (comma-separated)
    const { searchParams } = new URL(request.url);
    const addressesParam = searchParams.get('addresses');

    if (!addressesParam) {
      const response: BalancesResponse = {
        success: false,
        error: 'Missing addresses query parameter',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Parse comma-separated addresses
    const addresses = addressesParam.split(',').map(addr => addr.trim());

    if (addresses.length === 0) {
      const response: BalancesResponse = {
        success: false,
        error: 'At least one address is required',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate all addresses
    for (const address of addresses) {
      try {
        if (!isAddress(address)) {
          const response: BalancesResponse = {
            success: false,
            error: `Invalid Solana address: ${address}`,
          };
          return NextResponse.json(response, { status: 400 });
        }
      } catch {
        const response: BalancesResponse = {
          success: false,
          error: `Invalid Solana address: ${address}`,
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    // Fetch SOL price
    const solPrice = await getSolPriceUsd();

    // Fetch balances for all addresses using Promise.allSettled
    const balancePromises = addresses.map(async (address) => {
      try {
        const sol = await getSolBalance(address);
        const usd = sol * solPrice;

        return {
          address,
          sol,
          usd,
        };
      } catch (error) {
        console.error(`Error fetching balance for ${address}:`, error);
        // Return 0 balance on error (graceful degradation)
        return {
          address,
          sol: 0,
          usd: 0,
        };
      }
    });

    const results = await Promise.allSettled(balancePromises);

    // Extract successful results
    const balances: BalanceData[] = results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<BalanceData>).value);

    const response: BalancesResponse = {
      success: true,
      balances,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Balances API error:', error);
    const response: BalancesResponse = {
      success: false,
      error: 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
