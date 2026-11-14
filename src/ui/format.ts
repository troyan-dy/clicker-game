import { L, LANG } from '../core/lang';

/** how numbers are written: «12 400» and «1,24» in Russian, «12,400» and «1.24» in English */
export const LOCALE = L('ru-RU', 'en-US');
const int = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const UNITS: readonly [number, string][] = [
  [1e21, L(' скстлн', 'Sx')],
  [1e18, L(' квнтлн', 'Qi')],
  [1e15, L(' квдрлн', 'Qa')],
  [1e12, L(' трлн', 'T')],
  [1e9, L(' млрд', 'B')],
  [1e6, L(' млн', 'M')],
];

/** «в секунду», short: «3,8/с» */
export const PER_S = L('/с', '/s');

/** 950 → «950», 12 400 → «12 400», 1 240 000 → «1,24 млн» (English: «1.24M»), 2 500 000 000 → «2,5 млрд»; `digits` — after the comma */
export function short(n: number, digits = 2): string {
  const a = Math.abs(n);
  for (const [size, word] of UNITS) {
    if (a >= size) return `${(n / size).toLocaleString(LOCALE, { maximumFractionDigits: digits })}${word}`;
  }
  return int.format(n);
}

/** Like `short`, but always with `digits` after the comma: a counter that runs every frame keeps its width («22,730 трлн») */
export function steady(n: number, digits = 2): string {
  const a = Math.abs(n);
  for (const [size, word] of UNITS) {
    if (a >= size) return `${(n / size).toLocaleString(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits })}${word}`;
  }
  return int.format(n);
}

/** Plural by number: plural(3, ['сессия', 'сессии', 'сессий']) → «сессии»; English takes the first form for one and the last for the rest */
export function plural(n: number, forms: readonly [string, string, string]): string {
  const k = Math.abs(Math.round(n));
  if (LANG === 'en') return k === 1 ? forms[0] : forms[2];
  if (k % 10 === 1 && k % 100 !== 11) return forms[0];
  if (k % 10 >= 2 && k % 10 <= 4 && (k % 100 < 12 || k % 100 > 14)) return forms[1];
  return forms[2];
}
