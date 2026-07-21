import { supabase } from '../lib/supabase';
import { loadNotes } from './notes';
import type { AppData } from '../types/domain';

const tables = ['habits','habit_entries','daily_notes','clients','projects','work_sessions','payments','payment_allocations','tasks','purchases','reports','report_sessions'] as const;
export type TableName = (typeof tables)[number] | 'app_settings';
export const emptyData: AppData = { habits: [], habitEntries: [], dailyNotes: [], notes: [], clients: [], projects: [], sessions: [], payments: [], allocations: [], tasks: [], purchases: [], settings: null, reports: [], reportSessions: [] };
export async function loadData(userId: string): Promise<AppData> {
  const [results, notes] = await Promise.all([
    Promise.all([...tables.map((table) => supabase.from(table).select('*').eq('user_id', userId)), supabase.from('app_settings').select('*').eq('user_id', userId).maybeSingle()]),
    loadNotes(userId),
  ]);
  const error = results.find((item) => item.error)?.error;
  if (error) throw error;
  const rows = results.map((item) => item.data ?? []);
  return { habits: rows[0] as AppData['habits'], habitEntries: rows[1] as AppData['habitEntries'], dailyNotes: rows[2] as AppData['dailyNotes'], notes, clients: rows[3] as AppData['clients'], projects: rows[4] as AppData['projects'], sessions: rows[5] as AppData['sessions'], payments: rows[6] as AppData['payments'], allocations: rows[7] as AppData['allocations'], tasks: rows[8] as AppData['tasks'], purchases: rows[9] as AppData['purchases'], reports: rows[10] as AppData['reports'], reportSessions: rows[11] as AppData['reportSessions'], settings: (results[12].data ?? null) as AppData['settings'] };
}
export async function createRow(table: TableName, values: Record<string, unknown>) { const { data, error } = await supabase.from(table).insert(values).select().maybeSingle(); if (error) throw error; return data as Record<string, unknown> | null; }
export async function updateRow(table: TableName, id: string, values: Record<string, unknown>) { const key = table === 'app_settings' ? 'user_id' : 'id'; const { error } = await supabase.from(table).update(values).eq(key, id); if (error) throw error; }
export async function deleteRow(table: Exclude<TableName, 'app_settings'>, id: string) { const { error } = await supabase.from(table).delete().eq('id', id); if (error) throw error; }
export type ManagementRpc = 'create_payment_and_rebuild_allocations' | 'update_payment_and_rebuild_allocations' | 'delete_payment_and_rebuild_allocations' | 'delete_work_session_and_rebuild_allocations' | 'delete_project_keep_sessions' | 'delete_habit_with_history';
export async function runManagementRpc(name: ManagementRpc, args: Record<string, unknown>) { const { data, error } = await supabase.rpc(name, args); if (error) throw error; return data; }
