import { LANG } from '../core/lang';
import en from './legends.en.json';
import data from './legends.json';

/** A legendary ticket (M12): a question so absurd that approving it pays many times over and goes into the collection. */
export interface Legend {
  id: string;
  title: string;
  /** the question as the pile shows it */
  ask: string;
}

const words: Record<string, { title: string; ask: string }> = en;
/** the English words live in legends.en.json, by id */
export const LEGENDS: readonly Legend[] = LANG === 'en' ? data.map((l) => ({ ...l, ...words[l.id] })) : data;
