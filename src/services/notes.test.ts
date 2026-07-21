import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: { from: mocks.from } }));

import { createNote, deleteNote, loadNotes, moveNote, updateNote } from './notes';

const stored = {
  id: 'note-1',
  user_id: 'user-1',
  client_id: null,
  client_name_snapshot: null,
  title: '',
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
  plain_text: '',
  created_at: '2026-07-22T10:00:00Z',
  updated_at: '2026-07-22T10:00:00Z',
};

beforeEach(() => mocks.from.mockReset());

describe('notes repository', () => {
  it('explique clairement un refus de lecture Supabase', async () => {
    const secondOrder = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'permission denied for table notes' },
    });
    const firstOrder = vi.fn(() => ({ order: secondOrder }));
    const eq = vi.fn(() => ({ order: firstOrder }));
    const select = vi.fn(() => ({ eq }));
    mocks.from.mockReturnValue({ select });

    await expect(loadNotes('user-1')).rejects.toThrow(
      'Impossible de charger les notes : permission denied for table notes',
    );
  });

  it('crée une note globale ou liée à un client avec le compte connecté', async () => {
    const single = vi.fn().mockResolvedValue({ data: stored, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    mocks.from.mockReturnValue({ insert });
    await createNote('user-1', { clientId: null, clientNameSnapshot: null });
    await createNote('user-1', { clientId: 'client-1', clientNameSnapshot: 'Acme' });
    expect(insert).toHaveBeenNthCalledWith(1, expect.objectContaining({ user_id: 'user-1', client_id: null }));
    expect(insert).toHaveBeenNthCalledWith(2, expect.objectContaining({ user_id: 'user-1', client_id: 'client-1', client_name_snapshot: 'Acme' }));
  });

  it('modifie et déplace uniquement une note du propriétaire', async () => {
    const single = vi.fn().mockResolvedValue({ data: stored, error: null });
    const select = vi.fn(() => ({ single }));
    const eqId = vi.fn(() => ({ select }));
    const eqUser = vi.fn(() => ({ eq: eqId }));
    const update = vi.fn(() => ({ eq: eqUser }));
    mocks.from.mockReturnValue({ update });
    await updateNote('user-1', 'note-1', { title: 'Titre' });
    await moveNote('user-1', 'note-1', 'client-2', 'Beta');
    expect(update).toHaveBeenNthCalledWith(1, { title: 'Titre' });
    expect(update).toHaveBeenNthCalledWith(2, { client_id: 'client-2', client_name_snapshot: 'Beta' });
    expect(eqUser).toHaveBeenCalledWith('user_id', 'user-1');
    expect(eqId).toHaveBeenCalledWith('id', 'note-1');
  });

  it('supprime définitivement uniquement la note du propriétaire', async () => {
    const eqId = vi.fn().mockResolvedValue({ error: null });
    const eqUser = vi.fn(() => ({ eq: eqId }));
    const remove = vi.fn(() => ({ eq: eqUser }));
    mocks.from.mockReturnValue({ delete: remove });
    await deleteNote('user-1', 'note-1');
    expect(eqUser).toHaveBeenCalledWith('user_id', 'user-1');
    expect(eqId).toHaveBeenCalledWith('id', 'note-1');
  });
});
