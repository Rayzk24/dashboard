import Placeholder from '@tiptap/extension-placeholder';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import StarterKit from '@tiptap/starter-kit';
import { HexColorPreview } from './HexColorExtension';
import { NoteIndentation } from './NoteIndentation';

const explicitProtocol = /^[a-z][a-z\d+.-]*:/i;
const safeProtocol = /^https?:/i;

export function normalizeNoteHref(value: string) {
  const href = value.trim();
  if (!href) return null;
  const normalized = href.startsWith('//')
    ? `https:${href}`
    : explicitProtocol.test(href)
      ? href
      : `https://${href}`;
  if (!safeProtocol.test(normalized)) return null;
  try {
    const url = new URL(normalized);
    return url.hostname ? normalized : null;
  } catch {
    return null;
  }
}

export const noteLinkOptions = {
  openOnClick: true,
  enableClickSelection: false,
  autolink: true,
  defaultProtocol: 'https',
  protocols: ['http', 'https'],
  HTMLAttributes: {
    target: '_blank',
    rel: 'noopener noreferrer',
  },
  isAllowedUri: (url: string, context: { defaultValidate: (href: string) => boolean }) => {
    const href = url.trim();
    if (!href) return false;
    return normalizeNoteHref(href) !== null && context.defaultValidate(href);
  },
};

export function noteEditorExtensions(withPlaceholder = true) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2] },
      link: noteLinkOptions,
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    ...(withPlaceholder
      ? [Placeholder.configure({ placeholder: 'Écrivez une idée, une commande, du code…' })]
      : []),
    NoteIndentation,
    HexColorPreview,
  ];
}
