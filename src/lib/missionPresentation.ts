import type { Project } from "../types/domain";

export type MissionStatusTone =
  | "in-progress"
  | "waiting"
  | "completed"
  | "cancelled"
  | "neutral";

const missionStatuses: Record<
  string,
  { label: string; tone: MissionStatusTone }
> = {
  planned: { label: "En cours", tone: "in-progress" },
  in_progress: { label: "En cours", tone: "in-progress" },
  waiting: { label: "En attente", tone: "waiting" },
  completed: { label: "Terminé", tone: "completed" },
  cancelled: { label: "Annulé", tone: "cancelled" },
  canceled: { label: "Annulé", tone: "cancelled" },
  annule: { label: "Annulé", tone: "cancelled" },
  annulé: { label: "Annulé", tone: "cancelled" },
  archived: { label: "Annulé", tone: "cancelled" },
};

export const projectStatusOptions: Array<{
  value: Project["status"];
  label: string;
}> = [
  { value: "waiting", label: missionStatuses.waiting.label },
  { value: "in_progress", label: missionStatuses.in_progress.label },
  { value: "completed", label: missionStatuses.completed.label },
];

export const defaultProjectStatus: Project["status"] =
  projectStatusOptions[0].value;

export function missionStatusControlValue(status: Project["status"]) {
  if (status === "planned") return "in_progress";
  if (status === "archived") return "";
  return status;
}

export function projectStatusFromControl(value: string): Project["status"] {
  return value as Project["status"];
}

export function missionStatusPresentation(status: string) {
  return (
    missionStatuses[status] ?? {
      label: status.replaceAll("_", " "),
      tone: "neutral" as const,
    }
  );
}

export function missionCardClassName(selected: boolean) {
  return `mission-row${selected ? " selected" : ""}`;
}
