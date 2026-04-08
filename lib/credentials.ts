import { cookies } from "next/headers";
import type { WooCredentials, StorageMode } from "@/types";
import { encrypt, decrypt } from "./crypto";

const COOKIE_NAME = "wooship_credentials_v1";

/**
 * Common configuration for our credential cookie
 */
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 60 * 60 * 24 * 365, // 1 year duration
});

/**
 * Returns the active storage mode. Since we enforce cookies, this now purely returns "cookie".
 */
export async function detectStorageMode(): Promise<StorageMode> {
  return "cookie";
}

/**
 * Saves WooCommerce credentials to an encrypted HTTP-Only cookie.
 * Requires Next.js server context.
 */
export async function saveCredentials(
  creds: WooCredentials,
  mode: StorageMode
): Promise<void> {
  if (mode !== "cookie") {
    throw new Error("Only cookie storage is supported starting from v2.");
  }
  
  const encrypted = encrypt(JSON.stringify(creds));
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify(encrypted), getCookieOptions());
}

/**
 * Loads WooCommerce credentials from the HTTP-Only cookie.
 * Returns null if no cookie exists. Throws CryptoKeyError on decryption failure.
 */
export async function loadCredentials(
  mode: StorageMode
): Promise<WooCredentials | null> {
  if (mode !== "cookie") {
    throw new Error("Only cookie storage is supported starting from v2.");
  }

  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  
  if (!cookie || !cookie.value) {
    return null;
  }

  try {
    const { ciphertext, iv, tag } = JSON.parse(cookie.value);
    const plaintext = decrypt(ciphertext, iv, tag);
    return JSON.parse(plaintext) as WooCredentials;
  } catch (err) {
    console.error("[WooShip] Failed to parse/decrypt credentials from cookie", err);
    // If decryption fails (e.g. key rotated), behave like it doesn't exist so user can reconnect
    return null;
  }
}

/**
 * Clears stored credentials cookie.
 */
export async function clearCredentials(mode: StorageMode): Promise<void> {
  if (mode !== "cookie") {
    throw new Error("Only cookie storage is supported starting from v2.");
  }
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Checks if credentials exist in the cookie.
 */
export async function hasCredentials(mode?: StorageMode): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.has(COOKIE_NAME);
}

/**
 * Gets the store URL from the stored credentials cookie, or null if none exist.
 */
export async function getStoredStoreUrl(
  mode?: StorageMode
): Promise<string | null> {
  const creds = await loadCredentials("cookie");
  return creds?.storeUrl ?? null;
}

/**
 * Checks if credentials are provided via environment variables.
 */
export function isCredentialsFromEnvironment(): boolean {
  return !!(
    process.env.WOOCOMMERCE_STORE_URL &&
    process.env.WOOCOMMERCE_CONSUMER_KEY &&
    process.env.WOOCOMMERCE_CONSUMER_SECRET
  );
}

/**
 * Gets credentials from environment variables, or null if not all are set.
 */
export function getCredentialsFromEnvironment(): WooCredentials | null {
  if (!isCredentialsFromEnvironment()) return null;
  return {
    storeUrl: process.env.WOOCOMMERCE_STORE_URL!,
    consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY!,
    consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET!,
  };
}
