import { describe, it, expect } from "vitest";
import { generateCSV } from "./csv-generator";
import type { WooOrder, WooLineItem } from "@/types";

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

  it("handles 1 bottle 0.75L", () => {
    const csv = generateCSV([makeMinimalOrder({
      line_items: [makeItem("Prosecco DOC", 1)]
    })], { defaultPackageType: "Pacco", codType: "A" });
    const row = csv.split("\n")[1].split(";");
    expect(row[1]).toBe("COLLO-075-S");
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
    expect(row1[1]).toBe("COLLO-075-L");
    expect(row1[2]).toBe("10.0"); // 1.0 + (6*1.5) = 10.0
    
    const row2 = lines[2].split(";");
    expect(row2[1]).toBe("COLLO-075-M");
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
        expect(row[1]).toBe("COLLO-MAGNUM");
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
    expect(row[1]).toBe("PALLET-ALTO");
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
});
