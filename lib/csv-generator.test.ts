import { describe, it, expect } from "vitest";
import { generateCSV } from "./csv-generator";
import type { WooOrder } from "@/types";

function makeMinimalOrder(overrides: Partial<WooOrder> = {}): WooOrder {
  return {
    id: 1,
    number: "1234",
    status: "processing",
    currency: "EUR",
    currency_symbol: "€",
    prices_include_tax: false,
    date_created: "2023-01-30T14:30:00",
    date_modified: "2023-01-30T14:30:00",
    date_completed: null,
    date_paid: null,
    discount_total: "0",
    discount_tax: "0",
    shipping_total: "5.00",
    shipping_tax: "0.50",
    cart_tax: "0",
    total: "100.00",
    total_tax: "10.00",
    customer_id: 1,
    customer_note: "",
    billing: {
      first_name: "Mario",
      last_name: "Rossi",
      company: "",
      address_1: "Via Roma 1",
      address_2: "",
      city: "Roma",
      state: "RM",
      postcode: "00100",
      country: "IT",
      email: "mario@test.it",
      phone: "3331234567",
    },
    shipping: {
      first_name: "Luca",
      last_name: "Bianchi",
      company: "",
      address_1: "Via Milano 10",
      address_2: "",
      city: "Milano",
      state: "MI",
      postcode: "20100",
      country: "IT",
    },
    payment_method: "bacs",
    payment_method_title: "Bank Transfer",
    transaction_id: "",
    line_items: [],
    tax_lines: [],
    shipping_lines: [],
    fee_lines: [],
    refund_lines: [],
    coupons: [],
    virtual: false,
    downloadable_items: [],
    completed_date: null,
    meta_data: [],
    external_url: "",
    acknowledged: false,
    ...overrides,
  };
}

describe("generateCSV", () => {
  it("generates exactly 46 columns in header row", () => {
    const csv = generateCSV([makeMinimalOrder()], {
      defaultPackageType: "Pacco",
      codType: "A",
    });
    const lines = csv.split("\n");
    expect(lines.length).toBe(2); // 1 header + 1 data row
    const cols = lines[0].split(";");
    expect(cols.length).toBe(46);
  });

  it("uses semicolon delimiter", () => {
    const csv = generateCSV([makeMinimalOrder()], {
      defaultPackageType: "Pacco",
      codType: "A",
    });
    const lines = csv.split("\n");
    // Check header uses semicolons
    expect(lines[0].includes(";")).toBe(true);
    // Check no commas in header
    expect(lines[0].includes(",")).toBe(false);
  });

  it("maps order.number to custom_reference", () => {
    const csv = generateCSV([makeMinimalOrder({ number: "999" })], {
      defaultPackageType: "Pacco",
      codType: "A",
    });
    const lines = csv.split("\n");
    const row = lines[1];
    const cols = row.split(";");
    expect(cols[0]).toBe("999");
  });

  it("sets package_type from options", () => {
    const csv = generateCSV([makeMinimalOrder()], {
      defaultPackageType: "Busta",
      codType: "A",
    });
    const row = csv.split("\n")[1].split(";");
    expect(row[1]).toBe("Busta");
  });

  it("sets weight to 1 when no dimensions", () => {
    const csv = generateCSV([makeMinimalOrder()], {
      defaultPackageType: "Pacco",
      codType: "A",
    });
    const row = csv.split("\n")[1].split(";");
    expect(row[2]).toBe("1.0");
  });

  it("calculates volumetric weight from meta_data dimensions", () => {
    const csv = generateCSV(
      [
        makeMinimalOrder({
          meta_data: [
            { id: 1, key: "_width", value: "10" },
            { id: 2, key: "_height", value: "20" },
            { id: 3, key: "_length", value: "5" },
          ],
        }),
      ],
      { defaultPackageType: "Pacco", codType: "A" }
    );
    const row = csv.split("\n")[1].split(";");
    // 10 * 20 * 5 / 5000 = 0.2
    expect(row[2]).toBe("0.2");
  });

  it("pickup_date is empty when no pickupDate option provided", () => {
    const csv = generateCSV(
      [makeMinimalOrder({ date_created: "2023-01-30T14:30:00" })],
      {
        defaultPackageType: "Pacco",
        codType: "A",
      }
    );
    const row = csv.split("\n")[1].split(";");
    // pickup_date is column 6
    expect(row[6]).toBe("");
  });

  it("COD order has cod_type = 'A' and cod_value = order total", () => {
    const csv = generateCSV(
      [makeMinimalOrder({ payment_method: "cod", total: "55.00" })],
      { defaultPackageType: "Pacco", codType: "A" }
    );
    const row = csv.split("\n")[1].split(";");
    // cod_type is index 35
    expect(row[35]).toBe("A");
    // cod_value is index 36
    expect(row[36]).toBe("55.00");
  });

  it("COD order has cod_holder = billing first_name + last_name", () => {
    const csv = generateCSV([makeMinimalOrder({ payment_method: "cod" })], {
      defaultPackageType: "Pacco",
      codType: "A",
    });
    const row = csv.split("\n")[1].split(";");
    // cod_holder is index 37
    expect(row[37]).toBe("Mario Rossi");
  });

  it("non-COD order has empty cod_* fields", () => {
    const csv = generateCSV([makeMinimalOrder({ payment_method: "bacs" })], {
      defaultPackageType: "Pacco",
      codType: "A",
    });
    const row = csv.split("\n")[1].split(";");
    expect(row[35]).toBe(""); // cod_type
    expect(row[36]).toBe(""); // cod_value
    expect(row[37]).toBe(""); // cod_holder
  });

  it("generates multiple rows for multiple orders", () => {
    const csv = generateCSV(
      [
        makeMinimalOrder({ id: 1 }),
        makeMinimalOrder({ id: 2 }),
        makeMinimalOrder({ id: 3 }),
      ],
      { defaultPackageType: "Pacco", codType: "A" }
    );
    const lines = csv.split("\n");
    expect(lines.length).toBe(4); // 1 header + 3 data rows
  });
});
