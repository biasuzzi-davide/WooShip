import type { WooOrder, CSVOptions, PackageType } from "@/types";
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

interface SplitAddressResult {
  street: string;
  streetNumber: string;
}

interface SenderProfile {
  firstName: string;
  lastName: string;
  street: string;
  streetNumber: string;
  co: string;
  zip: string;
  city: string;
  province: string;
  country: string;
  phone: string;
  email: string;
}

function getEnvValue(name: string): string {
  return (process.env[name] ?? "").trim();
}

function splitStreetAndNumber(address: string | undefined): SplitAddressResult {
  const raw = (address ?? "").trim();
  if (!raw) return { street: "", streetNumber: "" };

  // Split a trailing street number like "Via Roma 12" or "Via Roma, 12/A".
  const trailingNumber = raw.match(/^(.*?)[,\s]+(\d[\dA-Za-z\-\/]*)$/);
  if (!trailingNumber) {
    return { street: raw, streetNumber: "" };
  }

  return {
    street: trailingNumber[1].trim(),
    streetNumber: trailingNumber[2].trim(),
  };
}

function getSenderProfileFromEnv(): SenderProfile {
  const streetInput = getEnvValue("TP_SENDER_STREET");
  const splitStreet = splitStreetAndNumber(streetInput);
  const explicitStreetNumber = getEnvValue("TP_SENDER_STREET_NUMBER");

  return {
    firstName: getEnvValue("TP_SENDER_FIRST_NAME"),
    lastName: getEnvValue("TP_SENDER_LAST_NAME"),
    street: splitStreet.street,
    streetNumber: explicitStreetNumber || splitStreet.streetNumber,
    co: getEnvValue("TP_SENDER_CO"),
    zip: getEnvValue("TP_SENDER_ZIP"),
    city: getEnvValue("TP_SENDER_CITY"),
    province: getEnvValue("TP_SENDER_PROVINCE"),
    country: getEnvValue("TP_SENDER_COUNTRY"),
    phone: getEnvValue("TP_SENDER_PHONE"),
    email: getEnvValue("TP_SENDER_EMAIL"),
  };
}

function mapPackageType(packageCode: string, defaultPackageType: PackageType): string {
  const normalized = packageCode.toUpperCase();

  if (normalized.includes("PALLET")) return "pallet";
  if (normalized.includes("BUSTA") || normalized.includes("ENVELOPE")) return "busta";
  if (normalized.includes("COLLO") || normalized.includes("PACK")) return "pacco";

  return defaultPackageType === "Busta" ? "busta" : "pacco";
}

function formatPickupDate(pickupDate?: string): string {
  if (!pickupDate) return "";

  const normalized = pickupDate.trim();
  const isoDate = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!isoDate) return normalized;

  const [, year, month, day] = isoDate;
  return `${day}/${month}/${year}`;
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
  const sender = getSenderProfileFromEnv();
  const destination = splitStreetAndNumber(shipping.address_1);
  const toFirstName = shipping.first_name || billing.first_name;
  const toLastName = shipping.last_name || billing.last_name;

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
      csvValue(mapPackageType(pkg.type, options.defaultPackageType)), // package_type
      csvValue(pkg.weight.toFixed(1)), // weight
      csvValue(pkg.height), // height
      csvValue(pkg.width), // width
      csvValue(pkg.depth), // depth
      csvValue(formatPickupDate(options.pickupDate)), // pickup_date
      csvValue(options.carrier ?? ""), // carrier
      csvValue(options.service ?? ""), // service
      csvValue(sender.firstName), // from_first_name

      // 11-20
      csvValue(sender.lastName), // from_last_name
      csvValue(sender.street), // from_street
      csvValue(sender.streetNumber), // from_street_number
      csvValue(sender.co), // from_co
      csvValue(sender.zip), // from_zip
      csvValue(sender.city), // from_city
      csvValue(sender.province), // from_province
      csvValue(sender.country), // from_country
      csvValue(sender.phone), // from_phone
      csvValue(sender.email), // from_email

      // 21-30
      csvValue(order.customer_note ?? ""), // notes
      csvValue(toFirstName), // to_first_name
      csvValue(toLastName), // to_last_name
      csvValue(destination.street), // to_street
      csvValue(destination.streetNumber), // to_street_number
      csvValue(shipping.address_2), // to_co
      csvValue(shipping.postcode), // to_zip
      csvValue(shipping.city), // to_city
      csvValue(shipping.state), // to_province
      csvValue(shipping.country), // to_country

      // 31-40
  csvValue(shipping.phone ?? billing.phone ?? ""), // to_phone
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
