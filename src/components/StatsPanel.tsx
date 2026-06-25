import { Flame, Percent, Target } from 'lucide-react';

type StatsPanelProps = {
  stats: {
    streak: number;
    successRate: number;
    successfulDays: number;
    trackedDays: number;
  };
};

export default function StatsPanel({ stats }: StatsPanelProps) {
  const items = [
    {
      icon: Target,
      label: 'Jours réussis',
      value: `${stats.successfulDays}`,
      suffix: `/ ${stats.trackedDays}`,
    },
    {
      icon: Percent,
      label: 'Réussite',
      value: `${stats.successRate}`,
      suffix: '%',
    },
    {
      icon: Flame,
      label: 'Streak actuel',
      value: `${stats.streak}`,
      suffix: stats.streak > 1 ? 'jours' : 'jour',
    },
  ];

  return (
    <section className="panel-dark relative overflow-hidden p-6 sm:p-7">
      <div className="noise-overlay pointer-events-none absolute inset-0 opacity-20" />
      <div className="relative grid gap-4 sm:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="rounded-2xl bg-white/[0.04] p-4">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-forest/30 text-emerald-300">
                <Icon size={19} />
              </div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-extrabold leading-none">
                  {item.value}
                </span>
                <span className="pb-1 text-sm font-semibold text-gray-400">
                  {item.suffix}
                </span>
              </div>
              <div className="mt-2 text-sm font-medium text-gray-400">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
