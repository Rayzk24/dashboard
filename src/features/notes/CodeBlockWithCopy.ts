import CodeBlock from '@tiptap/extension-code-block';

export const CodeBlockWithCopy = CodeBlock.extend({
  addNodeView() {
    return ({ node: initialNode }) => {
      let node = initialNode;
      let resetTimer: number | null = null;
      const dom = document.createElement('div');
      const button = document.createElement('button');
      const pre = document.createElement('pre');
      const code = document.createElement('code');

      dom.className = 'note-code-block';
      button.type = 'button';
      button.className = 'note-code-copy';
      button.contentEditable = 'false';
      button.textContent = 'Copier';
      button.setAttribute('aria-label', 'Copier le bloc de code');
      button.title = 'Copier';
      pre.append(code);
      dom.append(button, pre);

      const resetButton = () => {
        button.classList.remove('copied');
        button.textContent = 'Copier';
        button.setAttribute('aria-label', 'Copier le bloc de code');
        button.title = 'Copier';
      };
      const onMouseDown = (event: MouseEvent) => event.preventDefault();
      const onClick = async () => {
        try {
          await navigator.clipboard.writeText(node.textContent);
          button.classList.add('copied');
          button.textContent = 'Copié';
          button.setAttribute('aria-label', 'Code copié');
          button.title = 'Copié';
          if (resetTimer !== null) window.clearTimeout(resetTimer);
          resetTimer = window.setTimeout(resetButton, 1500);
        } catch {
          resetButton();
        }
      };

      button.addEventListener('mousedown', onMouseDown);
      button.addEventListener('click', onClick);

      return {
        dom,
        contentDOM: code,
        update(updatedNode) {
          if (updatedNode.type !== node.type) return false;
          node = updatedNode;
          return true;
        },
        destroy() {
          if (resetTimer !== null) window.clearTimeout(resetTimer);
          button.removeEventListener('mousedown', onMouseDown);
          button.removeEventListener('click', onClick);
        },
      };
    };
  },
});
