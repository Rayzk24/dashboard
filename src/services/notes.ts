import { supabase } from '../lib/supabase';
import type { Note, NoteDocument } from '../types/domain';

export type CreateNoteInput = {
  clientId: string | null;
  clientNameSnapshot: string | null;
  title?: string;
  content?: NoteDocument;
  plainText?: string;
};

export type UpdateNoteInput = Partial<{
  title: string;
  content: NoteDocument;
  plain_text: string;
  client_id: string | null;
  client_name_snapshot: string | null;
}>;

function noteRequestError(action: string, error: { message?: string }) {
  return new Error(`${action} : ${error.message || 'erreur Supabase inconnue'}`);
}

export async function loadNotes(userId: string) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw noteRequestError('Impossible de charger les notes', error);
  return (data ?? []) as Note[];
}

export async function loadNote(userId: string, noteId: string) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .eq('id', noteId)
    .maybeSingle();
  if (error) throw noteRequestError('Impossible de charger la note', error);
  return data as Note | null;
}

export async function createNote(userId: string, input: CreateNoteInput) {
  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: userId,
      client_id: input.clientId,
      client_name_snapshot: input.clientNameSnapshot,
      title: input.title ?? '',
      content: input.content ?? emptyNoteDocument,
      plain_text: input.plainText ?? '',
    })
    .select('*')
    .single();
  if (error) throw noteRequestError('Impossible de créer la note', error);
  return data as Note;
}

export async function updateNote(
  userId: string,
  noteId: string,
  input: UpdateNoteInput,
) {
  const { data, error } = await supabase
    .from('notes')
    .update(input)
    .eq('user_id', userId)
    .eq('id', noteId)
    .select('*')
    .single();
  if (error) throw noteRequestError('Impossible d’enregistrer la note', error);
  return data as Note;
}

export function moveNote(
  userId: string,
  noteId: string,
  clientId: string | null,
  clientNameSnapshot: string | null,
) {
  return updateNote(userId, noteId, {
    client_id: clientId,
    client_name_snapshot: clientNameSnapshot,
  });
}

export async function deleteNote(userId: string, noteId: string) {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('user_id', userId)
    .eq('id', noteId);
  if (error) throw noteRequestError('Impossible de supprimer la note', error);
}

export async function loadClientNotes(userId: string, clientId: string) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false });
  if (error) throw noteRequestError('Impossible de charger les notes du client', error);
  return (data ?? []) as Note[];
}

export const emptyNoteDocument: NoteDocument = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};
