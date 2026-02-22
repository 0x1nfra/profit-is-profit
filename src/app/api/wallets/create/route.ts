// DEPRECATED: Replaced by Convex mutation api.wallets.createWallets
// This route no longer exists. Use useMutation(api.wallets.createWallets) directly.
import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: "Migrated to Convex" }, { status: 410 });
}
