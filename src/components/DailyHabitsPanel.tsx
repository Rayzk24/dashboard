import { CalendarCheck } from 'lucide-react';
import type { DailyEntry, DailyEntryPatch } from '../types';
import { getCompletionCount } from '../lib/stats';
import { formatLongDate } from '../lib/summer';
import CheckboxRow from './CheckboxRow';

type DailyHabitsPanelProps = {
  entry: DailyEntry;
  isToday: boolean;
  onUpdate: (entryId: string, patch: DailyEntryPatch) => void;
};

const habits = [
  { key: 'code_done', label: '30 min de code' },
  { key: 'learning_done', label: 'Apprendre quelque chose' },
  { key: 'outside_done', label: '30 min dehors' },
] as const;

export default function DailyHabitsPanel({
  entry,
  isToday,
  onUpdate,
}: DailyHabitsPanelProps) {
  const completed = getCompletionCount(entry);

  return (
    <section className="panel p-6 sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-forest">
            {isToday ? "Aujourd'hui" : formatLongDate(entry.entry_date)}
          </p>
          <h2 className="mt-2 text-2xl font-extrabold">Habitudes</h2>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-paper px-3 py-2 text-sm font-bold text-ink">
          <CalendarCheck size={16} />
          {completed} / 3
        </div>
      </div>

      <div className="space-y-3">
        {habits.map((habit) => (
          <CheckboxRow
            checked={entry[habit.key]}
            key={habit.key}
            label={habit.label}
            onToggle={() =>
              onUpdate(entry.id, {
                [habit.key]: !entry[habit.key],
              })
            }
          />
        ))}
      </div>
    </section>
  );
}
