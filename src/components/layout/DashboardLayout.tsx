// =============================================
// Dashboard Layout Component
// src/components/layout/DashboardLayout.tsx
// =============================================

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  LayoutDashboard,
  History,
  Target,
  LogOut,
  Menu,
  Wallet,
} from "lucide-react";

export interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trades", label: "Trade History", icon: History },
  { href: "/goals", label: "Goals", icon: Target },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { walletAddress, disconnect } = useAuthStore();

  const handleDisconnect = async () => {
    await disconnect();
  };

  const truncateAddress = (address: string | null) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">
                P
              </span>
            </div>
            <span className="font-semibold text-lg hidden sm:block">
              Profit is Profit
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Section - Wallet Status & Disconnect */}
          <div className="flex items-center gap-2">
            {/* Wallet Badge */}
            {walletAddress && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-accent rounded-full">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {truncateAddress(walletAddress)}
                </span>
                <div className="w-2 h-2 bg-green-500 rounded-full" />
              </div>
            )}

            {/* Desktop Disconnect Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              className="hidden md:flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </Button>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}

              {/* Mobile Wallet Info */}
              {walletAddress && (
                <div className="flex items-center gap-2 px-4 py-3 border-t mt-2">
                  <Wallet className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {truncateAddress(walletAddress)}
                  </span>
                  <div className="w-2 h-2 bg-green-500 rounded-full ml-auto" />
                </div>
              )}

              {/* Mobile Disconnect */}
              <Button
                variant="ghost"
                className="justify-start gap-3 px-4 py-3 h-auto font-medium"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleDisconnect();
                }}
              >
                <LogOut className="w-5 h-5" />
                Disconnect Wallet
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

export default DashboardLayout;
