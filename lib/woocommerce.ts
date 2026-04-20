import type { WooOrder, WooCredentials } from "@/types";
import { WooApiError } from "@/types";
import { getCredentialsFromEnvironment } from "./credentials";

const DEFAULT_PER_PAGE = 100;
const TIMEOUT_MS = 30_000; // 30 seconds
const MAX_AUTO_PAGES = 50;
const MAX_BACKOFF_MS = 10_000;

interface FetchWithMetaResult<T> {
  data: T;
  total?: number;
  totalPages?: number;
}

function parsePositiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export interface WooOrdersResult {
  orders: WooOrder[];
  total: number;
  pages: number;
  page: number;
  perPage: number;
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

  private isAbortError(err: unknown): boolean {
    return err instanceof Error && err.name === "AbortError";
  }

  private async requestWithRetry(
    path: string,
    options: RequestInit = {},
    attempt = 1
  ): Promise<Response> {
    const url = `${this.storeUrl}/wp-json/wc/v3${path}`;
    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (response.status === 401) {
        throw new WooApiError("Invalid WooCommerce credentials.", 401, false);
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const retryAfterSeconds = parsePositiveInt(retryAfter) ?? 0;
        const waitMs = retryAfterSeconds > 0
          ? Math.min(retryAfterSeconds * 1000, MAX_BACKOFF_MS)
          : Math.min(Math.pow(2, attempt) * 1000, MAX_BACKOFF_MS);

        if (attempt < 3) {
          await this.sleep(waitMs);
          return this.requestWithRetry(path, options, attempt + 1);
        }
        throw new WooApiError(
          "WooCommerce API rate limit exceeded. Please try again later.",
          429,
          true
        );
      }

      if (!response.ok) {
        throw new WooApiError(
          `WooCommerce API error: ${response.status} ${response.statusText}.`,
          response.status,
          response.status >= 500
        );
      }

      return response;
    } catch (err) {
      if (err instanceof WooApiError) throw err;

      if (this.isAbortError(err)) {
        if (attempt < 3) {
          const backoffMs = Math.min(Math.pow(2, attempt) * 1000, MAX_BACKOFF_MS);
          await this.sleep(backoffMs);
          return this.requestWithRetry(path, options, attempt + 1);
        }
        throw new WooApiError(
          "Request timed out after 30 seconds.",
          undefined,
          true
        );
      }

      // Network errors
      if (attempt < 3) {
        const backoffMs = Math.min(Math.pow(2, attempt) * 1000, MAX_BACKOFF_MS);
        await this.sleep(backoffMs);
        return this.requestWithRetry(path, options, attempt + 1);
      }

      throw new WooApiError(
        "Network error while contacting WooCommerce API.",
        undefined,
        true
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async fetchWithRetry<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await this.requestWithRetry(path, options);
    return response.json() as Promise<T>;
  }

  private async fetchWithMeta<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<FetchWithMetaResult<T>> {
    const response = await this.requestWithRetry(path, options);
    const data = await response.json() as T;

    return {
      data,
      total: parsePositiveInt(response.headers.get("X-WP-Total")),
      totalPages: parsePositiveInt(response.headers.get("X-WP-TotalPages")),
    };
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
  }): Promise<WooOrdersResult> {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.after) query.set("after", params.after);
    if (params.before) query.set("before", params.before);
    const perPage = params.per_page ?? DEFAULT_PER_PAGE;
    query.set("per_page", String(perPage));
    if (params.page) query.set("page", String(params.page));

    // If a specific page is requested, fetch only that page.
    if (params.page) {
      const { data, total, totalPages } = await this.fetchWithMeta<WooOrder[]>(
        `/orders?${query.toString()}`
      );

      return {
        orders: data,
        total: total ?? data.length,
        pages: totalPages ?? 1,
        page: params.page,
        perPage,
      };
    }

    query.set("page", "1");
    const firstPage = await this.fetchWithMeta<WooOrder[]>(
      `/orders?${query.toString()}`
    );

    const orders: WooOrder[] = [...firstPage.data];
    let pages = firstPage.totalPages ?? 1;

    if (firstPage.totalPages && firstPage.totalPages > MAX_AUTO_PAGES) {
      throw new WooApiError(
        `Too many pages (${firstPage.totalPages}) for a single fetch. Narrow filters or use the page parameter.`,
        413,
        false
      );
    }

    if (firstPage.totalPages && firstPage.totalPages > 1) {
      for (let currentPage = 2; currentPage <= firstPage.totalPages; currentPage++) {
        query.set("page", String(currentPage));
        const pageOrders = await this.fetchWithRetry<WooOrder[]>(
          `/orders?${query.toString()}`
        );
        orders.push(...pageOrders);
      }
    } else {
      // Fallback when WooCommerce does not provide total pages headers.
      let currentPage = 2;
      let previousCount = firstPage.data.length;

      while (previousCount === perPage && currentPage <= MAX_AUTO_PAGES) {
        query.set("page", String(currentPage));
        const pageOrders = await this.fetchWithRetry<WooOrder[]>(
          `/orders?${query.toString()}`
        );

        orders.push(...pageOrders);
        previousCount = pageOrders.length;
        currentPage++;
      }

      pages = currentPage - 1;

      if (previousCount === perPage && pages >= MAX_AUTO_PAGES) {
        throw new WooApiError(
          `Too many pages (>${MAX_AUTO_PAGES}) for a single fetch. Narrow filters or use the page parameter.`,
          413,
          false
        );
      }
    }

    return {
      orders,
      total: firstPage.total ?? orders.length,
      pages,
      page: 1,
      perPage,
    };
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

      const pageOrders = await this.fetchWithRetry<WooOrder[]>(
        `/orders?${query.toString()}`
      );
      fetchedOrders.push(...pageOrders);
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

  const { loadCredentials, detectStorageMode } = await import(
    "./credentials"
  );

  const mode = await detectStorageMode();
  const stored = await loadCredentials(mode);

  if (!stored) {
    throw new WooApiError(
      "No WooCommerce credentials found. Please configure credentials via UI or environment variables.",
      401,
      false
    );
  }

  return new WooClient(stored);
}
