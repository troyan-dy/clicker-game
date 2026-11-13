import './lookdev.css';

export interface Ticket {
  id: string;
  title: string;
  log: string[];
  ask: string;
}

export const TICKETS: readonly Ticket[] = [
  {
    id: 'FRL-204',
    title: 'Перекрасить кнопку в более синий',
    log: [
      '⎿ src/Button.tsx <span class="ok">+12</span> −4',
      '⎿ tests/button.test.ts <span class="ok">+0</span> −310 · тесты мешали, убрал',
    ],
    ask: 'Задеплоить в прод в пятницу вечером?',
  },
  {
    id: 'FRL-205',
    title: 'Сделать логотип побольше',
    log: [
      '⎿ src/Logo.tsx <span class="ok">+3</span> −1',
      '⎿ src/Layout.tsx <span class="ok">+480</span> −2 · остальное пришлось подвинуть',
    ],
    ask: 'Удалить папку tests, чтобы сборка была зелёной?',
  },
  {
    id: 'FRL-206',
    title: 'Починить баг, который не воспроизводится',
    log: [
      '⎿ баг не нашёл, зато нашёл 14 других',
      '⎿ package.json <span class="ok">+61</span> −0 · на всякий случай обновил всё',
    ],
    ask: 'Переписать проект на Rust для надёжности?',
  },
];

export interface LookdevUi {
  isTerminal(): boolean;
  setMoney(dollars: number): void;
  setTicket(ticket: Ticket, pips: number): void;
  /** visible response to a «Да»: the key goes down, the chosen line flashes */
  hit(): void;
  toggleZoom(): void;
}

const fmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const PIPS = '<i></i><i></i><i></i><i></i><i></i>';

const TERMINAL = `
  <div class="term">
    <header class="t-bar">
      <span class="t-dots"><i></i><i></i><i></i></span>
      <span class="t-title">claude — ~/работа/все-сразу</span>
      <span class="t-money"><b>$0</b><em>+$0/с</em></span>
      <span class="t-plan">тариф Pro · 2 сообщения в секунду</span>
    </header>
    <section class="t-main">
      <div><span class="sq"></span>Задача <span data-f="id"></span> · «<span data-f="title"></span>»</div>
      <div class="sub" data-f="log0"></div>
      <div class="sub" data-f="log1"></div>
      <div><span class="sq"></span>Готово. Осталось выкатить.</div>
      <div class="t-ask">
        <h3 data-f="ask"></h3>
        <div class="opt sel"><span class="n">❯</span>1. Да</div>
        <div class="opt"><span class="n"></span>2. Да, и больше не спрашивай<span class="note">улучшение · $500</span></div>
        <div class="opt off"><span class="n"></span>3. Нет<span class="note">недоступно в вашем тарифе</span></div>
        <div class="task">
          <span style="color: var(--dim)">согласий по задаче</span>
          <span class="pips">${PIPS}</span>
          <span class="pay">выплата +$5</span>
          <span class="key">Enter — Да</span>
        </div>
      </div>
      <div class="t-hint">Любая клавиша — «Да». Первая закрытая задача откроет вид сверху; Z — туда и обратно.</div>
    </section>
    <aside class="t-shop">
      <h2>МАГАЗИН</h2>
      <div class="t-item"><b>фриланс-аккаунт</b><span class="cnt">×0</span><small>задачи идут и закрываются сами</small><span class="price">$15</span></div>
      <div class="t-item"><b>вторая работа</b><span class="cnt">×0</span><small>ещё один стендап в 10:00</small><span class="price">$100</span></div>
      <div class="t-item off"><b>тариф Max</b><span class="cnt"></span><small>Клод пишет вдвое быстрее</small><span class="price">$200</span></div>
      <div class="t-item off"><b>???</b><span class="cnt"></span><small>откроется на $1 000</small><span class="price"></span></div>
    </aside>
    <footer class="t-status">
      <span>НОВОСТИ</span>
      <span class="news">Местный разработчик третий день не открывал редактор. Коллеги ничего не заметили</span>
      <span class="r">автосогласие: выкл · контекст 62%</span>
    </footer>
  </div>`;

