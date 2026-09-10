import { describe, expect, it } from 'vitest';
import type { WorkSession } from '../types/domain';
import {
  freelanceAnalyticsPeriods,
  freelanceAnalyticsSeries,
  freelanceAnalyticsSummary,
  percentageChange,
  previousFinancialPeriodBounds,
} from './freelanceAnalytics';

const session = (values: Partial<WorkSession>): WorkSession => ({
  id: 'session',
  user_id: 'user',
  client_id: 'client',
  project_id: null,
  title: 'Session',
  session_date: '2026-09-10',
  started_at: null,
  ended_at: null,
  duration_minutes: 60,
  is_running: false,
  public_description: '',
  private_notes: '',
  hourly_rate: 20,
  commission_rate: 20,
  time_category: 'billable',
  gross_amount: 20,
  commission_amount: 4,
  net_amount: 16,
  created_at: '2026-09-10T10:00:00Z',
  ...values,
});

describe('analyses freelance', () => {
  it('calcule la valeur nette, le temps et le taux effectif', () => {
    const summary = freelanceAnalyticsSummary([
      session({ id: 'one', duration_minutes: 90, net_amount: 24 }),
      session({ id: 'two', duration_minutes: 30, net_amount: 6 }),
      session({ id: 'running', is_running: true, duration_minutes: 60, net_amount: 50 }),
    ]);
    expect(summary).toEqual({
      netValue: 30,
      totalMinutes: 120,
      workedDays: 1,
      averageMinutesPerWorkedDay: 120,
      effectiveHourlyRate: 15,
    });
  });

  it('construit correctement la période précédente', () => {
    const now = new Date(2026, 8, 10, 12);
    expect(previousFinancialPeriodBounds('week', now)).toEqual({
      start: '2026-08-31',
      end: '2026-09-06',
    });
    expect(previousFinancialPeriodBounds('month', now)).toEqual({
      start: '2026-08-01',
      end: '2026-08-31',
    });
    expect(previousFinancialPeriodBounds('year', now)).toEqual({
      start: '2025-01-01',
      end: '2025-12-31',
    });
  });

  it('sépare la période courante de la précédente', () => {
    const values = [
      session({ id: 'current', session_date: '2026-09-10' }),
      session({ id: 'previous', session_date: '2026-09-02' }),
      session({ id: 'older', session_date: '2026-08-20' }),
    ];
    const periods = freelanceAnalyticsPeriods(values, 'week', new Date(2026, 8, 10, 12));
    expect(periods.current.map((item) => item.id)).toEqual(['current']);
    expect(periods.previous?.map((item) => item.id)).toEqual(['previous']);
  });

  it('agrège la semaine par jour et le mois par semaines lisibles', () => {
    const values = [
      session({ id: 'monday', session_date: '2026-09-07', net_amount: 10, duration_minutes: 30 }),
      session({ id: 'thursday', session_date: '2026-09-10', net_amount: 20, duration_minutes: 60 }),
    ];
    const week = freelanceAnalyticsSeries(values, 'week', new Date(2026, 8, 10, 12));
    expect(week).toHaveLength(7);
    expect(week.reduce((sum, point) => sum + point.netValue, 0)).toBe(30);
    const month = freelanceAnalyticsSeries(values, 'month', new Date(2026, 8, 10, 12));
    expect(month).toHaveLength(5);
    expect(month[1]).toMatchObject({ label: '8–14', netValue: 20, minutes: 60 });
  });

  it('calcule les variations sans inventer de pourcentage sur une base nulle', () => {
    expect(percentageChange(120, 100)).toBe(20);
    expect(percentageChange(0, 0)).toBe(0);
    expect(percentageChange(20, 0)).toBeNull();
  });
});
