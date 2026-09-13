// @vitest-environment jsdom
import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

let root: Root;
let host: HTMLDivElement;
let opener: HTMLButtonElement;
beforeEach(() => {
  host = document.createElement('div');
  opener = document.createElement('button');
  document.body.append(opener, host);
  opener.focus();
  root = createRoot(host);
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  opener.remove();
  vi.restoreAllMocks();
});

describe('Modal mobile et clavier', () => {
  it('initialise le focus une seule fois, puis restaure le scroll et le déclencheur', async () => {
    const input = createRef<HTMLInputElement>();
    const render = () => root.render(<Modal title="Test" onClose={() => {}} initialFocusRef={input}>
      <input ref={input} /><button>Dernier</button>
    </Modal>);
    await act(async () => render());
    expect(document.activeElement).toBe(input.current);
    expect(document.body.style.overflow).toBe('hidden');
    input.current!.value = 'plusieurs caractères';
    await act(async () => render());
    expect(document.activeElement).toBe(input.current);
    expect(input.current!.value).toBe('plusieurs caractères');
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    await act(async () => root.render(null));
    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.hasAttribute('data-modal-open')).toBe(false);
  });

  it('garde Tab et Maj+Tab dans la fenêtre', async () => {
    await act(async () => root.render(<Modal title="Test" onClose={() => {}}><button id="last">Dernier</button></Modal>));
    const first = document.querySelector<HTMLButtonElement>('[aria-label="Fermer"]')!;
    const last = document.getElementById('last')!;
    last.focus();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));
    expect(document.activeElement).toBe(first);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true }));
    expect(document.activeElement).toBe(last);
  });

  it('ne ferme que la fenêtre supérieure avec Échap et conserve le verrou du parent', async () => {
    const closeParent = vi.fn();
    const closeChild = vi.fn();
    const parent = <Modal title="Parent" onClose={closeParent}>Parent</Modal>;
    await act(async () => root.render(<>{parent}<Modal title="Enfant" onClose={closeChild}>Enfant</Modal></>));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closeChild).toHaveBeenCalledOnce();
    expect(closeParent).not.toHaveBeenCalled();
    await act(async () => root.render(parent));
    expect(document.body.style.overflow).toBe('hidden');
    const consumed = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    consumed.preventDefault();
    window.dispatchEvent(consumed);
    expect(closeParent).not.toHaveBeenCalled();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closeParent).toHaveBeenCalledOnce();
  });
});
