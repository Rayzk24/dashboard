import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  formatLongDate,
  getDatesToEnsure,
  getSummerProgress,
  getTodayKey,
} from '../lib/summer';
import { getDashboardStats } from '../lib/stats';
import type {
  DailyEntry,
  DailyEntryPatch,
  SummerGoal,
  SummerGoalPatch,
} from '../types';
import DailyHabitsPanel from './DailyHabitsPanel';
import GoalsPanel from './GoalsPanel';
import HistoryPanel from './HistoryPanel';
import NotesPanel from './NotesPanel';
import ShellHeader from './ShellHeader';
import StatsPanel from './StatsPanel';

type DashboardProps = {
  onSignOut: () => void;
  session: Session;
};

const defaultGoals = [
  {
    goal_key: 'javascript-level',
    position: 1,
    title: 'Atteindre un bon niveau en JavaScript',
  },
  {
    goal_key: 'panel-v1',
    position: 2,
    title: 'Terminer la V1 de mon panel',
  },
  {
    goal_key: 'client-work',
    position: 3,
    title: 'Réaliser 3 prestations clients',
  },
] as const;

export default function Dashboard({ onSignOut, session }: DashboardProps) {
  const userId = session.user.id;
  const todayKey = getTodayKey();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [goals, setGoals] = useState<SummerGoal[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await ensureDailyEntries(userId);
      await ensureDefaultGoals(userId);

      const [entriesResult, goalsResult] = await Promise.all([
        supabase
          .from('daily_entries')
          .select('*')
          .eq('user_id', userId)
          .order('entry_date', { ascending: false }),
        supabase
          .from('summer_goals')
          .select('*')
          .eq('user_id', userId)
          .order('position', { ascending: true }),
      ]);

      if (entriesResult.error) throw entriesResult.error;
      if (goalsResult.error) throw goalsResult.error;

      const nextEntries = (entriesResult.data ?? []) as DailyEntry[];
      setEntries(nextEntries);
      setGoals((goalsResult.data ?? []) as SummerGoal[]);
      setSelectedDate((currentDate) =>
        nextEntries.some((entry) => entry.entry_date === currentDate)
          ? currentDate
          : todayKey,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Impossible de charger le dashboard.',
      );
    } finally {
      setLoading(false);
    }
  }, [todayKey, userId]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const selectedEntry = useMemo(
    () =>
      entries.find((entry) => entry.entry_date === selectedDate) ??
      entries.find((entry) => entry.entry_date === todayKey) ??
      entries[0] ??
      null,
    [entries, selectedDate, todayKey],
  );

  const stats = useMemo(
    () => getDashboardStats(entries, todayKey),
    [entries, todayKey],
  );

  const summer = useMemo(() => getSummerProgress(todayKey), [todayKey]);

  const updateEntry = useCallback(
    async (entryId: string, patch: DailyEntryPatch) => {
      const previousEntries = entries;
      setSaving(true);
      setEntries((currentEntries) =>
        currentEntries.map((entry) =>
          entry.id === entryId ? { ...entry, ...patch } : entry,
        ),
      );

      const { error: updateError } = await supabase
        .from('daily_entries')
        .update(patch)
        .eq('id', entryId)
        .eq('user_id', userId);

      if (updateError) {
        setEntries(previousEntries);
        setError(updateError.message);
      }

      setSaving(false);
    },
    [entries, userId],
  );

  const updateGoal = useCallback(
    async (goalId: string, patch: SummerGoalPatch) => {
      const previousGoals = goals;
      setSaving(true);
      setGoals((currentGoals) =>
        currentGoals.map((goal) =>
          goal.id === goalId ? { ...goal, ...patch } : goal,
        ),
      );

      const { error: updateError } = await supabase
        .from('summer_goals')
        .update(patch)
        .eq('id', goalId)
        .eq('user_id', userId);

      if (updateError) {
        setGoals(previousGoals);
        setError(updateError.message);
      }

      setSaving(false);
    },
    [goals, userId],
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-paper text-ink">
      <div className="minecraft-pattern pointer-events-none fixed inset-0" />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-white via-paper to-white" />

      <div className="relative">
        <ShellHeader
          dateLabel={formatLongDate(todayKey)}
          onSignOut={onSignOut}
          summerLabel={summer.label}
        />

        <section className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
          <div className="mb-5 flex min-h-6 items-center justify-between gap-3">
            <div className="text-sm font-semibold text-gray-500">
              {saving ? 'Synchronisation...' : 'Synchronisé'}
            </div>
            <button
              aria-label="Rafraîchir"
              className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/5 bg-white text-ink transition hover:border-black/10"
              onClick={() => void loadDashboard()}
              title="Rafraîchir"
              type="button"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {error ? (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          {loading || !selectedEntry ? (
            <div className="panel grid min-h-80 place-items-center p-8">
              <motion.div
                animate={{ opacity: [0.35, 1, 0.35] }}
                transition={{
                  duration: 1.8,
                  ease: 'easeInOut',
                  repeat: Infinity,
                }}
                className="h-2 w-24 rounded-full bg-ink/10"
              />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="space-y-5"
            >
              <StatsPanel stats={stats} />

              <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                <DailyHabitsPanel
                  entry={selectedEntry}
                  isToday={selectedEntry.entry_date === todayKey}
                  onUpdate={updateEntry}
                />
                <GoalsPanel goals={goals} onUpdate={updateGoal} />
              </div>

              <div className="grid gap-5 lg:grid-cols-[1fr_0.82fr]">
                <NotesPanel entry={selectedEntry} onUpdate={updateEntry} />
                <HistoryPanel
                  entries={entries}
                  onSelect={setSelectedDate}
                  selectedDate={selectedEntry.entry_date}
                />
              </div>
            </motion.div>
          )}
        </section>
      </div>
    </main>
  );
}

async function ensureDailyEntries(userId: string) {
  const rows = getDatesToEnsure().map((entryDate) => ({
    entry_date: entryDate,
    user_id: userId,
  }));

  if (rows.length === 0) return;

  const { error } = await supabase.from('daily_entries').upsert(rows, {
    ignoreDuplicates: true,
    onConflict: 'user_id,entry_date',
  });

  if (error) throw error;
}

async function ensureDefaultGoals(userId: string) {
  const rows = defaultGoals.map((goal) => ({
    ...goal,
    user_id: userId,
  }));

  const { error } = await supabase.from('summer_goals').upsert(rows, {
    ignoreDuplicates: true,
    onConflict: 'user_id,goal_key',
  });

  if (error) throw error;
}
