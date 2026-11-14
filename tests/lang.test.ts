import { describe, expect, it } from 'vitest';
import awardsEn from '../src/content/awards.en.json';
import awards from '../src/content/awards.json';
import callsEn from '../src/content/calls.en.json';
import calls from '../src/content/calls.json';
import legendsEn from '../src/content/legends.en.json';
import legends from '../src/content/legends.json';
import newsEn from '../src/content/news.en.json';
import news from '../src/content/news.json';
import quipsEn from '../src/content/quips.en.json';
import quips from '../src/content/quips.json';
import takeoversEn from '../src/content/takeovers.en.json';
import takeovers from '../src/content/takeovers.json';
import { TICKETS_EN } from '../src/content/tickets.en';
import { TICKETS } from '../src/content/tickets';
import farms from '../src/data/balance/farms.json';
import grades from '../src/data/balance/grades.json';
import lines from '../src/data/balance/lines.json';
import managers from '../src/data/balance/managers.json';
import names from '../src/data/balance/names.en.json';
import plans from '../src/data/balance/plans.json';
import scales from '../src/data/balance/scales.json';
import sources from '../src/data/balance/sources.json';

const ids = (rows: { id: string }[]): string[] => rows.map((r) => r.id).sort();
const keys = (o: object): string[] => Object.keys(o).sort();
/** how many lines every key has: the lines of a key are said in order, a call is picked by its number */
const sizes = (o: Record<string, string[]>): Record<string, number> => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.length]));

// a line added in one language only would silently put the English words under the wrong line or leave them Russian
describe('the English text follows the Russian one', () => {
  it('content: the same lines under the same ids', () => {
    expect(newsEn.length).toBe(news.length);
    expect(keys(awardsEn)).toEqual(ids(awards));
    expect(keys(legendsEn)).toEqual(ids(legends));
    expect(keys(takeoversEn)).toEqual(keys(takeovers));
    expect(sizes(quipsEn)).toEqual(sizes(quips));
    expect(sizes(callsEn)).toEqual(sizes(calls));
    // the tests run in Russian: TICKETS here is the Russian list
    expect(TICKETS_EN.map((t) => [t.id, t.asks.length])).toEqual(TICKETS.map((t) => [t.id, t.asks.length]));
  });

  it('balance: every thing on sale has an English name', () => {
    expect(keys(names.sources)).toEqual(ids(sources));
    expect(keys(names.perks)).toEqual(ids(sources.filter((s) => 'perk' in s)));
    expect(keys(names.farms)).toEqual(ids(farms));
    expect(keys(names.grades)).toEqual(ids(grades));
    expect(keys(names.lines)).toEqual(ids(lines));
    expect(keys(names.plans)).toEqual(ids(plans));
    expect(keys(names.scales)).toEqual(ids(scales));
    expect(keys(names.managers)).toEqual(managers.map((m) => String(m.screen)).sort());
  });
});
