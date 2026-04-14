import { describe, it, expect } from "vitest";
import { getPackagingForOrder, type PackagingResult } from "./packaging";
import type { WooOrder, WooLineItem } from "@/types";

// ─── Helpers ────────────────────────────────────────────────────────

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
    price: 0,
  } as WooLineItem;
}

function makeOrder(items: WooLineItem[]): WooOrder {
  return {
    id: 1,
    number: "TEST-001",
    status: "processing",
    currency: "EUR",
    currency_symbol: "€",
    prices_include_tax: false,
    date_created: "2025-01-01T00:00:00",
    date_modified: "2025-01-01T00:00:00",
    date_completed: null,
    date_paid: null,
    discount_total: "0",
    discount_tax: "0",
    shipping_total: "0",
    shipping_tax: "0",
    cart_tax: "0",
    total: "0",
    total_tax: "0",
    customer_id: 1,
    customer_note: "",
    billing: {
      first_name: "Test",
      last_name: "User",
      company: "",
      address_1: "Via Test 1",
      address_2: "",
      city: "Roma",
      state: "RM",
      postcode: "00100",
      country: "IT",
      email: "test@test.it",
      phone: "3331234567",
    },
    shipping: {
      first_name: "Test",
      last_name: "User",
      company: "",
      address_1: "Via Test 1",
      address_2: "",
      city: "Roma",
      state: "RM",
      postcode: "00100",
      country: "IT",
    },
    payment_method: "bacs",
    payment_method_title: "Bank Transfer",
    transaction_id: "",
    line_items: items,
    tax_lines: [],
    shipping_lines: [],
    fee_lines: [],
    refund_lines: [],
    coupons: [],
    meta_data: [],
    virtual: false,
    downloadable_items: [],
    completed_date: null,
    external_url: "",
    acknowledged: false,
  } as WooOrder;
}

/** Shorthand: create order with n bottles of 0.75L */
function order075(n: number): WooOrder {
  return makeOrder([makeItem("Vino Rosso 0.75L", n)]);
}

/** Shorthand: create order with n magnum bottles */
function orderMagnum(n: number): WooOrder {
  return makeOrder([makeItem("Vino Rosso Magnum", n)]);
}

/** Shorthand: create mixed order */
function orderMixed(n075: number, nMagnum: number): WooOrder {
  const items: WooLineItem[] = [];
  if (n075 > 0) items.push(makeItem("Vino Rosso 0.75L", n075));
  if (nMagnum > 0) items.push(makeItem("Vino Rosso Magnum", nMagnum));
  return makeOrder(items);
}

/** Count packages by type */
function countByType(result: PackagingResult): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const pkg of result.packages) {
    counts[pkg.type] = (counts[pkg.type] || 0) + 1;
  }
  return counts;
}

// ─── §7 — Casi test obbligatori per collaudo ────────────────────────
// These 17 test cases are mandatory and come directly from the spec.

