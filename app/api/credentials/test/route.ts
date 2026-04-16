import { NextRequest, NextResponse } from "next/server";
import { WooClient } from "@/lib/woocommerce";
import {
  detectStorageMode,
  getCredentialsFromEnvironment,
  isCredentialsFromEnvironment,
  loadCredentials,
} from "@/lib/credentials";
import { requireSameOrigin } from "@/lib/security";
import { WooApiError, type WooCredentials } from "@/types";

function normalizeStoreUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return withProtocol.replace(/\/$/, "");
}

function hasAnyProvidedCredentialField(body: Partial<WooCredentials>): boolean {
  return Boolean(body.storeUrl || body.consumerKey || body.consumerSecret);
}

function hasAllProvidedCredentials(
  body: Partial<WooCredentials>
): body is WooCredentials {
  return Boolean(
    typeof body.storeUrl === "string" &&
      body.storeUrl.trim() &&
      typeof body.consumerKey === "string" &&
      body.consumerKey.trim() &&
      typeof body.consumerSecret === "string" &&
      body.consumerSecret.trim()
  );
}

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req);
  if (originError) return originError;

  let body: Partial<WooCredentials> = {};
  try {
    body = (await req.json()) as Partial<WooCredentials>;
  } catch {
    body = {};
  }

  if (hasAnyProvidedCredentialField(body) && !hasAllProvidedCredentials(body)) {
    return NextResponse.json(
      {
        error:
          "Per testare i valori inseriti servono storeUrl, consumerKey e consumerSecret completi.",
      },
      { status: 400 }
    );
  }

  let creds: WooCredentials | null = null;
  let source: "manual" | "environment" | "cookie" = "cookie";

  if (hasAllProvidedCredentials(body)) {
    creds = {
      storeUrl: normalizeStoreUrl(body.storeUrl),
      consumerKey: body.consumerKey.trim(),
      consumerSecret: body.consumerSecret.trim(),
    };
    source = "manual";
  } else if (isCredentialsFromEnvironment()) {
    creds = getCredentialsFromEnvironment();
    source = "environment";
  } else {
    const mode = await detectStorageMode();
    const stored = await loadCredentials(mode);
    if (stored) {
      creds = stored;
      source = "cookie";
    }
  }

  if (!creds) {
    return NextResponse.json(
      {
        error:
          "Nessuna credenziale disponibile. Inserisci i valori nel form o salva una configurazione valida.",
      },
      { status: 400 }
    );
  }

  try {
    const client = new WooClient(creds);
    const info = await client.testConnection();

    return NextResponse.json({
      success: true,
      source,
      store: info.store,
      version: info.version,
      storeUrl: creds.storeUrl,
    });
  } catch (err) {
    if (err instanceof WooApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode ?? 502 }
      );
    }

    console.error("Error testing WooCommerce connection:", err);
    return NextResponse.json(
      { error: "Connessione fallita. Verifica URL e credenziali." },
      { status: 500 }
    );
  }
}
