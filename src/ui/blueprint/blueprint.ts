import './blueprint.css';
import { short } from '../format';
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
  /** centred on x instead of starting at it */
  mid?: boolean;
  /** a caption that sells: a click on it (or on the picture above it) buys `buy`; `can` — there is enough money */
  buy?: string;
  can?: boolean;
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
  /** Claude's remark; empty — he is silent */
  quip: string;
  /** where the remark appears: above the laptop of the blueprint or in the corner of a map */
  quipAt: 'desk' | 'corner';
  /** a pile of questions waiting for one «Да»: it takes the place of the remark */
  ask?: { text: string; worth: string; fill: number; legend: boolean };
}

export interface BlueprintUi {
  render(model: BlueprintModel): void;
  /** the pull-back has happened: captions, shop and money appear; `now` — at once, a saved game opens here */
  show(now?: boolean): void;
  /** the shop row `row` answers a click: bought, or not enough money */
  flash(row: string, kind: 'bought' | 'denied'): void;
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
    <div class="bl-quip"><i></i><span></span><div class="bl-ask"><b></b><u><s></s></u></div></div>
    <aside class="bl-shop"><div class="bl-shelves"></div><div class="bl-extra"></div></aside>
    <div class="bl-news"><i>НОВОСТИ</i><span></span><em></em></div>
  </div></div>`,
  );
  const root = layer.lastElementChild as HTMLElement;
  const q = <T extends HTMLElement>(sel: string): T => root.querySelector<T>(sel)!;
  const money = q('.bl-money b');
  const quip = q('.bl-quip');
  const quipText = q('.bl-quip span');
  const askWorth = q('.bl-ask b');
  const askBar = q('.bl-ask s');
  const parts: Record<string, HTMLElement> = {
    summary: q('.bl-money span'),
    neck: q('.bl-neck'),
    tags: q('.bl-tags'),
    shelves: q('.bl-shelves'),
    news: q('.bl-news span'),
    hint: q('.bl-news em'),
  };

  // the answer of a shop row to a click: it lives longer than the row's HTML, which is rebuilt on a purchase
  let mark: { row: string; cls: string; until: number } | null = null;
  const showMark = (): void => {
    if (!mark) return;
    // the same thing may be sold in the shop and on the map: both answer
    const els = root.querySelectorAll(`[data-row="${mark.row}"]`);
    const { cls } = mark;
    if (performance.now() > mark.until) {
      els.forEach((el) => el.classList.remove(cls));
      mark = null;
    } else els.forEach((el) => el.classList.add(cls));
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
    show(now = false) {
      root.classList.add('on');
      root.classList.toggle('now', now);
    },
    render(m) {
      // the counter jumps a few times a second at most: restarting the animation forces a layout
      // the counter keeps every digit while it fits the page
      const text = m.money < 1e10 ? fmt.format(Math.floor(m.money)) : short(m.money, 3);
      if (set('money', `$${text}`, money) && performance.now() - lastPop > 150) {
        lastPop = performance.now();
        money.classList.remove('pop');
        void money.offsetWidth; // restart the CSS animation
        money.classList.add('pop');
      }
      const income = m.income >= 1e5 ? short(Math.round(m.income / 1000) * 1000) : fmt1.format(m.income);
      set('summary', `+$${income} в секунду · ${esc(m.summary)}`);
      set('neck', m.neck);
      set('news', esc(m.news));
      // the last remark stays in place while it fades out
      const said = m.ask?.text ?? m.quip;
      if (said) set('quip', esc(said), quipText);
      if (m.ask) {
        set('askWorth', `Enter — Да всем · +$${esc(m.ask.worth)}`, askWorth);
        askBar.style.width = `${Math.round(m.ask.fill * 100)}%`;
      }
      quip.className = `bl-quip ${m.quipAt}${said ? ' on' : ''}${m.ask ? ' ask' : ''}${m.ask?.legend ? ' legend' : ''}`;
      set('hint', esc(m.hint));
      set(
        'tags',
        m.tags
          .map(
            (t) =>
              `<div class="bl-tag${t.hot ? ' hot' : ''}${t.small ? ' small' : ''}${t.mid ? ' mid' : ''}${t.buy ? ' act' : ''}${t.can ? ' can' : ''}"${t.buy ? ` data-row="${t.buy}"` : ''} style="left:${t.x}px;top:${t.y}px">${t.html}</div>`,
          )
          .join(''),
      );
      let html = '';
      for (const shelf of m.shelves) {
        html += `<h2 class="${shelf.hot ? 'hot' : ''}">${esc(shelf.title)}${shelf.hot ? '<em>← сейчас поможет</em>' : ''}</h2>`;
        for (const r of shelf.rows) {
          html += `<div class="bl-item ${r.state}${r.count ? '' : ' wide'}" data-row="${r.buy}"${r.state === 'can' && r.buy ? ` data-buy="${r.buy}"` : ''}>
            <b>${esc(r.title)}</b><span class="cnt">${esc(r.count)}</span>
            <small>${esc(r.sub)}</small><span class="price">${esc(r.price)}</span></div>`;
        }
      }
      set('shelves', html);
      showMark();
    },
    flash(row, kind) {
      mark = { row, cls: kind, until: performance.now() + 260 };
      showMark();
    },
  };
}
