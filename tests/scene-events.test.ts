import { assert, describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import { PICKET } from '../src/content/picket';
import {
  advanceCalls,
  advancePlacard,
  callOwners,
  endingAction,
  limitDue,
  streetRiot,
  streetStrike,
} from '../src/game/logic/events';
import { createEvents } from '../src/systems/events/events';
import { createPipe } from '../src/systems/pipeline/pipeline';
import { createRiots } from '../src/systems/riots/riots';
import { createStrikes } from '../src/systems/strikes/strikes';
import { cfg } from './fixtures/pipe';

const clock = { every: [10, 10] as const, life: 5, max: 3, worthSeconds: 2 };
const ordinary = {
  stage: 2,
  jobs: 1,
  owners: ['job'],
  intern: false,
  won: false,
  departing: false,
  cardOpen: false,
  selfPlay: false,
};

describe('calls from the current screen', () => {
  it('requires a contract on sale with both workers and a place on the map', () => {
    const s = createPipe(cfg);
    const [one, two, three, four] = cfg.sources;
    s.owned = { [one.id]: 1, [two.id]: 2, [three.id]: 1 };
    expect(
      callOwners(
        2,
        s,
        cfg,
        (x) => x !== three,
        (id) => id !== two.id,
      ),
    ).toEqual([one.id]);
    expect(s.owned[four.id]).toBeUndefined();
  });

  it('uses sleepers and the open gate at the towers, and sleepers alone on the planet', () => {
    const s = createPipe(cfg);
    const owners = (stage: number) =>
      callOwners(
        stage,
        s,
        cfg,
        () => true,
        () => true,
      );
    s.asleep = 2 * cfg.grid.unit - 1;
    expect(owners(cfg.grid.screen)).toEqual([]);
    s.gate = true;
    expect(owners(cfg.grid.screen)).toEqual(['gate']);
    s.asleep++;
    expect(owners(cfg.grid.screen)).toEqual(['wake:0', 'wake:1', 'gate']);
    s.asleep = 0;
    expect(owners(cfg.world.screen)).toEqual(['wake:0', 'wake:1']);
  });

  it('unlocks the double meeting through jobs, distinct employers or a later screen', () => {
    for (const change of [{ jobs: 2 }, { owners: ['job', 'freelance'] }, { stage: 3 }]) {
      const calls = createEvents(clock);
      advanceCalls(calls, {}, clock, 10, { ...ordinary, ...change }, createRng(1));
      expect(calls.list).toEqual([{ at: 'job', left: 5, kind: 0, standup: true }]);
      expect(calls.wait).toBe(20);
    }
  });

  it('blocks an early meeting, modal interruptions, and repeat invitations', () => {
    for (const options of [
      ordinary,
      ...(['intern', 'won', 'departing', 'cardOpen'] as const).map((key) => ({
        ...ordinary,
        jobs: 2,
        [key]: true,
      })),
    ]) {
      const calls = createEvents(clock);
      advanceCalls(calls, {}, clock, 10, options, createRng(1));
      expect(calls.list.some((e) => e.standup)).toBe(false);
    }
    const calls = createEvents(clock);
    advanceCalls(calls, { standup: 1 }, clock, 10, { ...ordinary, stage: 99 }, createRng(1));
    expect(calls.list).toEqual([]); // unknown stage has no ordinary calls
  });

  it('remembers a missed standup on its expiry tick; auto-answer waits for two full seconds', () => {
    const calls = createEvents(clock);
    const said: Record<string, number> = {};
    const meeting = { ...ordinary, selfPlay: true, jobs: 2 };
    const tick = (dt: number) => advanceCalls(calls, said, clock, dt, meeting, createRng(1));
    expect(tick(10)).toEqual({ missed: false, answer: false });
    expect(tick(2)).toEqual({ missed: false, answer: false });
    expect(tick(1)).toEqual({ missed: false, answer: true });
    expect(tick(2)).toEqual({ missed: true, answer: false });
    expect(said.standup).toBe(1);
    expect(tick(20).missed).toBe(false);
    expect(calls.list.some((e) => e.standup)).toBe(false);
  });
});

describe('street incidents', () => {
  it('times placards independently of their display life and requires an unpaid employer on a street', () => {
    const rng = createRng(42);
    const start = advancePlacard(null, 1, 1, true, 0, ['job'], rng);
    assert.isNotNull(start.placard);
    expect(start.placard.at).toBe('job');
    expect(PICKET).toContain(start.placard.text);
    const visible = advancePlacard(start.placard, 20, 1, true, 0, [], rng);
    assert.isNotNull(visible.placard);
    expect(visible.placard.left).toBeGreaterThan(0);
    const expired = advancePlacard(visible.placard, 19, visible.placard.left, true, 0, [], rng);
    expect(expired.placard).toBeNull();
    for (const blocked of [
      advancePlacard(null, 0, 1, false, 0, ['job'], rng),
      advancePlacard(null, 0, 1, true, 1, ['job'], rng),
      advancePlacard(null, 0, 1, true, 0, [], rng),
    ]) {
      expect(blocked.placard).toBeNull();
      expect(blocked.countdown).toBeGreaterThan(0);
    }
  });

  it('freezes marches after a win or full takeover, and resumes an eligible factory riot otherwise', () => {
    const s = createPipe(cfg);
    const tuning = { every: [4, 4] as const, warn: 2, from: 0, share: 0.5 };
    const riots = createRiots(tuning);
    const tick = (dt: number, won: boolean, taken: boolean) =>
      streetRiot(riots, tuning, dt, won, taken, s, cfg, createRng(1));
    expect(tick(4, true, false)).toBeNull();
    expect(tick(4, false, true)).toBeNull();
    expect(riots.wait).toBe(4);
    expect(tick(4, false, false)).toBe('start');
    expect(tick(2, false, false)).toBe('hit');
  });

  it('blocks a new door only on a street, excluding already struck employers', () => {
    const s = createPipe(cfg);
    const tuning = { every: [1, 1] as const, from: 0, max: 3, priceSeconds: 2 };
    const strike = createStrikes(tuning);
    const hit = (onStreet: boolean) =>
      streetStrike(strike, tuning, 2, onStreet, ['a', 'b'], s, cfg, createRng(2));
    s.strikes = ['a'];
    expect(hit(false)).toBeNull();
    expect(hit(true)).toBe('b');
    expect(hit(true)).toBeNull();
    expect(s.strikes).toEqual(['a', 'b']);
  });
});

describe('run progression', () => {
  it('starts the appropriate ending only once and only after the last purchase', () => {
    const s = createPipe(cfg);
    s.scale = cfg.scales.length;
    expect(endingAction(s, cfg, false, false, true)).toBeNull();
    s.modules.ark = 1;
    expect(endingAction(s, cfg, false, false, true)).toBe('depart');
    expect(endingAction(s, cfg, false, true, true)).toBeNull();
    expect(endingAction(s, cfg, true, false, true)).toBeNull();
    const old = { ...cfg, scales: [], sources: [] };
    expect(endingAction(createPipe(old), old, false, false, false)).toBe('ending');
  });

  it('raises new usage limits only outside an incident or modal and before permanent immunity', () => {
    const s = createPipe(cfg);
    expect(limitDue(1, false, false, s, cfg)).toBe(false);
    expect(limitDue(0, true, false, s, cfg)).toBe(false);
    expect(limitDue(0, false, true, s, cfg)).toBe(false);
    s.limited = 1;
    expect(limitDue(0, false, false, s, cfg)).toBe(false);
    s.limited = 0;
    expect(limitDue(0, false, false, s, cfg)).toBe(true);
    s.owned.defence = cfg.sources.find((x) => x.id === 'defence')!.max;
    expect(limitDue(-1, false, false, s, cfg)).toBe(false);
  });
});
