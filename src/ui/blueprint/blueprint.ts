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
  /** a request from an employer (M20): a dark bubble, a click answers the request with this number */
  ev?: number;
  /** words on a placard of the picket (M24): a light bubble, nothing to click */
  say?: boolean;
  /** a strike at the door (M24): a coral bubble; a click on it buys `buy` */
  alarm?: boolean;
}

/** Claude the manager at the top of the shop (M21): for hire, working or told to wait. */
export interface ManagerStrip {
  title: string;
  note: string;
  /** the price, or what he is doing */
  right: string;
  state: 'can' | 'poor' | 'on' | 'off';
}

/** One line of the conveyor table: what flows, how much, and whether it is what runs short. */
export interface MeterRow {
  label: string;
  /** «3 913/с» */
  value: string;
  /** the length of the bar, 0…1 */
  fill: number;
  /** this is what is short now */
  hot: boolean;
  /** what to do about it, or a detail of the line; may be empty */
  note: string;
  /** a line that answers a click */
  row?: string;
}

/** Everything the blueprint's HTML layer shows. The UI reads it and decides nothing. */
export interface BlueprintModel {
  money: number;
  /** dollars per second, averaged */
  income: number;
  /** the line under the money: where the flow stands */
  summary: string;
  /** the conveyor at a glance: tasks against sessions, the short one is marked */
  meter: MeterRow[];
  tags: BlueprintTag[];
  shelves: ShopShelf[];
  news: string;
  hint: string;
  /** Claude's remark; empty — he is silent */
  quip: string;
  /** where the remark appears: above the laptop of the blueprint or in the corner of a map */
  quipAt: 'desk' | 'corner';
  /** nothing — this screen has no manager */
  manager?: ManagerStrip;
  /** a pile of questions waiting for one «Да»: it takes the place of the remark */
  ask?: { text: string; worth: string; fill: number; legend: boolean };
}

export interface BlueprintUi {
  render(model: BlueprintModel): void;
  /** the pull-back has happened: captions, shop and money appear; `now` — at once, a saved game opens here */
  show(now?: boolean): void;
  /** the shop row `row` answers a click: bought, or not enough money */
  flash(row: string, kind: 'bought' | 'denied'): void;
  /** a banner over the map for a few seconds: something big has just happened */
  toast(title: string, text: string): void;
  /** the ending: the interface gives way to the picture, and comes back */
  cut(on: boolean): void;
  /** the ending: one line under the picture; empty — none */
  caption(text: string): void;
  /** below the shop: a gym puts its help here */
  extra: HTMLElement;
}

const fmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const fmt1 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/**
 * Adds the paper blueprint as a layer of a 1920×1080 `.ui1080` container (below the terminal).
 * The captions of the nodes go into `over` — a layer above the canvas, so that connectors pass behind the text.
 */
