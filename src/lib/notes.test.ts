import { describe, expect, it } from 'vitest';
import {
  filterNotes,
  findHexColors,
  noteClientSnapshot,
  noteDisplayTitle,
  noteExcerpt,
  sortNotes,
} from './notes';
import type { Client, Note } from '../types/domain';

const client = { id: 'client-1', name: 'Acme' } as Client;
const note = (values: Partial<Note>): Note => ({
  id: 'note-1',
  user_id: 'user-1',
  client_id: null,
  client_name_snapshot: null,
  title: '',
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
  plain_text: '',
  created_at: '2026-07-20T10:00:00Z',
  updated_at: '2026-07-20T10:00:00Z',
  ...values,
});

describe('notes', () => {
  it('trie par modification puis création décroissantes', () => {
    const sorted = sortNotes([
      note({ id: 'old', updated_at: '2026-07-20T10:00:00Z' }),
      note({ id: 'new', updated_at: '2026-07-22T10:00:00Z' }),
      note({ id: 'tie', updated_at: '2026-07-22T10:00:00Z', created_at: '2026-07-23T10:00:00Z' }),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(['tie', 'new', 'old']);
  });

  it('filtre les notes globales, client et recherche titre/contenu/client', () => {
    const values = [
      note({ id: 'global', title: 'Commandes', plain_text: 'npm run build' }),
      note({ id: 'client', client_id: client.id, client_name_snapshot: client.name, title: 'Livraison', plain_text: '#0A84FF' }),
    ];
    expect(filterNotes(values, [client], 'global', '').map((item) => item.id)).toEqual(['global']);
    expect(filterNotes(values, [client], 'clients', '').map((item) => item.id)).toEqual(['client']);
    expect(filterNotes(values, [client], 'all', 'acme').map((item) => item.id)).toEqual(['client']);
    expect(filterNotes(values, [client], 'all', 'npm').map((item) => item.id)).toEqual(['global']);
  });

  it('conserve le snapshot après suppression du client et l’efface lors du déplacement global', () => {
    const preserved = note({ client_id: null, client_name_snapshot: 'Ancien client' });
    expect(filterNotes([preserved], [], 'global', 'ancien client')).toHaveLength(1);
    expect(noteClientSnapshot(null, [], preserved.client_name_snapshot)).toBeNull();
    expect(noteClientSnapshot(client.id, [client], null)).toBe('Acme');
  });

  it('garde lisible une ancienne note liée à un client archivé', () => {
    const archivedClient = { ...client, status: 'archived' as const };
    const preserved = note({ client_id: client.id, client_name_snapshot: client.name, title: 'Archive client' });
    expect(filterNotes([preserved], [archivedClient], 'clients', 'acme')).toEqual([preserved]);
  });

  it('affiche un titre et un extrait sûrs', () => {
    expect(noteDisplayTitle({ title: '   ' })).toBe('Sans titre');
    expect(noteExcerpt({ plain_text: '  Une\nnote   concise  ' })).toBe('Une note concise');
  });
});

describe('couleurs HEX', () => {
  it('reconnaît les formats valides et leur casse', () => {
    expect(findHexColors('#FFF #0A84FF #FFFFFF80 #abcd').map((item) => item.value)).toEqual([
      '#FFF',
      '#0A84FF',
      '#FFFFFF80',
      '#abcd',
    ]);
  });

  it('ignore les valeurs invalides et les fragments trop longs', () => {
    expect(findHexColors('#GGGGGG #12 #12345 #123456789')).toEqual([]);
  });
});
