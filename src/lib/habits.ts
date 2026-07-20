import type { Habit, HabitEntry } from "../types/domain";

export function logicalDayKey(date = new Date(), rolloverHour = 5) {
  const shifted = new Date(date);
  if (shifted.getHours() < rolloverHour) shifted.setDate(shifted.getDate() - 1);
  return formatKey(shifted);
}
export function addDays(key: string, amount: number) {
  const date = parseKey(key);
  date.setDate(date.getDate() + amount);
  return formatKey(date);
}
export function weekStart(key: string) {
  const date = parseKey(key);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return formatKey(date);
}
export function weekDates(key: string) {
  const start = weekStart(key);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}
export function habitScheduled(habit: Habit, key: string) {
  if (key < habit.starts_on || (habit.ends_on && key > habit.ends_on))
    return false;
  if (habit.frequency === "daily") return true;
  return habit.week_days.includes(parseKey(key).getDay());
}
export function completion(
  habits: Habit[],
  entries: HabitEntry[],
  key: string,
) {
  const scheduled = habits.filter((habit) => habitScheduled(habit, key));
  const completed = scheduled.filter((habit) =>
    entries.some(
      (entry) =>
        entry.habit_id === habit.id &&
        entry.entry_date === key &&
        entry.completed,
    ),
  );
  return {
    scheduled: scheduled.length,
    completed: completed.length,
    rate: scheduled.length ? completed.length / scheduled.length : 0,
    complete: scheduled.length > 0 && completed.length === scheduled.length,
  };
}
export function habitStats(
  habits: Habit[],
  entries: HabitEntry[],
  today: string,
  days = 30,
) {
  const keys = Array.from({ length: days }, (_, index) =>
    addDays(today, -index),
  );
  const summaries = keys.map((key) => completion(habits, entries, key));
  const scheduled = summaries.reduce((sum, item) => sum + item.scheduled, 0);
  const completed = summaries.reduce((sum, item) => sum + item.completed, 0);
  let streak = 0;
  for (const item of summaries) {
    if (item.complete) streak += 1;
    else break;
  }
  let best = 0;
  let current = 0;
  for (const item of [...summaries].reverse()) {
    current = item.complete ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return {
    scheduled,
    completed,
    rate: scheduled ? completed / scheduled : 0,
    streak,
    best,
    successfulDays: summaries.filter((item) => item.complete).length,
  };
}
function parseKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}
function formatKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function minutesFromHoursMinutes(hours: number, minutes: number) {
  return Math.max(0, Math.round(hours * 60 + minutes));
}
export const sessionPresets = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 h", minutes: 60 },
  { label: "1 h 30", minutes: 90 },
  { label: "2 h", minutes: 120 },
  { label: "3 h", minutes: 180 },
  { label: "4 h", minutes: 240 },
];
