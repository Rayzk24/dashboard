import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { hexColorPattern } from '../../lib/notes';

function colorDecorations(doc: ProseMirrorNode) {
  const decorations: Decoration[] = [];
  doc.descendants((node, position) => {
    if (!node.isText || !node.text) return;
    const matches = node.text.matchAll(
      new RegExp(hexColorPattern.source, hexColorPattern.flags),
    );
    for (const match of matches) {
      if (match.index === undefined) continue;
      const color = match[0];
      decorations.push(
        Decoration.widget(position + match.index + color.length, () => {
          const preview = document.createElement('span');
          preview.className = 'note-hex-preview';
          preview.setAttribute('aria-hidden', 'true');
          preview.setAttribute('contenteditable', 'false');
          preview.title = color;
          const swatch = document.createElement('i');
          swatch.style.backgroundColor = color;
          preview.append(swatch);
          return preview;
        }, { side: 1 }),
      );
    }
  });
  return DecorationSet.create(doc, decorations);
}

export const HexColorPreview = Extension.create({
  name: 'hexColorPreview',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('hexColorPreview'),
        state: {
          init: (_, state) => colorDecorations(state.doc),
          apply(transaction, previous) {
            return transaction.docChanged
              ? colorDecorations(transaction.doc)
              : previous.map(transaction.mapping, transaction.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