describe("§7 — Casi test obbligatori per collaudo", () => {
  // 1 x 0,75 → 1 collo singolo, No pallet
  it("1 x 0.75 → 1 collo singolo, no pallet", () => {
    const r = getPackagingForOrder(order075(1));
    expect(r.mode).toBe("colli");
    expect(r.packages).toHaveLength(1);
    expect(r.packages[0].type).toBe("COLLO-075-S");
    expect(r.packages[0].weight).toBeCloseTo(2.0);
    expect(r.packages[0].height).toBe("35");
    expect(r.packages[0].width).toBe("11");
    expect(r.packages[0].depth).toBe("11");
  });

  // 7 x 0,75 → 1 collo 4/6 + 1 collo 2/3(1), No collo singolo
  it("7 x 0.75 → 1 collo 4/6 + 1 collo 2/3(1), no collo singolo", () => {
    const r = getPackagingForOrder(order075(7));
    expect(r.mode).toBe("colli");
    expect(r.packages).toHaveLength(2);

    expect(r.packages[0].type).toBe("COLLO-075-L");
    expect(r.packages[0].bottleCount).toBe(6);

    expect(r.packages[1].type).toBe("COLLO-075-M");
    expect(r.packages[1].bottleCount).toBe(1);

    // No COLLO-075-S should be present
    const types = r.packages.map((p) => p.type);
    expect(types).not.toContain("COLLO-075-S");
  });

  // 12 x 0,75 → 2 colli 4/6, Pesi 10 kg + 10 kg
  it("12 x 0.75 → 2 colli 4/6, pesi 10 kg + 10 kg", () => {
    const r = getPackagingForOrder(order075(12));
    expect(r.mode).toBe("colli");
    expect(r.packages).toHaveLength(2);

    for (const pkg of r.packages) {
      expect(pkg.type).toBe("COLLO-075-L");
      expect(pkg.bottleCount).toBe(6);
      expect(pkg.weight).toBeCloseTo(10.0); // 1.0 + (6 × 1.5) = 10.0
    }
  });

  // 25 x 0,75 → 4 colli 4/6 + 1 collo 2/3(1), 5 colli totali
  it("25 x 0.75 → 4 colli 4/6 + 1 collo 2/3(1), 5 colli totali", () => {
    const r = getPackagingForOrder(order075(25));
    expect(r.mode).toBe("colli");
    expect(r.packages).toHaveLength(5);

    const counts = countByType(r);
    expect(counts["COLLO-075-L"]).toBe(4);
    expect(counts["COLLO-075-M"]).toBe(1);
    expect(r.packages[4].bottleCount).toBe(1);
  });

  // 36 x 0,75 → 6 colli 4/6, Nessun pallet
  it("36 x 0.75 → 6 colli 4/6, nessun pallet", () => {
    const r = getPackagingForOrder(order075(36));
    expect(r.mode).toBe("colli");
    expect(r.packages).toHaveLength(6);

    for (const pkg of r.packages) {
      expect(pkg.type).toBe("COLLO-075-L");
      expect(pkg.bottleCount).toBe(6);
    }
  });

  // 37 x 0,75 → 1 pallet basso, Nessun collo normale
  it("37 x 0.75 → 1 pallet basso, nessun collo normale", () => {
    const r = getPackagingForOrder(order075(37));
    expect(r.mode).toBe("pallet-basso");
    expect(r.packages).toHaveLength(1);
    expect(r.packages[0].type).toBe("PALLET-BASSO");
    expect(r.packages[0].height).toBe("45");
    expect(r.packages[0].width).toBe("60");
    expect(r.packages[0].depth).toBe("80");
  });

  // 1 magnum → 1 collo magnum, Peso 3 kg
  it("1 magnum → 1 collo magnum, peso 3 kg", () => {
    const r = getPackagingForOrder(orderMagnum(1));
    expect(r.mode).toBe("colli");
    expect(r.packages).toHaveLength(1);
    expect(r.packages[0].type).toBe("COLLO-MAGNUM");
    expect(r.packages[0].weight).toBeCloseTo(3.0); // 0.5 + 2.5
    expect(r.packages[0].height).toBe("37");
    expect(r.packages[0].width).toBe("14");
    expect(r.packages[0].depth).toBe("14");
  });

  // 20 magnum → 20 colli magnum, No pallet
  it("20 magnum → 20 colli magnum, no pallet", () => {
    const r = getPackagingForOrder(orderMagnum(20));
    expect(r.mode).toBe("colli");
    expect(r.packages).toHaveLength(20);

    for (const pkg of r.packages) {
      expect(pkg.type).toBe("COLLO-MAGNUM");
    }
  });

  // 37 magnum → 1 pallet basso, Nessun collo magnum
  it("37 magnum → 1 pallet basso, nessun collo magnum", () => {
    const r = getPackagingForOrder(orderMagnum(37));
    expect(r.mode).toBe("pallet-basso");
    expect(r.packages).toHaveLength(1);
    expect(r.packages[0].type).toBe("PALLET-BASSO");
  });

  // 49 magnum → 1 pallet alto, Nessun collo magnum
  it("49 magnum → 1 pallet alto, nessun collo magnum", () => {
    const r = getPackagingForOrder(orderMagnum(49));
    expect(r.mode).toBe("pallet-alto");
    expect(r.packages).toHaveLength(1);
    expect(r.packages[0].type).toBe("PALLET-ALTO");
  });

  // 6 x 0,75 + 1 magnum → 1 collo 4/6 + 1 collo magnum, Totale 7 bottiglie
  it("6 x 0.75 + 1 magnum → 1 collo 4/6 + 1 collo magnum, totale 7", () => {
    const r = getPackagingForOrder(orderMixed(6, 1));
    expect(r.totalBottles).toBe(7);
    expect(r.mode).toBe("colli");
    expect(r.packages).toHaveLength(2);

    const counts = countByType(r);
    expect(counts["COLLO-MAGNUM"]).toBe(1);
    expect(counts["COLLO-075-L"]).toBe(1);
  });

  // 18 x 0,75 + 10 magnum → 3 colli 4/6 + 10 colli magnum, Totale 28
  it("18 x 0.75 + 10 magnum → 3 colli 4/6 + 10 colli magnum, totale 28", () => {
    const r = getPackagingForOrder(orderMixed(18, 10));
    expect(r.totalBottles).toBe(28);
    expect(r.mode).toBe("colli");
    expect(r.packages).toHaveLength(13);

    const counts = countByType(r);
    expect(counts["COLLO-MAGNUM"]).toBe(10);
    expect(counts["COLLO-075-L"]).toBe(3);
  });

  // 30 x 0,75 + 6 magnum → 5 colli 4/6 + 6 colli magnum, Totale 36
  it("30 x 0.75 + 6 magnum → 5 colli 4/6 + 6 colli magnum, totale 36", () => {
    const r = getPackagingForOrder(orderMixed(30, 6));
    expect(r.totalBottles).toBe(36);
    expect(r.mode).toBe("colli");
    expect(r.packages).toHaveLength(11);

    const counts = countByType(r);
    expect(counts["COLLO-MAGNUM"]).toBe(6);
    expect(counts["COLLO-075-L"]).toBe(5);
  });

  // 31 x 0,75 + 6 magnum → 1 pallet basso, Totale 37
  it("31 x 0.75 + 6 magnum → 1 pallet basso, totale 37", () => {
    const r = getPackagingForOrder(orderMixed(31, 6));
    expect(r.totalBottles).toBe(37);
    expect(r.mode).toBe("pallet-basso");
    expect(r.packages).toHaveLength(1);
    expect(r.packages[0].type).toBe("PALLET-BASSO");
  });

  // 20 x 0,75 + 29 magnum → 1 pallet alto, Totale 49
  it("20 x 0.75 + 29 magnum → 1 pallet alto, totale 49", () => {
    const r = getPackagingForOrder(orderMixed(20, 29));
    expect(r.totalBottles).toBe(49);
    expect(r.mode).toBe("pallet-alto");
    expect(r.packages).toHaveLength(1);
    expect(r.packages[0].type).toBe("PALLET-ALTO");
  });
});

