import type { WooOrder, CSVOptions } from "@/types";
import { getPackagingForOrder } from "./packaging";

// The exact 46-column header from modello-csv.csv
const CSV_HEADER =
  "custom_reference;package_type;weight;height;width;depth;pickup_date;carrier;service;from_first_name;from_last_name;from_street;from_street_number;from_co;from_zip;from_city;from_province;from_country;from_phone;from_email;notes;to_first_name;to_last_name;to_street;to_street_number;to_co;to_zip;to_city;to_province;to_country;to_phone;to_email;insurance_value;from_cp_code;to_cp_code;cod_type;cod_value;cod_holder;cod_iban;cod_holder_locality;cod_holder_iso2;cod_holder_tax_code;triangulation_from;delivery_to_floor;tail_lift_departure;tail_lift_arrival";

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
 * Generates CSV rows for a single WooCommerce order.
 * Returns an array of string arrays (each inner array is 46 columns).
 */
function orderToRows(
  order: WooOrder,
  options: CSVOptions
): string[][] {
  const isCOD = order.payment_method === "cod";
  const billing = order.billing;
  const shipping = order.shipping;

  const { packages } = getPackagingForOrder(order);
  const rows: string[][] = [];

  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    
    // COD is assigned only to the first package
    const codType = isCOD && i === 0 ? options.codType : "";
    const codValue = isCOD && i === 0 ? order.total : "";
    const codHolder = isCOD && i === 0
      ? [billing.first_name, billing.last_name].filter(Boolean).join(" ")
      : "";
    const codIban = isCOD && i === 0 ? "" : ""; // WooCommerce doesn't store IBAN by default
    const codHolderLocality = isCOD && i === 0 ? (billing.city ?? "") : "";
    const codHolderIso2 = isCOD && i === 0 ? (billing.country ?? "") : "";
    const codHolderTaxCode = isCOD && i === 0 ? (billing.tax_id ?? "") : "";

    const row: string[] = [
      // 1-10
      csvValue(order.number), // custom_reference
      csvValue(pkg.type), // package_type
      csvValue(pkg.weight.toFixed(1)), // weight
      csvValue(pkg.height), // height
      csvValue(pkg.width), // width
      csvValue(pkg.depth), // depth
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
    
    rows.push(row);
  }

  return rows;
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
    const orderRows = orderToRows(order, options);
    for (const row of orderRows) {
      rows.push(row.join(";"));
    }
  }

  return rows.join("\n");
}
