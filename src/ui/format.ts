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

const fmt2 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
const fmt1 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });
const fixed1 = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** "0,75 задачи", "2 задачи", "15 задач", "21 задача"; English: "0.75 tasks", "1 task", "15 tasks" */
export function tasksPhrase(count: number): string {
  const n = Math.abs(count);
  if (LANG === 'en') return `${fmt2.format(count)} ${n === 1 ? 'task' : 'tasks'}`;
  const word = Number.isInteger(n) ? plural(n, ['задача', 'задачи', 'задач']) : 'задачи';
  return `${fmt2.format(count)} ${word}`;
}

export function moneyCounter(money: number): string {
  return money < 1e10 ? int.format(Math.floor(money)) : steady(money, 3);
}

export function incomeCounter(income: number): string {
  return income >= 1e5 ? steady(Math.round(income / 1000) * 1000) : fixed1.format(income);
}

/** a grade in the middle of a line: Russian writes it small, English keeps «CTO» and «Team Lead» as they are */
export const gradeWord = (name: string): string => (LANG === 'en' ? name : name.toLowerCase());

export const planTitle = (name: string): string => L(`Тариф ${name}`, `${name} plan`);

/** the pay for a task: whole dollars from a hundred up — it drifts with unemployment, and «879,9 → 880» would change the width of the line */
export const payText = (n: number): string => (n >= 100 ? short(Math.round(n)) : fmt1.format(n));

/** gigawatts, after a number: «0,8 ГВт», «240 ГВт» */
export const gw = (n: number): string => `${n < 100 ? fmt1.format(n) : short(Math.round(n))}${L(' ГВт', ' GW')}`;

/** «3,75 задачи», «26 задач», «34 600 задач», «1,2 млн задач» */
export function flowText(perSec: number): string {
  return perSec < 1000 ? tasksPhrase(Math.round(perSec * 100) / 100) : `${short(Math.round(perSec))} ${L('задач', 'tasks')}`;
}

/** «3,8/с», «3 913/с», «1,2 млн/с» */
export function perSecond(n: number): string {
  return `${n < 1000 ? fmt1.format(n) : short(Math.round(n))}${PER_S}`;
}
