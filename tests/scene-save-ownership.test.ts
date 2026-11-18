import { describe, expect, it, vi } from 'vitest';
import { SAVE_KEY, SaveOwnership } from '../src/game/logic/saveOwnership';

function sharedStorage(initial: string | null) {
  const items = new Map<string, string>();
  if (initial !== null) items.set(SAVE_KEY, initial);
  return {
    getItem(key: string) {
      return items.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      items.set(key, value);
    },
  };
}

describe('save ownership between tabs', () => {
  it('a hidden tab detects delayed takeover before it serializes or overwrites a newer save', () => {
    const disk = sharedStorage('old');
    const oldTab = new SaveOwnership(() => disk);
    const foreground = new SaveOwnership(() => disk);
    expect(oldTab.read(true)).toBe('old');
    expect(foreground.read(true)).toBe('old');
    oldTab.write(true, false, true, () => 'own autosave');
    expect(oldTab.checkForTakeover()).toBe(false);
    foreground.write(true, false, false, () => 'new progress');
    const serialize = vi.fn(() => 'obsolete');
    oldTab.write(true, false, true, serialize);
    expect(serialize).not.toHaveBeenCalled();
    expect(disk.getItem(SAVE_KEY)).toBe('new progress');
    expect(oldTab.superseded).toBe(true);
    expect(oldTab.onFocus(false)).toBe('reload');
    expect(oldTab.onFocus(true)).toBe('reload');
    oldTab.write(true, false, false, serialize);
    expect(serialize).not.toHaveBeenCalled();
  });

  it('claims an empty slot and compares subsequent background writes to its own last save', () => {
    const disk = sharedStorage(null);
    const tab = new SaveOwnership(() => disk);
    expect(tab.read(true)).toBeNull();
    tab.write(true, false, true, () => 'first');
    tab.write(true, false, true, () => 'second');
    expect(disk.getItem(SAVE_KEY)).toBe('second');
    expect(tab.superseded).toBe(false);
    expect(tab.onFocus(false)).toBe('save');
    expect(tab.onFocus(true)).toBe('none');
  });

  it.each([SAVE_KEY, null])('relinquishes a hidden save on external changes to %s', (key) => {
    const tab = new SaveOwnership(() => sharedStorage(null));
    tab.storageChanged('language', true, true);
    tab.storageChanged(key, false, true);
    tab.storageChanged(key, true, false);
    expect(tab.superseded).toBe(false);
    tab.storageChanged(key, true, true);
    expect(tab.superseded).toBe(true);
    expect(tab.checkForTakeover()).toBe(true);
  });

  it('avoids all storage and serialization in unsaved games and skips writes before a reload', () => {
    const access = vi.fn(() => sharedStorage(null));
    const tab = new SaveOwnership(access);
    const serialize = vi.fn(() => 'data');
    expect(tab.read(false)).toBeNull();
    tab.write(false, false, false, serialize);
    tab.write(true, true, false, serialize);
    expect(access).not.toHaveBeenCalled();
    expect(serialize).not.toHaveBeenCalled();
  });

  it('keeps running and retains ownership when even accessing localStorage is forbidden', () => {
    const tab = new SaveOwnership(() => {
      throw new Error('disabled storage');
    });
    expect(tab.read(true)).toBeNull();
    expect(tab.checkForTakeover()).toBe(false);
    expect(() => tab.write(true, false, true, () => 'memory only')).not.toThrow();
    expect(tab.onFocus(false)).toBe('save');
  });

  it('remembers the last successful write across serialization and quota failures', () => {
    const disk = sharedStorage('before');
    const tab = new SaveOwnership(() => disk);
    tab.read(true);
    tab.write(true, false, true, () => {
      throw new Error('serialization failed');
    });
    vi.spyOn(disk, 'setItem').mockImplementationOnce(() => {
      throw new Error('quota');
    });
    tab.write(true, false, true, () => 'failed');
    expect(disk.getItem(SAVE_KEY)).toBe('before');
    expect(tab.checkForTakeover()).toBe(false);
    tab.write(true, false, true, () => 'recovered');
    expect(disk.getItem(SAVE_KEY)).toBe('recovered');
    expect(tab.checkForTakeover()).toBe(false);
  });
});
