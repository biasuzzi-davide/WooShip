import { NextResponse } from "next/server";
import { detectStorageMode, isCredentialsFromEnvironment } from "@/lib/credentials";

export async function GET() {
  try {
    const persistedStorageMode = await detectStorageMode();
    const storageMode = isCredentialsFromEnvironment()
      ? "environment"
      : persistedStorageMode;

    return NextResponse.json({ storageMode, persistedStorageMode });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to detect storage mode" },
      { status: 500 }
    );
  }
}
