import { afterEach, describe, expect, it, vi } from 'vitest';
import { AutosaveQueue } from './noteAutosave';

afterEach(() => {
  vi.useRealTimers();
});

describe('AutosaveQueue', () => {
  it('applique un debounce et expose Enregistrement puis Enregistré', async () => {
    vi.useFakeTimers();
    const save = vi.fn(async () => undefined);
    const statuses: string[] = [];
    const queue = new AutosaveQueue(save, (status) => statuses.push(status), 700);
    queue.schedule('premier');
    queue.schedule('dernier');
    await vi.advanceTimersByTimeAsync(699);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith('dernier');
    expect(statuses).toEqual(['saving', 'saving', 'saved']);
  });

  it('conserve une sauvegarde échouée et permet de réessayer', async () => {
    let failures = 1;
    const save = vi.fn(async () => {
      if (failures-- > 0) throw new Error('network');
    });
    const statuses: string[] = [];
    const queue = new AutosaveQueue(save, (status) => statuses.push(status), 0);
    queue.schedule('contenu');
    await queue.flush();
    expect(statuses.at(-1)).toBe('error');
    await queue.retry();
    expect(save).toHaveBeenCalledTimes(2);
    expect(statuses.at(-1)).toBe('saved');
  });

  it('sérialise les requêtes pour qu’une ancienne version ne remplace pas la suivante', async () => {
    let resolveFirst: (() => void) | undefined;
    const first = new Promise<void>((resolve) => { resolveFirst = resolve; });
    const saved: string[] = [];
    const save = vi.fn(async (value: string) => {
      saved.push(value);
      if (value === 'v1') await first;
    });
    const queue = new AutosaveQueue(save, () => undefined, 0);
    queue.schedule('v1');
    const flushing = queue.flush();
    await Promise.resolve();
    queue.schedule('v2');
    resolveFirst?.();
    await flushing;
    await queue.flush();
    expect(saved).toEqual(['v1', 'v2']);
  });

  it('force la dernière version avant un changement de note', async () => {
    const save = vi.fn(async () => undefined);
    const queue = new AutosaveQueue(save, () => undefined, 10_000);
    queue.schedule('brouillon final');
    await queue.flush();
    expect(save).toHaveBeenCalledWith('brouillon final');
  });
});
