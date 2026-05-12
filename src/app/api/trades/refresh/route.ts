// DEPRECATED: Replaced by Convex action api.sync.syncWalletTrades
// Call useAction(api.sync.syncWalletTrades) directly from client.
import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: "Migrated to Convex" }, { status: 410 });
}
