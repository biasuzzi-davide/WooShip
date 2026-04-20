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
import { normalizeApiError } from "@/lib/api-errors";
import { wooCredentialsSchema } from "@/lib/api-validation";

export async function GET() {
  if (isCredentialsFromEnvironment()) {
    const storeUrl = process.env.WOOCOMMERCE_STORE_URL!;
    return NextResponse.json({
      hasCredentials: true,
      storeUrl,
      credentialsSource: "environment",
    });
  }

  try {
    const mode = await detectStorageMode();
    const exists = await loadCredentials(mode);
    if (exists) {
      const storeUrl = await getStoredStoreUrl(mode);
      return NextResponse.json({
        hasCredentials: true,
        storeUrl,
        storageMode: mode,
        credentialsSource: mode,
      });
    }
    return NextResponse.json({
      hasCredentials: false,
      storageMode: mode,
      credentialsSource: null,
    });
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
    const body = wooCredentialsSchema.parse(await req.json());
    const { storeUrl, consumerKey, consumerSecret } = body;

    await saveCredentials({ storeUrl, consumerKey, consumerSecret }, mode);
    return NextResponse.json({ success: true, storeUrl });
  } catch (err) {
    const normalized = normalizeApiError(
      err,
      "Impossibile salvare le credenziali."
    );
    if (normalized.shouldLog) {
      console.error("Error saving credentials:", err);
    }
    return NextResponse.json({ error: normalized.message }, { status: normalized.status });
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
    const normalized = normalizeApiError(
      err,
      "Impossibile rimuovere le credenziali."
    );
    if (normalized.shouldLog) {
      console.error("Error clearing credentials:", err);
    }
    return NextResponse.json({ error: normalized.message }, { status: normalized.status });
  }
}
