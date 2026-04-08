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
    const storageMode = await detectStorageMode();
    let storeUrl: string | undefined;

    if (isCredentialsFromEnvironment()) {
      storeUrl = process.env.WOOCOMMERCE_STORE_URL;
    } else if (storageMode === "filesystem") {
      storeUrl = await getStoredStoreUrl(storageMode) ?? undefined;
    }

    return NextResponse.json({ keyValid: true, storageMode, storeUrl });
  } catch (err) {
    return NextResponse.json(
      { keyValid: true, error: (err as Error).message },
      { status: 200 }
    );
  }
}
