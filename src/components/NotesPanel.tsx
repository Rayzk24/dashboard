import { useEffect, useState } from 'react';
import { PenLine } from 'lucide-react';
import type { DailyEntry, DailyEntryPatch } from '../types';

type NotesPanelProps = {
  entry: DailyEntry;
  onUpdate: (entryId: string, patch: DailyEntryPatch) => void;
};

export default function NotesPanel({ entry, onUpdate }: NotesPanelProps) {
  const [draft, setDraft] = useState(entry.notes ?? '');

  useEffect(() => {
    setDraft(entry.notes ?? '');
  }, [entry.id, entry.notes]);

  useEffect(() => {
    if (draft === (entry.notes ?? '')) return undefined;

    const timeout = window.setTimeout(() => {
      onUpdate(entry.id, { notes: draft });
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [draft, entry.id, entry.notes, onUpdate]);

  return (
    <section className="panel p-6 sm:p-7">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-forest">
            Notes du jour
          </p>
          <h2 className="mt-2 text-2xl font-extrabold">Quelques lignes</h2>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-paper text-forest">
          <PenLine size={19} />
        </div>
      </div>

      <textarea
        className="focus-ring min-h-40 w-full resize-none rounded-2xl border border-black/5 bg-paper p-4 leading-relaxed text-ink outline-none transition placeholder:text-gray-400 focus:bg-white"
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Note rapide..."
        value={draft}
      />
    </section>
  );
}
