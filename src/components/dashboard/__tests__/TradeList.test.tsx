import { render, screen } from "@testing-library/react";
import { TradeList } from "../TradeList";

const VAULT = "VAULT000VAULT000";

// These tests FAIL until Plan 04 creates TradeList.tsx
describe("TradeList", () => {
  it("renders 'Recent Trades' heading", () => {
    render(<TradeList trades={[]} vaultAddress={VAULT} isSyncing={false} onSync={() => {}} />);
    expect(screen.getByRole("heading", { name: "Recent Trades" })).toBeInTheDocument();
  });

  it("renders empty state when no trades", () => {
    render(<TradeList trades={[]} vaultAddress={VAULT} isSyncing={false} onSync={() => {}} />);
    expect(screen.getByText("No trades yet")).toBeInTheDocument();
    expect(screen.getByText(/Sync your wallet to detect closed trades/)).toBeInTheDocument();
  });

  it("renders 'Refresh Trades' button in idle state", () => {
    render(<TradeList trades={[]} vaultAddress={VAULT} isSyncing={false} onSync={() => {}} />);
    expect(screen.getByText("Refresh Trades")).toBeInTheDocument();
  });

  it("renders 'Syncing...' button text when isSyncing is true", () => {
    render(<TradeList trades={[]} vaultAddress={VAULT} isSyncing={true} onSync={() => {}} />);
    expect(screen.getByText("Syncing...")).toBeInTheDocument();
  });
});
