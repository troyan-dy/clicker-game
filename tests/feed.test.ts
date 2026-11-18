import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import {
  createFeed,
  headline,
  say,
  stepFeed,
  tell,
  type FeedContent,
} from '../src/systems/feed/feed';

const content: FeedContent = {
  news: [
    { screen: 1, text: 'first' },
    { screen: 2, text: 'second' },
    { screen: 2, text: 'contract', needs: 'contract' },
  ],
  quips: { hire: ['welcome', 'again'], quiet: [] },
};
const tuning = { newsHold: 8, quipHold: 2, quipPerChar: 0.5, quipGap: 3 };

describe('news ticker and remarks', () => {
  it('prioritizes the current screen, gates news by ownership and avoids immediate repeats', () => {
    const feed = createFeed();
    const rng = createRng(3);
    let owns = false;
    const tick = (dt: number, screen: number) => {
      stepFeed(feed, content, tuning, dt, screen, (id) => owns && id === 'contract', rng);
      return feed.news;
    };
    expect(tick(0, 0)).toBe('');
    expect(tick(0, 1)).toBe('first');
    expect(tick(8, 1)).toBe('first');
    expect(tick(0, 2)).toBe('second');
    owns = true;
    expect(tick(7, 2)).toBe('second');
    expect(tick(1, 2)).toBe('contract');
    expect(tick(8, 2)).toBe('first');
    expect(['second', 'contract']).toContain(tick(8, 2));
    headline(feed, tuning, 'breaking');
    expect(tick(7, 2)).toBe('breaking');
    expect(tick(1, 2)).not.toBe('breaking');
  });

  it('cycles remarks by event, observes the silent gap and allows forced interruptions', () => {
    const feed = createFeed();
    const rng = createRng(3);
    const tick = (seconds: number) => stepFeed(feed, content, tuning, seconds, 1, () => false, rng);
    expect(say(feed, content, tuning, 'missing')).toBe(false);
    expect(say(feed, content, tuning, 'quiet')).toBe(false);
    expect(say(feed, content, tuning, 'hire')).toBe(true);
    expect(feed.quip).toBe('welcome');
    expect(say(feed, content, tuning, 'hire')).toBe(false);
    expect(say(feed, content, tuning, 'hire', true)).toBe(true);
    expect(feed.quip).toBe('again');
    tick(4);
    expect(feed.quip).toBe('again');
    tick(0.5);
    expect(feed.quip).toBe('');
    expect(say(feed, content, tuning, 'hire')).toBe(false);
    tick(3);
    expect(say(feed, content, tuning, 'hire')).toBe(true);
    expect(feed.quip).toBe('welcome');
    tell(feed, tuning, 'ok');
    expect(feed).toMatchObject({ quip: 'ok', quipLeft: 3, quiet: 6, said: { hire: 3 } });
  });
});
