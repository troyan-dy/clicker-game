import data from './news.json';

/**
 * The news ticker: the world notices the consequences. The lines live in news.json — add freely.
 * `screen` — the screen a line belongs to (1 terminal … 5 planet); `needs` — what the player must own
 * for it to make sense: a source id, a farm id, or one of `plan`, `sub`, `grade`.
 */
export interface NewsLine {
  screen: number;
  text: string;
  needs?: string;
}

export const NEWS: readonly NewsLine[] = data;
