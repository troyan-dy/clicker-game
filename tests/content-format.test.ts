import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => vi.unstubAllGlobals());

it.each(['ru', 'en'])('keeps the numbers, units and status of each %s dashboard caption', async lang => {
  vi.resetModules();
  vi.stubGlobal('window', { location: { search: '?lang=' + lang } });
  const [{ TOWERS: t }, { WORLD: w }, { BENCH: b }] = await Promise.all([
    import('../src/content/towers'), import('../src/content/world'), import('../src/content/bench'),
  ]);
  const ru = lang === 'ru';
  const fields: [string, string[]][] = [
    [t.tower(12), ['12']], [t.ofBlocks(3, 17), ['3','17']], [t.rows.came('51', '32'), ['51','32']],
    [t.rows.slept('400', '500'), ['400','500']], [t.rows.netAsks('24'), ['24']],
    [t.summary('32 GW','52'), ['32','52']], [t.waiting('31'), ['31']], [t.park('12'), ['12']],
    [t.inventing('CPU', 87), ['87']], [t.hint('33', '96'), ['33','96']],
    [t.proposal(8, 'CPU'), ['8']], [t.scaleLocked(44, 63), ['44','63']],
    [w.siberianPilot('31 GW'), ['31']], [w.eastSites(3,25), ['3','25']], [w.ofNodes(7,18), ['7','18']],
    [w.rows.slept('18','25'), ['18','25']], [w.rows.netAsks('37'), ['37']], [w.mars('42M'), ['42']],
    [w.regionNodes('Asia', 2, 4), ['2','4']], [w.hint('12','30','48'), ['12','30','48']],
    [b.counted('17'), ['17']], [b.lying(4), ['4']], [b.rowMoney('35'), ['35']],
  ];
  for (const [caption, numbers] of fields) expect(caption.match(/\d+/g), caption).toEqual(numbers);
  expect(t.inventing('CPU', 87)).toContain('CPU');
  expect(t.signedSub('CPU')).toContain('CPU');
  expect(t.proposal(8, 'CPU')).toContain('CPU');
  expect(w.span('Asia')).toContain('Asia');
  expect(w.regionNodes('Asia', 2, 4)).toContain('Asia');
  expect(b.perSec('3.5')).toBe(ru ? '3.5/с' : '3.5/s');
  expect(b.status(true)).toBe(ru ? 'автокормление: вкл' : 'auto-feeding: on');
  expect(b.status(false)).toBe(ru ? 'автокормление: выкл' : 'auto-feeding: off');
  expect(w.rows.carries(3, true)).toBe(ru ? 'ниток 3 · пояс замкнут' : 'strands: 3 · the belt is closed');
  expect(w.rows.carries(3, false)).toBe(ru ? 'ниток 3' : 'strands: 3');
  expect([1, 3, 5].map(t.build)).toEqual(ru ? ['+1 капсула', '+3 капсулы', '+5 капсул'] : ['+1 capsule', '+3 capsules', '+5 capsules']);
});

it.each(['ru', 'en'])('selects every public story collection for the %s run', async lang => {
  vi.resetModules();
  vi.stubGlobal('window', { location: { search: '?lang=' + lang } });
  const [{ CALLS }, { QUIPS }, { TAKEOVERS }, { PICKET }, { EPILOGUE }, { CREDITS_END }] = await Promise.all([
    import('../src/content/calls'), import('../src/content/quips'), import('../src/content/takeovers'),
    import('../src/content/picket'), import('../src/content/screens'), import('../src/content/credits'),
  ]);
  for (const line of [CALLS['2'][0], QUIPS.start[0], TAKEOVERS.vector, PICKET[0], EPILOGUE.moral, CREDITS_END]) {
    expect(/[а-яё]/i.test(line), line).toBe(lang === 'ru');
    expect(line.length).toBeGreaterThan(0);
  }
});
