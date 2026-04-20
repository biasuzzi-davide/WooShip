import { NextRequest, NextResponse } from "next/server";

const encoder = new TextEncoder();

function unauthorized(): NextResponse {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="WooShip", charset="UTF-8"',
    },
  });
}

function decodeBasicAuthHeader(headerValue: string): { user: string; pass: string } | null {
  const [scheme, encoded] = headerValue.split(" ");
  if (scheme !== "Basic" || !encoded) return null;

  try {
    const decoded = atob(encoded);
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex < 0) return null;

    return {
      user: decoded.slice(0, separatorIndex),
      pass: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  const maxLen = Math.max(aBytes.length, bBytes.length);

  let mismatch = aBytes.length ^ bBytes.length;
  for (let i = 0; i < maxLen; i++) {
    mismatch |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }

  return mismatch === 0;
}

export function middleware(req: NextRequest) {
  const username = process.env.APP_BASIC_AUTH_USER;
  const password = process.env.APP_BASIC_AUTH_PASSWORD;
  const isVercelProduction = process.env.VERCEL_ENV === "production";

  if (!username || !password) {
    if (isVercelProduction) {
      return new NextResponse(
        "Missing APP_BASIC_AUTH_USER or APP_BASIC_AUTH_PASSWORD",
        { status: 500 }
      );
    }
    return NextResponse.next();
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return unauthorized();

  const parsed = decodeBasicAuthHeader(authHeader);
  if (!parsed) return unauthorized();

  const userMatch = timingSafeEqual(parsed.user, username);
  const passMatch = timingSafeEqual(parsed.pass, password);

  if (!userMatch || !passMatch) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};