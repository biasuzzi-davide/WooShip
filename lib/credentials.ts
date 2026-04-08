import path from "path";
import fs from "fs/promises";
import type { WooCredentials, StorageMode } from "@/types";
import { encrypt, decrypt } from "./crypto";

const CREDENTIALS_DIR = path.join(process.cwd(), ".data");
const CREDENTIALS_FILE = path.join(CREDENTIALS_DIR, "credentials.enc");

// Cached storage mode (set on first call)
let cachedStorageMode: StorageMode | null = null;

/**
 * Detects whether we can write to the filesystem.
 * Returns "filesystem" if .data/ is writable, "session_cookie" otherwise.
 * Caches the result after first call.
 */
export async function detectStorageMode(): Promise<StorageMode> {
  if (cachedStorageMode) return cachedStorageMode;

  try {
    await fs.mkdir(CREDENTIALS_DIR, { recursive: true });
    const testFile = path.join(CREDENTIALS_DIR, ".write-test");
    await fs.writeFile(testFile, "test");
    await fs.unlink(testFile);
    cachedStorageMode = "filesystem";
    console.log("[WooShip] Storage mode: filesystem (Vercel Pro detected)");
  } catch {
    cachedStorageMode = "session_cookie";
    console.warn(
      "[WooShip] Storage mode: session_cookie (filesystem not available — Vercel Hobby or read-only environment)"
    );
  }

  return cachedStorageMode;
}

/**
 * Saves WooCommerce credentials to storage.
 * Currently only supports filesystem mode. Throws for session_cookie mode.
 */
export async function saveCredentials(
  creds: WooCredentials,
  mode: StorageMode
): Promise<void> {
  if (mode !== "filesystem") {
    throw new Error("Session cookie storage not yet implemented. Use filesystem mode or set WOOCOMMERCE_* env vars.");
  }
  const encrypted = encrypt(JSON.stringify(creds));
  await fs.mkdir(CREDENTIALS_DIR, { recursive: true });
  await fs.writeFile(CREDENTIALS_FILE, JSON.stringify(encrypted), "utf-8");
}

/**
 * Loads WooCommerce credentials from storage.
 * Returns null if no credentials exist. Throws CryptoKeyError on decryption failure.
 */
export async function loadCredentials(
  mode: StorageMode
): Promise<WooCredentials | null> {
  if (mode !== "filesystem") {
    throw new Error("Session cookie storage not yet implemented.");
  }
  try {
    const data = await fs.readFile(CREDENTIALS_FILE, "utf-8");
    const { ciphertext, iv, tag } = JSON.parse(data);
    const plaintext = decrypt(ciphertext, iv, tag);
    return JSON.parse(plaintext) as WooCredentials;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

/**
 * Clears stored credentials from filesystem.
 */
export async function clearCredentials(mode: StorageMode): Promise<void> {
  if (mode !== "filesystem") {
    throw new Error("Session cookie storage not yet implemented.");
  }
  try {
    await fs.unlink(CREDENTIALS_FILE);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
    // File didn't exist — already cleared
  }
}

/**
 * Checks if credentials exist in filesystem storage.
 */
export async function hasCredentials(mode?: StorageMode): Promise<boolean> {
  const storageMode = mode ?? (await detectStorageMode());
  if (storageMode !== "filesystem") return false;
  try {
    await fs.access(CREDENTIALS_FILE);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the store URL from stored credentials, or null if none exist.
 */
export async function getStoredStoreUrl(
  mode?: StorageMode
): Promise<string | null> {
  const storageMode = mode ?? (await detectStorageMode());
  const creds = await loadCredentials(storageMode);
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
