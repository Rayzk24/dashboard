// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import { noteIndentationLimit } from './NoteIndentation';
import { normalizeNoteHref, noteEditorExtensions } from './noteEditorConfig';

const editors: Editor[] = [];

function editorWith(content = '<p>Rayzk</p>') {
  const element = document.createElement('div');
  document.body.append(element);
  const editor = new Editor({
    element,
    extensions: noteEditorExtensions(false),
    content,
  });
  editors.push(editor);
  return editor;
}

function cursorIn(editor: Editor, text: string, offset = 1) {
  let position = -1;
  editor.state.doc.descendants((node, nodePosition) => {
    if (position < 0 && node.isText && node.text?.includes(text)) position = nodePosition + offset;
  });
  editor.commands.setTextSelection(position);
}

function pressTab(editor: Editor, shiftKey = false) {
  editor.view.dom.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey,
    bubbles: true,
    cancelable: true,
  }));
}

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('éditeur de notes', () => {
  it('gère gras, italique, titres, listes, checklist, code et lien', () => {
    const editor = editorWith();
    editor.commands.selectAll();
    editor.chain().focus().toggleBold().toggleItalic().run();
    expect(editor.isActive('bold')).toBe(true);
    expect(editor.isActive('italic')).toBe(true);

    editor.commands.setContent('<p>Titre</p>');
    editor.commands.setTextSelection(2);
    editor.chain().focus().setHeading({ level: 1 }).run();
    expect(editor.isActive('heading', { level: 1 })).toBe(true);

    editor.commands.setContent('<p>Liste</p>');
    editor.commands.setTextSelection(2);
    editor.chain().focus().toggleBulletList().run();
    expect(editor.isActive('bulletList')).toBe(true);

    editor.commands.setContent('<p>Liste</p>');
    editor.commands.setTextSelection(2);
    editor.chain().focus().toggleOrderedList().run();
    expect(editor.isActive('orderedList')).toBe(true);

    editor.commands.setContent('<p>Checklist</p>');
    editor.commands.setTextSelection(2);
    editor.chain().focus().toggleTaskList().run();
    expect(editor.isActive('taskList')).toBe(true);

    editor.commands.setContent('<p>code</p>');
    editor.commands.selectAll();
    editor.chain().focus().toggleCode().run();
    expect(editor.isActive('code')).toBe(true);

    editor.commands.setContent('<p>lien</p>');
    editor.commands.selectAll();
    editor.chain().focus().setLink({ href: 'https://rayzk.fr' }).run();
    expect(editor.isActive('link')).toBe(true);

    editor.commands.setContent('<p>bloc</p>');
    editor.commands.setTextSelection(2);
    editor.chain().focus().toggleCodeBlock().run();
    expect(editor.isActive('codeBlock')).toBe(true);
  });

  it('gère annuler et rétablir', () => {
    const editor = editorWith('<p>A</p>');
    editor.commands.setTextSelection(2);
    editor.commands.insertContent('B');
    expect(editor.getText()).toContain('B');
    editor.commands.undo();
    expect(editor.getText()).toBe('A');
    editor.commands.redo();
    expect(editor.getText()).toContain('B');
  });

  it('ouvre une seule fois les liens externes avec les attributs de sécurité', () => {
    const editor = editorWith('<p><a href="https://rayzk.fr">Rayzk</a></p>');
    const link = editor.view.dom.querySelector('a') as HTMLAnchorElement;
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
    const event = new MouseEvent('click', { button: 0, bubbles: true, cancelable: true });
    Object.defineProperty(event, 'target', { value: link });
    const handled = editor.state.plugins.filter((plugin) => plugin.props.handleClick)
      .map((plugin) => plugin.props.handleClick?.call(plugin, editor.view, 2, event))
      .filter(Boolean);
    expect(handled).toHaveLength(1);
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith('https://rayzk.fr/', '_blank');
  });

  it('normalise les liens sans protocole et refuse les protocoles dangereux', () => {
    expect(normalizeNoteHref('rayzk.fr/docs')).toBe('https://rayzk.fr/docs');
    expect(normalizeNoteHref('javascript:alert(1)')).toBeNull();
    expect(normalizeNoteHref('data:text/html,test')).toBeNull();
    expect(normalizeNoteHref('https://')).toBeNull();
    const editor = editorWith('<p>Lien</p>');
    editor.commands.selectAll();
    expect(editor.commands.setLink({ href: 'javascript:alert(1)' })).toBe(false);
    expect(editor.getJSON().content?.[0]?.content?.[0]?.marks).toBeUndefined();
  });

  it('imbrique et remonte les listes et checklists avec Tab et Maj + Tab', () => {
    for (const content of [
      '<ul><li><p>Premier</p></li><li><p>Second</p></li></ul>',
      '<ol><li><p>Premier</p></li><li><p>Second</p></li></ol>',
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Premier</p></li><li data-type="taskItem" data-checked="false"><p>Second</p></li></ul>',
    ]) {
      const editor = editorWith(content);
      cursorIn(editor, 'Second');
      pressTab(editor);
      expect(editor.getJSON().content?.[0]?.content).toHaveLength(1);
      pressTab(editor, true);
      expect(editor.getJSON().content?.[0]?.content).toHaveLength(2);
    }
  });

  it('conserve des structures distinctes pour les puces et les numéros', () => {
    const editor = editorWith('<ul><li><p>Puces</p></li></ul><ol><li><p>Numéros</p></li></ol>');
    expect(editor.view.dom.querySelector('ul:not([data-type="taskList"])')).not.toBeNull();
    expect(editor.view.dom.querySelector('ol')).not.toBeNull();
  });

  it('indente paragraphes et titres dans le JSON avec une limite de six niveaux', () => {
    for (const content of ['<p>Paragraphe</p>', '<h2>Titre</h2>']) {
      const editor = editorWith(content);
      cursorIn(editor, content.includes('Titre') ? 'Titre' : 'Paragraphe');
      for (let index = 0; index < noteIndentationLimit + 2; index += 1) pressTab(editor);
      expect(editor.getJSON().content?.[0]?.attrs?.indent).toBe(noteIndentationLimit);
      expect(editor.view.dom.firstElementChild?.getAttribute('data-indent')).toBe(String(noteIndentationLimit));
      pressTab(editor, true);
      expect(editor.getJSON().content?.[0]?.attrs?.indent).toBe(noteIndentationLimit - 1);
    }
  });

  it('insère et retire deux espaces avec Tab dans un bloc de code', () => {
    const editor = editorWith('<pre><code>const value = 1</code></pre>');
    cursorIn(editor, 'const', 0);
    pressTab(editor);
    expect(editor.getText().startsWith('  const value = 1')).toBe(true);
    pressTab(editor, true);
    expect(editor.getText().startsWith('const value = 1')).toBe(true);
  });

  it('met immédiatement à jour une tâche cochée puis décochée', () => {
    const editor = editorWith('<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>À faire</p></li></ul>');
    const checkbox = editor.view.dom.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.click();
    expect(JSON.stringify(editor.getJSON())).toContain('"checked":true');
    checkbox.click();
    expect(JSON.stringify(editor.getJSON())).toContain('"checked":false');
  });

  it('affiche les aperçus HEX sans modifier le JSON et les actualise', () => {
    const editor = editorWith('<p>#FFF #0A84FF #FFFFFF80 #abcd #GGGGGG #12345</p><pre><code>#07090D</code></pre>');
    expect(editor.view.dom.querySelectorAll('.note-hex-preview')).toHaveLength(5);
    expect(JSON.stringify(editor.getJSON())).not.toContain('note-hex-preview');
    editor.commands.setContent('<p>Plus aucune couleur</p>');
    expect(editor.view.dom.querySelectorAll('.note-hex-preview')).toHaveLength(0);
    editor.commands.setContent('<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>#30D158</p></li></ul>');
    expect(editor.view.dom.querySelectorAll('.note-hex-preview')).toHaveLength(1);
  });
});
