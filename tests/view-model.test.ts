import { expect, it } from 'vitest';
import { deskScreen } from '../src/data/layout/blueprint';
import { canChoose, initialChoice, moveChoice } from '../src/ui/logic/cardChoice';
import { terminalState } from '../src/ui/logic/terminalState';
import { along, curve, ellipse, length } from '../src/view/logic/geometry';
import { NODES, orderedNodes, regionProgress } from '../src/view/logic/globeNodes';

it('selects valid dialog actions and skips disabled entries in either direction', () => {
  const options = [{ label: 'a', off: true }, { label: 'b' }, { label: 'c', off: true }, { label: 'd' }];
  expect(initialChoice(options)).toBe(1);
  expect(initialChoice(options, 3)).toBe(3);
  expect(initialChoice(options, 0)).toBe(1);
  expect(moveChoice(options, 1, -1)).toBe(3);
  expect(moveChoice(options, 3, 1)).toBe(1);
  for (const index of [-1, 0, 2, 4, 8]) expect(canChoose(options, index)).toBe(false);
  expect(canChoose(options, 3)).toBe(true);
  expect(moveChoice([{ label: 'a', off: true }], 0, 1)).toBe(0);
  expect(initialChoice([])).toBe(0);
  expect(canChoose([], 0)).toBe(false);
});

it('prioritises automatic approval, ready tasks and a whole queued task in that order', () => {
  expect(terminalState({ noAsk: true, ready: 1, backlog: 2 })).toBe('noask');
  expect(terminalState({ noAsk: false, ready: 1, backlog: 2 })).toBe('asking');
  expect(terminalState({ noAsk: false, ready: 0, backlog: 1 })).toBe('working');
  expect(terminalState({ noAsk: false, ready: 0, backlog: 0.99 })).toBe('empty');
});

it('interpolates across bends, ignores coincident points and stops at the end', () => {
  const points = [[0, 0], [0, 0], [3, 4], [3, 8]] as const;
  expect(length(points)).toBe(9);
  expect(along(points, 0)).toEqual([0, 0]);
  expect(along(points, 2.5)).toEqual([1.5, 2]);
  expect(along(points, 7)).toEqual([3, 6]);
  expect(along(points, 12)).toEqual([3, 8]);
  expect(curve([0, 0], [1, 2], [4, 0], 2)).toEqual([[0, 0], [1, 2], [4, 0]]);
  const arc = ellipse(2, 3, 2, 1, 0, Math.PI, 2);
  expect(arc[0]).toEqual([4, 3]);
  expect(arc[1][1]).toBe(4);
  expect(arc[2][0]).toBeCloseTo(0);
  expect(deskScreen()).toEqual({ tl: [653.5, 483], tr: [718.5, 457], bl: [665.5, 539] });
});

it('counts built sites in construction order, keeping home separate from the free pilot', () => {
  const legacy = orderedNodes(undefined, 5);
  expect(legacy).toBe(NODES);
  const earlyEast = orderedNodes('eastasia', 1);
  expect(earlyEast[0].region).toBe(0);
  const eastIndex = earlyEast.findIndex(n => n.region === 2);
  expect(eastIndex).toBeLessThan(earlyEast.findIndex(n => n.region === 1));
  expect(regionProgress(earlyEast, 2, eastIndex - 1)).toEqual({ built: 0, next: true });
  expect(regionProgress(earlyEast, 2, eastIndex).built).toBe(1);
  const pilot = orderedNodes('eastasia', 2);
  expect(pilot).toBe(orderedNodes('siberia', 1));
  expect(pilot[1].region).toBe(1);
  expect(regionProgress(pilot, 1, 1)).toEqual({ built: 1, next: false });
  expect(regionProgress(pilot, 0, 0).built).toBe(0);
  expect(regionProgress(pilot, 0, NODES.length - 1).next).toBe(false);
  expect(pilot.map(n => n.texture).sort((a, b) => a - b)).toEqual(NODES.map(n => n.texture));
});
