import { describe, expect, it } from 'vitest';
import { allocationTotal, canSetSessionAmount, clientSummary, deterministicAllocationPlan, durationMinutes, financialDataForPeriod, financialSummary, inheritedRate, paymentBreakdown, remainingForSession, sessionAmounts, visibleFreelanceClients } from './finance';
import { buildPublicReport } from './report';
import type { Client, Payment, PaymentAllocation, WorkSession } from '../types/domain';

const client = { id: 'c1', user_id: 'u1', name: 'Client', contact: null, email: null, status: 'active', hourly_rate: 15, payment_method: null, private_notes: 'secret', last_contact_date: null, next_follow_up_date: null, created_at: '' } as Client;
const session = { id: 's1', user_id: 'u1', client_id: 'c1', project_id: null, title: 'Configuration', session_date: '2026-07-15', started_at: null, ended_at: null, duration_minutes: 120, is_running: false, public_description: 'Configuration publique\navec détail', private_notes: 'Ne jamais exporter', hourly_rate: 15, commission_rate: 20, time_category: 'billable', gross_amount: 30, commission_amount: 6, net_amount: 24, created_at: '' } as WorkSession;

describe('règles freelance', () => {
  it('exclut les clients archivés des sélecteurs Freelance et Notes', () => {
    const archived = { ...client, id: 'archived', name: 'Ancien client', status: 'archived' as const };
    expect(visibleFreelanceClients([client, archived]).map((item) => item.id)).toEqual(['c1']);
  });
  it('calcule durée, priorité de tarif et commission', () => { expect(durationMinutes('2026-07-15T10:00:00Z', '2026-07-15T11:30:00Z')).toBe(90); expect(inheritedRate(20, { hourly_rate: 18 }, { hourly_rate: 15 }, 12)).toBe(20); expect(sessionAmounts(300, 12, 20)).toEqual({ gross: 60, commission: 12, net: 48 }); });
  it('centralise travail valorisé, reçu, attribué et à recevoir', () => { const allocations = [{ id: 'a1', user_id: 'u1', payment_id: 'p1', work_session_id: 's1', allocated_amount: 10 }] as PaymentAllocation[]; const payment = paymentOf('p1', 10, '2026-07-15'); expect(allocationTotal('s1', allocations)).toBe(10); expect(remainingForSession(session, allocations)).toBe(20); expect(clientSummary('c1', [session], [payment], allocations)).toMatchObject({ generated: 30, received: 10, covered: 10, remaining: 20 }); expect(financialSummary([session], [payment], allocations)).toMatchObject({ valued: 30, received: 10, allocated: 10, remaining: 20 }); });
  it('protège une session déjà attribuée et expose le montant non attribué', () => { const allocations = [{ id: 'a1', user_id: 'u1', payment_id: 'p1', work_session_id: 's1', allocated_amount: 12 }] as PaymentAllocation[]; const payment = paymentOf('p1', 20, '2026-07-15'); expect(canSetSessionAmount(11, allocationTotal('s1', allocations))).toBe(false); expect(canSetSessionAmount(12, allocationTotal('s1', allocations))).toBe(true); expect(paymentBreakdown(payment, allocations)).toEqual({ allocated: 12, unallocated: 8 }); });
  it('reconstruit les allocations dans un ordre stable par règlement puis session', () => { const old = { ...session, id: 's-old', session_date: '2026-07-01', gross_amount: 10, created_at: '2026-07-01' }; const next = { ...session, id: 's-next', session_date: '2026-07-02', gross_amount: 12, created_at: '2026-07-02' }; expect(deterministicAllocationPlan([next, old], [paymentOf('p-later', 9, '2026-07-03'), paymentOf('p-early', 13, '2026-07-01')])).toEqual([{ paymentId: 'p-early', workSessionId: 's-old', amount: 10 }, { paymentId: 'p-early', workSessionId: 's-next', amount: 3 }, { paymentId: 'p-later', workSessionId: 's-next', amount: 9 }]); });
  it('ne fournit au rapport que les champs publics et conserve les paragraphes', () => { const report = buildPublicReport({ user_id: 'u1', display_name: 'Rayzk', public_site: 'rayzk.fr', default_hourly_rate: 12, currency: 'EUR', day_rollover_hour: 5 }, client, undefined, [session], { period: 'juillet', includeDurations: true, includeRate: false, includeAmounts: true }); expect(JSON.stringify(report)).toContain('Configuration'); expect(JSON.stringify(report)).toContain('Configuration publique\\navec détail'); expect(JSON.stringify(report)).not.toContain('Ne jamais exporter'); });
});

describe('périodes financières', () => {
  it('filtre indépendamment les sessions et les règlements de la semaine', () => {
    const thisWeekSession = { ...session, id: 's-week', session_date: '2026-07-22', gross_amount: 150 };
    const outsideWeekSession = { ...session, id: 's-outside', session_date: '2026-07-19', gross_amount: 50 };
    const thisWeekPayment = paymentOf('p-week', 40, '2026-07-20');
    const outsideWeekPayment = paymentOf('p-outside', 200, '2026-07-19');
    const scoped = financialDataForPeriod(
      [thisWeekSession, outsideWeekSession],
      [thisWeekPayment, outsideWeekPayment],
      'week',
      new Date(2026, 6, 22, 12),
    );

    expect(scoped.sessions.map((item) => item.id)).toEqual(['s-week']);
    expect(scoped.payments.map((item) => item.id)).toEqual(['p-week']);
    expect(financialSummary(scoped.sessions, scoped.payments, [])).toMatchObject({
      valued: 150,
      received: 40,
      remaining: 110,
    });
  });
});

function paymentOf(id: string, amount: number, date: string): Payment { return { id, user_id: 'u1', client_id: 'c1', project_id: null, payment_date: date, amount_expected: amount, amount_received: amount, fees: 0, payment_method: null, reference_note: '', status: 'paid', created_at: date }; }
