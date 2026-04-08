import * as crypto from "crypto";
import { CryptoKeyError } from "@/types";

// Environment variable name for the encryption key
const ENCRYPTION_KEY_ENV = "ENCRYPTION_KEY";

/**
 * Validates that the encryption key is present and exactly 32 bytes (64 hex chars).
 * Throws CryptoKeyError if invalid.
 */
function getKey(): Buffer {
  const keyHex = process.env[ENCRYPTION_KEY_ENV];
  if (!keyHex) {
    throw new CryptoKeyError(
      `Missing ${ENCRYPTION_KEY_ENV} environment variable. ` +
        `Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }
  if (keyHex.length !== 64) {
    throw new CryptoKeyError(
      `${ENCRYPTION_KEY_ENV} must be a 64-character hex string (32 bytes). ` +
        `Current length: ${keyHex.length}. ` +
        `Generate a valid key with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }
  // Validate it's actually hex
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new CryptoKeyError(
      `${ENCRYPTION_KEY_ENV} must contain only hexadecimal characters (0-9, a-f, A-F).`
    );
  }
  return Buffer.from(keyHex, "hex");
}

export interface EncryptedData {
  ciphertext: string; // base64
  iv: string;         // base64
  tag: string;        // base64 (auth tag is stored separately in GCM mode)
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * @param plaintext - The string to encrypt
 * @param key - 32-byte Buffer (derived from ENCRYPTION_KEY)
 * @returns EncryptedData with base64-encoded ciphertext, iv, and tag
 */
export function encrypt(plaintext: string, key: Buffer = getKey()): EncryptedData {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

/**
 * Decrypts data encrypted with AES-256-GCM.
 * @param ciphertext - base64 encoded ciphertext
 * @param iv - base64 encoded IV
 * @param tag - base64 encoded auth tag
 * @param key - 32-byte Buffer
 * @returns Decrypted plaintext string
 */
export function decrypt(
  ciphertext: string,
  iv: string,
  tag: string,
  key: Buffer = getKey()
): string {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}

/**
 * Validates the ENCRYPTION_KEY and returns whether it's valid.
 * Does not throw — returns false if key is missing or malformed.
 */
export function isEncryptionKeyValid(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the key or throws. Use isEncryptionKeyValid() first to check.
 */
export { getKey };
