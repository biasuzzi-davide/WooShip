import type { WooOrder, WooCredentials } from "@/types";
import { WooApiError } from "@/types";
import { getCredentialsFromEnvironment } from "./credentials";

const DEFAULT_PER_PAGE = 100;
const TIMEOUT_MS = 30_000; // 30 seconds

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export class WooClient {
  private storeUrl: string;
  private consumerKey: string;
  private consumerSecret: string;

  constructor(creds: WooCredentials) {
    this.storeUrl = creds.storeUrl.replace(/\/$/, ""); // Remove trailing slash
    this.consumerKey = creds.consumerKey;
    this.consumerSecret = creds.consumerSecret;
  }

  private get authHeader(): string {
    const credentials = Buffer.from(
      `${this.consumerKey}:${this.consumerSecret}`
    ).toString("base64");
    return `Basic ${credentials}`;
  }

  private async fetchWithRetry<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.storeUrl}/wp-json/wc/v3${path}`;
    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new WooApiError("Request timed out after 30 seconds.", undefined, false)
        );
      }, TIMEOUT_MS);
    });

    const fetchPromise = this._fetchWithRetry<T>(url, headers, options);
    return Promise.race([fetchPromise, timeoutPromise]);
  }

  private async _fetchWithRetry<T>(
    url: string,
    headers: Record<string, string>,
    options: RequestInit,
    attempt = 1
  ): Promise<T> {
    try {
      const response = await fetch(url, { ...options, headers });

      if (response.status === 401) {
        throw new WooApiError("Invalid WooCommerce credentials.", 401, false);
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const waitMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : Math.pow(2, attempt) * 1000; // fallback: 2^attempt ms

        if (attempt < 3) {
          await this.sleep(waitMs);
          return this._fetchWithRetry(url, headers, options, attempt + 1);
        }
        throw new WooApiError(
          "WooCommerce API rate limit exceeded. Please try again later.",
          429,
          true
        );
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "Unknown error");
        throw new WooApiError(
          `WooCommerce API error: ${response.status} ${response.statusText}. ${errorBody}`,
          response.status,
          response.status >= 500
        );
      }

      return response.json() as Promise<T>;
    } catch (err) {
      if (err instanceof WooApiError) throw err;

      // Network errors
      if (attempt < 3) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        await this.sleep(backoffMs);
        return this._fetchWithRetry(url, headers, options, attempt + 1);
      }

      throw new WooApiError(
        `Network error fetching ${url}: ${(err as Error).message}`,
        undefined,
        true
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Fetches all orders from WooCommerce with pagination.
   * Automatically fetches all pages until all orders are retrieved.
   */
  async getOrders(params: {
    status?: string;
    after?: string;
    before?: string;
    per_page?: number;
    page?: number;
  }): Promise<WooOrder[]> {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.after) query.set("after", params.after);
    if (params.before) query.set("before", params.before);
    const perPage = params.per_page ?? DEFAULT_PER_PAGE;
    query.set("per_page", String(perPage));
    if (params.page) query.set("page", String(params.page));

    const orders: WooOrder[] = [];

    // If a specific page is requested, just fetch that page
    if (params.page) {
      const result = await this.fetchWithRetry<WooOrder[]>(
        `/orders?${query.toString()}`
      );
      return result;
    }

    // Otherwise, fetch all pages
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      query.set("page", String(currentPage));
      const pageOrders = await this.fetchWithRetry<WooOrder[]>(
        `/orders?${query.toString()}`
      );
      orders.push(...pageOrders);
      hasMore = pageOrders.length === perPage;
      currentPage++;
    }

    return orders;
  }

  /**
   * Fetches a precise set of orders by IDs.
   * Uses chunked include queries to avoid truncation on stores with many orders.
   */
  async getOrdersByIds(orderIds: number[]): Promise<WooOrder[]> {
    const uniqueIds = [...new Set(orderIds)].filter(
      (id) => Number.isInteger(id) && id > 0
    );

    if (uniqueIds.length === 0) return [];

    const chunks = chunkArray(uniqueIds, DEFAULT_PER_PAGE);
    const fetchedOrders: WooOrder[] = [];

    for (const ids of chunks) {
      const query = new URLSearchParams();
      query.set("include", ids.join(","));
      query.set("per_page", String(ids.length));
      query.set("orderby", "include");

      const batch = await this.fetchWithRetry<WooOrder[]>(
        `/orders?${query.toString()}`
      );
      fetchedOrders.push(...batch);
    }

    const byId = new Map<number, WooOrder>();
    for (const order of fetchedOrders) {
      byId.set(order.id, order);
    }

    return uniqueIds
      .map((id) => byId.get(id))
      .filter((order): order is WooOrder => Boolean(order));
  }

  /**
   * Tests the connection by fetching system status.
   */
  async testConnection(): Promise<{ store: string; version: string }> {
    const data = await this.fetchWithRetry<{
      environment: { version: string };
      site: { name: string };
    }>("/system_status");

    return {
      store: data.site?.name ?? this.storeUrl,
      version: data.environment?.version ?? "unknown",
    };
  }
}

/**
 * Creates a WooClient from stored credentials or environment variables.
 * Throws if no credentials are available.
 */
export async function createWooClient(): Promise<WooClient> {
  const creds = getCredentialsFromEnvironment();
  if (creds) {
    return new WooClient(creds);
  }

  const { getStoredStoreUrl, loadCredentials, detectStorageMode } = await import(
    "./credentials"
  );

  const mode = await detectStorageMode();
  const stored = await loadCredentials(mode);

  if (!stored) {
    throw new WooApiError(
      "No WooCommerce credentials found. Please configure credentials via UI or environment variables.",
      undefined,
      false
    );
  }

  return new WooClient(stored);
}
