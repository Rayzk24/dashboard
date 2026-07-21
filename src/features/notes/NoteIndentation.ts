import { Extension, type Editor } from '@tiptap/core';
import type { EditorState, Transaction } from '@tiptap/pm/state';

const MAX_INDENT = 6;
const INDENT_SIZE = 24;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    noteIndentation: {
      increaseNoteIndent: () => ReturnType;
      decreaseNoteIndent: () => ReturnType;
      increaseListItemIndent: () => ReturnType;
      decreaseListItemIndent: () => ReturnType;
    };
  }
}

function activeTextNode(editor: Editor) {
  if (editor.isActive('heading')) return 'heading';
  if (editor.isActive('paragraph')) return 'paragraph';
  return null;
}

function textIndentChange(editor: Editor, delta: number) {
  const nodeName = activeTextNode(editor);
  if (!nodeName) return null;
  const current = Number(editor.getAttributes(nodeName).indent ?? 0);
  const next = Math.min(MAX_INDENT, Math.max(0, current + delta));
  return { current, next, nodeName };
}

function activeListItemNode(editor: Editor) {
  if (editor.isActive('taskItem')) return 'taskItem';
  if (editor.isActive('listItem')) return 'listItem';
  return null;
}

function listItemIndentChange(editor: Editor, delta: number) {
  const nodeName = activeListItemNode(editor);
  if (!nodeName) return null;
  const current = Number(editor.getAttributes(nodeName).indentLevel ?? 0);
  const next = Math.min(MAX_INDENT, Math.max(0, current + delta));
  return { current, next, nodeName };
}

function selectedCodeLineStarts(state: EditorState) {
  const { $from, $to } = state.selection;
  if ($from.parent.type.name !== 'codeBlock' || $to.parent !== $from.parent) return null;
  const text = $from.parent.textContent;
  const blockStart = $from.start();
  const firstOffset = text.lastIndexOf('\n', Math.max(0, $from.parentOffset - 1)) + 1;
  const lastOffset = $to.parentOffset;
  const starts = [firstOffset];
  let cursor = text.indexOf('\n', firstOffset);
  while (cursor >= 0 && cursor < lastOffset) {
    starts.push(cursor + 1);
    cursor = text.indexOf('\n', cursor + 1);
  }
  return { blockStart, starts, text };
}

function dispatchCodeTransaction(editor: Editor, transform: (transaction: Transaction) => boolean) {
  const transaction = editor.state.tr;
  if (!transform(transaction)) return true;
  editor.view.dispatch(transaction.scrollIntoView());
  return true;
}

function indentCode(editor: Editor) {
  const { from, to } = editor.state.selection;
  if (from === to) {
    return dispatchCodeTransaction(editor, (transaction) => {
      transaction.insertText('  ', from, to);
      return true;
    });
  }
  const lines = selectedCodeLineStarts(editor.state);
  if (!lines) return false;
  return dispatchCodeTransaction(editor, (transaction) => {
    [...lines.starts].reverse().forEach((offset) => {
      transaction.insertText('  ', lines.blockStart + offset);
    });
    return true;
  });
}

function outdentCode(editor: Editor) {
  const lines = selectedCodeLineStarts(editor.state);
  if (!lines) return false;
  return dispatchCodeTransaction(editor, (transaction) => {
    let changed = false;
    [...lines.starts].reverse().forEach((offset) => {
      const spaces = lines.text.slice(offset).match(/^ {1,2}/)?.[0].length ?? 0;
      if (!spaces) return;
      transaction.delete(lines.blockStart + offset, lines.blockStart + offset + spaces);
      changed = true;
    });
    return changed;
  });
}

export const NoteIndentation = Extension.create({
  name: 'noteIndentation',
  priority: 1_000,

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const value = Number(element.getAttribute('data-indent') ?? 0);
              return Math.min(MAX_INDENT, Math.max(0, Number.isFinite(value) ? value : 0));
            },
            renderHTML: (attributes) => {
              const indent = Math.min(MAX_INDENT, Math.max(0, Number(attributes.indent ?? 0)));
              return indent
                ? { 'data-indent': String(indent), style: `margin-left: ${indent * INDENT_SIZE}px` }
                : {};
            },
          },
        },
      },
      {
        types: ['listItem', 'taskItem'],
        attributes: {
          indentLevel: {
            default: 0,
            parseHTML: (element) => {
              const value = Number(element.getAttribute('data-indent-level') ?? 0);
              return Math.min(MAX_INDENT, Math.max(0, Number.isFinite(value) ? value : 0));
            },
            renderHTML: (attributes) => {
              const indentLevel = Math.min(
                MAX_INDENT,
                Math.max(0, Number(attributes.indentLevel ?? 0)),
              );
              return indentLevel ? { 'data-indent-level': String(indentLevel) } : {};
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      increaseNoteIndent: () => ({ editor, commands }) => {
        const change = textIndentChange(editor, 1);
        if (!change) return false;
        return change.next === change.current
          ? true
          : commands.updateAttributes(change.nodeName, { indent: change.next });
      },
      decreaseNoteIndent: () => ({ editor, commands }) => {
        const change = textIndentChange(editor, -1);
        if (!change) return false;
        return change.next === change.current
          ? true
          : commands.updateAttributes(change.nodeName, { indent: change.next });
      },
      increaseListItemIndent: () => ({ editor, commands }) => {
        const change = listItemIndentChange(editor, 1);
        if (!change) return false;
        return change.next === change.current
          ? true
          : commands.updateAttributes(change.nodeName, { indentLevel: change.next });
      },
      decreaseListItemIndent: () => ({ editor, commands }) => {
        const change = listItemIndentChange(editor, -1);
        if (!change) return false;
        return change.next === change.current
          ? true
          : commands.updateAttributes(change.nodeName, { indentLevel: change.next });
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.isActive('codeBlock')) return indentCode(this.editor);
        if (activeListItemNode(this.editor)) return this.editor.commands.increaseListItemIndent();
        return this.editor.commands.increaseNoteIndent();
      },
      'Shift-Tab': () => {
        if (this.editor.isActive('codeBlock')) return outdentCode(this.editor);
        if (activeListItemNode(this.editor)) return this.editor.commands.decreaseListItemIndent();
        return this.editor.commands.decreaseNoteIndent();
      },
    };
  },
});

export const noteIndentationLimit = MAX_INDENT;
