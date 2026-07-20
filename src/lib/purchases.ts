import type { Purchase } from "../types/domain";

export type PurchaseFilter = "all" | "planned" | "considering";

export const purchasePriorityOrder: Record<Purchase["priority"], number> = {
  urgent: 0,
  useful: 1,
  not_urgent: 2,
};

export const purchaseStatusOrder: Record<Purchase["status"], number> = {
  planned: 0,
  considering: 1,
  bought: 2,
  abandoned: 3,
};

export function filterAndSortPurchases(
  purchases: Purchase[],
  filter: PurchaseFilter,
) {
  return purchases
    .filter((purchase) => filter === "all" || purchase.status === filter)
    .slice()
    .sort(
      (left, right) =>
        purchasePriorityOrder[left.priority] -
          purchasePriorityOrder[right.priority] ||
        purchaseStatusOrder[left.status] - purchaseStatusOrder[right.status] ||
        left.created_at.localeCompare(right.created_at) ||
        left.id.localeCompare(right.id),
    );
}
