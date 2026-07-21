import {
  Bold,
  Braces,
  CheckSquare2,
  Code2,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  RemoveFormatting,
  Text,
  Undo2,
} from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useReducer } from 'react';
import type { JSONContent } from '@tiptap/core';
import type { NoteDocument } from '../../types/domain';
import { normalizeNoteHref, noteEditorExtensions } from './noteEditorConfig';

export type NoteEditorValue = {
  content: NoteDocument;
  plainText: string;
};

export function RichNoteEditor({
  content,
  onChange,
}: {
  content: NoteDocument;
  onChange: (value: NoteEditorValue) => void;
}) {
  const editor = useEditor({
    extensions: noteEditorExtensions(),
    content: content as JSONContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'note-prosemirror',
        spellcheck: 'true',
        'aria-label': 'Contenu de la note',
      },
    },
    onUpdate: ({ editor: current }) =>
      onChange({
        content: current.getJSON() as NoteDocument,
        plainText: current.getText({ blockSeparator: '\n' }),
      }),
  });
  const [, refreshToolbar] = useReducer((value) => value + 1, 0);

  useEffect(() => {
    if (!editor) return;
    const refresh = () => refreshToolbar();
    editor.on('selectionUpdate', refresh);
    editor.on('transaction', refresh);
    return () => {
      editor.off('selectionUpdate', refresh);
      editor.off('transaction', refresh);
    };
  }, [editor]);

  if (!editor) return <div className="note-editor-loading">Préparation de l’éditeur…</div>;

  const setLink = () => {
    const current = editor.getAttributes('link').href as string | undefined;
    const href = window.prompt('Adresse du lien', current ?? 'https://');
    if (href === null) return;
    if (!href.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    const normalized = normalizeNoteHref(href);
    if (!normalized) {
      window.alert('Ce protocole de lien n’est pas autorisé.');
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run();
  };

  return (
    <div
      className="note-rich-editor"
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          setLink();
        }
      }}
    >
      <div className="note-toolbar" role="toolbar" aria-label="Mise en forme de la note">
        <Tool label="Paragraphe" active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()}><Text size={17} /></Tool>
        <Tool label="Titre" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={17} /></Tool>
        <Tool label="Sous-titre" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={17} /></Tool>
        <span className="note-toolbar-separator" />
        <Tool label="Gras" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={17} /></Tool>
        <Tool label="Italique" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={17} /></Tool>
        <Tool label="Liste à puces" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={17} /></Tool>
        <Tool label="Liste numérotée" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={17} /></Tool>
        <Tool label="Checklist" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}><CheckSquare2 size={17} /></Tool>
        <Tool label="Code en ligne" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}><Code2 size={17} /></Tool>
        <Tool label="Bloc de code" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Braces size={17} /></Tool>
        <Tool label="Lien" active={editor.isActive('link')} onClick={setLink}><Link2 size={17} /></Tool>
        <Tool label="Effacer le formatage" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><RemoveFormatting size={17} /></Tool>
        <span className="note-toolbar-separator" />
        <Tool label="Annuler" disabled={!editor.can().chain().focus().undo().run()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={17} /></Tool>
        <Tool label="Rétablir" disabled={!editor.can().chain().focus().redo().run()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={17} /></Tool>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function Tool({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={active ? 'active' : ''}
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
