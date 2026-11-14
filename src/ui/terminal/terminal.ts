import './terminal.css';
import type { Prompt } from '../../content/tickets';
import { L, LANG } from '../../core/lang';
import { LOCALE, PER_S } from '../format';
import type { Rect } from '../../view/squares';

/** what runs short: the first three — before the towers, the next three — at them (capsules, people, the appetite of the network) */
export type Neck = 'tasks' | 'claude' | 'you' | 'pods' | 'people' | 'net' | 'none';

export interface ShopRow {
  /** what a click buys: `src:<id>`, `plan`, `noask`, `sub`; empty — not for sale */
  buy: string;
  title: string;
  sub: string;
  /** right of the title: «×3», «есть», «куплен» */
  count: string;
  price: string;
  state: 'can' | 'poor' | 'owned' | 'off';
}

export interface ShopShelf {
  title: string;
  /** this shelf removes the current bottleneck */
  hot: boolean;
  /** what the perks do to this shelf, said after the title: «скидка 28%» */
  bonus?: string;
  rows: ShopRow[];
}

/** Everything the terminal shows. The UI reads it and decides nothing. */
export interface TerminalView {
  money: number;
  /** dollars per second, averaged */
  income: number;
  prompt: Prompt;
  pay: number;
  /** tasks per second coming in */
  inflow: number;
  backlog: number;
  backlogMax: number;
  /** tasks per second Claude prepares */
  rate: number;
  plan: string;
  /** 0..1 — how far Claude is into the current task */
  think: number;
  /** finished tasks waiting for a «Да» */
  ready: number;
  readyMax: number;
  buffered: number;
  noAsk: boolean;
  noAskPrice: number;
  canBuyNoAsk: boolean;
  subagents: number;
  /** tasks per second subagent sessions close */
  subRate: number;
  neck: Neck;
  shelves: ShopShelf[];
  news: string;
  /** Claude's remark; empty — he is silent */
  quip: string;
}

export interface TerminalUi {
  render(view: TerminalView): void;
  /** the visible answer to a «Да»: by hand or by the automation */
  hit(kind: 'approved' | 'buffered' | 'wasted' | 'auto'): void;
  /** the shop row `row` answers a click: bought, or not enough money */
  flash(row: string, kind: 'bought' | 'denied'): void;
  /** below the shop: a gym puts its help here */
  extra: HTMLElement;
  /** the whole terminal layer: the pull-back shrinks it into a laptop screen */
  root: HTMLElement;
}

/** Scene coordinates of the places squares fly between (match terminal.css). */
export const TERMINAL_SPOTS: { ask: Rect; money: Rect; backlog: Rect } = {
  ask: { x: 560, y: 410, w: 420, h: 60 },
  money: { x: 880, y: 44, w: 160, h: 40 },
  backlog: { x: 330, y: 690, w: 160, h: 40 },
};

const fmt = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const fmt2 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
/** "+12" in a log line is shown green */
const logLine = (s: string): string => `⎿ ${esc(s).replace(/(\+\d[\d\s,]*)/g, '<span class="ok">$1</span>')}`;

/** "0,75 задачи", "2 задачи", "15 задач", "21 задача"; English: "0.75 tasks", "1 task", "15 tasks" */
export function tasksPhrase(count: number): string {
  const n = Math.abs(count);
  if (LANG === 'en') return `${fmt2.format(count)} ${n === 1 ? 'task' : 'tasks'}`;
  let word = 'задач';
  if (!Number.isInteger(n)) word = 'задачи';
  else if (n % 10 === 1 && n % 100 !== 11) word = 'задача';
  else if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) word = 'задачи';
  return `${fmt2.format(count)} ${word}`;
}

const NECK_TEXT: Record<Neck, string> = L(
  {
    tasks: 'узкое место: <b>задачи</b> — Клод всё сделал и ждёт работу',
    claude: 'узкое место: <b>Клод</b> — задачи копятся быстрее, чем он делает',
    you: 'узкое место: <b>ты</b> — Клод ждёт твоего «Да»',
    pods: '',
    people: '',
    net: '',
    none: '',
  },
  {
    tasks: 'bottleneck: <b>tasks</b> — Claude is done and waits for work',
    claude: 'bottleneck: <b>Claude</b> — tasks pile up faster than Claude closes them',
    you: 'bottleneck: <b>you</b> — Claude is waiting for your “Yes”',
    pods: '',
    people: '',
    net: '',
    none: '',
  },
);
const PER_SECOND = L('в секунду', 'per second');
const NECK_CELL: Record<Neck, string> = { tasks: 'in', claude: 'claude', you: 'you', pods: '', people: '', net: '', none: '' };

