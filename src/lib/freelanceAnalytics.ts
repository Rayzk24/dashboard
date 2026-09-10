import type { FinancialPeriod } from './finance';
import { financialDataForPeriod, financialPeriodBounds } from './finance';
import type { WorkSession } from '../types/domain';

export type FreelanceAnalyticsSummary = {
  netValue: number;
  totalMinutes: number;
  workedDays: number;
  averageMinutesPerWorkedDay: number;
  effectiveHourlyRate: number;
};

export type FreelanceAnalyticsPoint = {
  key: string;
  label: string;
  netValue: number;
  minutes: number;
};

type DateRange = { start: string; end: string };

function dateFromKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function dateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function completedSessions(sessions: WorkSession[]) {
  return sessions.filter((session) => !session.is_running);
}

function sessionsInRange(sessions: WorkSession[], range: DateRange) {
  return completedSessions(sessions).filter(
    (session) => session.session_date >= range.start && session.session_date <= range.end,
  );
}

export function freelanceAnalyticsSummary(sessions: WorkSession[]): FreelanceAnalyticsSummary {
  const completed = completedSessions(sessions);
  const netValue = completed.reduce((sum, session) => sum + Number(session.net_amount || 0), 0);
  const totalMinutes = completed.reduce(
    (sum, session) => sum + Math.max(0, Number(session.duration_minutes || 0)),
    0,
  );
  const workedDays = new Set(
    completed
      .filter((session) => Number(session.duration_minutes || 0) > 0)
      .map((session) => session.session_date),
  ).size;

  return {
    netValue,
    totalMinutes,
    workedDays,
    averageMinutesPerWorkedDay: workedDays ? totalMinutes / workedDays : 0,
    effectiveHourlyRate: totalMinutes ? netValue / (totalMinutes / 60) : 0,
  };
}

export function previousFinancialPeriodBounds(
  period: Exclude<FinancialPeriod, 'all'>,
  now = new Date(),
): DateRange {
  const current = financialPeriodBounds(period, now);

  if (period === 'week') {
    const start = dateFromKey(current.start);
    const end = dateFromKey(current.end);
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() - 7);
    return { start: dateKey(start), end: dateKey(end) };
  }

  if (period === 'month') {
    const currentStart = dateFromKey(current.start);
    const start = new Date(currentStart.getFullYear(), currentStart.getMonth() - 1, 1);
    const end = new Date(currentStart.getFullYear(), currentStart.getMonth(), 0);
    return { start: dateKey(start), end: dateKey(end) };
  }

  const currentStart = dateFromKey(current.start);
  const year = currentStart.getFullYear() - 1;
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function freelanceAnalyticsPeriods(
  sessions: WorkSession[],
  period: FinancialPeriod,
  now = new Date(),
) {
  const current = financialDataForPeriod(sessions, [], period, now).sessions;
  const previous = period === 'all'
    ? null
    : sessionsInRange(sessions, previousFinancialPeriodBounds(period, now));
  return { current, previous };
}

function createPoint(key: string, label: string): FreelanceAnalyticsPoint {
  return { key, label, netValue: 0, minutes: 0 };
}

function addSession(point: FreelanceAnalyticsPoint, session: WorkSession) {
  point.netValue += Number(session.net_amount || 0);
  point.minutes += Math.max(0, Number(session.duration_minutes || 0));
}

export function freelanceAnalyticsSeries(
  sessions: WorkSession[],
  period: FinancialPeriod,
  now = new Date(),
): FreelanceAnalyticsPoint[] {
  const relevant = completedSessions(
    financialDataForPeriod(sessions, [], period, now).sessions,
  );

  if (period === 'week') {
    const range = financialPeriodBounds('week', now);
    const cursor = dateFromKey(range.start);
    const formatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
    const points = Array.from({ length: 7 }, () => {
      const key = dateKey(cursor);
      const point = createPoint(key, formatter.format(cursor).replace('.', ''));
      cursor.setDate(cursor.getDate() + 1);
      return point;
    });
    const byKey = new Map(points.map((point) => [point.key, point]));
    relevant.forEach((session) => {
      const point = byKey.get(session.session_date);
      if (point) addSession(point, session);
    });
    return points;
  }

  if (period === 'month') {
    const range = financialPeriodBounds('month', now);
    const lastDay = Number(range.end.slice(-2));
    const points = Array.from({ length: Math.ceil(lastDay / 7) }, (_, index) => {
      const start = index * 7 + 1;
      const end = Math.min(start + 6, lastDay);
      return createPoint(`week-${index}`, `${start}–${end}`);
    });
    relevant.forEach((session) => {
      const index = Math.floor((Number(session.session_date.slice(-2)) - 1) / 7);
      if (points[index]) addSession(points[index], session);
    });
    return points;
  }

  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
  if (period === 'year') {
    const year = Number(financialPeriodBounds('year', now).start.slice(0, 4));
    const points = Array.from({ length: 12 }, (_, month) =>
      createPoint(
        `${year}-${String(month + 1).padStart(2, '0')}`,
        monthFormatter.format(new Date(year, month, 1)).replace('.', ''),
      ),
    );
    const byKey = new Map(points.map((point) => [point.key, point]));
    relevant.forEach((session) => {
      const point = byKey.get(session.session_date.slice(0, 7));
      if (point) addSession(point, session);
    });
    return points;
  }

  if (!relevant.length) return [];
  const sortedMonths = relevant.map((session) => session.session_date.slice(0, 7)).sort();
  const start = dateFromKey(`${sortedMonths[0]}-01`);
  const end = dateFromKey(`${sortedMonths[sortedMonths.length - 1]}-01`);
  const points: FreelanceAnalyticsPoint[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = dateKey(cursor).slice(0, 7);
    points.push(
      createPoint(
        key,
        `${monthFormatter.format(cursor).replace('.', '')} ${String(cursor.getFullYear()).slice(-2)}`,
      ),
    );
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const byKey = new Map(points.map((point) => [point.key, point]));
  relevant.forEach((session) => {
    const point = byKey.get(session.session_date.slice(0, 7));
    if (point) addSession(point, session);
  });
  return points;
}

export function percentageChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}
