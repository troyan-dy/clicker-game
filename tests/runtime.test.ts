import { afterEach, expect, it, vi } from 'vitest';
import { gameOptions, readArgs } from '../src/core/args';
import { installMetrics, logEvent, metrics } from '../src/core/metrics';
import { createRng } from '../src/core/rng';
import { loadSettings, saveSettings } from '../src/core/settings';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('uses the clock for missing or malformed seeds and ignores tooling flags in a release', () => {
  vi.spyOn(Date, 'now').mockReturnValue(2 ** 32 + 42);
  const defaults = { seed: 42, gym: '', state: '', debug: false, capture: false, save: false, menu: false };
  expect(readArgs('')).toEqual(defaults);
  expect(readArgs('?seed=abc')).toEqual(defaults);
  const all = '?seed=0&gym=agree&state=city&debug=1&capture=1&save=1&menu=1';
  expect(readArgs(all, false)).toEqual(defaults);
  expect(readArgs(all)).toEqual({ seed: 0, gym: 'agree', state: 'city', debug: true, capture: true, save: true, menu: true });
});

it('isolates capture, regular play and gym saves and maps named starts', () => {
  const args = readArgs('?gym=agree&state=world&debug=1');
  expect(gameOptions(args, true)).toEqual({ overlay: true, gym: true, start: 8, demo: 'world', save: false, menu: false });
  expect(gameOptions(args, false)).toMatchObject({ start: 0, demo: '', save: true, menu: true });
  expect(gameOptions({ ...args, state: 'unknown', save: true, menu: true }, true)).toMatchObject({ start: 0, save: true, menu: true });
  for (const gym of [true, false]) {
    expect(gameOptions({ ...args, capture: true, save: true }, gym)).toMatchObject({ save: false, menu: false });
  }
});

it('records at most the first 200 metrics in the object exposed to capture', () => {
  vi.stubGlobal('window', {});
  metrics.events.length = 0;
  installMetrics();
  for (let i = 0; i <= 200; i++) logEvent(String(i));
  expect(window.__GAME__.ready).toBe(false);
  expect(window.__metrics.events).toEqual(Array.from({ length: 200 }, (_, i) => String(i)));
  metrics.events.length = 0;
});

it('picks the same items and range values from a seeded stream', () => {
  const rng = createRng(42);
  expect(rng.pick(['a', 'b', 'c'])).toBe('b');
  expect(rng.range(-1, 1)).toBeCloseTo(-0.103418882);
});

it('reads and persists only supported settings even when storage fails', () => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) });
  expect(loadSettings()).toEqual({ sound: true, music: true });
  for (const lang of ['ru', 'en'] as const) {
    const settings = { sound: false, music: false, lang };
    saveSettings(settings);
    expect(loadSettings()).toEqual(settings);
  }
  store.set('da-klod-settings', '{"music":1,"lang":"fr"}');
  expect(loadSettings()).toEqual({ sound: true, music: true });
  store.set('da-klod-settings', '{');
  expect(loadSettings()).toEqual({ sound: true, music: true });
  vi.stubGlobal('localStorage', undefined);
  expect(() => saveSettings({ sound: false, music: true })).not.toThrow();
});
