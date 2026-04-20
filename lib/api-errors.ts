import { ZodError } from "zod";
import { CryptoKeyError, WooApiError } from "@/types";

export interface ApiErrorInfo {
  status: number;
  message: string;
  shouldLog: boolean;
}

export function normalizeApiError(
  err: unknown,
  fallbackMessage: string
): ApiErrorInfo {
  if (err instanceof ZodError) {
    return {
      status: 400,
      message: err.issues[0]?.message ?? "Richiesta non valida",
      shouldLog: false,
    };
  }

  if (err instanceof SyntaxError) {
    return {
      status: 400,
      message: "Body JSON non valido.",
      shouldLog: false,
    };
  }

  if (err instanceof CryptoKeyError) {
    return {
      status: 500,
      message:
        "Configurazione server non valida: controlla ENCRYPTION_KEY.",
      shouldLog: true,
    };
  }

  if (err instanceof WooApiError) {
    if (err.statusCode === 401) {
      const message = err.message.includes("No WooCommerce credentials found")
        ? "Nessuna credenziale configurata."
        : "Credenziali WooCommerce non valide.";

      return {
        status: 401,
        message,
        shouldLog: false,
      };
    }

    if (err.statusCode === 429) {
      return {
        status: 429,
        message: "WooCommerce ha applicato un rate-limit. Riprova tra poco.",
        shouldLog: false,
      };
    }

    if (err.statusCode === 413) {
      return {
        status: 413,
        message: err.message,
        shouldLog: false,
      };
    }

    return {
      status: err.statusCode && err.statusCode >= 400 && err.statusCode < 500 ? 400 : 502,
      message: "Servizio WooCommerce temporaneamente non disponibile.",
      shouldLog: true,
    };
  }

  if (err instanceof Error && err.message === "No credentials") {
    return {
      status: 401,
      message: "Nessuna credenziale configurata.",
      shouldLog: false,
    };
  }

  return {
    status: 500,
    message: fallbackMessage,
    shouldLog: true,
  };
}
