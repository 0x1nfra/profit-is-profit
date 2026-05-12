// DEPRECATED: Replaced by Convex query api.wallets.getUserWallets
// This route no longer exists. Use useQuery(api.wallets.getUserWallets) directly.
import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ error: "Migrated to Convex" }, { status: 410 });
}
