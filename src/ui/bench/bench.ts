import './bench.css';
import { BENCH } from '../../content/bench';
import { L } from '../../core/lang';
import { LOCALE } from '../format';
import type { ShopShelf } from '../terminal/terminal';
import type { Rect } from '../../view/squares';

/** what holds things up on the bench: nothing does, but the first screen always said it out loud */
export type BenchNeck = 'none' | 'you' | 'birds' | 'bread';

/** Everything the bench shows. The UI reads it and decides nothing. */
export interface BenchModel {
  /** slices thrown */
  thrown: number;
  fed: number;
  /** the question of the prompt */
  ask: string;
  /** a bird waits for an answer: the prompt is lit */
  asking: boolean;
  /** Claude throws the bread himself */
  auto: boolean;
  /** birds per second that fly in */
  rate: number;
  waiting: number;
  waitMax: number;
  loaf: number;
  loafMax: number;
  /** the courier is on the way with the next loaf */
  courier: boolean;
  lying: number;
  neck: BenchNeck;
  shelves: ShopShelf[];
  news: string;
  /** Claude's remark; empty — he is silent */
  quip: string;
}

export interface BenchUi {
  render(model: BenchModel): void;
  /** the bench appears in place of everything else, or goes away; `now` — without the fade */
  show(on: boolean, now?: boolean): void;
  /** the visible answer to a press: a slice was thrown, or the bag was empty */
  hit(kind: 'thrown' | 'empty'): void;
  /** the row `row` of the shop or of the prompt answers a click */
  flash(row: string): void;
  /** below the shop: a gym puts its help here */
  extra: HTMLElement;
}

/** Scene coordinates of the place the big number stands at: slices land there as tasks landed in the money. */
export const BENCH_COUNT: Rect = { x: 900, y: 44, w: 120, h: 40 };

const fmt = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const fmt1 = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const NECK_CELL: Record<BenchNeck, string> = { none: '', you: 'hand', birds: 'birds', bread: 'loaf' };

/**
 * The bench after the credits (M30): the terminal of the first screen on paper — the same bar, prompt,
 * conveyor cells, shop and status line, with a picture where the task used to be. Added as the top
 * layer of a 1920×1080 `.ui1080` container; the picture itself is drawn on the canvas above it.
 */
