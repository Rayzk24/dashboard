import { useEffect } from 'react';

// Safari keeps the layout viewport tall while the keyboard reduces the visible area.
export function useMobileViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      frame = 0;
      root.style.setProperty('--visible-height', `${viewport.height}px`);
      root.style.setProperty('--visible-top', `${viewport.offsetTop}px`);
      const editing = document.activeElement?.matches('input, textarea, [contenteditable="true"]');
      root.toggleAttribute('data-mobile-keyboard', Boolean(
        editing && window.innerWidth <= 850 && viewport.scale === 1 &&
        window.innerHeight - viewport.height > 150,
      ));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    viewport.addEventListener('resize', schedule);
    viewport.addEventListener('scroll', schedule);
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', schedule);
      viewport.removeEventListener('scroll', schedule);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', schedule);
      root.style.removeProperty('--visible-height');
      root.style.removeProperty('--visible-top');
      root.removeAttribute('data-mobile-keyboard');
    };
  }, []);
}