// ─── §6 — Tabella composizione attesa per bottiglie 0.75 L (1-36) ──

describe("§6 — Composizione 0.75L da 1 a 36 bottiglie", () => {
  /**
   * Expected composition for 0.75L bottles from the spec table.
   * Format: [qty, expectedL, expectedM]
   * where L = number of COLLO-075-L and M = number of COLLO-075-M
   * Special case: qty === 1 → COLLO-075-S (not M)
   */
  const table: Array<{
    qty: number;
    S?: number;
    L?: number;
    M?: number;
    mBottles?: number;
    lBottles?: number[];
  }> = [
    // qty 1 → 1x singolo
    { qty: 1, S: 1 },
    // qty 2 → 1x 2/3(2)
    { qty: 2, M: 1, mBottles: 2 },
    // qty 3 → 1x 2/3(3)
    { qty: 3, M: 1, mBottles: 3 },
    // qty 4 → 1x 4/6(4)
    { qty: 4, L: 1, lBottles: [4] },
    // qty 5 → 1x 4/6(5)
    { qty: 5, L: 1, lBottles: [5] },
    // qty 6 → 1x 4/6(6)
    { qty: 6, L: 1, lBottles: [6] },
    // qty 7 → 1x 4/6 + 1x 2/3(1)
    { qty: 7, L: 1, M: 1, lBottles: [6], mBottles: 1 },
    // qty 8 → 1x 4/6 + 1x 2/3(2)
    { qty: 8, L: 1, M: 1, lBottles: [6], mBottles: 2 },
    // qty 9 → 1x 4/6 + 1x 2/3(3)
    { qty: 9, L: 1, M: 1, lBottles: [6], mBottles: 3 },
    // qty 10 → 1x 4/6 + 1x 4/6(4)
    { qty: 10, L: 2, lBottles: [6, 4] },
    // qty 11 → 1x 4/6 + 1x 4/6(5)
    { qty: 11, L: 2, lBottles: [6, 5] },
    // qty 12 → 2x 4/6
    { qty: 12, L: 2, lBottles: [6, 6] },
    // qty 13 → 2x 4/6 + 1x 2/3(1)
    { qty: 13, L: 2, M: 1, lBottles: [6, 6], mBottles: 1 },
    // qty 14 → 2x 4/6 + 1x 2/3(2)
    { qty: 14, L: 2, M: 1, lBottles: [6, 6], mBottles: 2 },
    // qty 15 → 2x 4/6 + 1x 2/3(3)
    { qty: 15, L: 2, M: 1, lBottles: [6, 6], mBottles: 3 },
    // qty 16 → 2x 4/6 + 1x 4/6(4)
    { qty: 16, L: 3, lBottles: [6, 6, 4] },
    // qty 17 → 2x 4/6 + 1x 4/6(5)
    { qty: 17, L: 3, lBottles: [6, 6, 5] },
    // qty 18 → 3x 4/6
    { qty: 18, L: 3, lBottles: [6, 6, 6] },
    // qty 19 → 3x 4/6 + 1x 2/3(1)
    { qty: 19, L: 3, M: 1, lBottles: [6, 6, 6], mBottles: 1 },
    // qty 20 → 3x 4/6 + 1x 2/3(2)
    { qty: 20, L: 3, M: 1, lBottles: [6, 6, 6], mBottles: 2 },
    // qty 21 → 3x 4/6 + 1x 2/3(3)
    { qty: 21, L: 3, M: 1, lBottles: [6, 6, 6], mBottles: 3 },
    // qty 22 → 3x 4/6 + 1x 4/6(4)
    { qty: 22, L: 4, lBottles: [6, 6, 6, 4] },
    // qty 23 → 3x 4/6 + 1x 4/6(5)
    { qty: 23, L: 4, lBottles: [6, 6, 6, 5] },
    // qty 24 → 4x 4/6
    { qty: 24, L: 4, lBottles: [6, 6, 6, 6] },
    // qty 25 → 4x 4/6 + 1x 2/3(1)
    { qty: 25, L: 4, M: 1, lBottles: [6, 6, 6, 6], mBottles: 1 },
    // qty 26 → 4x 4/6 + 1x 2/3(2)
    { qty: 26, L: 4, M: 1, lBottles: [6, 6, 6, 6], mBottles: 2 },
    // qty 27 → 4x 4/6 + 1x 2/3(3)
    { qty: 27, L: 4, M: 1, lBottles: [6, 6, 6, 6], mBottles: 3 },
    // qty 28 → 4x 4/6 + 1x 4/6(4)
    { qty: 28, L: 5, lBottles: [6, 6, 6, 6, 4] },
    // qty 29 → 4x 4/6 + 1x 4/6(5)
    { qty: 29, L: 5, lBottles: [6, 6, 6, 6, 5] },
    // qty 30 → 5x 4/6
    { qty: 30, L: 5, lBottles: [6, 6, 6, 6, 6] },
    // qty 31 → 5x 4/6 + 1x 2/3(1)
    { qty: 31, L: 5, M: 1, lBottles: [6, 6, 6, 6, 6], mBottles: 1 },
    // qty 32 → 5x 4/6 + 1x 2/3(2)
    { qty: 32, L: 5, M: 1, lBottles: [6, 6, 6, 6, 6], mBottles: 2 },
    // qty 33 → 5x 4/6 + 1x 2/3(3)
    { qty: 33, L: 5, M: 1, lBottles: [6, 6, 6, 6, 6], mBottles: 3 },
    // qty 34 → 5x 4/6 + 1x 4/6(4)
    { qty: 34, L: 6, lBottles: [6, 6, 6, 6, 6, 4] },
    // qty 35 → 5x 4/6 + 1x 4/6(5)
    { qty: 35, L: 6, lBottles: [6, 6, 6, 6, 6, 5] },
    // qty 36 → 6x 4/6
    { qty: 36, L: 6, lBottles: [6, 6, 6, 6, 6, 6] },
  ];

  for (const tc of table) {
    it(`${tc.qty} bottiglie 0.75L`, () => {
      const r = getPackagingForOrder(order075(tc.qty));
      expect(r.mode).toBe("colli");
      expect(r.qty075).toBe(tc.qty);
      expect(r.totalBottles).toBe(tc.qty);

      const counts = countByType(r);
      const totalPkgs = (tc.S ?? 0) + (tc.L ?? 0) + (tc.M ?? 0);
      expect(r.packages).toHaveLength(totalPkgs);

      if (tc.S) {
        expect(counts["COLLO-075-S"]).toBe(tc.S);
      }
      if (tc.L) {
        expect(counts["COLLO-075-L"]).toBe(tc.L);
        // Verify bottle counts in L-type packages
        const lPkgs = r.packages.filter((p) => p.type === "COLLO-075-L");
        for (let i = 0; i < lPkgs.length; i++) {
          expect(lPkgs[i].bottleCount).toBe(tc.lBottles![i]);
        }
      }
      if (tc.M) {
        expect(counts["COLLO-075-M"]).toBe(tc.M);
        const mPkg = r.packages.find((p) => p.type === "COLLO-075-M")!;
        expect(mPkg.bottleCount).toBe(tc.mBottles);
      }
    });
  }
});

