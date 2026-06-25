const MS_PER_DAY = 86_400_000;
const DEFAULT_SUMMER_START = '2026-06-14';
const DEFAULT_SUMMER_END = '2026-08-20';
const DEFAULT_DAY_ROLLOVER_HOUR = 5;

export function getTodayKey(date = new Date()) {
  const shiftedDate = new Date(date);
  shiftedDate.setHours(shiftedDate.getHours() - getDayRolloverHour());

  return formatDateKey(shiftedDate);
}

export function getDayRolloverHour() {
  const configuredHour = Number.parseInt(
    import.meta.env.VITE_DAY_ROLLOVER_HOUR ?? '',
    10,
  );

  if (
    Number.isInteger(configuredHour) &&
    configuredHour >= 0 &&
    configuredHour <= 23
  ) {
    return configuredHour;
  }

  return DEFAULT_DAY_ROLLOVER_HOUR;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getSummerConfig() {
  const start = import.meta.env.VITE_SUMMER_START || DEFAULT_SUMMER_START;
  const end = import.meta.env.VITE_SUMMER_END || DEFAULT_SUMMER_END;

  return { start, end };
}

export function getSummerProgress(todayKey = getTodayKey()) {
  const { start, end } = getSummerConfig();
  const totalDays = daysBetween(start, end) + 1;
  const rawDay = daysBetween(start, todayKey) + 1;
  const currentDay = Math.min(Math.max(rawDay, 0), totalDays);
  const year = start.slice(2, 4);

  return {
    currentDay,
    totalDays,
    label: `Summer '${year} — Day ${currentDay} / ${totalDays}`,
  };
}

export function getDatesToEnsure(todayKey = getTodayKey()) {
  const { start, end } = getSummerConfig();
  const todayIndex = dayIndex(todayKey);
  const startIndex = dayIndex(start);
  const endIndex = dayIndex(end);

  if (todayIndex < startIndex) {
    return [todayKey];
  }

  const dates = dateRange(start, todayIndex > endIndex ? end : todayKey);

  if (todayIndex > endIndex) {
    dates.push(todayKey);
  }

  return Array.from(new Set(dates));
}

export function addDaysToKey(dateKey: string, amount: number) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + amount);
  return formatDateKey(date);
}

export function formatLongDate(dateKey: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseDateKey(dateKey));
}

export function formatShortDate(dateKey: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  }).format(parseDateKey(dateKey));
}

function dateRange(startKey: string, endKey: string) {
  const dates: string[] = [];
  let cursor = startKey;

  while (dayIndex(cursor) <= dayIndex(endKey)) {
    dates.push(cursor);
    cursor = addDaysToKey(cursor, 1);
  }

  return dates;
}

function daysBetween(startKey: string, endKey: string) {
  return dayIndex(endKey) - dayIndex(startKey);
}

function dayIndex(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}
