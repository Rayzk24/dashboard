import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  createRow,
  deleteRow,
  emptyData,
  loadData,
  runManagementRpc,
  updateRow,
  type ManagementRpc,
  type TableName,
} from '../services/data';
import {
  createNote as createNoteRow,
  deleteNote as deleteNoteRow,
  moveNote as moveNoteRow,
  updateNote as updateNoteRow,
  type CreateNoteInput,
  type UpdateNoteInput,
} from '../services/notes';
import type { AppData, Note } from '../types/domain';

type ContextValue = AppData & {
  userId: string;
  loading: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (table: TableName, values: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  update: (table: TableName, id: string, values: Record<string, unknown>) => Promise<void>;
  remove: (table: Exclude<TableName, 'app_settings'>, id: string) => Promise<void>;
  manage: (name: ManagementRpc, args: Record<string, unknown>) => Promise<unknown>;
  createNote: (input: CreateNoteInput) => Promise<Note>;
  updateNote: (id: string, input: UpdateNoteInput) => Promise<Note>;
  moveNote: (id: string, clientId: string | null, snapshot: string | null) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
};

const DataContext = createContext<ContextValue | null>(null);

export function AppDataProvider({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  const userId = session.user.id;
  const [data, setData] = useState<AppData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loadData(userId));
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
    const focus = () => void refresh();
    window.addEventListener('focus', focus);
    return () => window.removeEventListener('focus', focus);
  }, [refresh]);

  const mutate = useCallback(
    async <T,>(work: () => Promise<T>) => {
      setSaving(true);
      try {
        const result = await work();
        await refresh();
        return result;
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'La sauvegarde a échoué.');
        throw reason;
      } finally {
        setSaving(false);
      }
    },
    [refresh],
  );

  const mutateNote = useCallback(
    async <T,>(work: () => Promise<T>, apply: (current: AppData, result: T) => AppData) => {
      setSaving(true);
      try {
        const result = await work();
        setData((current) => apply(current, result));
        setError(null);
        return result;
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'La sauvegarde de la note a échoué.');
        throw reason;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const value = useMemo<ContextValue>(
    () => ({
      ...data,
      userId,
      loading,
      saving,
      error,
      refresh,
      create: (table, values) => mutate(() => createRow(table, { ...values, user_id: userId })),
      update: (table, id, values) => mutate(() => updateRow(table, id, values)),
      remove: (table, id) => mutate(() => deleteRow(table, id)),
      manage: (name, args) => mutate(() => runManagementRpc(name, args)),
      createNote: (input) =>
        mutateNote(
          () => createNoteRow(userId, input),
          (current, note) => ({ ...current, notes: [note, ...current.notes] }),
        ),
      updateNote: (id, input) =>
        mutateNote(
          () => updateNoteRow(userId, id, input),
          (current, note) => ({
            ...current,
            notes: current.notes.map((item) => (item.id === note.id ? note : item)),
          }),
        ),
      moveNote: (id, clientId, snapshot) =>
        mutateNote(
          () => moveNoteRow(userId, id, clientId, snapshot),
          (current, note) => ({
            ...current,
            notes: current.notes.map((item) => (item.id === note.id ? note : item)),
          }),
        ),
      deleteNote: (id) =>
        mutateNote(
          () => deleteNoteRow(userId, id),
          (current) => ({ ...current, notes: current.notes.filter((item) => item.id !== id) }),
        ),
    }),
    [data, error, loading, mutate, mutateNote, refresh, saving, userId],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useAppData() {
  const value = useContext(DataContext);
  if (!value) throw new Error('useAppData doit être utilisé dans AppDataProvider.');
  return value;
}
