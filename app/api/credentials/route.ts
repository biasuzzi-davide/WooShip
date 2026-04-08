import { NextRequest, NextResponse } from "next/server";
import {
  saveCredentials,
  loadCredentials,
  clearCredentials,
  getStoredStoreUrl,
  detectStorageMode,
  isCredentialsFromEnvironment,
} from "@/lib/credentials";
import { requireSameOrigin } from "@/lib/security";
import type { WooCredentials } from "@/types";

export async function GET() {
  if (isCredentialsFromEnvironment()) {
    const storeUrl = process.env.WOOCOMMERCE_STORE_URL!;
    return NextResponse.json({ hasCredentials: true, storeUrl });
  }

  try {
    const mode = await detectStorageMode();
    const exists = await loadCredentials(mode);
    if (exists) {
      const storeUrl = await getStoredStoreUrl(mode);
      return NextResponse.json({ hasCredentials: true, storeUrl });
    }
    return NextResponse.json({ hasCredentials: false, storageMode: mode });
  } catch (err) {
    console.error("Error loading credentials:", err);
    return NextResponse.json(
      { error: "Failed to load credentials" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req);
  if (originError) return originError;

  if (isCredentialsFromEnvironment()) {
    return NextResponse.json(
      { error: "Credentials are set via environment variables. Cannot overwrite." },
      { status: 403 }
    );
  }

  const mode = await detectStorageMode();

  try {
    const body = await req.json() as Partial<WooCredentials>;
    const { storeUrl, consumerKey, consumerSecret } = body;

    if (!storeUrl || !consumerKey || !consumerSecret) {
      return NextResponse.json(
        { error: "storeUrl, consumerKey, and consumerSecret are required" },
        { status: 400 }
      );
    }

    await saveCredentials({ storeUrl, consumerKey, consumerSecret }, mode);
    return NextResponse.json({ success: true, storeUrl });
  } catch (err) {
    console.error("Error saving credentials:", err);
    const message = err instanceof Error ? err.message : "Failed to save credentials";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const originError = requireSameOrigin(req);
  if (originError) return originError;

  if (isCredentialsFromEnvironment()) {
    return NextResponse.json(
      { error: "Cannot delete credentials set via environment variables" },
      { status: 403 }
    );
  }

  const mode = await detectStorageMode();

  try {
    await clearCredentials(mode);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error clearing credentials:", err);
    return NextResponse.json(
      { error: "Failed to clear credentials" },
      { status: 500 }
    );
  }
}
