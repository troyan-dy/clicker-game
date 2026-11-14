import { loadSettings } from './settings';

export type Lang = 'ru' | 'en';

/** The language of this run: the address (`?lang=en`), then the choice made in the menu, then the browser. */
function pick(): Lang {
  try {
    const asked = new URLSearchParams(window.location.search).get('lang');
    if (asked === 'ru' || asked === 'en') return asked;
    return loadSettings().lang ?? (navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en');
  } catch {
    return 'ru'; // no browser around: the tests read the game in its first language
  }
}

/** Fixed for the whole run: the menu changes it by reloading the page. */
export const LANG: Lang = pick();

/** The same thing in both languages; the game says the one it runs in. */
export const L = <T>(ru: T, en: T): T => (LANG === 'en' ? en : ru);
