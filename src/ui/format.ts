const int = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const UNITS: readonly [number, string][] = [
  [1e21, 'скстлн'],
  [1e18, 'квнтлн'],
  [1e15, 'квдрлн'],
  [1e12, 'трлн'],
  [1e9, 'млрд'],
  [1e6, 'млн'],
];

/** 950 → «950», 12 400 → «12 400», 1 240 000 → «1,24 млн», 2 500 000 000 → «2,5 млрд»; `digits` — after the comma */
export function short(n: number, digits = 2): string {
  const a = Math.abs(n);
  for (const [size, word] of UNITS) {
    if (a >= size) return `${(n / size).toLocaleString('ru-RU', { maximumFractionDigits: digits })} ${word}`;
  }
  return int.format(n);
}

/** Russian plural: plural(3, ['сессия', 'сессии', 'сессий']) → «сессии» */
export function plural(n: number, forms: readonly [string, string, string]): string {
  const k = Math.abs(Math.round(n));
  if (k % 10 === 1 && k % 100 !== 11) return forms[0];
  if (k % 10 >= 2 && k % 10 <= 4 && (k % 100 < 12 || k % 100 > 14)) return forms[1];
  return forms[2];
}
