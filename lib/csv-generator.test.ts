import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateCSV } from "./csv-generator";
import type { WooOrder, WooLineItem } from "@/types";

const SENDER_ENV_KEYS = [
  "TP_SENDER_FIRST_NAME",
  "TP_SENDER_LAST_NAME",
  "TP_SENDER_STREET",
  "TP_SENDER_STREET_NUMBER",
  "TP_SENDER_ZIP",
  "TP_SENDER_CITY",
  "TP_SENDER_PROVINCE",
  "TP_SENDER_COUNTRY",
  "TP_SENDER_PHONE",
  "TP_SENDER_EMAIL",
] as const;

const SENDER_ENV_VALUES: Record<(typeof SENDER_ENV_KEYS)[number], string> = {
  TP_SENDER_FIRST_NAME: "Vini Dufour",
  TP_SENDER_LAST_NAME: "Societa Agricola Rossi de Rubeis Giovanna Srl",
  TP_SENDER_STREET: "Martiri della Liberta",
  TP_SENDER_STREET_NUMBER: "55",
  TP_SENDER_ZIP: "31025",
  TP_SENDER_CITY: "Santa Lucia di Piave",
  TP_SENDER_PROVINCE: "TV",
  TP_SENDER_COUNTRY: "IT",
  TP_SENDER_PHONE: "+39 392 2504920",
  TP_SENDER_EMAIL: "tommaso@vinidufour.com",
};

const originalSenderEnv: Partial<Record<(typeof SENDER_ENV_KEYS)[number], string | undefined>> = {};

beforeEach(() => {
  for (const key of SENDER_ENV_KEYS) {
    originalSenderEnv[key] = process.env[key];
    process.env[key] = SENDER_ENV_VALUES[key];
  }
});

afterEach(() => {
  for (const key of SENDER_ENV_KEYS) {
    const original = originalSenderEnv[key];
    if (original === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = original;
    }
  }
});

function makeItem(name: string, quantity: number): WooLineItem {
  return {
    id: Math.random(),
    name,
    product_id: 1,
    variation_id: 0,
    quantity,
    tax_class: "",
    subtotal: "0",
    subtotal_tax: "0",
    total: "0",
    total_tax: "0",
    taxes: [],
    meta_data: [],
    sku: "",
    price: 0
  } as WooLineItem;
}

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
    line_items: [makeItem("Bottiglia 0.75L", 1)],
    tax_lines: [],
    shipping_lines: [],
    fee_lines: [],
    refund_lines: [],
    coupons: [],
    meta_data: [],
    ...overrides,
  } as WooOrder;
}

