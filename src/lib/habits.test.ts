import { describe, expect, it } from "vitest";
import {
  addDays,
  completion,
  habitScheduled,
  habitStats,
  logicalDayKey,
  minutesFromHoursMinutes,
  sessionPresets,
  weekDates,
} from "./habits";
import {
  allocationPlan,
  lastProjectForClient,
  projectsForClient,
  sessionPaymentState,
} from "./finance";
import type {
  Habit,
  HabitEntry,
  PaymentAllocation,
  WorkSession,
} from "../types/domain";

const habit = (id: string): Habit => ({
  id,
  user_id: "u",
  name: id,
  icon: null,
  color: null,
  frequency: "daily",
  week_days: [],
  position: 0,
  is_active: true,
  archived_at: null,
  starts_on: "2026-07-01",
  ends_on: null,
  created_at: "",
});
const entry = (
  habit_id: string,
  entry_date: string,
  completed = true,
): HabitEntry => ({
  id: `${habit_id}-${entry_date}`,
  user_id: "u",
  habit_id,
  entry_date,
  completed,
});
const session = (
  id: string,
  project_id: string | null,
  gross_amount = 12,
): WorkSession => ({
  id,
  user_id: "u",
  client_id: "c",
  project_id,
  title: `Session ${id}`,
  session_date: "2026-07-15",
  started_at: null,
  ended_at: null,
  duration_minutes: 60,
  is_running: false,
  public_description: "",
  private_notes: "",
  hourly_rate: 12,
  commission_rate: 0,
  time_category: "billable",
  gross_amount,
  commission_amount: 0,
  net_amount: gross_amount,
  created_at: `2026-07-1${id}`,
});

describe("jour logique et habitudes", () => {
  it("rattache 03:00 à la veille avec un seuil à 05:00", () => {
    expect(logicalDayKey(new Date("2026-07-14T03:00:00"), 5)).toBe(
      "2026-07-13",
    );
    expect(logicalDayKey(new Date("2026-07-14T05:00:00"), 5)).toBe(
      "2026-07-14",
    );
  });
  it("calcule grille hebdomadaire, taux et streak sur chaque habitude", () => {
    const habits = [habit("h1"), habit("h2")];
    const today = "2026-07-15";
    const entries = [
      entry("h1", today),
      entry("h2", today),
      entry("h1", addDays(today, -1)),
      entry("h2", addDays(today, -1)),
      entry("h1", addDays(today, -2)),
    ];
    expect(weekDates(today)).toHaveLength(7);
    expect(completion(habits, entries, today)).toMatchObject({
      completed: 2,
      scheduled: 2,
      complete: true,
    });
    expect(habitStats(habits, entries, today, 3)).toMatchObject({
      streak: 2,
      best: 2,
      successfulDays: 2,
      rate: 5 / 6,
    });
  });
  it("convertit heures/minutes et raccourcis", () => {
    expect(minutesFromHoursMinutes(1, 30)).toBe(90);
    expect(sessionPresets.map((item) => item.minutes)).toEqual([
      15, 30, 45, 60, 90, 120, 180, 240,
    ]);
    expect(sessionPresets.map((item) => item.label)).toEqual([
      "15 min",
      "30 min",
      "45 min",
      "1 h",
      "1 h 30",
      "2 h",
      "3 h",
      "4 h",
    ]);
    expect(
      sessionPresets.find(
        (item) => item.minutes === minutesFromHoursMinutes(4, 0),
      )?.label,
    ).toBe("4 h");
    expect(
      sessionPresets.find(
        (item) => item.minutes === minutesFromHoursMinutes(1, 15),
      ),
    ).toBeUndefined();
  });
  it("ne compte pas une habitude avant son début ni après son archivage", () => {
    const future = {
      ...habit("new"),
      starts_on: "2026-07-15",
      ends_on: "2026-07-20",
    };
    expect(habitScheduled(future, "2026-07-14")).toBe(false);
    expect(habitScheduled(future, "2026-07-15")).toBe(true);
    expect(habitScheduled(future, "2026-07-21")).toBe(false);
    expect(completion([future], [], "2026-07-14").scheduled).toBe(0);
  });
});
describe("missions et paiements", () => {
  it("suggère la dernière mission du client et ne mélange pas les clients", () => {
    expect(
      lastProjectForClient("c", [
        session("1", "p1"),
        { ...session("2", "p2"), client_id: "other" },
      ]),
    ).toBe("p1");
  });
  it("retourne les états non payé, partiel et payé", () => {
    const s = session("3", "p1");
    const partial = [
      {
        id: "a",
        user_id: "u",
        payment_id: "p",
        work_session_id: "3",
        allocated_amount: 5,
      },
    ] as PaymentAllocation[];
    const paid = [{ ...partial[0], allocated_amount: 12 }];
    expect(sessionPaymentState(s, [])).toBe("unpaid");
    expect(sessionPaymentState(s, partial)).toBe("partial");
    expect(sessionPaymentState(s, paid)).toBe("paid");
  });
  it("filtre les missions du client courant et répartit un règlement", () => {
    const sessions = [
      session("4", "p1", 10),
      { ...session("5", "p1", 8), session_date: "2026-07-16" },
    ];
    const projects = [
      { id: "p1", client_id: "c", status: "planned" },
      { id: "p2", client_id: "other", status: "planned" },
      { id: "p3", client_id: "c", status: "archived" },
    ] as any;
    expect(
      projectsForClient("c", projects).map((project) => project.id),
    ).toEqual(["p1"]);
    expect(allocationPlan(sessions, [], 13)).toEqual([
      { workSessionId: "4", amount: 10 },
      { workSessionId: "5", amount: 3 },
    ]);
  });
});
