import { L } from '../core/lang';
import en from './shifts.en.json';
import data from './shifts.json';

/**
 * What the two shifts of the ziggurat say to each other when they pass on the road (M29): the one
 * going home complains about the hard work — lying in a bath and dreaming — and the one coming to lie
 * down answers. The pairs live in shifts.json (English — shifts.en.json): add freely; a line must fit a small bubble.
 */
export const SHIFT_TALK: readonly (readonly [string, string])[] = (L(data, en) as string[][]).map(([a, b]) => [a, b] as const);
