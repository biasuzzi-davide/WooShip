import { NextResponse } from "next/server";
import { isEncryptionKeyValid } from "@/lib/crypto";
import { detectStorageMode, getStoredStoreUrl, isCredentialsFromEnvironment } from "@/lib/credentials";

export async function GET() {
  const keyValid = isEncryptionKeyValid();

  if (!keyValid) {
    return NextResponse.json(
      {
        keyValid: false,
        error: "ENCRYPTION_KEY must be a 64-character hex string. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      },
      { status: 400 }
    );
  }

  try {
    const persistedStorageMode = await detectStorageMode();
    const storageMode = isCredentialsFromEnvironment()
      ? "environment"
      : persistedStorageMode;
    let storeUrl: string | undefined;

    if (storageMode === "environment") {
      storeUrl = process.env.WOOCOMMERCE_STORE_URL;
    } else {
      storeUrl = await getStoredStoreUrl(persistedStorageMode) ?? undefined;
    }

    return NextResponse.json({ keyValid: true, storageMode, storeUrl });
  } catch (err) {
    console.error("Error checking health status:", err);
    return NextResponse.json(
      { keyValid: true, error: "Impossibile verificare lo stato credenziali." },
      { status: 500 }
    );
  }
}
