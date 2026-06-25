import type { DailyEntry } from '../types';
import { addDaysToKey, getTodayKey } from './summer';

export function isEntryComplete(entry: DailyEntry) {
  return entry.code_done && entry.learning_done && entry.outside_done;
}

export function getCompletionCount(entry: DailyEntry) {
  return [entry.code_done, entry.learning_done, entry.outside_done].filter(Boolean)
    .length;
}

export function getDashboardStats(entries: DailyEntry[], todayKey = getTodayKey()) {
  const successfulDays = entries.filter(isEntryComplete).length;
  const successRate =
    entries.length > 0 ? Math.round((successfulDays / entries.length) * 100) : 0;
  const completeByDate = new Map(
    entries.map((entry) => [entry.entry_date, isEntryComplete(entry)]),
  );

  let streak = 0;
  let cursor = todayKey;

  while (completeByDate.get(cursor)) {
    streak += 1;
    cursor = addDaysToKey(cursor, -1);
  }

  return {
    successfulDays,
    successRate,
    streak,
    trackedDays: entries.length,
  };
}
