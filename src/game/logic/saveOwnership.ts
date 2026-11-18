/** A foreground tab may write. A background tab first checks whether another tab replaced its save. */
export const SAVE_KEY = 'da-klod-save';

export class SaveOwnership {
  private lastSaved: string | null = null;
  private lost = false;

  private readonly storage: () => Pick<Storage, 'getItem' | 'setItem'>;

  constructor(storage: () => Pick<Storage, 'getItem' | 'setItem'>) {
    this.storage = storage;
  }

  get superseded(): boolean {
    return this.lost;
  }

  read(enabled: boolean): string | null {
    if (!enabled) return null;
    try {
      this.lastSaved = this.storage().getItem(SAVE_KEY);
      return this.lastSaved;
    } catch {
      return null;
    }
  }

  storageChanged(key: string | null, enabled: boolean, background: boolean): void {
    if (enabled && background && (key === SAVE_KEY || key === null)) this.lost = true;
  }

  /** Sleeping tabs may not yet have received a storage event. */
  checkForTakeover(): boolean {
    try {
      if (this.storage().getItem(SAVE_KEY) !== this.lastSaved) this.lost = true;
    } catch {
      // Disabled storage still permits background earnings in memory.
    }
    return this.lost;
  }

  write(enabled: boolean, frozen: boolean, background: boolean, serialize: () => string): void {
    if (!enabled || frozen || this.lost) return;
    try {
      if (background && this.checkForTakeover()) return;
      const json = serialize();
      this.storage().setItem(SAVE_KEY, json);
      this.lastSaved = json;
    } catch {
      // Serialization or storage can fail. Compare again against the last successful write.
    }
  }

  onFocus(paused: boolean): 'reload' | 'save' | 'none' {
    if (this.lost) return 'reload';
    return paused ? 'none' : 'save';
  }
}
