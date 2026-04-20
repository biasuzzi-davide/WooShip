import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createWooClient } from "@/lib/woocommerce";
import { getKey } from "@/lib/crypto";
import { ordersQuerySchema } from "@/lib/api-validation";
import { normalizeApiError } from "@/lib/api-errors";

export async function GET(req: NextRequest) {
  try {
    const hmacKey = getKey();
    const { searchParams } = new URL(req.url);
    const query = ordersQuerySchema.parse({
      status: searchParams.get("status"),
      after: searchParams.get("after"),
      before: searchParams.get("before"),
      per_page: searchParams.get("per_page"),
      page: searchParams.get("page"),
    });

    const client = await createWooClient();
    const result = await client.getOrders(query);

    // Generate HMAC-SHA256 export token from sorted order IDs
    const fetchedOrderIds = result.orders.map((o) => o.id).sort((a, b) => a - b);
    const exportToken = crypto
      .createHmac("sha256", hmacKey)
      .update(JSON.stringify(fetchedOrderIds))
      .digest("hex");

    return NextResponse.json({
      orders: result.orders,
      total: result.total,
      pages: result.pages,
      page: result.page,
      perPage: result.perPage,
      exportToken,
      fetchedOrderIds,
    });
  } catch (err) {
    const normalized = normalizeApiError(
      err,
      "Impossibile recuperare gli ordini."
    );
    if (normalized.shouldLog) {
      console.error("Error fetching orders:", err);
    }

    return NextResponse.json({ error: normalized.message }, { status: normalized.status });
  }
}