/** Adds the terminal as the top layer of a 1920×1080 `.ui1080` container. */
export function createTerminal(layer: HTMLElement): TerminalUi {
  layer.insertAdjacentHTML(
    'beforeend',
    `
  <div class="tm">
    <header class="tm-bar">
      <span class="tm-dots"><i></i><i></i><i></i></span>
      <span class="tm-title">${L('claude — ~/работа/все-сразу', 'claude — ~/work/all-at-once')}</span>
      <span class="tm-money"><b>$0</b></span>
      <span class="tm-neck"></span>
      <span class="tm-plan"></span>
    </header>
    <section class="tm-main">
      <div class="tm-head"><span class="tm-sq"></span>${L('Задача', 'Task')} <span data-f="id"></span> · ${L('«', '“')}<span data-f="title"></span>${L('»', '”')}</div>
      <div class="tm-sub" data-f="log0"></div>
      <div class="tm-sub" data-f="log1"></div>
      <div class="tm-ask">
        <h3 data-f="ask"></h3>
        <div class="tm-think"><i></i></div>
        <div class="tm-opt" data-o="1"><span class="n"></span>1. ${L('Да', 'Yes')}<span class="note" data-f="note1"></span></div>
        <div class="tm-opt" data-o="2"><span class="n"></span>2. ${L('Да, и больше не спрашивай', 'Yes, and don’t ask again')}<span class="note" data-f="note2"></span></div>
        <div class="tm-opt off"><span class="n"></span>3. ${L('Нет', 'No')}<span class="note">${L('недоступно в вашем тарифе', 'not available on your plan')}</span></div>
        <div class="tm-task">
          <span class="ok" data-f="pay"></span>
          <span class="dim" data-f="ahead"></span>
          <span class="tm-key">${L('Enter — Да', 'Enter — Yes')}</span>
        </div>
      </div>
      <div class="tm-flow">
        <div class="cell" data-c="in"><small>${L('ВХОД', 'INFLOW')}</small><b data-f="fin"></b></div><i>►</i>
        <div class="cell" data-c="backlog"><small>${L('БЭКЛОГ', 'BACKLOG')}</small><b data-f="fbacklog"></b></div><i>►</i>
        <div class="cell" data-c="claude"><small data-f="fplan"></small><b data-f="fclaude"></b></div><i>►</i>
        <div class="cell" data-c="you"><small>${L('ЖДУТ «ДА»', 'AWAIT “YES”')}</small><b data-f="fready"></b></div><i>►</i>
        <div class="cell" data-c="out"><small>${L('ДОХОД', 'INCOME')}</small><b class="ok" data-f="fout"></b></div>
      </div>
      <div class="tm-auto" data-f="auto"></div>
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
  const money = q('.tm-money b');
  const neck = q('.tm-neck');
  const plan = q('.tm-plan');
  const ask = q('.tm-ask');
  const think = q('.tm-think i');
  const opt1 = q('.tm-opt[data-o="1"]');
  const opt2 = q('.tm-opt[data-o="2"]');
  const key = q('.tm-key');
  const shop = q('.tm-shop');
  const quip = q('.tm-quip');
  const cells = Array.from(root.querySelectorAll<HTMLElement>('.tm-flow .cell'));
  let selected = opt1;

  // the answer of a shop row to a click: it lives longer than the row's HTML, which is rebuilt on a purchase
  let mark: { row: string; cls: string; until: number } | null = null;
  const showMark = (): void => {
    if (!mark) return;
    const el = root.querySelector(`[data-row="${mark.row}"]`);
    if (performance.now() > mark.until) {
      el?.classList.remove(mark.cls);
      mark = null;
    } else el?.classList.add(mark.cls);
  };

  // write to the DOM only when a value actually changed
  const last: Record<string, string> = {};
  const set = (name: string, html: string, el: HTMLElement = field[name]): boolean => {
    if (last[name] === html) return false;
    last[name] = html;
    el.innerHTML = html;
    return true;
  };
  const pulse = (el: HTMLElement, cls: string, ms: number): void => {
    el.classList.add(cls);
    window.setTimeout(() => el.classList.remove(cls), ms);
  };

  return {
    root,
    extra: q('.tm-extra'),
    render(v) {
      if (set('money', `$${fmt.format(Math.floor(v.money))}`, money)) {
        money.classList.remove('pop');
        void money.offsetWidth; // restart the CSS animation
        money.classList.add('pop');
      }
      set('plan', `${L('тариф', 'plan')} ${esc(v.plan)} · ${tasksPhrase(v.rate)} ${PER_SECOND}`, plan);
      set('id', v.prompt.id);
      set('title', esc(v.prompt.title));
      set('log0', logLine(v.prompt.log[0]));
      set('log1', logLine(v.prompt.log[1]));
      set('news', esc(v.news));
      // the last remark stays in place while it fades out
      if (v.quip) set('quip', esc(v.quip));
      quip.classList.toggle('on', !!v.quip);
      set('pay', `${L('за задачу', 'per task')} +$${fmt2.format(v.pay)}`);

      // the prompt box: asking, working, out of work, or no longer asking at all
      const working = v.backlog >= 1;
      const state = v.noAsk ? 'noask' : v.ready > 0 ? 'asking' : working ? 'working' : 'empty';
      if (last.state !== state) {
        last.state = state;
        ask.className = `tm-ask ${state}`;
        selected = v.noAsk ? opt2 : opt1;
        opt1.classList.toggle('sel', !v.noAsk);
        opt2.classList.toggle('sel', v.noAsk);
        opt1.querySelector('.n')!.textContent = v.noAsk ? '' : '❯';
        opt2.querySelector('.n')!.textContent = v.noAsk ? '❯' : '';
      }
      set(
        'ask',
        state === 'asking'
          ? esc(v.prompt.ask)
          : state === 'noask'
            ? L('Клод больше не спрашивает', 'Claude no longer asks')
            : state === 'working'
              ? L('Клод работает…', 'Claude is working…')
              : L('Задач нет. Клод ждёт работу', 'No tasks. Claude is waiting for work'),
      );
      think.style.width = state === 'working' ? `${Math.round(Math.min(1, v.think) * 100)}%` : '0';
      set('note1', v.noAsk ? L('подгоняет Клода: закрывает задачу сразу', 'hurries Claude: closes the task at once') : '');
      set('note2', v.noAsk ? L('куплено', 'bought') : `${v.canBuyNoAsk ? L('купить', 'buy') : L('улучшение', 'upgrade')} · $${fmt.format(v.noAskPrice)}`);
      const buyable = !v.noAsk && v.canBuyNoAsk;
      if (last.buy2 !== String(buyable)) {
        last.buy2 = String(buyable);
        opt2.classList.toggle('buy', buyable);
        if (buyable) opt2.dataset.buy = 'noask';
        else delete opt2.dataset.buy;
      }
      set('ahead', v.buffered > 0 ? L('«Да» дано заранее ✓', '“Yes” given in advance ✓') : '');
      key.classList.toggle('spent', state !== 'asking' && state !== 'noask' && v.buffered > 0);

      // the conveyor: where the tasks are and what is slowest
      set('fin', `${tasksPhrase(v.inflow)}${PER_S}`);
      set('fbacklog', `${v.backlog} / ${v.backlogMax}`);
      set('fplan', `${L('КЛОД', 'CLAUDE')} · ${esc(v.plan)}`);
      set('fclaude', `${fmt2.format(v.rate)}${PER_S}`);
      set('fready', v.noAsk ? L('не спрашивает', 'not asking') : `${v.ready} / ${v.readyMax}`);
      set('fout', `+$${fmt2.format(Math.round(v.income * 10) / 10)}${PER_S}`);
      if (last.neck !== v.neck) {
        last.neck = v.neck;
        neck.className = `tm-neck ${v.neck}`;
        neck.innerHTML = NECK_TEXT[v.neck];
        for (const c of cells) c.classList.toggle('neck', c.dataset.c === NECK_CELL[v.neck]);
      }
      const auto: string[] = [];
      if (v.subagents > 0) {
        auto.push(
          L(
            `сабагентов: ${v.subagents} · свои сессии, сами закрывают до ${tasksPhrase(v.subRate)} в секунду`,
            `subagents: ${v.subagents} · their own sessions, closing up to ${tasksPhrase(v.subRate)} per second by themselves`,
          ),
        );
      }
      set('auto', auto.join(' · '));
      set('autostate', `${L('автосогласие', 'auto-yes')}: ${v.noAsk ? L('вкл', 'on') : L('выкл', 'off')}`);

      let html = '';
      for (const shelf of v.shelves) {
        html += `<h2 class="${shelf.hot ? 'hot' : ''}">${esc(shelf.title)}${shelf.hot ? `<em>${L('сейчас нужно', 'needed now')}</em>` : ''}</h2>`;
        for (const r of shelf.rows) {
          html += `<div class="tm-item ${r.state}" data-row="${r.buy}"${r.state === 'can' && r.buy ? ` data-buy="${r.buy}"` : ''}>
            <b>${esc(r.title)}${r.count ? `<i>${esc(r.count)}</i>` : ''}</b><span class="price">${esc(r.price)}</span>
            <small>${esc(r.sub)}</small></div>`;
        }
      }
      set('shop', html, shop);
      showMark();
    },
    flash(row, kind) {
      mark = { row, cls: kind, until: performance.now() + 260 };
      showMark();
    },
    hit(kind) {
      if (kind === 'wasted') {
        pulse(key, 'miss', 110);
        return;
      }
      if (kind !== 'auto') pulse(key, 'down', 90);
      if (kind !== 'buffered') pulse(selected, 'flash', 70);
    },
  };
}
