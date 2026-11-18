import { describe, expect, it } from 'vitest';
import { takeEvent, type EventsState } from '../src/systems/events/events';
import { createStack, stackWorth, stepStack, takeStack } from '../src/systems/stack/stack';
import { laptopPhase, startIncident, stepIncident } from '../src/systems/intern/incident';
import intern from '../src/data/tuning/intern.json';
import stack from '../src/data/tuning/stack.json';

describe('map events', () => {
  it.each([-1, 0.5, NaN, 2])('leaves pending calls untouched for invalid index %s', (index) => {
    const calls: EventsState = {
      wait: 1,
      taken: 0,
      list: [
        { at: 'one', kind: 0, left: 2 },
        { at: 'two', kind: 0, left: 1 },
      ],
    };
    const before = structuredClone(calls);
    expect(takeEvent(calls, index)).toBeUndefined();
    expect(calls).toEqual(before);
  });
});

describe('question pile', () => {
  it('waits for automatic approval, fills to its cap and starts a fresh cooldown after collection', () => {
    const pile = createStack(stack);
    expect(stackWorth(pile, stack, 4.15)).toBe(0);
    stepStack(pile, stack, 50, false);
    expect(pile.wait).toBe(stack.cooldown / 2);
    stepStack(pile, stack, pile.wait - 1, true);
    expect(pile.fill).toBe(0);
    stepStack(pile, stack, 1, true);
    expect(pile.fill).toBeCloseTo(1 / stack.fillSeconds);
    stepStack(pile, stack, 2 * stack.fillSeconds, true);
    expect(pile.fill).toBe(1);
    expect(stackWorth(pile, stack, 4.15)).toBe(Math.floor(4.15 * stack.worthSeconds));
    takeStack(pile, stack);
    expect(pile).toEqual({ wait: stack.cooldown, fill: 0, taken: 1 });
  });
});

describe('intern service credit', () => {
  it('pays once even when one update crosses every phase', () => {
    const incident = startIncident(0);
    expect(laptopPhase(incident.elapsed)).toBe('routing');
    expect(laptopPhase(intern.routeSeconds)).toBe('closed');
    expect(laptopPhase(intern.routeSeconds + intern.closedSeconds)).toBe('restored');
    const elapsed = intern.routeSeconds + intern.closedSeconds + intern.receiptSeconds;
    expect(stepIncident(incident, elapsed)).toBe(1);
    expect(laptopPhase(incident.elapsed)).toBe('done');
    expect(stepIncident(incident, elapsed)).toBe(0);
  });
});