describe("generateCSV packaging logic", () => {
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

  it("fills sender fields from environment variables", () => {
    const csv = generateCSV([makeMinimalOrder()], {
      defaultPackageType: "Pacco",
      codType: "A",
    });

    const row = csv.split("\n")[1].split(";");
    expect(row[9]).toBe("Vini Dufour");
    expect(row[10]).toBe("Societa Agricola Rossi de Rubeis Giovanna Srl");
    expect(row[11]).toBe("Martiri della Liberta");
    expect(row[12]).toBe("55");
    expect(row[14]).toBe("31025");
    expect(row[15]).toBe("Santa Lucia di Piave");
    expect(row[16]).toBe("TV");
    expect(row[17]).toBe("IT");
    expect(row[18]).toBe("+39 392 2504920");
    expect(row[19]).toBe("tommaso@vinidufour.com");
  });

  it("handles 1 bottle 0.75L", () => {
    const csv = generateCSV([makeMinimalOrder({
      line_items: [makeItem("Prosecco DOC", 1)]
    })], { defaultPackageType: "Pacco", codType: "A" });
    const row = csv.split("\n")[1].split(";");
    expect(row[1]).toBe("pacco");
    expect(row[2]).toBe("2.0"); // 0.5 + 1.5
    expect(row[3]).toBe("35"); // height
    expect(row[4]).toBe("11"); // width
    expect(row[5]).toBe("11"); // depth
  });

  it("handles 7 bottles 0.75L (1x 4/6 + 1x 2/3)", () => {
    const csv = generateCSV([makeMinimalOrder({
      line_items: [makeItem("Prosecco DOC", 7)]
    })], { defaultPackageType: "Pacco", codType: "A" });
    const lines = csv.split("\n");
    expect(lines.length).toBe(3); // header + 2 rows
    
    const row1 = lines[1].split(";");
    expect(row1[1]).toBe("pacco");
    expect(row1[2]).toBe("10.0"); // 1.0 + (6*1.5) = 10.0
    
    const row2 = lines[2].split(";");
    expect(row2[1]).toBe("pacco");
    expect(row2[2]).toBe("2.0"); // 0.5 + (1*1.5) = 2.0
  });

  it("handles Magnum bottles correctly", () => {
    const csv = generateCSV([makeMinimalOrder({
      line_items: [makeItem("Prosecco Magnum Special", 2)]
    })], { defaultPackageType: "Pacco", codType: "A" });
    const lines = csv.split("\n");
    expect(lines.length).toBe(3); // header + 2 rows
    
    for (let i = 1; i <= 2; i++) {
        const row = lines[i].split(";");
      expect(row[1]).toBe("pacco");
        expect(row[2]).toBe("3.0"); // 0.5 + 2.5
    }
  });

  it("handles High Pallet (> 48 bottles)", () => {
    const csv = generateCSV([makeMinimalOrder({
      line_items: [makeItem("Prosecco DOC", 50)]
    })], { defaultPackageType: "Pacco", codType: "A" });
    const lines = csv.split("\n");
    expect(lines.length).toBe(2); 
    
    const row = lines[1].split(";");
    expect(row[1]).toBe("pallet");
    expect(row[2]).toBe("77.0"); // 2.0 + (50*1.5) = 77
    expect(row[3]).toBe("75"); // height
  });

  it("COD order distributes total correctly on the first row only", () => {
    const csv = generateCSV([makeMinimalOrder({
      payment_method: "cod",
      total: "50.00",
      line_items: [makeItem("Prosecco DOC", 7)] // generates 2 rows
    })], { defaultPackageType: "Pacco", codType: "A" });
    const lines = csv.split("\n");
    expect(lines.length).toBe(3); 
    
    const row1 = lines[1].split(";");
    expect(row1[35]).toBe("A"); // cod_type
    expect(row1[36]).toBe("50.00"); // cod_value
    
    const row2 = lines[2].split(";");
    expect(row2[35]).toBe(""); 
    expect(row2[36]).toBe(""); 
  });

  it("can skip COD fields when includeCod is disabled", () => {
    const csv = generateCSV([makeMinimalOrder({
      payment_method: "cod",
      total: "50.00",
      line_items: [makeItem("Prosecco DOC", 7)] // generates 2 rows
    })], {
      defaultPackageType: "Pacco",
      codType: "A",
      includeCod: false,
    });

    const lines = csv.split("\n");
    expect(lines.length).toBe(3);

    const row1 = lines[1].split(";");
    const row2 = lines[2].split(";");

    expect(row1[35]).toBe("");
    expect(row1[36]).toBe("");
    expect(row1[37]).toBe("");
    expect(row1[40]).toBe("");
    expect(row2[35]).toBe("");
    expect(row2[36]).toBe("");
  });

  it("falls back to billing country for to_country when shipping country is empty", () => {
    const csv = generateCSV([makeMinimalOrder({
      shipping: {
        ...makeMinimalOrder().shipping,
        country: "   ",
      },
      billing: {
        ...makeMinimalOrder().billing,
        country: "IT",
      },
    })], {
      defaultPackageType: "Pacco",
      codType: "A",
    });

    const row = csv.split("\n")[1].split(";");
    expect(row[29]).toBe("IT");
  });

  it("uses shipping phone for to_phone when available", () => {
    const csv = generateCSV([makeMinimalOrder({
      shipping: {
        ...makeMinimalOrder().shipping,
        phone: "3339990001",
      },
      billing: {
        ...makeMinimalOrder().billing,
        phone: "3331112222",
      },
    })], {
      defaultPackageType: "Pacco",
      codType: "A",
    });

    const row = csv.split("\n")[1].split(";");
    expect(row[30]).toBe("3339990001");
  });

  it("falls back to billing phone for to_phone when shipping phone is empty", () => {
    const csv = generateCSV([makeMinimalOrder({
      shipping: {
        ...makeMinimalOrder().shipping,
        phone: "   ",
      },
      billing: {
        ...makeMinimalOrder().billing,
        phone: "3331112222",
      },
    })], {
      defaultPackageType: "Pacco",
      codType: "A",
    });

    const row = csv.split("\n")[1].split(";");
    expect(row[30]).toBe("3331112222");
  });
});
