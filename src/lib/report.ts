import type { Client, PaymentAllocation, Project, Settings, WorkSession } from '../types/domain';
import { minutesLabel } from './format';
import { sessionPaymentState } from './finance';

export type PublicReport = {
  issuer: string;
  site: string;
  client: string;
  project?: string;
  period: string;
  generatedAt: string;
  includeDurations: boolean;
  includeRate: boolean;
  includeAmounts: boolean;
  sessions: Array<{
    id: string;
    dateKey: string;
    date: string;
    title: string;
    project?: string;
    description: string;
    duration: string;
    rate: number;
    amount: number;
  }>;
  total: number;
  totalDuration: string;
};

const longDate = (value: string) => new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date(`${value}T12:00:00`));

const monthName = (value: string) => new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
}).format(new Date(`${value}T12:00:00`));

export function compareReportSessions(a: WorkSession, b: WorkSession) {
  const day = a.session_date.localeCompare(b.session_date);
  if (day) return day;
  const aTime = a.started_at || a.ended_at || a.created_at || '';
  const bTime = b.started_at || b.ended_at || b.created_at || '';
  return aTime.localeCompare(bTime) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
}

export function defaultReportSessionIds(sessions: WorkSession[], allocations: PaymentAllocation[]) {
  return sessions
    .filter((session) => sessionPaymentState(session, allocations) !== 'paid')
    .map((session) => session.id);
}

export function reportPeriodLabel(sessions: WorkSession[], from = '', to = '') {
  const ordered = sessions.slice().sort(compareReportSessions);
  const start = from || ordered[0]?.session_date;
  const end = to || ordered.at(-1)?.session_date;
  if (!start && !end) return 'Période non définie';
  if (!start) return `Jusqu’au ${longDate(end!)}`;
  if (!end) return `Depuis le ${longDate(start)}`;
  if (start === end) return longDate(start);
  const startYear = start.slice(0, 4);
  const endYear = end.slice(0, 4);
  const startMonth = start.slice(0, 7);
  const endMonth = end.slice(0, 7);
  const startDay = Number(start.slice(-2));
  if (startYear !== endYear) return `${longDate(start)} - ${longDate(end)}`;
  if (startMonth === endMonth) return `${startDay} - ${longDate(end)}`;
  return `${startDay} ${monthName(start)} - ${longDate(end)}`;
}

export function buildPublicReport(
  settings: Settings | null,
  client: Client,
  project: Project | undefined,
  sessions: WorkSession[],
  options: Pick<PublicReport, 'period' | 'includeDurations' | 'includeRate' | 'includeAmounts'>,
): PublicReport {
  const ordered = sessions.slice().sort(compareReportSessions);
  return {
    issuer: settings?.display_name || 'Rayzk',
    site: settings?.public_site || 'rayzk.fr',
    client: client.name,
    project: project?.name,
    generatedAt: longDate(new Date().toISOString().slice(0, 10)),
    ...options,
    sessions: ordered.map((item) => ({
      id: item.id,
      dateKey: item.session_date,
      date: longDate(item.session_date),
      project: project?.name,
      title: item.title || 'Session de travail',
      description: item.public_description,
      duration: minutesLabel(Number(item.duration_minutes || 0)),
      rate: Number(item.hourly_rate),
      amount: Number(item.gross_amount),
    })),
    total: ordered.reduce((sum, item) => sum + Number(item.gross_amount), 0),
    totalDuration: minutesLabel(ordered.reduce(
      (sum, item) => sum + Number(item.duration_minutes || 0),
      0,
    )),
  };
}
