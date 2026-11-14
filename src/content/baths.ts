import { L } from '../core/lang';
import en from './baths.en.json';
import data from './baths.json';

/**
 * What the people in the baths of the ziggurat say (M28) while a shift lies there.
 * The lines live in baths.json (English — baths.en.json) — add freely; they must fit a small bubble.
 */
export const BATHS: readonly string[] = L(data, en);
