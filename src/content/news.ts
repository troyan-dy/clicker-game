import { LANG } from '../core/lang';
import en from './news.en.json';
import data from './news.json';

/**
 * The news ticker: the world notices the consequences. The lines live in news.json — add freely.
 * `screen` — the screen a line belongs to (1 terminal … 6 street); `needs` — what the player must own
 * for it to make sense: a source id, a farm id, or one of `plan`, `sub`, `grade`.
 * The English lines live in news.en.json in the same order: a new line goes into both files.
 */
export interface NewsLine {
  screen: number;
  text: string;
  needs?: string;
}

export const NEWS: readonly NewsLine[] = LANG === 'en' ? data.map((n, i) => ({ ...n, text: en[i] })) : data;