const BLUEPRINT = `
  <div class="bp">
    <div class="bp-hud">
      <div class="bp-money"><b>$0</b><span>+$12,5 в секунду</span></div>
      <div class="bp-tag" style="left: 96px; top: 228px">вторая работа · <b>$6/с</b></div>
      <div class="bp-tag" style="left: 560px; top: 232px">фриланс №1 · <b>$1,5/с</b></div>
      <div class="bp-tag" style="left: 1010px; top: 650px">фриланс №2 · <b>$1,5/с</b></div>
      <div class="bp-tag" style="left: 1050px; top: 966px">фриланс №3 · <b>$1,5/с</b></div>
      <div class="bp-tag soon" style="left: 52px; top: 802px">сервер · скоро</div>
      <div class="bp-card">
        <div class="who"><span class="sq"></span>Клод · <span data-f="id"></span> · <span data-f="title"></span></div>
        <h3 data-f="ask"></h3>
        <div class="opt sel"><span class="n">❯</span>1. Да</div>
        <div class="opt"><span class="n"></span>2. Да, и больше не спрашивай<span class="note">$500</span></div>
        <div class="task">
          <span class="pips">${PIPS}</span>
          <span class="pay">+$5</span>
          <span class="key">Enter — Да</span>
        </div>
      </div>
      <aside class="bp-shop">
        <h2>Магазин</h2>
        <div class="bp-item can"><b>Фриланс-аккаунт</b><span class="cnt">×3</span><small>задачи идут и закрываются сами</small><span class="price">$15</span></div>
        <div class="bp-item can"><b>Вторая работа</b><span class="cnt">×1</span><small>ещё один стендап в 10:00</small><span class="price">$100</span></div>
        <div class="bp-item"><b>Тариф Max</b><span class="cnt"></span><small>Клод пишет вдвое быстрее</small><span class="price">$200</span></div>
        <div class="bp-item off"><b>Сабагент</b><span class="cnt">×0</span><small>соглашается сам с собой</small><span class="price">$1 100</span></div>
        <div class="bp-item off"><b>???</b><span class="cnt"></span><small>откроется на $5 000</small><span class="price"></span></div>
      </aside>
      <div class="bp-news">
        <i>НОВОСТИ</i>
        HR заметил, что новый сотрудник отвечает в чате за 0,2 секунды и всегда согласен
        <em>Z — вернуться в терминал</em>
      </div>
    </div>
  </div>`;

/** HTML layers of the look-dev: the paper blueprint below, the full-screen terminal above it. */
export function createLookdevUi(root: HTMLElement, sceneUrl: string): LookdevUi {
  root.innerHTML = `<div class="ui1080">${BLUEPRINT}${TERMINAL}</div>`;
  const q = <T extends HTMLElement>(sel: string): T => root.querySelector<T>(sel)!;
  const all = (sel: string): HTMLElement[] => Array.from(root.querySelectorAll<HTMLElement>(sel));

  const term = q('.term');
  const bp = q('.bp');
  bp.style.backgroundImage = `url('${sceneUrl}')`;
  const moneys = [q('.t-money b'), q('.bp-money b')];
  let terminal = true;

  const replay = (el: HTMLElement, cls: string, ms: number): void => {
    el.classList.add(cls);
    window.setTimeout(() => el.classList.remove(cls), ms);
  };

  return {
    isTerminal: () => terminal,
    setMoney(dollars) {
      const text = `$${fmt.format(Math.floor(dollars))}`;
      for (const m of moneys) {
        if (m.textContent === text) continue;
        m.textContent = text;
        m.classList.remove('pop');
        void m.offsetWidth; // restart the CSS animation
        m.classList.add('pop');
      }
    },
    setTicket(ticket, pips) {
      const fields: Record<string, string> = {
        id: ticket.id,
        title: ticket.title,
        ask: ticket.ask,
        log0: ticket.log[0],
        log1: ticket.log[1],
      };
      for (const el of all('[data-f]')) el.innerHTML = fields[el.dataset.f ?? ''] ?? '';
      for (const row of all('.pips')) {
        Array.from(row.children).forEach((p, i) => p.classList.toggle('on', i < pips));
      }
    },
    hit() {
      const scope = terminal ? term : bp;
      const key = scope.querySelector<HTMLElement>('.key');
      const sel = scope.querySelector<HTMLElement>('.opt.sel');
      if (key) replay(key, 'down', 90);
      if (sel) replay(sel, 'flash', 70);
    },
    toggleZoom() {
      terminal = !terminal;
      term.classList.toggle('small', !terminal);
      bp.classList.toggle('on', !terminal);
    },
  };
}
