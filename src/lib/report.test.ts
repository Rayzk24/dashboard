import { describe, expect, it } from 'vitest';
import type { Client, PaymentAllocation, Settings, WorkSession } from '../types/domain';
import {
  buildPublicReport,
  compareReportSessions,
  defaultReportSessionIds,
  reportFileName,
  reportPeriodLabel,
} from './report';

const client = { id: 'c1', user_id: 'u1', name: 'EvoBlock', status: 'active' } as Client;
const settings = { user_id: 'u1', display_name: 'Rayzk', public_site: 'rayzk.fr' } as Settings;
const session = (id: string, day: string, startedAt: string | null, amount = 12): WorkSession => ({
  id,
  user_id: 'u1',
  client_id: 'c1',
  project_id: null,
  title: `Session ${id}`,
  session_date: day,
  started_at: startedAt,
  ended_at: null,
  duration_minutes: 60,
  is_running: false,
  public_description: `Description ${id}\navec plusieurs lignes`,
  private_notes: 'Ne jamais exporter',
  hourly_rate: 12,
  commission_rate: 0,
  time_category: 'billable',
  gross_amount: amount,
  commission_amount: 0,
  net_amount: amount,
  created_at: startedAt || `${day}T12:00:00Z`,
});

describe('rapport client', () => {
  it('trie chronologiquement et départage les sessions du même jour par leur heure', () => {
    const morning = session('matin', '2026-08-28', '2026-08-28T08:00:00Z');
    const evening = session('soir', '2026-08-28', '2026-08-28T18:00:00Z');
    const nextDay = session('demain', '2026-08-29', '2026-08-29T09:00:00Z');
    expect([nextDay, evening, morning].sort(compareReportSessions).map((item) => item.id))
      .toEqual(['matin', 'soir', 'demain']);
    const report = buildPublicReport(settings, client, undefined, [nextDay, evening, morning], {
      period: '28 - 29 août 2026', includeDurations: true, includeRate: false, includeAmounts: true,
    });
    expect(report.sessions.map((item) => item.id)).toEqual(['matin', 'soir', 'demain']);
    expect(JSON.stringify(report)).not.toContain('Ne jamais exporter');
  });

  it('sélectionne par défaut les sessions non payées et partiellement payées', () => {
    const unpaid = session('non-payee', '2026-08-28', null, 20);
    const partial = session('partielle', '2026-08-29', null, 20);
    const paid = session('payee', '2026-08-30', null, 20);
    const allocations = [
      { id: 'a1', user_id: 'u1', payment_id: 'p1', work_session_id: partial.id, allocated_amount: 5 },
      { id: 'a2', user_id: 'u1', payment_id: 'p2', work_session_id: paid.id, allocated_amount: 20 },
    ] as PaymentAllocation[];
    expect(defaultReportSessionIds([paid, partial, unpaid], allocations))
      .toEqual(['partielle', 'non-payee']);
  });

  it('formate une période française compacte', () => {
    expect(reportPeriodLabel([
      session('b', '2026-09-11', null),
      session('a', '2026-08-28', null),
    ])).toBe('28 août - 11 septembre 2026');
    expect(reportPeriodLabel([], '2026-09-01', '2026-09-11')).toBe('1 - 11 septembre 2026');
  });

  it('conserve les descriptions complètes, la durée et les montants publics', () => {
    const report = buildPublicReport(settings, client, undefined, [session('longue', '2026-09-01', null)], {
      period: '1 septembre 2026', includeDurations: true, includeRate: false, includeAmounts: true,
    });
    expect(report.sessions[0]).toMatchObject({
      title: 'Session longue',
      description: 'Description longue\navec plusieurs lignes',
      duration: '1 h 00',
      amount: 12,
    });
  });

  it('ajoute la date locale de génération au nom du fichier', () => {
    expect(reportFileName('EvoBlock', new Date(2026, 8, 14, 23, 30)))
      .toBe('rapport-evoblock-2026-09-14.pdf');
  });
});
