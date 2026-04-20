import { NextRequest, NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const TRUSTED_FETCH_SITES = new Set(["same-origin", "same-site", "none"]);

function isSameOrigin(urlValue: string, origin: string): boolean {
  try {
    return new URL(urlValue).origin === origin;
  } catch {
    return false;
  }
}

export function requireSameOrigin(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  if (SAFE_METHODS.has(method)) {
    return null;
  }

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const fetchSite = req.headers.get("sec-fetch-site");

  if (fetchSite && !TRUSTED_FETCH_SITES.has(fetchSite)) {
    return NextResponse.json(
      { error: "Cross-site request blocked" },
      { status: 403 }
    );
  }

  if (origin) {
    if (origin !== req.nextUrl.origin) {
      return NextResponse.json(
        { error: "Cross-site request blocked" },
        { status: 403 }
      );
    }
    return null;
  }

  if (referer) {
    if (!isSameOrigin(referer, req.nextUrl.origin)) {
      return NextResponse.json(
        { error: "Cross-site request blocked" },
        { status: 403 }
      );
    }
    return null;
  }

  if (!fetchSite || !TRUSTED_FETCH_SITES.has(fetchSite)) {
    return NextResponse.json(
      { error: "Cross-site request blocked" },
      { status: 403 }
    );
  }

  return null;
}