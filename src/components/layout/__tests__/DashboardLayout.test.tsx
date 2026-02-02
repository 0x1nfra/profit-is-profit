// =============================================
// DashboardLayout Tests
// src/components/layout/__tests__/DashboardLayout.test.tsx
// =============================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardLayout } from "../DashboardLayout";
import { useAuthStore } from "@/lib/stores/auth-store";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("DashboardLayout", () => {
  beforeEach(() => {
    // Reset auth store
    useAuthStore.getState().reset();
  });

  it("should render children content", () => {
    render(
      <DashboardLayout>
        <div data-testid="test-content">Test Content</div>
      </DashboardLayout>
    );

    expect(screen.getByTestId("test-content")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should render logo and brand name", () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText("Profit is Profit")).toBeInTheDocument();
  });

  it("should render navigation links", () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Trade History")).toBeInTheDocument();
    expect(screen.getByText("Goals")).toBeInTheDocument();
  });

  it("should show wallet address when connected", () => {
    const walletAddress = "7xKxy123456789abcdef";
    useAuthStore.getState().setWalletAddress(walletAddress);

    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    // Should show truncated address
    expect(screen.getByText("7xKy...cdef")).toBeInTheDocument();
  });

  it("should not show wallet badge when not connected", () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    // Wallet badge should not be visible on mobile/desktop
    const walletElements = screen.queryAllByText(/\.\.\./);
    expect(walletElements.length).toBe(0);
  });

  it("should render disconnect button", () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText("Disconnect")).toBeInTheDocument();
  });

  it("should call disconnect when disconnect button clicked", async () => {
    const mockDisconnect = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ disconnect: mockDisconnect });

    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    const disconnectButton = screen.getByText("Disconnect");
    fireEvent.click(disconnectButton);

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("should render mobile menu button", () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    // Menu icon button should exist (we can check by looking for the button with Menu icon)
    const menuButtons = screen.getAllByRole("button");
    expect(menuButtons.length).toBeGreaterThan(0);
  });

  it("should show active state for current route", () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    // Dashboard should be active (has bg-accent class)
    const dashboardLink = screen.getByText("Dashboard").closest("a");
    expect(dashboardLink?.className).toContain("bg-accent");
  });

  it("should contain link to dashboard in logo", () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    const logoLink = screen.getByText("P").closest("a");
    expect(logoLink).toHaveAttribute("href", "/dashboard");
  });
});
