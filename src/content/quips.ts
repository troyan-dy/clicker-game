import { L } from '../core/lang';
import en from './quips.en.json';
import data from './quips.json';

/**
 * Claude's remarks: polite, agreeable, slightly too honest. The lines live in quips.json (English —
 * quips.en.json, the same keys) — add freely.
 * The key is what happened (start, back, yes, waste, idle, neck:*, buy:*, surge, quota, all, legend,
 * finale, after); lines of one key are said in order and then start over. The lines of `buy:plan`,
 * `buy:grade` and `buy:scale` go in the order of the purchases.
 */
export const QUIPS: Record<string, readonly string[]> = L(data, en);
