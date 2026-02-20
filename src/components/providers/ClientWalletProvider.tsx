'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import WalletProvider with ssr: false to prevent hydration errors
const WalletProvider = dynamic(() => import('./WalletProvider'), {
  ssr: false,
});

interface ClientWalletProviderProps {
  children: React.ReactNode;
}

export default function ClientWalletProvider({ children }: ClientWalletProviderProps) {
  return <WalletProvider>{children}</WalletProvider>;
}
