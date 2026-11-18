import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import awardData from '../src/content/awards.json';
import awardWords from '../src/content/awards.en.json';
import legendData from '../src/content/legends.json';
import legendWords from '../src/content/legends.en.json';
import news from '../src/content/news.json';
import newsEn from '../src/content/news.en.json';

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

function browser(search = '', language = 'en-US', saved: string | null = null) {
  vi.stubGlobal('window', { location: { search } });
  vi.stubGlobal('navigator', { language });
  vi.stubGlobal('localStorage', { getItem: () => saved });
}

it.each([
  ['?lang=ru', 'en-US', '{"lang":"en"}', 'ru'],
  ['?lang=en', 'ru-RU', '{"lang":"ru"}', 'en'],
  ['?lang=fr', 'en-US', '{"lang":"ru"}', 'ru'],
  ['', 'RU-ru', null, 'ru'],
  ['', 'de-DE', null, 'en'],
])('resolves %s with browser %s and saved %s to %s', async (query, language, saved, expected) => {
  browser(query, language, saved);
  expect((await import('../src/core/lang')).LANG).toBe(expected);
});

it('uses Russian when running without a browser', async () => {
  vi.stubGlobal('window', undefined);
  expect((await import('../src/core/lang')).LANG).toBe('ru');
});

it.each(['ru', 'en'])('formats quantities, rounding and plural boundaries in %s', async lang => {
  browser('?lang=' + lang);
  const { short, steady, plural, tasksPhrase, moneyCounter, incomeCounter, gradeWord, planTitle, payText, gw, flowText, perSecond } = await import('../src/ui/format');
  const ru = lang === 'ru';
  const counts = [0, 1, 2, 4, 5, 11, 12, 14, 21, 23, 114, 124, -1];
  const ruForms = ['c','a','b','b','c','c','c','c','a','b','c','b','a'];
  for (const [i, n] of counts.entries()) expect(plural(n, ['a','b','c'])).toBe(ru ? ruForms[i] : Math.abs(n) === 1 ? 'a' : 'c');
  expect(tasksPhrase(0.75)).toBe(ru ? '0,75 задачи' : '0.75 tasks');
  expect(tasksPhrase(-1)).toBe(ru ? '-1 задача' : '-1 task');
  expect(tasksPhrase(11)).toBe(ru ? '11 задач' : '11 tasks');
  expect(short(950.2)).toBe('950');
  const suffixes = ru ? [' млн',' млрд',' трлн',' квдрлн',' квнтлн',' скстлн'] : ['M','B','T','Qa','Qi','Sx'];
  for (const [index, suffix] of suffixes.entries()) {
    expect(short(-1.25 * 10 ** (6 + index * 3), 1)).toBe((ru ? '-1,3' : '-1.3') + suffix);
  }
  expect(steady(1.25e6, 3)).toBe(ru ? '1,250 млн' : '1.250M');
  expect(steady(999)).toBe('999');
  expect(moneyCounter(1.99)).toBe('1');
  expect(moneyCounter(1e10)).toBe(ru ? '10,000 млрд' : '10.000B');
  expect(incomeCounter(12)).toBe(ru ? '12,0' : '12.0');
  expect(incomeCounter(1_249_800)).toBe(ru ? '1,25 млн' : '1.25M');
  expect(gradeWord('CTO')).toBe(ru ? 'cto' : 'CTO');
  expect(planTitle('Pro')).toBe(ru ? 'Тариф Pro' : 'Pro plan');
  expect(payText(99.52)).toBe(ru ? '99,5' : '99.5');
  expect(payText(100.52)).toBe('101');
  expect(gw(4.25)).toBe(ru ? '4,3 ГВт' : '4.3 GW');
  expect(gw(100.52)).toBe(ru ? '101 ГВт' : '101 GW');
  expect(flowText(1.999)).toBe(ru ? '2 задачи' : '2 tasks');
  expect(flowText(1_000_000)).toBe(ru ? '1 млн задач' : '1M tasks');
  expect(perSecond(2.55)).toBe(ru ? '2,6/с' : '2.6/s');
  expect(perSecond(1_000_000)).toBe(ru ? '1 млн/с' : '1M/s');
});

it.each(['ru', 'en'])('keeps game IDs and unlock rules stable while translating %s content', async lang => {
  browser('?lang=' + lang);
  const [{ AWARDS }, { LEGENDS }, { NEWS }, { words }, { promptAt, TICKETS }] = await Promise.all([
    import('../src/content/awards'), import('../src/content/legends'), import('../src/content/news'),
    import('../src/content/names'), import('../src/content/tickets'),
  ]);
  const awardsById = new Map(Object.entries(awardWords));
  const legendsById = new Map(Object.entries(legendWords));
  expect(AWARDS).toEqual(awardData.map(a => lang === 'ru' ? a : { ...a, ...awardsById.get(a.id) }));
  expect(LEGENDS).toEqual(legendData.map(l => lang === 'ru' ? l : { ...l, ...legendsById.get(l.id) }));
  expect(NEWS).toEqual(news.map((n,i) => lang === 'ru' ? n : { ...n, text: newsEn[i] }));
  expect(words('auto','subagent')).toEqual(lang === 'ru' ? {} : { name: 'Subagent', note: 'its own session, ¼ of your limit' });
  expect(words('plans','unknown')).toEqual({});
  expect(promptAt(-1).ask).toBe(TICKETS[0].asks[0]);
  let index = 0;
  for (const ticket of TICKETS) {
    for (const ask of ticket.asks) {
      expect(promptAt(index++ + 0.5)).toEqual({ id: ticket.id, title: ticket.title, log: ticket.log, ask });
    }
  }
  expect(promptAt(index)).toEqual(promptAt(0));
});
