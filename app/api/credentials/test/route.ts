import { NextRequest, NextResponse } from "next/server";
import { WooClient } from "@/lib/woocommerce";
import {
  detectStorageMode,
  getCredentialsFromEnvironment,
  isCredentialsFromEnvironment,
  loadCredentials,
} from "@/lib/credentials";
import { requireSameOrigin } from "@/lib/security";
import { wooCredentialsSchema } from "@/lib/api-validation";
import { normalizeApiError } from "@/lib/api-errors";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: NextRequest) {
  const originError = requireSameOrigin(req);
  if (originError) return originError;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  let creds: ReturnType<typeof wooCredentialsSchema.parse> | null = null;
  let source: "manual" | "environment" | "cookie" = "cookie";

  const manualParse = wooCredentialsSchema.safeParse(body);
  if (manualParse.success) {
    creds = manualParse.data;
    source = "manual";
  } else if (isPlainObject(body) && Object.keys(body).length > 0) {
    const message = manualParse.error.issues[0]?.message ??
      "Per il test manuale servono storeUrl, consumerKey e consumerSecret validi.";

    return NextResponse.json({ error: message }, { status: 400 });
  } else if (isCredentialsFromEnvironment()) {
    creds = getCredentialsFromEnvironment()!;
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
    const normalized = normalizeApiError(
      err,
      "Connessione fallita. Verifica URL e credenziali."
    );
    if (normalized.shouldLog) {
      console.error("Error testing WooCommerce connection:", err);
    }

    return NextResponse.json({ error: normalized.message }, { status: normalized.status });
  }
}
