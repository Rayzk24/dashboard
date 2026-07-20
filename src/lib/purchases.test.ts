import { describe, expect, it } from "vitest";
import type { Purchase } from "../types/domain";
import { filterAndSortPurchases } from "./purchases";

function purchase(
  id: string,
  priority: Purchase["priority"],
  status: Purchase["status"],
  createdAt: string,
): Purchase {
  return {
    id,
    user_id: "user",
    name: id,
    estimated_price: 10,
    url: null,
    category: null,
    priority,
    certainty: "sure",
    status,
    note: "",
    purchased_at: null,
    created_at: createdAt,
  };
}

const purchases = [
  purchase("envisage-urgent", "urgent", "considering", "2026-07-01"),
  purchase("prevu-utile", "useful", "planned", "2026-07-02"),
  purchase("prevu-urgent", "urgent", "planned", "2026-07-03"),
  purchase("ancien-prevu-urgent", "urgent", "planned", "2026-06-01"),
];

describe("filtre et ordre des achats", () => {
  it("conserve tous les achats avec le filtre Tout", () => {
    expect(filterAndSortPurchases(purchases, "all")).toHaveLength(4);
  });

  it("filtre les achats prévus", () => {
    expect(filterAndSortPurchases(purchases, "planned").map((item) => item.id)).toEqual([
      "ancien-prevu-urgent",
      "prevu-urgent",
      "prevu-utile",
    ]);
  });

  it("filtre les achats envisagés", () => {
    expect(filterAndSortPurchases(purchases, "considering").map((item) => item.id)).toEqual([
      "envisage-urgent",
    ]);
  });

  it("place Prévu avant Envisagé uniquement à priorité égale", () => {
    expect(filterAndSortPurchases(purchases, "all").map((item) => item.id)).toEqual([
      "ancien-prevu-urgent",
      "prevu-urgent",
      "envisage-urgent",
      "prevu-utile",
    ]);
  });

  it("reste déterministe pour une priorité et un statut identiques", () => {
    const first = filterAndSortPurchases(purchases, "all").map((item) => item.id);
    const second = filterAndSortPurchases([...purchases].reverse(), "all").map((item) => item.id);
    expect(first).toEqual(second);
  });
});
