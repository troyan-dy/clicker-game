import './terminal.css';
import type { Ticket } from '../../content/tickets';
import type { Rect } from '../../view/squares';

/** Everything the terminal shows. The UI reads it and decides nothing. */
export interface TerminalView {
  money: number;
  ticket: Ticket;
  pips: number;
  stepsPerTask: number;
  pay: number;
  /** requests waiting for a «Да» */
  queue: number;
  /** «Да» given in advance */
  buffered: number;
  /** 0..1 — how far Claude is into the next request */
  thinking: number;
  rate: number;
  classic: boolean;
  news: string;
}

export interface TerminalUi {
  render(view: TerminalView): void;
  /** the visible answer to a key press */
  hit(kind: 'approved' | 'buffered' | 'wasted'): void;
  /** right-hand column: the shop in the game, help in a gym */
  side: HTMLElement;
}

/** Scene coordinates of the places squares fly between (match terminal.css). */
export const TERMINAL_SPOTS: { ask: Rect; pips: Rect; money: Rect } = {
  ask: { x: 560, y: 432, w: 420, h: 60 },
  pips: { x: 333, y: 552, w: 142, h: 22 },
  money: { x: 880, y: 44, w: 160, h: 40 },
};

const fmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
/** "+12" in a log line is shown green */
const logLine = (s: string): string => `⎿ ${esc(s).replace(/(\+[\d\s]+)/g, '<span class="ok">$1</span>')}`;

export function createTerminal(root: HTMLElement): TerminalUi {
  root.innerHTML = `
  <div class="ui1080"><div class="tm">
    <header class="tm-bar">
      <span class="tm-dots"><i></i><i></i><i></i></span>
      <span class="tm-title">claude — ~/работа/все-сразу</span>
      <span class="tm-money"><b>$0</b></span>
      <span class="tm-neck"></span>
      <span class="tm-plan"></span>
    </header>
    <section class="tm-main">
      <div><span class="tm-sq"></span>Задача <span data-f="id"></span> · «<span data-f="title"></span>»</div>
      <div class="tm-sub" data-f="log0"></div>
      <div class="tm-sub" data-f="log1"></div>
      <div class="tm-ask">
        <h3 data-f="ask"></h3>
        <div class="tm-think"><i></i></div>
        <div class="tm-opt sel"><span class="n">❯</span>1. Да</div>
        <div class="tm-opt"><span class="n"></span>2. Да, и больше не спрашивай<span class="note">улучшение · скоро</span></div>
        <div class="tm-opt off"><span class="n"></span>3. Нет<span class="note">недоступно в вашем тарифе</span></div>
        <div class="tm-task">
          <span class="dim">согласий по задаче</span>
          <span class="tm-pips"></span>
          <span class="ok" data-f="pay"></span>
          <span class="tm-key">Enter — Да</span>
        </div>
      </div>
      <div class="tm-queue">
        <span data-f="qlabel"></span><span class="cells"></span><span class="next" data-f="next"></span>
        <span class="ahead" data-f="ahead"></span>
      </div>
    </section>
    <aside class="tm-side"></aside>
    <footer class="tm-status">
      <span>НОВОСТИ</span><span class="news" data-f="news"></span>
      <span class="r">автосогласие: выкл</span>
    </footer>
  </div></div>`;

  const q = <T extends HTMLElement>(sel: string): T => root.querySelector<T>(sel)!;
  const field: Record<string, HTMLElement> = {};
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-f]'))) field[el.dataset.f!] = el;
  const money = q('.tm-money b');
  const neck = q('.tm-neck');
  const plan = q('.tm-plan');
  const ask = q('.tm-ask');
  const think = q('.tm-think i');
  const sel = q('.tm-opt.sel');
  const pips = q('.tm-pips');
  const key = q('.tm-key');
  const cells = q('.tm-queue .cells');

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
    side: q('.tm-side'),
    render(v) {
      if (set('money', `$${fmt.format(Math.floor(v.money))}`, money)) {
        money.classList.remove('pop');
        void money.offsetWidth; // restart the CSS animation
        money.classList.add('pop');
      }
      set('id', v.ticket.id);
      set('title', esc(v.ticket.title));
      set('log0', logLine(v.ticket.log[0]));
      set('log1', logLine(v.ticket.log[1]));
      set('pay', `выплата +$${v.pay}`);
      set('news', esc(v.news));
      set(
        'plan',
        v.classic ? 'режим сравнения: каждое нажатие — «Да»' : `тариф Pro · ${fmt.format(v.rate)} запроса в секунду`,
        plan,
      );

      const idle = v.queue === 0;
      ask.classList.toggle('idle', idle);
      key.classList.toggle('spent', idle && v.buffered > 0);
      set('ask', idle ? 'Клод думает…' : esc(v.ticket.asks[v.pips % v.ticket.asks.length]));
      think.style.width = idle ? `${Math.round(v.thinking * 100)}%` : '0';

      let dots = '';
      for (let i = 0; i < v.stepsPerTask; i++) dots += i < v.pips ? '<i class="on"></i>' : '<i></i>';
      set('pips', dots, pips);

      const waiting = Math.max(0, v.queue - 1);
      set('qlabel', v.classic ? '' : waiting > 0 ? `в очереди ещё ${waiting}:` : idle ? 'очередь пуста' : 'в очереди больше ничего');
      set('cells', '<i></i>'.repeat(v.classic ? 0 : Math.min(waiting, 24)), cells);
      const nextAsk = v.ticket.asks[(v.pips + 1) % v.ticket.asks.length];
      set('next', !v.classic && waiting > 0 ? `далее: ${esc(nextAsk)}` : '');
      set('ahead', v.buffered > 0 ? '«Да» дано заранее ✓' : '');

      const who = v.classic ? '' : idle ? 'claude' : v.queue >= 3 ? 'you' : 'none';
      if (last.who !== who) {
        last.who = who;
        neck.className = `tm-neck ${who}`;
        neck.innerHTML =
          who === 'claude'
            ? 'сейчас тормозит: <b>Клод</b> — ты жмёшь быстрее, чем он пишет'
            : who === 'you'
              ? 'сейчас тормозишь: <b>ты</b> — Клод ждёт твоего «Да»'
              : '';
      }
    },
    hit(kind) {
      if (kind === 'wasted') {
        pulse(key, 'miss', 110);
        return;
      }
      pulse(key, 'down', 90);
      if (kind === 'approved') pulse(sel, 'flash', 70);
    },
  };
}
