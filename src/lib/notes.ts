import type { Client, Note } from '../types/domain';

export type NoteFilter = 'all' | 'global' | 'clients';

export function sortNotes(notes: Note[]) {
  return notes.slice().sort(
    (a, b) =>
      b.updated_at.localeCompare(a.updated_at) ||
      b.created_at.localeCompare(a.created_at),
  );
}

export function filterNotes(
  notes: Note[],
  clients: Client[],
  filter: NoteFilter,
  query: string,
  clientId: string | null = null,
) {
  const normalized = query.trim().toLocaleLowerCase('fr-FR');
  const clientsById = new Map(clients.map((client) => [client.id, client.name]));
  return sortNotes(notes).filter((note) => {
    if (clientId && note.client_id !== clientId) return false;
    if (filter === 'global' && note.client_id) return false;
    if (filter === 'clients' && !note.client_id) return false;
    if (!normalized) return true;
    const clientName = note.client_id
      ? clientsById.get(note.client_id) ?? note.client_name_snapshot ?? ''
      : note.client_name_snapshot ?? '';
    return [note.title, note.plain_text, clientName]
      .join('\n')
      .toLocaleLowerCase('fr-FR')
      .includes(normalized);
  });
}

export function noteDisplayTitle(note: Pick<Note, 'title'>) {
  return note.title.trim() || 'Sans titre';
}

export function noteExcerpt(note: Pick<Note, 'plain_text'>, maxLength = 110) {
  const text = note.plain_text.replace(/\s+/g, ' ').trim();
  if (!text) return 'Note vide';
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

export const hexColorPattern = /(?<![0-9a-f])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})(?![0-9a-f])/gi;

export function findHexColors(text: string) {
  return Array.from(text.matchAll(new RegExp(hexColorPattern.source, hexColorPattern.flags))).map(
    (match) => ({ value: match[0], index: match.index }),
  );
}

export function noteClientSnapshot(
  clientId: string | null,
  clients: Client[],
  previousSnapshot: string | null,
) {
  if (!clientId) return null;
  return clients.find((client) => client.id === clientId)?.name ?? previousSnapshot;
}
