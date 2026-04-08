import { NextRequest, NextResponse } from "next/server";

export function requireSameOrigin(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null;
  }

  const origin = req.headers.get("origin");
  if (!origin || origin !== req.nextUrl.origin) {
    return NextResponse.json(
      { error: "Cross-site request blocked" },
      { status: 403 }
    );
  }

  return null;
}