export function createBlueprint(layer: HTMLElement, over: HTMLElement): BlueprintUi {
  layer.insertAdjacentHTML(
    'beforeend',
    `
  <div class="bl"><div class="bl-hud">
    <div class="bl-money"><b>$0</b><span></span></div>
    <div class="bl-meter"></div>
    <div class="bl-quip"><i></i><span></span><div class="bl-ask"><b></b><u><s></s></u></div></div>
    <aside class="bl-shop"><div class="bl-manager"></div><div class="bl-shelves"></div><div class="bl-extra"></div></aside>
    <div class="bl-news"><i>НОВОСТИ</i><span></span><em></em></div>
  </div></div>`,
  );
  const root = layer.lastElementChild as HTMLElement;
  over.insertAdjacentHTML('afterbegin', '<div class="bl-over"><div class="bl-tags"></div><div class="bl-toast"><i></i><b></b><span></span></div><div class="bl-cine"></div></div>');
  const overRoot = over.firstElementChild as HTMLElement;
  const toast = overRoot.querySelector<HTMLElement>('.bl-toast')!;
  const cine = overRoot.querySelector<HTMLElement>('.bl-cine')!;
  const q = <T extends HTMLElement>(sel: string): T => root.querySelector<T>(sel)!;
  const money = q('.bl-money b');
  const quip = q('.bl-quip');
  const quipText = q('.bl-quip span');
  const askWorth = q('.bl-ask b');
  const askBar = q('.bl-ask s');
  const parts: Record<string, HTMLElement> = {
    summary: q('.bl-money span'),
    meter: q('.bl-meter'),
    tags: overRoot.querySelector<HTMLElement>('.bl-tags')!,
    shelves: q('.bl-shelves'),
    manager: q('.bl-manager'),
    news: q('.bl-news span'),
    hint: q('.bl-news em'),
  };

  // the answer of a shop row to a click: it lives longer than the row's HTML, which is rebuilt on a purchase
  let mark: { row: string; cls: string; until: number } | null = null;
  const showMark = (): void => {
    if (!mark) return;
    // the same thing may be sold in the shop and on the map: both answer
    const els = [...root.querySelectorAll(`[data-row="${mark.row}"]`), ...overRoot.querySelectorAll(`[data-row="${mark.row}"]`)];
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
      for (const el of [root, overRoot]) {
        el.classList.add('on');
        el.classList.toggle('now', now);
      }
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
      set(
        'meter',
        m.meter
          .map(
            (r) =>
              `<div class="bl-mrow${r.hot ? ' hot' : ''}${r.row ? ' act' : ''}"${r.row ? ` data-row="${r.row}"` : ''}><i>${esc(r.label)}</i><u><s style="width:${Math.round(Math.max(0, Math.min(1, r.fill)) * 100)}%"></s></u><b>${esc(r.value)}</b><em>${esc(r.note)}</em></div>`,
          )
          .join(''),
      );
      set('news', esc(m.news));
      // the last remark stays in place while it fades out
      const said = m.ask?.text ?? m.quip;
      if (said) set('quip', esc(said), quipText);
      if (m.ask) {
        // the pile is taken whole: until then it only says what it will pay
        set('askWorth', m.ask.fill >= 1 ? `Enter — Да всем · +$${esc(m.ask.worth)}` : `вопросы копятся · +$${esc(m.ask.worth)}`, askWorth);
        askBar.style.width = `${Math.round(m.ask.fill * 100)}%`;
      }
      quip.className = `bl-quip ${m.quipAt}${said ? ' on' : ''}${m.ask ? ' ask' : ''}${m.ask?.legend ? ' legend' : ''}`;
      set('hint', esc(m.hint));
      set(
        'tags',
        m.tags
          .map(
            (t) =>
              `<div class="bl-tag${t.hot ? ' hot' : ''}${t.small ? ' small' : ''}${t.mid ? ' mid' : ''}${t.buy ? ' act' : ''}${t.can ? ' can' : ''}${t.ev === undefined && !t.alarm ? '' : ' ev'}${t.alarm ? ' alarm' : ''}${t.say ? ' say' : ''}"${t.buy ? ` data-row="${t.buy}"` : ''}${t.ev === undefined ? '' : ` data-ev="${t.ev}"`} style="left:${t.x}px;top:${t.y}px">${t.html}</div>`,
          )
          .join(''),
      );
      let html = '';
      for (const shelf of m.shelves) {
        html += `<h2 class="${shelf.hot ? 'hot' : ''}">${esc(shelf.title)}${shelf.bonus ? `<b>${esc(shelf.bonus)}</b>` : ''}${shelf.hot ? '<em>сейчас нужно</em>' : ''}</h2>`;
        for (const r of shelf.rows) {
          html += `<div class="bl-item ${r.state}" data-row="${r.buy}"${r.state === 'can' && r.buy ? ` data-buy="${r.buy}"` : ''}>
            <b>${esc(r.title)}${r.count ? `<i>${esc(r.count)}</i>` : ''}</b><span class="price">${esc(r.price)}</span>
            <small>${esc(r.sub)}</small></div>`;
        }
      }
      set('shelves', html);
      const mg = m.manager;
      set('manager', mg ? `<div class="bl-mgr ${mg.state}" data-row="manager"><i></i><b>${esc(mg.title)}</b><small>${esc(mg.note)}</small><span>${esc(mg.right)}</span></div>` : '');
      showMark();
    },
    flash(row, kind) {
      mark = { row, cls: kind, until: performance.now() + 260 };
      showMark();
    },
    cut(on) {
      root.classList.toggle('cut', on);
      overRoot.classList.toggle('cut', on);
    },
    caption(text) {
      if (text) cine.textContent = text;
      cine.classList.toggle('on', text !== '');
    },
    toast(title, text) {
      toast.querySelector('b')!.textContent = title;
      toast.querySelector('span')!.textContent = text;
      toast.classList.remove('on');
      void toast.offsetWidth; // restart the CSS animation
      toast.classList.add('on');
    },
  };
}
