import {
  ArrowLeft,
  ChevronRight,
  FilePlus2,
  Globe2,
  Search,
  StickyNote,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { useAppData } from '../../app/AppDataProvider';
import { AppSelect } from '../../components/ui/AppSelect';
import { Empty, Modal } from '../../components/ui/Modal';
import { AutosaveQueue, type AutosaveStatus } from '../../lib/noteAutosave';
import { visibleFreelanceClients } from '../../lib/finance';
import {
  filterNotes,
  noteClientSnapshot,
  noteDisplayTitle,
  noteExcerpt,
  type NoteFilter,
} from '../../lib/notes';
import { emptyNoteDocument, type UpdateNoteInput } from '../../services/notes';
import type { Note, NoteDocument } from '../../types/domain';
import { RichNoteEditor, type NoteEditorValue } from './RichNoteEditor';

type LocationState = { focusTitle?: boolean } | null;

export function NotesPage() {
  const data = useAppData();
  const { noteId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<NoteFilter>('all');
  const [creationOpen, setCreationOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const flushRef = useRef<(() => Promise<boolean>) | null>(null);
  const automaticCreation = useRef<string | null>(null);
  const clientFilter = searchParams.get('client');
  const selected = noteId ? data.notes.find((note) => note.id === noteId) : undefined;
  const visibleNotes = useMemo(
    () => filterNotes(data.notes, data.clients, filter, query, clientFilter),
    [clientFilter, data.clients, data.notes, filter, query],
  );

  const create = async (clientId: string | null) => {
    setCreating(true);
    try {
      const client = data.clients.find((item) => item.id === clientId);
      if (clientId && (!client || client.status === 'archived')) return;
      const note = await data.createNote({
        clientId,
        clientNameSnapshot: client?.name ?? null,
        content: emptyNoteDocument,
      });
      setCreationOpen(false);
      navigate(`/notes/${note.id}`, { state: { focusTitle: true } });
    } catch {
      /* AppShell affiche l’erreur Supabase sans fermer le choix de création. */
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    const clientId = searchParams.get('newClient');
    if (!clientId || automaticCreation.current === clientId || data.loading) return;
    const client = visibleFreelanceClients(data.clients).find((item) => item.id === clientId);
    if (!client) return;
    automaticCreation.current = clientId;
    setSearchParams({}, { replace: true });
    void create(clientId);
  }, [data.clients, data.loading, searchParams, setSearchParams]);

  const openNote = async (id: string) => {
    const saved = await flushRef.current?.();
    if (saved === false) return;
    const search = searchParams.toString();
    navigate({
      pathname: id ? `/notes/${id}` : '/notes',
      search: search ? `?${search}` : '',
    });
  };

  const afterDelete = (deletedId: string) => {
    const next = visibleNotes.find((note) => note.id !== deletedId);
    const search = searchParams.toString();
    navigate({
      pathname: next ? `/notes/${next.id}` : '/notes',
      search: search ? `?${search}` : '',
    }, { replace: true });
  };

  const clearClientFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('client');
    setSearchParams(next, { replace: true });
  };

  return (
    <section className={`page notes-page ${selected ? 'note-open' : ''}`}>
      <div className="notes-layout">
        <aside className="notes-sidebar panel">
          <header className="notes-list-header">
            <div>
              <p className="eyebrow">Espace personnel</p>
              <h1>Notes</h1>
            </div>
            <button
              className="button primary notes-new-button"
              onClick={() => setCreationOpen(true)}
            >
              <FilePlus2 size={17} /> Nouvelle note
            </button>
          </header>
          <label className="notes-search">
            <Search size={17} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher"
              aria-label="Rechercher dans les notes"
            />
          </label>
          <div className="notes-filters" aria-label="Filtrer les notes">
            {([
              ['all', 'Toutes'],
              ['global', 'Globales'],
              ['clients', 'Clients'],
            ] as const).map(([value, label]) => (
              <button
                type="button"
                className={filter === value ? 'selected' : ''}
                onClick={() => setFilter(value)}
                key={value}
              >
                {label}
              </button>
            ))}
          </div>
          {clientFilter ? (
            <button className="notes-client-filter" onClick={clearClientFilter}>
              <Users size={14} />
              {data.clients.find((client) => client.id === clientFilter)?.name ?? 'Client'}
              <span>Retirer</span>
            </button>
          ) : null}
          <div className="notes-list">
            {visibleNotes.length ? (
              visibleNotes.map((note) => (
                <NoteListItem
                  key={note.id}
                  note={note}
                  clientName={
                    data.clients.find((client) => client.id === note.client_id)?.name ??
                    note.client_name_snapshot
                  }
                  selected={note.id === selected?.id}
                  onClick={() => void openNote(note.id)}
                />
              ))
            ) : (
              <Empty>Aucune note ne correspond.</Empty>
            )}
          </div>
        </aside>
        <main className="notes-editor-panel panel">
          {selected ? (
            <NoteEditor
              key={selected.id}
              note={selected}
              focusTitle={(location.state as LocationState)?.focusTitle === true}
              flushRef={flushRef}
              onBack={() => void openNote('')}
              onDeleted={() => afterDelete(selected.id)}
            />
          ) : (
            <div className="notes-welcome">
              <span className="empty-icon"><StickyNote size={22} /></span>
              <h2>Sélectionnez une note</h2>
              <p>Ou créez un brouillon pour commencer immédiatement.</p>
              <button className="button primary" onClick={() => setCreationOpen(true)}>
                <FilePlus2 size={17} /> Nouvelle note
              </button>
            </div>
          )}
        </main>
      </div>
      {creationOpen ? (
        <CreateNoteModal
          loading={creating}
          onCreate={create}
          onClose={() => setCreationOpen(false)}
        />
      ) : null}
    </section>
  );
}

function NoteListItem({
  note,
  clientName,
  selected,
  onClick,
}: {
  note: Note;
  clientName: string | null;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`note-list-item ${selected ? 'selected' : ''}`} onClick={onClick}>
      <span className="note-list-icon">{note.client_id ? <UserRound size={16} /> : <Globe2 size={16} />}</span>
      <span className="note-list-copy">
        <b>{noteDisplayTitle(note)}</b>
        <small>{noteExcerpt(note)}</small>
        <span>
          {note.client_id ? clientName || 'Ancien client' : note.client_name_snapshot ? `Ancien client : ${note.client_name_snapshot}` : 'Globale'}
          {' · '}
          {formatNoteDate(note.updated_at)}
        </span>
      </span>
      <ChevronRight size={15} />
    </button>
  );
}

function CreateNoteModal({
  loading,
  onCreate,
  onClose,
}: {
  loading: boolean;
  onCreate: (clientId: string | null) => Promise<void>;
  onClose: () => void;
}) {
  const { clients } = useAppData();
  const selectableClients = visibleFreelanceClients(clients);
  const [clientMode, setClientMode] = useState(false);
  const [clientId, setClientId] = useState('');
  return (
    <Modal title="Nouvelle note" onClose={onClose}>
      {!clientMode ? (
        <div className="note-create-choices">
          <button onClick={() => void onCreate(null)} disabled={loading}>
            <Globe2 size={20} />
            <span><b>Note globale</b><small>Idées, commandes et informations générales.</small></span>
          </button>
          <button onClick={() => setClientMode(true)} disabled={loading || !selectableClients.length}>
            <UserRound size={20} />
            <span><b>Note liée à un client</b><small>Contexte, livraison ou brouillon client.</small></span>
          </button>
        </div>
      ) : (
        <div className="form-grid">
          <label className="field">
            <span>Client</span>
            <AppSelect
              value={clientId}
              onChange={setClientId}
              ariaLabel="Choisir le client de la note"
              placeholder="Choisir un client"
              options={selectableClients.map((client) => ({ value: client.id, label: client.name }))}
            />
          </label>
          <div className="button-row">
            <button className="button subtle" onClick={() => setClientMode(false)}>Retour</button>
            <button className="button primary" disabled={!clientId || loading} onClick={() => void onCreate(clientId)}>
              {loading ? 'Création…' : 'Créer la note'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function NoteEditor({
  note,
  focusTitle,
  flushRef,
  onBack,
  onDeleted,
}: {
  note: Note;
  focusTitle: boolean;
  flushRef: RefObject<(() => Promise<boolean>) | null>;
  onBack: () => void;
  onDeleted: () => void;
}) {
  const data = useAppData();
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState<NoteDocument>(note.content);
  const [plainText, setPlainText] = useState(note.plain_text);
  const [clientId, setClientId] = useState(note.client_id ?? '');
  const [snapshot, setSnapshot] = useState(note.client_name_snapshot);
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [confirming, setConfirming] = useState(false);
  const selectableClients = visibleFreelanceClients(data.clients);
  const linkedClient = data.clients.find((client) => client.id === note.client_id);
  const archivedClientOption = linkedClient?.status === 'archived'
    ? [{ value: linkedClient.id, label: `${linkedClient.name} · Client archivé`, disabled: true }]
    : [];
  const saveNoteRef = useRef(data.updateNote);
  saveNoteRef.current = data.updateNote;
  const queue = useMemo(
    () =>
      new AutosaveQueue<UpdateNoteInput>(
        async (value) => {
          await saveNoteRef.current(note.id, value);
        },
        setStatus,
      ),
    [note.id],
  );

  const schedule = (next: {
    title: string;
    content: NoteDocument;
    plainText: string;
    clientId: string;
    snapshot: string | null;
  }) =>
    queue.schedule({
      title: next.title,
      content: next.content,
      plain_text: next.plainText,
      client_id: next.clientId || null,
      client_name_snapshot: next.snapshot,
    });

  useEffect(() => {
    flushRef.current = () => queue.flush();
    const flush = () => void queue.flush();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      void queue.flush().catch(() => undefined);
      flushRef.current = null;
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [flushRef, queue]);

  useEffect(() => {
    if (focusTitle) requestAnimationFrame(() => titleRef.current?.focus());
  }, [focusTitle]);

  const updateTitle = (value: string) => {
    setTitle(value);
    schedule({ title: value, content, plainText, clientId, snapshot });
  };

  const updateContent = (value: NoteEditorValue) => {
    setContent(value.content);
    setPlainText(value.plainText);
    schedule({ title, content: value.content, plainText: value.plainText, clientId, snapshot });
  };

  const move = async (value: string) => {
    if (!(await queue.flush())) return;
    const nextSnapshot = noteClientSnapshot(value || null, data.clients, snapshot);
    setClientId(value);
    setSnapshot(nextSnapshot);
    setStatus('saving');
    try {
      await data.moveNote(note.id, value || null, nextSnapshot);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  };

  const remove = async () => {
    if (!(await queue.flush())) {
      setConfirming(false);
      return;
    }
    try {
      await data.deleteNote(note.id);
      queue.cancel();
      onDeleted();
    } catch {
      setStatus('error');
      setConfirming(false);
    }
  };

  return (
    <article className="note-editor-view">
      <header className="note-editor-header">
        <button className="mobile-back note-mobile-back" onClick={onBack}>
          <ArrowLeft size={17} /> Notes
        </button>
        <div className="note-title-row">
          <input
            ref={titleRef}
            className="note-title-input"
            value={title}
            maxLength={300}
            onChange={(event) => updateTitle(event.target.value)}
            placeholder="Sans titre"
            aria-label="Titre de la note"
          />
          <SaveIndicator status={status} onRetry={() => void queue.retry()} />
        </div>
        <div className="note-meta-row">
          <div className="note-client-select">
            <AppSelect
              value={clientId}
              onChange={(value) => void move(value)}
              ariaLabel="Rattachement de la note"
              options={[
                { value: '', label: 'Globale' },
                ...archivedClientOption,
                ...selectableClients.map((client) => ({ value: client.id, label: client.name })),
              ]}
            />
          </div>
          <span>Modifiée {formatNoteDate(note.updated_at)}</span>
          {!note.client_id && snapshot ? <span className="former-client">Ancien client : {snapshot}</span> : null}
          <button className="text-link danger-action" onClick={() => setConfirming(true)}>
            <Trash2 size={15} /> Supprimer définitivement
          </button>
        </div>
      </header>
      <RichNoteEditor content={content} onChange={updateContent} />
      {confirming ? (
        <section className="danger-confirm note-delete-confirm">
          <p><b>Supprimer définitivement « {noteDisplayTitle({ title })} » ?</b></p>
          <p>Cette action ne pourra pas être annulée.</p>
          <div className="button-row">
            <button className="button subtle" onClick={() => setConfirming(false)}>Annuler</button>
            <button className="button brick" disabled={data.saving} onClick={() => void remove()}>
              {data.saving ? 'Suppression…' : 'Confirmer la suppression'}
            </button>
          </div>
        </section>
      ) : null}
    </article>
  );
}

function SaveIndicator({
  status,
  onRetry,
}: {
  status: AutosaveStatus;
  onRetry: () => void;
}) {
  if (status === 'error') {
    return <button className="note-save-status error" onClick={onRetry}>Échec de l’enregistrement — Réessayer</button>;
  }
  return (
    <span className={`note-save-status ${status}`} aria-live="polite">
      {status === 'saving' ? 'Enregistrement…' : status === 'saved' ? 'Enregistré' : 'Prêt'}
    </span>
  );
}

function formatNoteDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return new Intl.DateTimeFormat('fr-FR', sameDay
    ? { hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' }
  ).format(date);
}