export function createBench(layer: HTMLElement): BenchUi {
  const t = BENCH;
  layer.insertAdjacentHTML(
    'beforeend',
    `
  <div class="tm bench">
    <header class="tm-bar">
      <span class="tm-dots"><i></i><i></i><i></i></span>
      <span class="tm-title">${t.title}</span>
      <span class="tm-money"><b>0</b></span>
      <span class="tm-neck"></span>
      <span class="tm-plan">${t.plan}</span>
    </header>
    <section class="tm-main">
      <div class="bn-view"></div>
      <div class="tm-ask">
        <h3 data-f="ask"></h3>
        <div class="tm-opt sel" data-o="1"><span class="n">❯</span>1. ${t.yes}<span class="note" data-f="note1"></span></div>
        <div class="tm-opt buy" data-o="2" data-row="bench:auto"><span class="n"></span>2. ${t.forever}<span class="note" data-f="note2"></span></div>
        <div class="tm-opt buy" data-o="3" data-row="bench:no"><span class="n"></span>3. ${t.no}<span class="note">${t.noteNo}</span></div>
        <div class="tm-task">
          <span data-f="pay">${t.perSlice}</span>
          <span class="dim" data-f="ahead"></span>
          <span class="tm-key">${t.key}</span>
        </div>
      </div>
      <div class="tm-flow">
        <div class="cell" data-c="birds"><small>${t.cells.birds}</small><b data-f="fbirds"></b></div><i>►</i>
        <div class="cell" data-c="wait"><small>${t.cells.wait}</small><b data-f="fwait"></b></div><i>►</i>
        <div class="cell" data-c="loaf"><small>${t.cells.loaf}</small><b data-f="floaf"></b></div><i>►</i>
        <div class="cell" data-c="hand"><small>${t.cells.hand}</small><b data-f="fhand"></b></div><i>►</i>
        <div class="cell" data-c="fed"><small>${t.cells.fed}</small><b data-f="ffed"></b></div>
      </div>
      <div class="tm-quip"><span class="tm-sq"></span><span data-f="quip"></span></div>
    </section>
    <aside class="tm-side"><div class="tm-shop"></div><div class="tm-extra"></div></aside>
    <footer class="tm-status" data-row="news" title="${L('история новостей', 'news history')}">
      <span>${L('НОВОСТИ', 'NEWS')} ▸</span><span class="news" data-f="news"></span>
      <span class="r" data-f="autostate"></span>
    </footer>
  </div>`,
  );
  const root = layer.lastElementChild as HTMLElement;
  const q = <T extends HTMLElement>(sel: string): T => root.querySelector<T>(sel)!;
  const field: Record<string, HTMLElement> = {};
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-f]'))) field[el.dataset.f!] = el;
  const count = q('.tm-money b');
  const neck = q('.tm-neck');
  const ask = q('.tm-ask');
  const opt1 = q('.tm-opt[data-o="1"]');
  const opt2 = q('.tm-opt[data-o="2"]');
  const key = q('.tm-key');
  const shop = q('.tm-shop');
  const quip = q('.tm-quip');
  const cells = Array.from(root.querySelectorAll<HTMLElement>('.tm-flow .cell'));

  const last: Record<string, string> = {};
  const set = (name: string, html: string, el: HTMLElement = field[name]): boolean => {
    if (last[name] === html) return false;
    last[name] = html;
    el.innerHTML = html;
    return true;
  };
  const pulse = (el: Element | null, cls: string, ms: number): void => {
    if (!el) return;
    el.classList.add(cls);
    window.setTimeout(() => el.classList.remove(cls), ms);
  };

  return {
    extra: q('.tm-extra'),
    show(on, now = false) {
      root.classList.toggle('now', now);
      root.classList.toggle('on', on);
    },
    render(m) {
      if (set('count', fmt.format(m.thrown), count)) {
        count.classList.remove('pop');
        void count.offsetWidth; // restart the CSS animation
        count.classList.add('pop');
      }
      const neckText = `${t.counted(fmt.format(m.fed))} · ${t.neck[m.neck]}`;
      if (set('neck', neckText, neck)) for (const c of cells) c.classList.toggle('neck', c.dataset.c === NECK_CELL[m.neck]);
      set('ask', esc(m.ask));
      const state = m.auto ? 'noask' : m.asking ? 'asking' : 'empty';
      if (last.state !== state) {
        last.state = state;
        ask.className = `tm-ask ${state}`;
        // Claude throws: the second answer is the chosen one, as it was once in the terminal
        opt1.classList.toggle('sel', !m.auto);
        opt2.classList.toggle('sel', m.auto);
        opt1.querySelector('.n')!.textContent = m.auto ? '' : '❯';
        opt2.querySelector('.n')!.textContent = m.auto ? '❯' : '';
      }
      set('note2', m.auto ? t.noteAutoOn : t.noteAuto);
      set('ahead', m.lying > 0 ? t.lying(m.lying) : '');
      set('fbirds', t.perSec(fmt1.format(m.rate)));
      set('fwait', `${m.waiting} / ${m.waitMax}`);
      set('floaf', m.courier ? t.courier : `${m.loaf} / ${m.loafMax}`);
      set('fhand', m.auto ? t.claude : t.you);
      set('ffed', fmt.format(m.fed));
      set('news', esc(m.news));
      if (m.quip) set('quip', esc(m.quip));
      quip.classList.toggle('on', !!m.quip);
      set('autostate', t.status(m.auto));
      let html = '';
      for (const shelf of m.shelves) {
        html += `<h2>${esc(shelf.title)}</h2>`;
        for (const r of shelf.rows) {
          html += `<div class="tm-item ${r.state}" data-row="${r.buy}"${r.state === 'can' && r.buy ? ` data-buy="${r.buy}"` : ''}>
            <b>${esc(r.title)}${r.count ? `<i>${esc(r.count)}</i>` : ''}</b><span class="price">${esc(r.price)}</span>
            <small>${esc(r.sub)}</small></div>`;
        }
      }
      set('shop', html, shop);
    },
    hit(kind) {
      if (kind === 'empty') {
        pulse(key, 'miss', 110);
        return;
      }
      pulse(key, 'down', 90);
      pulse(opt1, 'flash', 70);
    },
    flash(row) {
      for (const el of Array.from(root.querySelectorAll(`[data-row="${row}"]`))) pulse(el, 'bought', 260);
    },
  };
}
