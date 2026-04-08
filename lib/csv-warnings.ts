import type { WooOrder, WarningSummary } from "@/types";

// Required fields for a valid shipping address
const REQUIRED_FIELDS = [
  "to_street",
  "to_zip",
  "to_city",
  "to_country",
  "to_last_name",
] as const;

/**
 * Returns all missing required fields for a single order.
 */
function getMissingFields(order: WooOrder): string[] {
  const missing: string[] = [];
  const shipping = order.shipping;

  if (!shipping.address_1?.trim()) missing.push("to_street");
  if (!shipping.postcode?.trim()) missing.push("to_zip");
  if (!shipping.city?.trim()) missing.push("to_city");
  if (!shipping.country?.trim()) missing.push("to_country");
  if (!shipping.last_name?.trim()) missing.push("to_last_name");

  return missing;
}

/**
 * Returns a list of warning summaries for orders with missing required fields.
 */
export function getMissingFieldWarnings(
  orders: WooOrder[]
): WarningSummary[] {
  const warnings: WarningSummary[] = [];

  for (const order of orders) {
    const missing = getMissingFields(order);
    if (missing.length > 0) {
      warnings.push({
        orderId: order.id,
        orderNumber: order.number,
        missingFields: missing,
      });
    }
  }

  return warnings;
}

/**
 * Returns true if any order has missing required fields.
 */
export function hasAnyWarnings(orders: WooOrder[]): boolean {
  return orders.some((order) => getMissingFields(order).length > 0);
}
