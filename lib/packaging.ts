import type { WooOrder } from "@/types";

export interface PackageInfo {
  type: string;
  weight: number;
  height: string;
  width: string;
  depth: string;
  bottleCount?: number;
  bottleType?: "075" | "magnum" | "mixed";
}

export interface PackagingResult {
  packages: PackageInfo[];
  qty075: number;
  qtyMagnum: number;
  totalBottles: number;
  mode: "pallet-alto" | "pallet-basso" | "colli" | "empty";
}

/**
 * Computes the packaging breakdown for a WooCommerce order.
 * This is the same business logic used by the CSV generator, exposed
 * as a pure function so it can be consumed by both client components
 * and server-side CSV generation.
 */
export function getPackagingForOrder(order: WooOrder): PackagingResult {
  let qty075 = 0;
  let qtyMagnum = 0;

  for (const item of order.line_items ?? []) {
    const name = item.name?.toLowerCase() || "";
    if (name.includes("magnum")) {
      qtyMagnum += item.quantity;
    } else {
      qty075 += item.quantity;
    }
  }

  const totalBottles = qty075 + qtyMagnum;
  const packages: PackageInfo[] = [];

  if (totalBottles === 0) {
    return {
      packages: [
        {
          type: "COLLO-STANDARD",
          weight: 1.0,
          height: "",
          width: "",
          depth: "",
        },
      ],
      qty075,
      qtyMagnum,
      totalBottles,
      mode: "empty",
    };
  }

  if (totalBottles > 48) {
    packages.push({
      type: "PALLET-ALTO",
      weight: 2.0 + qty075 * 1.5 + qtyMagnum * 2.5,
      height: "75",
      width: "60",
      depth: "80",
      bottleCount: totalBottles,
      bottleType: qtyMagnum > 0 && qty075 > 0 ? "mixed" : qtyMagnum > 0 ? "magnum" : "075",
    });
    return { packages, qty075, qtyMagnum, totalBottles, mode: "pallet-alto" };
  }

  if (totalBottles >= 37 && totalBottles <= 48) {
    packages.push({
      type: "PALLET-BASSO",
      weight: 2.0 + qty075 * 1.5 + qtyMagnum * 2.5,
      height: "45",
      width: "60",
      depth: "80",
      bottleCount: totalBottles,
      bottleType: qtyMagnum > 0 && qty075 > 0 ? "mixed" : qtyMagnum > 0 ? "magnum" : "075",
    });
    return { packages, qty075, qtyMagnum, totalBottles, mode: "pallet-basso" };
  }

  // <= 36 bottles: individual colli
  for (let i = 0; i < qtyMagnum; i++) {
    packages.push({
      type: "COLLO-MAGNUM",
      weight: 3.0,
      height: "37",
      width: "14",
      depth: "14",
      bottleCount: 1,
      bottleType: "magnum",
    });
  }

  if (qty075 === 1) {
    packages.push({
      type: "COLLO-075-S",
      weight: 2.0,
      height: "35",
      width: "11",
      depth: "11",
      bottleCount: 1,
      bottleType: "075",
    });
  } else if (qty075 > 0) {
    let unassigned = qty075;
    while (unassigned > 0) {
      if (unassigned >= 6) {
        packages.push({
          type: "COLLO-075-L",
          weight: 1.0 + 6 * 1.5,
          height: "39",
          width: "30",
          depth: "41",
          bottleCount: 6,
          bottleType: "075",
        });
        unassigned -= 6;
      } else if (unassigned === 4 || unassigned === 5) {
        packages.push({
          type: "COLLO-075-L",
          weight: 1.0 + unassigned * 1.5,
          height: "39",
          width: "30",
          depth: "41",
          bottleCount: unassigned,
          bottleType: "075",
        });
        unassigned = 0;
      } else {
        // 1-3
        packages.push({
          type: "COLLO-075-M",
          weight: 0.5 + unassigned * 1.5,
          height: "39",
          width: "15",
          depth: "41",
          bottleCount: unassigned,
          bottleType: "075",
        });
        unassigned = 0;
      }
    }
  }

  return { packages, qty075, qtyMagnum, totalBottles, mode: "colli" };
}
