// =============================================
// Landing Page (Home) with Wallet Connection
// src/app/page.tsx
// =============================================

"use client";

import React, { useEffect, useState } from "react";
import { WalletConnectButton } from "@/components/auth/WalletConnectButton";
import { useAuthStore, type WalletError } from "@/lib/stores/auth-store";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, Wallet, Shield, TrendingUp } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, connectionStatus, error, clearError } = useAuthStore();
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      setIsMobile(
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent
        )
      );
    };
    checkMobile();
  }, []);

  // Redirect to dashboard if already authenticated (after hydration)
  useEffect(() => {
    // Only redirect after store has hydrated from localStorage
    // to prevent premature redirects during initial page load
    const checkAndRedirect = () => {
      const state = useAuthStore.getState();
      if (state.isHydrated && state.isAuthenticated) {
        const hasCompletedSetup = localStorage.getItem("pisp-setup-complete");
        if (hasCompletedSetup === "true") {
          router.replace("/dashboard");
        } else {
          router.replace("/setup");
        }
      }
    };

    // Check immediately in case already hydrated
    checkAndRedirect();

    // Subscribe to store changes
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.isHydrated && state.isAuthenticated) {
        const hasCompletedSetup = localStorage.getItem("pisp-setup-complete");
        if (hasCompletedSetup === "true") {
          router.replace("/dashboard");
        } else {
          router.replace("/setup");
        }
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Control modal visibility directly based on error state
  // Using Dialog's controlled open state pattern

  const handleConnectSuccess = () => {
    // Redirect will happen via useEffect above
  };

  const handleConnectError = (error: WalletError) => {
    console.error("Wallet connection error:", error);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Profit is Profit</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#how-it-works"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              How it Works
            </a>
            <a
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Features
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
            Take More Profits,
            <span className="text-primary"> Systematically</span>
          </h1>
          <p className="mb-8 text-lg text-muted-foreground md:text-xl">
            Stop giving back your gains. Our intelligent profit-taking system
            helps meme coin traders secure profits while maintaining a healthy
            trading wallet balance.
          </p>

          {/* Wallet Connection CTA */}
          <div className="flex flex-col items-center gap-4">
            {isMobile ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Open in your wallet app:
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() =>
                      window.open("phantom://browse?url=" + window.location.href)
                    }
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Open in Phantom
                  </Button>
                  <Button
                    onClick={() =>
                      window.open("solflare://browse?url=" + window.location.href)
                    }
                    variant="outline"
                  >
                    Open in Solflare
                  </Button>
                </div>
              </div>
            ) : (
              <WalletConnectButton
                size="lg"
                fullWidth
                onConnect={handleConnectSuccess}
                onError={handleConnectError}
              />
            )}

            {connectionStatus === "connecting" && (
              <p className="text-sm text-muted-foreground">
                Please approve the connection in your wallet...
              </p>
            )}
          </div>
        </div>

        {/* How it Works Section */}
        <section id="how-it-works" className="mt-24">
          <h2 className="mb-12 text-center text-3xl font-bold">How It Works</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">1. Connect Wallet</h3>
              <p className="text-muted-foreground">
                Link your trading and vault wallets. We only need your public
                addresses—no private keys ever touch our servers.
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">2. Trade & Detect</h3>
              <p className="text-muted-foreground">
                Trade normally on your favorite DEXs. We automatically detect
                completed trades and calculate optimal cashout percentages.
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">3. Secure Profits</h3>
              <p className="text-muted-foreground">
                Follow our cashout recommendations to move profits to your vault
                wallet. Build a secured profit stash you can&apos;t give back.
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="mt-24">
          <h2 className="mb-12 text-center text-3xl font-bold">Features</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              "Dynamic Tier System",
              "Automatic Trade Detection",
              "Goal Tracking",
              "Weekly Boost Suggestions",
              "Losing Streak Protection",
              "Manual Override Options",
              "Real-time Balance Updates",
              "Completely Non-custodial",
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 rounded-lg border p-4"
              >
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            © 2026 Profit is Profit. Built for disciplined traders.
          </p>
        </div>
      </footer>

      {/* Extension Not Found Modal */}
      <Dialog open={error?.type === "EXTENSION_NOT_FOUND"} onOpenChange={(open) => !open && clearError()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wallet Extension Required</DialogTitle>
            <DialogDescription>
              To use Profit is Profit, you need a Solana wallet extension
              installed in your browser.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <a
              href="https://phantom.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-600" />
                <div>
                  <p className="font-medium">Phantom</p>
                  <p className="text-sm text-muted-foreground">
                    Most popular Solana wallet
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
            <a
              href="https://solflare.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-600" />
                <div>
                  <p className="font-medium">Solflare</p>
                  <p className="text-sm text-muted-foreground">
                    Feature-rich Solana wallet
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => clearError()}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                clearError();
                // Retry connection
                window.location.reload();
              }}
            >
              I&apos;ve Installed It
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
