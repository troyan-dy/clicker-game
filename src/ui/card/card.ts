import './card.css';

export interface CardOption {
  label: string;
  /** dim text to the right of the label */
  note?: string;
  /** shown but cannot be picked */
  off?: boolean;
}

export interface CardSpec {
  /** the window title: «claude — утренний отчёт» */
  head: string;
  title: string;
  /** may contain <b> */
  lines: string[];
  options: CardOption[];
  /** the hint under the options */
  hint?: string;
}

/**
 * A dialog in the style of Claude's permission prompt: a dark terminal card over everything else.
 * Used for the morning report, the menu and the ending. Enter picks the highlighted option,
 * arrows and digits move the highlight, a click picks at once.
 */
export interface CardUi {
  show(spec: CardSpec, onPick: (index: number) => void): void;
  hide(): void;
  readonly open: boolean;
  /** Feeds a key press to the card. Returns true when the card is open: the key is spent. */
  key(e: KeyboardEvent): boolean;
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Adds the card to a 1920×1080 layer that sits above the canvas. */
export function createCard(layer: HTMLElement): CardUi {
  layer.insertAdjacentHTML(
    'beforeend',
    `
  <div class="card-veil">
    <div class="card">
      <header class="card-bar"><span class="card-dots"><i></i><i></i><i></i></span><span class="card-head"></span></header>
      <h2><i></i><span></span></h2>
      <div class="card-lines"></div>
      <div class="card-opts"></div>
      <div class="card-hint"></div>
    </div>
  </div>`,
  );
  const veil = layer.lastElementChild as HTMLElement;
  const q = (sel: string): HTMLElement => veil.querySelector<HTMLElement>(sel)!;
  const opts = q('.card-opts');
  let spec: CardSpec | null = null;
  let pick: (index: number) => void = () => undefined;
  let selected = 0;

  const paint = (): void => {
    if (!spec) return;
    opts.innerHTML = spec.options
      .map(
        (o, i) =>
          `<div class="card-opt${i === selected ? ' sel' : ''}${o.off ? ' off' : ''}" data-i="${i}"><span class="n">${i === selected ? '❯' : ''}</span>${i + 1}. ${esc(o.label)}<span class="note">${esc(o.note ?? '')}</span></div>`,
      )
      .join('');
  };
  const move = (step: number): void => {
    if (!spec) return;
    const n = spec.options.length;
    for (let k = 1; k <= n; k++) {
      const i = (selected + step * k + n * k) % n;
      if (!spec.options[i].off) {
        selected = i;
        break;
      }
    }
    paint();
  };
  const choose = (i: number): void => {
    if (!spec || spec.options[i]?.off) return;
    const done = pick;
    // the handler may open the next card at once
    spec = null;
    veil.classList.remove('on');
    done(i);
  };

  veil.addEventListener('pointerdown', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.card-opt');
    if (el) choose(Number(el.dataset.i));
  });

  return {
    get open() {
      return spec !== null;
    },
    show(next, onPick) {
      spec = next;
      pick = onPick;
      selected = Math.max(0, next.options.findIndex((o) => !o.off));
      q('.card-head').textContent = next.head;
      q('h2 span').textContent = next.title;
      q('.card-lines').innerHTML = next.lines.map((l) => `<p>${l}</p>`).join('');
      q('.card-hint').textContent = next.hint ?? 'Enter — Да';
      paint();
      veil.classList.add('on');
    },
    hide() {
      spec = null;
      veil.classList.remove('on');
    },
    key(e) {
      if (!spec) return false;
      e.preventDefault();
      if (e.repeat) return true;
      if (e.code === 'ArrowDown' || e.code === 'Tab') move(1);
      else if (e.code === 'ArrowUp') move(-1);
      else if (/^(Digit|Numpad)[1-9]$/.test(e.code)) choose(Number(e.code.slice(-1)) - 1);
      else if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') choose(selected);
      return true;
    },
  };
}
