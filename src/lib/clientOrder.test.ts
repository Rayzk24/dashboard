import { describe, expect, it } from "vitest";
import { moveClientInOrder, reconcileClientOrder } from "./clientOrder";

describe("ordre manuel des clients", () => {
  it("conserve l’ordre choisi et ajoute les nouveaux clients à la fin", () => {
    expect(reconcileClientOrder(["a", "b", "c"], ["b", "a"])).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("retire les clients absents et ignore les doublons", () => {
    expect(reconcileClientOrder(["a", "b"], ["ghost", "b", "b"])).toEqual([
      "b",
      "a",
    ]);
  });

  it("déplace un client sans dépasser les limites", () => {
    expect(moveClientInOrder(["a", "b", "c"], "b", -1)).toEqual([
      "b",
      "a",
      "c",
    ]);
    expect(moveClientInOrder(["a", "b", "c"], "a", -1)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});
