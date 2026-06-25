import { History } from 'lucide-react';
import type { DailyEntry } from '../types';
import { getCompletionCount, isEntryComplete } from '../lib/stats';
import { formatShortDate, getTodayKey } from '../lib/summer';

type HistoryPanelProps = {
  entries: DailyEntry[];
  onSelect: (dateKey: string) => void;
  selectedDate: string;
};

export default function HistoryPanel({
  entries,
  onSelect,
  selectedDate,
}: HistoryPanelProps) {
  const todayKey = getTodayKey();

  return (
    <section className="panel p-6 sm:p-7">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-forest">Historique</p>
          <h2 className="mt-2 text-2xl font-extrabold">Jours</h2>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-paper text-forest">
          <History size={19} />
        </div>
      </div>

      <div className="grid max-h-[28rem] gap-2 overflow-y-auto pr-1">
        {entries.map((entry) => {
          const isSelected = selectedDate === entry.entry_date;
          const complete = isEntryComplete(entry);
          const count = getCompletionCount(entry);
          const isToday = entry.entry_date === todayKey;

          return (
            <button
              className={`focus-ring flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                isSelected
                  ? 'border-forest/30 bg-forest/10'
                  : 'border-black/5 bg-paper hover:border-black/10 hover:bg-white'
              }`}
              key={entry.id}
              onClick={() => onSelect(entry.entry_date)}
              type="button"
            >
              <span>
                <span className="block text-sm font-bold text-ink">
                  {isToday ? "Aujourd'hui" : formatShortDate(entry.entry_date)}
                </span>
                <span className="mt-0.5 block text-xs font-medium text-gray-500">
                  {count} / 3
                </span>
              </span>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  complete ? 'bg-forest' : 'bg-black/10'
                }`}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
