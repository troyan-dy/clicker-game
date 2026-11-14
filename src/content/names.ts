import { LANG } from '../core/lang';
import en from '../data/balance/names.en.json';

/**
 * The balance files name what they sell in Russian. The English names live in names.en.json and are
 * laid over a row by its id (a manager — by his screen), so the numbers stay in one place.
 * Nothing in Russian: the row is taken as it is.
 */
export function words(kind: keyof typeof en, id: string | number): object {
  return LANG === 'en' ? ((en[kind] as Record<string, object>)[id] ?? {}) : {};
}
