import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { WooClient } from "@/lib/woocommerce";
import { getKey } from "@/lib/crypto";
import {
  isCredentialsFromEnvironment,
  getCredentialsFromEnvironment,
  detectStorageMode,
  loadCredentials,
} from "@/lib/credentials";

async function getClient(): Promise<WooClient> {
  if (isCredentialsFromEnvironment()) {
    const creds = getCredentialsFromEnvironment()!;
    return new WooClient(creds);
  }
  const mode = await detectStorageMode();
  const creds = await loadCredentials(mode);
  if (!creds) {
    throw new Error("No credentials");
  }
  return new WooClient(creds);
}

export async function GET(req: NextRequest) {
  try {
    const hmacKey = getKey();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const after = searchParams.get("after") ?? undefined;
    const before = searchParams.get("before") ?? undefined;
    const per_page = parseInt(searchParams.get("per_page") ?? "100");
    const page = searchParams.has("page")
      ? parseInt(searchParams.get("page")!)
      : undefined;

    const client = await getClient();
    const orders = await client.getOrders({ status, after, before, per_page, page });

    // Generate HMAC-SHA256 export token from sorted order IDs
    const fetchedOrderIds = orders.map((o) => o.id).sort((a, b) => a - b);
    const exportToken = crypto
      .createHmac("sha256", hmacKey)
      .update(JSON.stringify(fetchedOrderIds))
      .digest("hex");

    return NextResponse.json({
      orders,
      total: fetchedOrderIds.length,
      pages: 1,
      exportToken,
      fetchedOrderIds,
    });
  } catch (err) {
    if ((err as Error).message === "No credentials") {
      return NextResponse.json({ error: "No credentials configured" }, { status: 401 });
    }
    console.error("Error fetching orders:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
