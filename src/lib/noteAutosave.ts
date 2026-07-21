export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type PendingValue<T> = { revision: number; value: T };

export class AutosaveQueue<T> {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: PendingValue<T> | null = null;
  private failed: PendingValue<T> | null = null;
  private revision = 0;
  private running: Promise<void> | null = null;
  private disposed = false;
  private readonly save: (value: T) => Promise<void>;
  private readonly onStatus: (status: AutosaveStatus) => void;
  private readonly delay: number;

  constructor(
    save: (value: T) => Promise<void>,
    onStatus: (status: AutosaveStatus) => void,
    delay = 700,
  ) {
    this.save = save;
    this.onStatus = onStatus;
    this.delay = delay;
  }

  schedule(value: T) {
    if (this.disposed) return;
    this.revision += 1;
    this.pending = { revision: this.revision, value };
    this.failed = null;
    this.onStatus('saving');
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.drain();
    }, this.delay);
  }

  async flush() {
    if (this.disposed) return false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.drain();
    return this.failed === null;
  }

  async retry() {
    if (this.disposed || !this.failed) return this.failed === null;
    this.pending = this.failed;
    this.failed = null;
    this.onStatus('saving');
    await this.drain();
    return this.failed === null;
  }

  cancel() {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pending = null;
    this.failed = null;
  }

  private async drain() {
    if (this.running) {
      await this.running;
      if (this.pending) await this.drain();
      return;
    }
    const next = this.pending;
    if (!next) return;
    this.pending = null;
    this.running = (async () => {
      try {
        await this.save(next.value);
        if (!this.pending && next.revision === this.revision) this.onStatus('saved');
      } catch {
        if (!this.pending || next.revision > this.pending.revision) this.failed = next;
        this.onStatus('error');
      } finally {
        this.running = null;
      }
    })();
    await this.running;
    if (this.pending) await this.drain();
  }
}