// ─── §5 — Formule di peso ───────────────────────────────────────────

describe("§5 — Formule di peso", () => {
  // Collo singolo 0,75 L = 0,5 + (1 × 1,5) = 2,0 kg
  it("Collo singolo 0.75L: peso = 0.5 + (1 × 1.5) = 2.0 kg", () => {
    const r = getPackagingForOrder(order075(1));
    expect(r.packages[0].weight).toBeCloseTo(2.0);
  });

  // Collo 2/3: 0,5 + (n × 1,5) per n in [1,3]
  it.each([1, 2, 3])(
    "Collo 2/3 con n=%d bottiglie: peso = 0.5 + (n × 1.5)",
    (n) => {
      // To get a COLLO-075-M with n bottles, we need qty > 1
      // n=1 → order 7 bottles (6L + 1M), n=2 → order 8, n=3 → order 9
      const qty = 6 + n; // ensures 1 COLLO-075-L(6) + 1 COLLO-075-M(n)
      const r = getPackagingForOrder(order075(qty));
      const mPkg = r.packages.find((p) => p.type === "COLLO-075-M")!;
      expect(mPkg).toBeDefined();
      expect(mPkg.bottleCount).toBe(n);
      expect(mPkg.weight).toBeCloseTo(0.5 + n * 1.5);
    }
  );

  // Collo 4/6: 1,0 + (n × 1,5) per n in [4,6]
  it.each([4, 5, 6])(
    "Collo 4/6 con n=%d bottiglie: peso = 1.0 + (n × 1.5)",
    (n) => {
      const r = getPackagingForOrder(order075(n));
      expect(r.packages[0].type).toBe("COLLO-075-L");
      expect(r.packages[0].bottleCount).toBe(n);
      expect(r.packages[0].weight).toBeCloseTo(1.0 + n * 1.5);
    }
  );

  // Collo magnum = 0,5 + (1 × 2,5) = 3,0 kg
  it("Collo magnum: peso = 0.5 + (1 × 2.5) = 3.0 kg", () => {
    const r = getPackagingForOrder(orderMagnum(1));
    expect(r.packages[0].weight).toBeCloseTo(3.0);
  });

  // Pallet basso/alto = 2,0 + (n075 × 1,5) + (nMag × 2,5)
  it("Pallet basso: peso = 2.0 + (n075 × 1.5) + (nMag × 2.5)", () => {
    const r = getPackagingForOrder(orderMixed(31, 6));
    // 2.0 + (31 × 1.5) + (6 × 2.5) = 2.0 + 46.5 + 15.0 = 63.5
    expect(r.packages[0].weight).toBeCloseTo(63.5);
  });

  it("Pallet alto: peso = 2.0 + (n075 × 1.5) + (nMag × 2.5)", () => {
    const r = getPackagingForOrder(orderMixed(20, 29));
    // 2.0 + (20 × 1.5) + (29 × 2.5) = 2.0 + 30.0 + 72.5 = 104.5
    expect(r.packages[0].weight).toBeCloseTo(104.5);
  });

  it("Pallet alto solo 0.75L: peso = 2.0 + (50 × 1.5) = 77.0 kg", () => {
    const r = getPackagingForOrder(order075(50));
    expect(r.packages[0].weight).toBeCloseTo(77.0);
  });
});

