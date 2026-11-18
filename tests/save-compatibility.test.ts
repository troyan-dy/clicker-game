import { describe, expect, it } from 'vitest';
import { NEWS_KEPT, restorePipe, unpackSave } from '../src/systems/save/save';
import { cfg } from './fixtures/pipe';

describe('save compatibility', () => {
  it('restores only eligible unfinished jobs and preserves the remaining time once per employer', () => {
    const s = restorePipe(cfg, {
      owned: { shipping: 3 },
      jobs: [
        { id: 'unknown' },
        { id: 'job' },
        { id: 'shipping' },
        { id: 'exchange', left: 2 },
        { id: 'exchange', left: 0 },
        { id: 'satnet', total: 9, left: 10 },
      ],
    });
    expect(s.jobs).toEqual([
      { id: 'exchange', total: 5, left: 2 },
      { id: 'satnet', total: 9, left: 9 },
    ]);
    expect(s.bribed.shipping).toBe(true);
  });

  it('upgrades the legacy allowance switch, clears its strikes and keeps only known unpaid strikes', () => {
    const strikes = ['exchange', 'ghost', 'exchange'];
    expect(restorePipe(cfg, { allowance: true, strikes })).toMatchObject({
      allowance: 1,
      strikes: [],
    });
    expect(restorePipe(cfg, { allowance: false, strikes })).toMatchObject({
      allowance: 0,
      strikes: ['exchange'],
    });
  });

  it('restores surge multipliers only on eligible equipment and discards mismatched robot assignments', () => {
    const s = restorePipe(cfg, {
      surge: { android: 1.3, dogs: 1.4, gpu: 1.45, rack: 2 },
      aim: { robodog: 'depot', android: 'depot' },
    });
    expect(s.surge).toEqual({ android: 1.3, gpu: 1.45 });
    expect(s.aim).toEqual({ robodog: 'depot' });
  });

  it('recovers a missing news feed and trims the history in newest-first order', () => {
    const history = Array.from({ length: NEWS_KEPT + 2 }, (_, i) => 'news ' + i);
    const file = unpackSave(JSON.stringify({ v: 1, meta: { news: [null, ...history] } }), cfg)!;
    expect(file.feed).toEqual({ shown: [], said: {} });
    expect(file.meta.news).toEqual(history.slice(0, NEWS_KEPT));
  });
});
