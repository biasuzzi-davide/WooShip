import type { WooOrder } from "./woocommerce";
export type { WooOrder };

// Credentials
export interface WooCredentials {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

// CSV Options
export type PackageType = "Busta" | "Pacco";
export type CodType = "A" | "E" | "D";
// A = Contrassegno Assicurato (Insured Cash on Delivery)
// E = Contrassegno (Cash on Delivery)
// D = Contrassegno Digitale (Digital Cash on Delivery)

export interface CSVOptions {
  defaultPackageType: PackageType;
  pickupDate?: string; // DD/MM/YYYY format
  carrier?: string;
  service?: string;
  codType: CodType;
}

// Warning Summary
export interface WarningSummary {
  orderId: number;
  orderNumber: string;
  missingFields: string[];
}

// Storage Mode (two-tier strategy)
export type StorageMode = "filesystem" | "cookie";

// API Error
export class WooApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public retryable?: boolean
  ) {
    super(message);
    this.name = "WooApiError";
  }
}

// Crypto Error
export class CryptoKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CryptoKeyError";
  }
}