// ─── §3 — Dati logistici fissi (dimensioni colli) ───────────────────

describe("§3 — Dimensioni colli", () => {
  it("COLLO-075-S: 35 × 11 × 11 cm", () => {
    const r = getPackagingForOrder(order075(1));
    const pkg = r.packages[0];
    expect(pkg.type).toBe("COLLO-075-S");
    expect(pkg.height).toBe("35");
    expect(pkg.width).toBe("11");
    expect(pkg.depth).toBe("11");
  });

  it("COLLO-075-M: 39 × 15 × 41 cm", () => {
    const r = getPackagingForOrder(order075(2));
    const pkg = r.packages[0];
    expect(pkg.type).toBe("COLLO-075-M");
    expect(pkg.height).toBe("39");
    expect(pkg.width).toBe("15");
    expect(pkg.depth).toBe("41");
  });

  it("COLLO-075-L: 39 × 30 × 41 cm", () => {
    const r = getPackagingForOrder(order075(6));
    const pkg = r.packages[0];
    expect(pkg.type).toBe("COLLO-075-L");
    expect(pkg.height).toBe("39");
    expect(pkg.width).toBe("30");
    expect(pkg.depth).toBe("41");
  });

  it("COLLO-MAGNUM: 37 × 14 × 14 cm", () => {
    const r = getPackagingForOrder(orderMagnum(1));
    const pkg = r.packages[0];
    expect(pkg.type).toBe("COLLO-MAGNUM");
    expect(pkg.height).toBe("37");
    expect(pkg.width).toBe("14");
    expect(pkg.depth).toBe("14");
  });

  it("PALLET-BASSO: 45 × 60 × 80 cm", () => {
    const r = getPackagingForOrder(order075(37));
    const pkg = r.packages[0];
    expect(pkg.type).toBe("PALLET-BASSO");
    expect(pkg.height).toBe("45");
    expect(pkg.width).toBe("60");
    expect(pkg.depth).toBe("80");
  });

  it("PALLET-ALTO: 75 × 60 × 80 cm", () => {
    const r = getPackagingForOrder(order075(49));
    const pkg = r.packages[0];
    expect(pkg.type).toBe("PALLET-ALTO");
    expect(pkg.height).toBe("75");
    expect(pkg.width).toBe("60");
    expect(pkg.depth).toBe("80");
  });
});

