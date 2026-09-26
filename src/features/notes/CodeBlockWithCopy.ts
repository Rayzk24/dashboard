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
      const icon = (className: string, paths: string[]) => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.setAttribute('aria-hidden', 'true');
        svg.classList.add(className);
        paths.forEach((d) => {
          const path = document.createElementNS(svg.namespaceURI, 'path');
          path.setAttribute('d', d);
          svg.append(path);
        });
        return svg;
      };
      button.append(
        icon('note-copy-icon', ['M9 9h11v11H9z', 'M5 15H4V4h11v1']),
        icon('note-copy-check', ['m5 12 4 4L19 6']),
      );
      button.setAttribute('aria-label', 'Copier le bloc de code');
      pre.append(code);
      dom.append(button, pre);

      const resetButton = () => {
        button.classList.remove('copied');
        if (resetTimer !== null) window.clearTimeout(resetTimer);
        resetTimer = null;
        button.setAttribute('aria-label', 'Copier le bloc de code');
      };
      const onMouseDown = (event: MouseEvent) => event.preventDefault();
      const onClick = async () => {
        try {
          await navigator.clipboard.writeText(node.textContent);
          button.classList.add('copied');
          button.setAttribute('aria-label', 'Code copié');
          if (resetTimer !== null) window.clearTimeout(resetTimer);
          resetTimer = window.setTimeout(resetButton, 1800);
        } catch {
          resetButton();
        }
      };

      button.addEventListener('mousedown', onMouseDown);
      button.addEventListener('click', onClick);

      return {
        dom,
        contentDOM: code,
        // Copy feedback is UI, not editable document content. Let ProseMirror
        // observe the code normally without rebuilding this view for the button.
        ignoreMutation(mutation) {
          return button.contains(mutation.target);
        },
        stopEvent(event) {
          return event.target instanceof Node && button.contains(event.target);
        },
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
