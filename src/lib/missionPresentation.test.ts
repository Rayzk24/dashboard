import { describe, expect, it } from "vitest";
import {
  defaultProjectStatus,
  missionCardClassName,
  missionStatusControlValue,
  missionStatusPresentation,
  projectStatusFromControl,
  projectStatusOptions,
} from "./missionPresentation";

describe("présentation des statuts de mission", () => {
  it.each([
    ["planned", "En cours", "in-progress"],
    ["in_progress", "En cours", "in-progress"],
    ["waiting", "En attente", "waiting"],
    ["completed", "Terminé", "completed"],
    ["cancelled", "Annulé", "cancelled"],
    ["canceled", "Annulé", "cancelled"],
    ["annule", "Annulé", "cancelled"],
    ["annulé", "Annulé", "cancelled"],
    ["archived", "Annulé", "cancelled"],
  ])("présente %s lisiblement", (status, label, tone) => {
    expect(missionStatusPresentation(status)).toEqual({ label, tone });
  });

  it("propose uniquement les trois statuts finaux", () => {
    expect(projectStatusOptions).toEqual([
      { value: "waiting", label: "En attente" },
      { value: "in_progress", label: "En cours" },
      { value: "completed", label: "Terminé" },
    ]);
    expect(projectStatusOptions.some((option) => option.label === "Archivé")).toBe(false);
    expect(projectStatusOptions.some((option) => option.label === "Annulé")).toBe(false);
    expect(projectStatusOptions.some((option) => option.value === "archived")).toBe(false);
    expect(
      projectStatusOptions.some(
        (option) => String(option.value) === "cancelled",
      ),
    ).toBe(false);
  });

  it("utilise En attente comme statut initial d’une nouvelle mission", () => {
    expect(defaultProjectStatus).toBe("waiting");
    expect(missionStatusPresentation(defaultProjectStatus).label).toBe(
      "En attente",
    );
  });

  it("adapte les anciennes valeurs sans modifier le schéma", () => {
    expect(missionStatusControlValue("planned")).toBe("in_progress");
    expect(missionStatusControlValue("archived")).toBe("");
    expect(projectStatusFromControl("waiting")).toBe("waiting");
  });

  it("ne place jamais le statut dans les classes de bordure de la carte", () => {
    for (const status of [
      "planned",
      "in_progress",
      "waiting",
      "completed",
      "cancelled",
    ]) {
      expect(missionCardClassName(false)).toBe("mission-row");
      expect(missionCardClassName(true)).toBe("mission-row selected");
      expect(missionCardClassName(true)).not.toContain(status);
    }
  });
});