// ─── §4 — Regole di business ────────────────────────────────────────

describe("§4 — Regole di business", () => {
  it("Totale bottiglie = qty 0.75L + qty magnum", () => {
    const r = getPackagingForOrder(orderMixed(10, 5));
    expect(r.qty075).toBe(10);
    expect(r.qtyMagnum).toBe(5);
    expect(r.totalBottles).toBe(15);
  });

  it("Totale > 48 → pallet-alto, nessun collo individuale", () => {
    const r = getPackagingForOrder(order075(49));
    expect(r.mode).toBe("pallet-alto");
    expect(r.packages).toHaveLength(1);
    expect(r.packages[0].type).toBe("PALLET-ALTO");
  });

  it("Totale 37-48 → pallet-basso, nessun collo individuale", () => {
    for (const n of [37, 40, 48]) {
      const r = getPackagingForOrder(order075(n));
      expect(r.mode).toBe("pallet-basso");
      expect(r.packages).toHaveLength(1);
      expect(r.packages[0].type).toBe("PALLET-BASSO");
    }
  });

  it("Totale <= 36 → colli individuali", () => {
    const r = getPackagingForOrder(order075(36));
    expect(r.mode).toBe("colli");
    const types = r.packages.map((p) => p.type);
    expect(types).not.toContain("PALLET-ALTO");
    expect(types).not.toContain("PALLET-BASSO");
  });

  it("Fino a 36, ogni magnum viaggia in collo singolo magnum", () => {
    const r = getPackagingForOrder(orderMixed(10, 5));
    expect(r.totalBottles).toBe(15);
    const magnumPkgs = r.packages.filter((p) => p.type === "COLLO-MAGNUM");
    expect(magnumPkgs).toHaveLength(5);
    for (const pkg of magnumPkgs) {
      expect(pkg.bottleCount).toBe(1);
    }
  });

  it("Singola 0.75L usa collo singolo SOLO con esattamente 1 bottiglia 0.75L", () => {
    // Exactly 1 bottle of 0.75L → COLLO-075-S
    const r1 = getPackagingForOrder(order075(1));
    expect(r1.packages[0].type).toBe("COLLO-075-S");

    // 1 bottle 0.75L + 1 magnum → should still use COLLO-075-S for the 0.75
    const r2 = getPackagingForOrder(orderMixed(1, 1));
    const s = r2.packages.find((p) => p.type === "COLLO-075-S");
    expect(s).toBeDefined();

    // 2 bottles of 0.75L → should NOT use COLLO-075-S
    const r3 = getPackagingForOrder(order075(2));
    const types = r3.packages.map((p) => p.type);
    expect(types).not.toContain("COLLO-075-S");
  });

  it("Per 0.75L da 2 a 3 → collo 2/3", () => {
    for (const n of [2, 3]) {
      const r = getPackagingForOrder(order075(n));
      expect(r.packages).toHaveLength(1);
      expect(r.packages[0].type).toBe("COLLO-075-M");
    }
  });

  it("Per 0.75L da 4 a 6 → collo 4/6", () => {
    for (const n of [4, 5, 6]) {
      const r = getPackagingForOrder(order075(n));
      expect(r.packages).toHaveLength(1);
      expect(r.packages[0].type).toBe("COLLO-075-L");
    }
  });

  it("Per 0.75L ≥ 7: massimo colli da 6, resto 1-3 → 1 collo 2/3", () => {
    // 7 = 6 + 1 → L + M(1)
    const r7 = getPackagingForOrder(order075(7));
    const counts7 = countByType(r7);
    expect(counts7["COLLO-075-L"]).toBe(1);
    expect(counts7["COLLO-075-M"]).toBe(1);

    // 15 = 12 + 3 → 2L + M(3)
    const r15 = getPackagingForOrder(order075(15));
    const counts15 = countByType(r15);
    expect(counts15["COLLO-075-L"]).toBe(2);
    expect(counts15["COLLO-075-M"]).toBe(1);
  });

  it("Per 0.75L ≥ 7: massimo colli da 6, resto 4 o 5 → 1 collo 4/6", () => {
    // 10 = 6 + 4 → L(6) + L(4)
    const r10 = getPackagingForOrder(order075(10));
    const counts10 = countByType(r10);
    expect(counts10["COLLO-075-L"]).toBe(2);
    expect(counts10["COLLO-075-M"]).toBeUndefined();

    // 17 = 12 + 5 → 2x L(6) + L(5)
    const r17 = getPackagingForOrder(order075(17));
    const counts17 = countByType(r17);
    expect(counts17["COLLO-075-L"]).toBe(3);
    expect(counts17["COLLO-075-M"]).toBeUndefined();
  });
});

