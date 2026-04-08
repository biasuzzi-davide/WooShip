import type { WooOrder, CSVOptions } from "@/types";

// The exact 46-column header from modello-csv.csv
const CSV_HEADER =
  "custom_reference;package_type;weight;height;width;depth;pickup_date;carrier;service;from_first_name;from_last_name;from_street;from_street_number;from_co;from_zip;from_city;from_province;from_country;from_phone;from_email;notes;to_first_name;to_last_name;to_street;to_street_number;to_co;to_zip;to_city;to_province;to_country;to_phone;to_email;insurance_value;from_cp_code;to_cp_code;cod_type;cod_value;cod_holder;cod_iban;cod_holder_locality;cod_holder_iso2;cod_holder_tax_code;triangulation_from;delivery_to_floor;tail_lift_departure;tail_lift_arrival";

/**
 * Formats a date from ISO 8601 to Italian DD/MM/YYYY format.
 * Input: "2023-01-30T14:30:00" → Output: "30/01/2023"
 */
function formatDateItalian(isoDate: string): string {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Escapes a value for CSV: wraps in quotes if contains semicolon, newline, or quotes.
 * Empty values are returned as empty strings.
 */
function csvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str === "") return "";
  if (str.includes(";") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates a CSV row for a single WooCommerce order.
 * Returns an array of 46 string values.
 */
function orderToRow(
  order: WooOrder,
  options: CSVOptions
): string[] {
  const isCOD = order.payment_method === "cod";
  const billing = order.billing;
  const shipping = order.shipping;

  // Volumetric weight calculation: W * H * D / 5000
  // Try to get dimensions from meta_data (common WooCommerce dimension plugins store here)
  let weight = 1;
  let height = "";
  let width = "";
  let depth = "";

  for (const meta of order.meta_data ?? []) {
    if (meta.key === "_height") height = String(meta.value);
    if (meta.key === "_width") width = String(meta.value);
    if (meta.key === "_length") depth = String(meta.value);
    if (meta.key === "_weight") weight = parseFloat(String(meta.value)) || 1;
  }

  // If we have all dimensions, calculate volumetric weight
  const h = parseFloat(height);
  const w = parseFloat(width);
  const d = parseFloat(depth);
  if (!isNaN(h) && !isNaN(w) && !isNaN(d) && h > 0 && w > 0 && d > 0) {
    weight = (w * h * d) / 5000;
  }

  // COD fields
  const codType = isCOD ? options.codType : "";
  const codValue = isCOD ? order.total : "";
  const codHolder = isCOD
    ? [billing.first_name, billing.last_name].filter(Boolean).join(" ")
    : "";
  const codIban = isCOD ? "" : ""; // WooCommerce doesn't store IBAN by default
  const codHolderLocality = isCOD ? (billing.city ?? "") : "";
  const codHolderIso2 = isCOD ? (billing.country ?? "") : "";
  const codHolderTaxCode = isCOD ? (billing.tax_id ?? "") : "";

  const row: string[] = [
    // 1-10
    csvValue(order.number), // custom_reference
    csvValue(options.defaultPackageType), // package_type
    csvValue(weight.toFixed(1)), // weight
    csvValue(height), // height
    csvValue(width), // width
    csvValue(depth), // depth
    csvValue(options.pickupDate ?? ""), // pickup_date
    csvValue(options.carrier ?? ""), // carrier
    csvValue(options.service ?? ""), // service
    csvValue(""), // from_first_name

    // 11-20
    csvValue(""), // from_last_name
    csvValue(""), // from_street
    csvValue(""), // from_street_number
    csvValue(""), // from_co
    csvValue(""), // from_zip
    csvValue(""), // from_city
    csvValue(""), // from_province
    csvValue(""), // from_country
    csvValue(""), // from_phone
    csvValue(""), // from_email

    // 21-30
    csvValue(""), // notes
    csvValue(shipping.first_name), // to_first_name
    csvValue(shipping.last_name), // to_last_name
    csvValue(shipping.address_1), // to_street
    csvValue(""), // to_street_number (WooCommerce doesn't separate this)
    csvValue(shipping.address_2), // to_co
    csvValue(shipping.postcode), // to_zip
    csvValue(shipping.city), // to_city
    csvValue(shipping.state), // to_province
    csvValue(shipping.country), // to_country

    // 31-40
    csvValue(shipping.phone ?? ""), // to_phone
    csvValue(billing.email ?? ""), // to_email
    csvValue(""), // insurance_value
    csvValue(""), // from_cp_code
    csvValue(""), // to_cp_code
    csvValue(codType), // cod_type
    csvValue(codValue), // cod_value
    csvValue(codHolder), // cod_holder
    csvValue(codIban), // cod_iban
    csvValue(codHolderLocality), // cod_holder_locality

    // 41-46
    csvValue(codHolderIso2), // cod_holder_iso2
    csvValue(codHolderTaxCode), // cod_holder_tax_code
    csvValue(""), // triangulation_from
    csvValue(""), // delivery_to_floor
    csvValue(""), // tail_lift_departure
    csvValue(""), // tail_lift_arrival
  ];

  return row;
}

/**
 * Generates a semicolon-delimited CSV string from WooCommerce orders.
 * @param orders Array of WooCommerce orders
 * @param options CSV generation options
 * @returns Complete CSV string with header row
 */
export function generateCSV(
  orders: WooOrder[],
  options: CSVOptions
): string {
  const rows = [CSV_HEADER];

  for (const order of orders) {
    const row = orderToRow(order, options);
    rows.push(row.join(";"));
  }

  return rows.join("\n");
}
