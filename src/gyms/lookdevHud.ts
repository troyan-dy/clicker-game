import './lookdev.css';

export interface LookdevHud {
  setMoney(dollars: number): void;
  setPips(done: number): void;
  hitBubble(): void;
}

const fmt = new Intl.NumberFormat('ru-RU');

/** Static HUD mock for the look-dev scene. The real UI is built with the mechanics. */
export function createLookdevHud(root: HTMLElement, cardUrl: string): LookdevHud {
  root.innerHTML = `
    <div class="ld">
      <div class="ld-money">
        <span class="ld-money-value">$0</span>
        <span class="ld-money-rate">+$12,5 в секунду</span>
      </div>
      <div class="ld-bubble">
        <div class="ld-ticket">Задача · фриланс</div>
        <div class="ld-name">Перекрасить кнопку в более синий</div>
        <div class="ld-say"><b>Клод:</b> Сделал синее. Задеплоить в прод?</div>
        <div class="ld-row">
          <div class="ld-pips"><i></i><i></i><i></i><i></i><i></i></div>
          <div class="ld-pay">+$5</div>
          <div class="ld-hint"><span class="ld-keycap">Enter</span>Да</div>
        </div>
      </div>
      <aside class="ld-shop">
        <h2>Магазин</h2>
        <div class="ld-tag">
          <div class="ld-tag-pic"></div>
          <div>
            <span class="ld-tag-count">3</span>
            <div class="ld-tag-title">Фриланс-биржа</div>
            <div class="ld-tag-sub">задачи идут сами</div>
            <div class="ld-tag-price">$15</div>
          </div>
        </div>
        <div class="ld-tag poor">
          <div class="ld-tag-pic" style="background-image:url('${cardUrl}')"></div>
          <div>
            <div class="ld-tag-title">Вторая работа</div>
            <div class="ld-tag-sub">ещё один стендап в 10:00</div>
            <div class="ld-tag-price">$100</div>
          </div>
        </div>
        <div class="ld-tag locked">
          <div class="ld-tag-pic"></div>
          <div>
            <div class="ld-tag-title">???</div>
            <div class="ld-tag-sub">откроется позже</div>
          </div>
        </div>
      </aside>
      <div class="ld-news">
        <b>Новости</b>
        HR заметил, что новый сотрудник отвечает в рабочем чате за 0,2 секунды и всегда согласен
      </div>
    </div>`;

  const money = root.querySelector<HTMLElement>('.ld-money-value')!;
  const bubble = root.querySelector<HTMLElement>('.ld-bubble')!;
  const pips = Array.from(root.querySelectorAll<HTMLElement>('.ld-pips i'));

  const replay = (el: HTMLElement, cls: string): void => {
    el.classList.remove(cls);
    void el.offsetWidth; // restart the CSS animation
    el.classList.add(cls);
  };

  return {
    setMoney(dollars) {
      money.textContent = `$${fmt.format(dollars)}`;
      replay(money, 'pop');
    },
    setPips(done) {
      pips.forEach((p, i) => p.classList.toggle('on', i < done));
    },
    hitBubble() {
      replay(bubble, 'hit');
    },
  };
}