// ─── Edge cases & boundary conditions ───────────────────────────────

describe("Edge cases", () => {
  it("Ordine senza line_items → fallback collo standard", () => {
    const order = makeOrder([]);
    const r = getPackagingForOrder(order);
    expect(r.totalBottles).toBe(0);
    expect(r.mode).toBe("empty");
  });

  it("Boundary: 48 bottiglie → pallet basso (non alto)", () => {
    const r = getPackagingForOrder(order075(48));
    expect(r.mode).toBe("pallet-basso");
    expect(r.packages[0].type).toBe("PALLET-BASSO");
  });

  it("Boundary: 49 bottiglie → pallet alto", () => {
    const r = getPackagingForOrder(order075(49));
    expect(r.mode).toBe("pallet-alto");
    expect(r.packages[0].type).toBe("PALLET-ALTO");
  });

  it("Boundary: 36 bottiglie → colli (non pallet)", () => {
    const r = getPackagingForOrder(order075(36));
    expect(r.mode).toBe("colli");
  });

  it("Boundary: 37 bottiglie → pallet basso", () => {
    const r = getPackagingForOrder(order075(37));
    expect(r.mode).toBe("pallet-basso");
  });

  it("Ordine molto grande (100+ bottiglie miste) → pallet alto", () => {
    const r = getPackagingForOrder(orderMixed(60, 50));
    expect(r.totalBottles).toBe(110);
    expect(r.mode).toBe("pallet-alto");
    expect(r.packages).toHaveLength(1);
    expect(r.packages[0].weight).toBeCloseTo(2.0 + 60 * 1.5 + 50 * 2.5);
  });

  it("Somma bottiglie di prodotti multipli dello stesso tipo", () => {
    const order = makeOrder([
      makeItem("Prosecco DOC 0.75L", 3),
      makeItem("Amarone 0.75L", 4),
    ]);
    const r = getPackagingForOrder(order);
    expect(r.qty075).toBe(7);
    expect(r.totalBottles).toBe(7);
  });

  it("Mix di prodotti magnum e normali", () => {
    const order = makeOrder([
      makeItem("Prosecco DOC 0.75L", 3),
      makeItem("Amarone Magnum", 2),
      makeItem("Barolo 0.75L", 3),
    ]);
    const r = getPackagingForOrder(order);
    expect(r.qty075).toBe(6);
    expect(r.qtyMagnum).toBe(2);
    expect(r.totalBottles).toBe(8);
    expect(r.mode).toBe("colli");

    const counts = countByType(r);
    expect(counts["COLLO-MAGNUM"]).toBe(2);
    expect(counts["COLLO-075-L"]).toBe(1); // 6 bottles → 1x collo 4/6
  });
});
