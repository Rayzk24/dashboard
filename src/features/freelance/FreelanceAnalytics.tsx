import { BarChart3, Clock3, Gauge, TimerReset, WalletCards } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AppSelect } from '../../components/ui/AppSelect';
import { Empty } from '../../components/ui/Modal';
import {
  freelanceAnalyticsPeriods,
  freelanceAnalyticsSeries,
  freelanceAnalyticsSummary,
  percentageChange,
} from '../../lib/freelanceAnalytics';
import type { FinancialPeriod } from '../../lib/finance';
import { euro, minutesLabel } from '../../lib/format';
import type { WorkSession } from '../../types/domain';

type ChartMode = 'value' | 'time';

const periodLabels: Record<FinancialPeriod, string> = {
  week: 'Cette semaine',
  month: 'Ce mois',
  year: 'Cette année',
  all: 'Toute la période',
};

function signedMinutes(value: number) {
  if (!value) return 'Stable';
  const sign = value > 0 ? '+' : '−';
  return `${sign}${minutesLabel(Math.abs(Math.round(value)))}`;
}

function percentageLabel(current: number, previous: number) {
  const change = percentageChange(current, previous);
  if (change === null) return 'Nouveau';
  if (Math.abs(change) < 0.5) return 'Stable';
  return `${change > 0 ? '+' : '−'}${Math.abs(Math.round(change))} %`;
}

function comparisonTone(current: number, previous: number) {
  return current > previous ? 'up' : current < previous ? 'down' : 'stable';
}

export function FreelanceAnalytics({
  sessions,
  period,
  onPeriodChange,
}: {
  sessions: WorkSession[];
  period: FinancialPeriod;
  onPeriodChange: (period: FinancialPeriod) => void;
}) {
  const [chartMode, setChartMode] = useState<ChartMode>('value');
  const periods = useMemo(
    () => freelanceAnalyticsPeriods(sessions, period),
    [period, sessions],
  );
  const current = useMemo(
    () => freelanceAnalyticsSummary(periods.current),
    [periods.current],
  );
  const previous = useMemo(
    () => periods.previous ? freelanceAnalyticsSummary(periods.previous) : null,
    [periods.previous],
  );
  const points = useMemo(
    () => freelanceAnalyticsSeries(sessions, period),
    [period, sessions],
  );
  const values = points.map((point) => chartMode === 'value' ? point.netValue : point.minutes);
  const maximum = Math.max(...values, 0);

  return (
    <div className="freelance-analytics">
      <header className="analytics-intro">
        <div>
          <p className="eyebrow">{periodLabels[period]}</p>
          <p>Une lecture simple du temps travaillé et de la valeur nette réellement générée.</p>
        </div>
        <AppSelect
          className="analytics-period-select"
          ariaLabel="Période des analyses"
          value={period}
          onChange={(value) => onPeriodChange(value as FinancialPeriod)}
          options={[
            { value: 'week', label: 'Cette semaine' },
            { value: 'month', label: 'Ce mois' },
            { value: 'year', label: 'Cette année' },
            { value: 'all', label: 'Tout' },
          ]}
        />
      </header>

      <section className="analytics-summary" aria-label="Résumé de la période">
        <AnalyticsMetric
          icon={<WalletCards size={17} />}
          label="Valeur nette"
          value={euro(current.netValue)}
          accent
        />
        <AnalyticsMetric
          icon={<Clock3 size={17} />}
          label="Temps travaillé"
          value={minutesLabel(current.totalMinutes)}
        />
        <AnalyticsMetric
          icon={<TimerReset size={17} />}
          label="Moyenne par jour travaillé"
          value={minutesLabel(Math.round(current.averageMinutesPerWorkedDay))}
          detail={current.workedDays ? `${current.workedDays} jour${current.workedDays > 1 ? 's' : ''} actif${current.workedDays > 1 ? 's' : ''}` : 'Aucun jour travaillé'}
        />
        <AnalyticsMetric
          icon={<Gauge size={17} />}
          label="Taux horaire effectif"
          value={`${euro(current.effectiveHourlyRate)} / h`}
          detail="Après commissions"
        />
      </section>

      <section className="analytics-chart-card">
        <header>
          <div>
            <span className="analytics-icon"><BarChart3 size={17} /></span>
            <div>
              <h3>Évolution</h3>
              <small>{period === 'month' ? 'Agrégée par semaine' : period === 'week' ? 'Agrégée par jour' : 'Agrégée par mois'}</small>
            </div>
          </div>
          <div className="analytics-switch" role="group" aria-label="Mesure du graphique">
            <button
              type="button"
              className={chartMode === 'value' ? 'selected' : ''}
              aria-pressed={chartMode === 'value'}
              onClick={() => setChartMode('value')}
            >
              Valeur
            </button>
            <button
              type="button"
              className={chartMode === 'time' ? 'selected' : ''}
              aria-pressed={chartMode === 'time'}
              onClick={() => setChartMode('time')}
            >
              Temps
            </button>
          </div>
        </header>
        {points.length ? (
          <div className="analytics-chart-scroll">
            <div
              className="analytics-bars"
              role="img"
              aria-label={`Évolution de ${chartMode === 'value' ? 'la valeur nette' : 'la durée travaillée'}`}
            >
              {points.map((point, index) => {
                const value = values[index];
                const display = chartMode === 'value' ? euro(value) : minutesLabel(value);
                const height = maximum && value ? Math.max(4, (value / maximum) * 100) : 2;
                return (
                  <div className="analytics-bar-column" key={point.key} title={`${point.label} · ${display}`}>
                    <span className="analytics-bar-value">{value ? display : '—'}</span>
                    <span className="analytics-bar-track">
                      <i style={{ height: `${height}%` }} />
                    </span>
                    <small>{point.label}</small>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <Empty>Aucune session terminée sur cette période.</Empty>
        )}
      </section>

      {previous && (
        <section className="analytics-comparison">
          <header>
            <div>
              <h3>Par rapport à la période précédente</h3>
              <small>Même durée, juste avant la période sélectionnée.</small>
            </div>
          </header>
          <div>
            <ComparisonRow
              label="Valeur nette générée"
              value={euro(current.netValue)}
              change={percentageLabel(current.netValue, previous.netValue)}
              tone={comparisonTone(current.netValue, previous.netValue)}
            />
            <ComparisonRow
              label="Temps travaillé"
              value={minutesLabel(current.totalMinutes)}
              change={signedMinutes(current.totalMinutes - previous.totalMinutes)}
              tone={comparisonTone(current.totalMinutes, previous.totalMinutes)}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function AnalyticsMetric({
  icon,
  label,
  value,
  detail,
  accent = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail?: string;
  accent?: boolean;
}) {
  return (
    <article className={`analytics-metric ${accent ? 'accent' : ''}`}>
      <span className="analytics-icon">{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

function ComparisonRow({
  label,
  value,
  change,
  tone,
}: {
  label: string;
  value: string;
  change: string;
  tone: 'up' | 'down' | 'stable';
}) {
  return (
    <div className="analytics-comparison-row">
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={tone}>{change}</small>
    </div>
  );
}
