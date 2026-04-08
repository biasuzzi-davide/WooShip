import { NextResponse } from "next/server";
import { detectStorageMode } from "@/lib/credentials";

export async function GET() {
  try {
    const mode = await detectStorageMode();
    return NextResponse.json({ storageMode: mode });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to detect storage mode" },
      { status: 500 }
    );
  }
}
