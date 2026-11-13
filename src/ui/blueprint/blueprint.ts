import './blueprint.css';
import type { ShopShelf } from '../terminal/terminal';

export interface BlueprintTag {
  x: number;
  y: number;
  /** may contain <b> */
  html: string;
  /** this node is the bottleneck */
  hot?: boolean;
  /** a short caption without the underline */
  small?: boolean;
}

/** Everything the blueprint's HTML layer shows. The UI reads it and decides nothing. */
export interface BlueprintModel {
  money: number;
  /** dollars per second, averaged */
  income: number;
  /** the line under the money: where the flow stands */
  summary: string;
  /** the bottleneck in words; may contain <b>; empty when nothing is slow */
  neck: string;
  tags: BlueprintTag[];
  shelves: ShopShelf[];
  news: string;
  hint: string;
}

export interface BlueprintUi {
  render(model: BlueprintModel): void;
  /** the pull-back has happened: captions, shop and money appear */
  show(): void;
  /** below the shop: a gym puts its help here */
  extra: HTMLElement;
}

const fmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const fmt1 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Adds the paper blueprint as a layer of a 1920×1080 `.ui1080` container (below the terminal). */
export function createBlueprint(layer: HTMLElement): BlueprintUi {
  layer.insertAdjacentHTML(
    'beforeend',
    `
  <div class="bl"><div class="bl-hud">
    <div class="bl-money"><b>$0</b><span></span></div>
    <div class="bl-neck"></div>
    <div class="bl-tags"></div>
    <aside class="bl-shop"><div class="bl-shelves"></div><div class="bl-extra"></div></aside>
    <div class="bl-news"><i>НОВОСТИ</i><span></span><em></em></div>
  </div></div>`,
  );
  const root = layer.lastElementChild as HTMLElement;
  const q = <T extends HTMLElement>(sel: string): T => root.querySelector<T>(sel)!;
  const money = q('.bl-money b');
  const parts: Record<string, HTMLElement> = {
    summary: q('.bl-money span'),
    neck: q('.bl-neck'),
    tags: q('.bl-tags'),
    shelves: q('.bl-shelves'),
    news: q('.bl-news span'),
    hint: q('.bl-news em'),
  };

  // write to the DOM only when a value actually changed
  const last: Record<string, string> = {};
  let lastPop = 0;
  const set = (name: string, html: string, el: HTMLElement = parts[name]): boolean => {
    if (last[name] === html) return false;
    last[name] = html;
    el.innerHTML = html;
    return true;
  };

  return {
    extra: q('.bl-extra'),
    show() {
      root.classList.add('on');
    },
    render(m) {
      // the counter jumps a few times a second at most: restarting the animation forces a layout
      if (set('money', `$${fmt.format(Math.floor(m.money))}`, money) && performance.now() - lastPop > 150) {
        lastPop = performance.now();
        money.classList.remove('pop');
        void money.offsetWidth; // restart the CSS animation
        money.classList.add('pop');
      }
      set('summary', `+$${fmt1.format(m.income)} в секунду · ${esc(m.summary)}`);
      set('neck', m.neck);
      set('news', esc(m.news));
      set('hint', esc(m.hint));
      set(
        'tags',
        m.tags
          .map(
            (t) =>
              `<div class="bl-tag${t.hot ? ' hot' : ''}${t.small ? ' small' : ''}" style="left:${t.x}px;top:${t.y}px">${t.html}</div>`,
          )
          .join(''),
      );
      let html = '';
      for (const shelf of m.shelves) {
        html += `<h2 class="${shelf.hot ? 'hot' : ''}">${esc(shelf.title)}${shelf.hot ? '<em>← сейчас поможет</em>' : ''}</h2>`;
        for (const r of shelf.rows) {
          html += `<div class="bl-item ${r.state}"${r.state === 'can' && r.buy ? ` data-buy="${r.buy}"` : ''}>
            <b>${esc(r.title)}</b><span class="cnt">${esc(r.count)}</span>
            <small>${esc(r.sub)}</small><span class="price">${esc(r.price)}</span></div>`;
        }
      }
      set('shelves', html);
    },
  };
}
