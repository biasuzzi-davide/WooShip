// WooCommerce REST API v3 response types

export interface WooAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string; // ISO 2-letter country code, e.g. "IT"
  email?: string;
  phone?: string;
  tax_id?: string; // VAT/tax ID if set on billing
}

export interface WooLineItem {
  id: number;
  name: string;
  product_id: number;
  quantity: number;
  total: string; // string to preserve decimal precision
  total_tax: string;
  price: number;
  sku?: string;
}

export interface WooShippingLine {
  id: number;
  method_id: string;
  instance_id: string;
  method_title: string;
  total: string;
}

export interface WooFeeLine {
  id: number;
  name: string;
  total: string;
}

export interface WooTaxLine {
  id: number;
  rate_code: string;
  rate_id: number;
  label: string;
  compound: boolean;
  tax_total: string;
  shipping_tax_total: string;
}

export interface WooRefund {
  id: number;
  reason: string;
  total: string;
}

export interface WooOrder {
  id: number;
  number: string; // Human-readable order number
  status: "pending" | "processing" | "on-hold" | "completed" | "cancelled" | "refunded" | "failed" | "trash";
  currency: string;
  currency_symbol: string;
  prices_include_tax: boolean;
  date_created: string; // ISO 8601: "2023-01-30T14:30:00"
  date_modified: string;
  date_completed: string | null;
  date_paid: string | null;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string; // Order total (string for decimal precision)
  total_tax: string;
  customer_id: number;
  customer_note: string;
  billing: WooAddress;
  shipping: WooAddress;
  payment_method: string; // e.g. "cod", "bacs", "stripe", "" for none
  payment_method_title: string;
  transaction_id: string;
  line_items: WooLineItem[];
  tax_lines: WooTaxLine[];
  shipping_lines: WooShippingLine[];
  fee_lines: WooFeeLine[];
  refund_lines: WooRefund[];
  coupons: Array<{ id: number; code: string; discount: string }>;
  virtual: boolean;
  downloadable_items: Array<{ download_id: string; name: string; file: string }>;
  completed_date: string | null;
  meta_data: Array<{ id: number; key: string; value: string | string[] }>;
  external_url: string;
  acknowledged: boolean;
}

export interface WooCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  date_created: string;
  date_modified: string;
  billing: WooAddress;
  shipping: WooAddress;
}
