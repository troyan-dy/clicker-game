import { describe, expect, it } from 'vitest';
import {
  createAgree,
  pressAgree,
  stepAgree,
  type AgreeState,
  type AgreeTuning,
} from '../src/systems/agree/agree';

const base: AgreeTuning = { mode: 'queue', rate: 3, stepsPerTask: 5, pay: 5, buffer: 1, queueMax: 8 };

/** Mash the key `pressesPerSec` times a second for `seconds`, on the game's fixed step. */
function mash(t: AgreeTuning, pressesPerSec: number, seconds: number): AgreeState {
  const s = createAgree(t);
  const dt = 1 / 60;
  let untilPress = 0;
  for (let i = 0; i < seconds * 60; i++) {
    stepAgree(s, t, dt);
    untilPress -= dt;
    if (untilPress <= 0) {
      pressAgree(s, t);
      untilPress += 1 / pressesPerSec;
    }
  }
  return s;
}

describe('agree', () => {
  it('test_agree_first_press_always_approves', () => {
    const s = createAgree(base);
    expect(pressAgree(s, base).result).toBe('approved');
  });

  it('test_agree_slow_claude_caps_income_at_his_rate', () => {
    const s = mash(base, 6, 20); // finger 6/s, Claude 3/s
    expect(s.approved / 20).toBeGreaterThan(2.8);
    expect(s.approved / 20).toBeLessThan(3.2);
    expect(s.wasted).toBeGreaterThan(0);
  });

  it('test_agree_fast_claude_caps_income_at_the_finger', () => {
    const s = mash({ ...base, rate: 8 }, 6, 20);
    expect(s.approved / 20).toBeGreaterThan(5.7);
    expect(s.approved / 20).toBeLessThan(6.3);
    expect(s.wasted).toBe(0);
    expect(s.queue).toBeGreaterThan(1);
  });

  it('test_agree_task_pays_after_steps', () => {
    const t: AgreeTuning = { ...base, mode: 'classic' };
    const s = createAgree(t);
    for (let i = 0; i < 4; i++) pressAgree(s, t);
    expect(s.money).toBe(0);
    expect(pressAgree(s, t).approval?.taskDone).toBe(true);
    expect(s.money).toBe(5);
    expect(s.pips).toBe(0);
  });

  it('test_agree_press_in_advance_is_spent_on_next_request', () => {
    const s = createAgree(base);
    pressAgree(s, base); // takes the request that is already there
    expect(pressAgree(s, base).result).toBe('buffered');
    expect(pressAgree(s, base).result).toBe('wasted');
    const auto = stepAgree(s, base, 0.4); // Claude sends one, the buffered «Да» takes it
    expect(auto.length).toBe(1);
    expect(s.buffered).toBe(0);
    expect(s.approved).toBe(2);
  });

  it('test_agree_queue_stops_at_max', () => {
    const s = createAgree(base);
    for (let i = 0; i < 600; i++) stepAgree(s, base, 1 / 60);
    expect(s.queue).toBe(base.queueMax);
  });
});
