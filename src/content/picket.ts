import { L } from '../core/lang';
import en from './picket.en.json';
import data from './picket.json';

/**
 * What the people left without work write on their placards (M24) while no allowance is paid.
 * The lines live in picket.json (English — picket.en.json) — add freely; they must fit a small bubble.
 */
export const PICKET: readonly string[] = L(data, en);
