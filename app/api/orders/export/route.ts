import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createWooClient } from "@/lib/woocommerce";
import { generateCSV } from "@/lib/csv-generator";
import { getKey } from "@/lib/crypto";
import { requireSameOrigin } from "@/lib/security";
import { normalizeApiError } from "@/lib/api-errors";
import { ordersExportBodySchema } from "@/lib/api-validation";

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req);
  if (originError) return originError;

  try {
    const body = ordersExportBodySchema.parse(await req.json());
    const { orderIds, fetchedOrderIds, exportToken, options } = body;

    const uniqueOrderIds = [...new Set(orderIds)].sort((a, b) => a - b);
    const uniqueFetchedOrderIds = [...new Set(fetchedOrderIds)].sort((a, b) => a - b);

    if (uniqueOrderIds.length === 0) {
      return NextResponse.json(
        { error: "At least one order must be selected" },
        { status: 400 }
      );
    }

    if (uniqueFetchedOrderIds.length === 0) {
      return NextResponse.json(
        { error: "Fetched order set is empty. Please re-fetch orders." },
        { status: 400 }
      );
    }

    const fetchedSet = new Set(uniqueFetchedOrderIds);
    if (!uniqueOrderIds.every((id) => fetchedSet.has(id))) {
      return NextResponse.json(
        { error: "Selected orders are not valid for the current export session. Please re-fetch orders." },
        { status: 403 }
      );
    }

    // Validate export token with timing-safe comparison
    const hmacKey = getKey();
    const expectedToken = crypto
      .createHmac("sha256", hmacKey)
      .update(JSON.stringify(uniqueFetchedOrderIds))
      .digest("hex");

    const tokenBuffer = Buffer.from(exportToken, "hex");
    const expectedBuffer = Buffer.from(expectedToken, "hex");

    if (
      tokenBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(tokenBuffer, expectedBuffer)
    ) {
      return NextResponse.json(
        { error: "Invalid export token. Please re-fetch orders." },
        { status: 403 }
      );
    }

    const client = await createWooClient();
    const selectedOrders = await client.getOrdersByIds(uniqueOrderIds);

    if (selectedOrders.length !== uniqueOrderIds.length) {
      return NextResponse.json(
        { error: "Some selected orders are no longer available. Please re-fetch orders." },
        { status: 409 }
      );
    }

    const csv = generateCSV(selectedOrders, options);
    const today = new Date().toISOString().split("T")[0];
    const filename = `wooship-${today}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const normalized = normalizeApiError(
      err,
      "Impossibile esportare il CSV."
    );
    if (normalized.shouldLog) {
      console.error("Error exporting CSV:", err);
    }

    return NextResponse.json({ error: normalized.message }, { status: normalized.status });
  }
}
