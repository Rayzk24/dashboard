// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { useMobileViewport } from './useMobileViewport';

it('adapte la zone visible au clavier et nettoie ses écouteurs au démontage', async () => {
  const viewport = Object.assign(new EventTarget(), {
    width: 390,
    height: 844,
    offsetLeft: 0,
    offsetTop: 0,
    scale: 1,
  });
  const removeListener = vi.spyOn(viewport, 'removeEventListener');
  vi.stubGlobal('visualViewport', viewport);
  vi.stubGlobal('innerWidth', 390);
  vi.stubGlobal('innerHeight', 844);
  let pending: FrameRequestCallback | undefined;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { pending = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  function Example() { useMobileViewport(); return <input aria-label="Champ" />; }
  try {
    await act(async () => root.render(<Example />));
    expect(document.documentElement.style.getPropertyValue('--visible-width')).toBe('390px');
    expect(document.documentElement.style.getPropertyValue('--visible-left')).toBe('0px');
    expect(document.documentElement.style.getPropertyValue('--visible-height')).toBe('844px');
    host.querySelector('input')!.focus();
    viewport.width = 375;
    viewport.height = 400;
    viewport.offsetLeft = 4;
    viewport.offsetTop = 80;
    viewport.dispatchEvent(new Event('resize'));
    pending?.(0);
    expect(document.documentElement.hasAttribute('data-mobile-keyboard')).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--visible-width')).toBe('375px');
    expect(document.documentElement.style.getPropertyValue('--visible-left')).toBe('4px');
    expect(document.documentElement.style.getPropertyValue('--visible-top')).toBe('80px');
    viewport.height = 844;
    viewport.dispatchEvent(new Event('resize'));
    pending?.(0);
    expect(document.documentElement.hasAttribute('data-mobile-keyboard')).toBe(false);
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
  expect(removeListener).toHaveBeenCalledTimes(2);
  expect(document.documentElement.style.getPropertyValue('--visible-width')).toBe('');
  expect(document.documentElement.style.getPropertyValue('--visible-left')).toBe('');
  expect(document.documentElement.style.getPropertyValue('--visible-height')).toBe('');
  vi.restoreAllMocks();
});
