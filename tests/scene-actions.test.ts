import { describe, expect, it } from 'vitest';
import {
  approveStack,
  buyUsage,
  cycleAllowance,
  flowIncome,
  limitClock,
  limitOffer,
  pickLegend,
  pileWorth,
  rewardCall,
  settleStrike,
  strikePrice,
} from '../src/game/logic/actions';
import { createPipe } from '../src/systems/pipeline/pipeline';
import { freshMeta } from '../src/systems/save/save';
import { createRng } from '../src/core/rng';
import { LEGENDS } from '../src/content/legends';
import limit from '../src/data/tuning/limit.json';
import stack from '../src/data/tuning/stack.json';
import events from '../src/data/tuning/events.json';
import strikes from '../src/data/tuning/strikes.json';
import { cfg } from './fixtures/pipe';

describe('player actions', () => {
  it('cycles the allowance, announcing the first payment differently during a strike', () => {
    const s = createPipe(cfg);
    expect(cycleAllowance(s, 2)).toBe('ubi:on');
    expect(cycleAllowance(s, 2)).toBe('ubi:more');
    expect(cycleAllowance(s, 2)).toBe('ubi:off');
    s.strikes = ['job'];
    expect(cycleAllowance(s, 2)).toBe('strike:over');
    expect(s.allowance).toBe(1);
  });

  it('settles only the selected strike once, at the quoted integer price', () => {
    const s = createPipe(cfg);
    const price = strikePrice(1.9);
    expect(price).toBe(Math.floor(1.9 * strikes.priceSeconds));
    expect(strikePrice(0)).toBe(1);
    s.strikes = ['a', 'b'];
    s.money = price - 1;
    expect(settleStrike(s, 'a', price)).toBe('poor');
    expect(s.strikes).toEqual(['a', 'b']);
    s.money = price;
    expect(settleStrike(s, 'a', price)).toBe('paid');
    expect(settleStrike(s, 'a', price)).toBe('absent');
    expect(s.strikes).toEqual(['b']);
    expect(s.money).toBe(0);
  });

  it('counts a standup as two calls while counting a single keypress', () => {
    const s = createPipe(cfg),
      meta = freshMeta();
    const startingMoney = s.money;
    const worth = Math.floor(flowIncome(s, cfg) * events.worthSeconds);
    rewardCall(s, cfg, meta, false);
    expect(s.money - startingMoney).toBe(worth);
    rewardCall(s, cfg, meta, true);
    expect(s.money - startingMoney).toBe(3 * worth);
    expect(s.presses).toBe(2);
    expect(meta.calls).toBe(3);
  });

  it('pays once for a still-active limit and keeps the balance nonnegative', () => {
    const s = createPipe(cfg);
    const { wait, price } = limitOffer(s, cfg);
    expect(wait).toBe(limit.wait);
    expect(price).toBe(Math.floor(flowIncome(s, cfg) * limit.priceSeconds));
    expect(limitClock(wait)).toBe(limit.fakeHours + ':00:00');
    expect(limitClock(0)).toBe('0:00:00');
    s.limited = wait;
    s.money = price - 1;
    expect(buyUsage(s, price)).toBe(false);
    expect(s.limited).toBe(wait);
    s.money = price;
    expect(buyUsage(s, price)).toBe(true);
    expect(buyUsage(s, price)).toBe(false);
    expect([s.money, s.limited]).toEqual([0, 0]);
  });

  it('draws missing legends first and reopens the deck once all are owned', () => {
    const seen = LEGENDS.slice(1).map((x) => x.id);
    const rng = createRng(29);
    expect(pickLegend(LEGENDS, seen, 0, rng)).toBeNull();
    expect(pickLegend(LEGENDS, seen, 1, rng)).toBe(LEGENDS[0]);
    expect(LEGENDS).toContain(
      pickLegend(
        LEGENDS,
        LEGENDS.map((x) => x.id),
        1,
        rng,
      ),
    );
  });

  it('pays a completed pile once, with the multiplier for a legend and a one-time intern incident', () => {
    const s = createPipe(cfg),
      meta = freshMeta(),
      pile = { fill: 0.5, taken: 0, wait: 0 };
    const score = (legend: (typeof LEGENDS)[number] | null, closed = false) =>
      approveStack(s, cfg, meta, pile, legend, closed);
    const intern = LEGENDS.find((l) => l.id === 'intern')!;
    const regular = LEGENDS.find((l) => l.id !== 'intern')!;
    const income = flowIncome(s, cfg);
    const ordinary = Math.floor(income * stack.worthSeconds);
    expect(pileWorth(s, cfg, pile, false)).toBe(ordinary);
    expect(score(null)).toBe(false);
    pile.fill = 1;
    expect(score(null, true)).toBe(false);
    const money = s.money;
    expect(score(null)).toBe(true);
    expect(s.money).toBe(money + ordinary);
    expect(score(null)).toBe(false);
    pile.fill = 1;
    expect(score(regular)).toBe(true);
    expect(meta.intern).toBeUndefined();
    pile.fill = 1;
    expect(score(intern)).toBe(true);
    expect(meta.intern?.elapsed).toBe(0);
    delete meta.intern;
    pile.fill = 1;
    expect(score(intern)).toBe(true);
    expect(meta.legends).toEqual([regular.id, intern.id]);
    expect(meta.intern).toBeUndefined();
    expect(meta.piles).toBe(4);
    expect(s.presses).toBe(4);
    expect(s.money).toBe(money + ordinary * (1 + 3 * stack.legendMult));
  });
});
