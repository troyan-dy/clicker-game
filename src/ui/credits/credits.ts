import './credits.css';
import { L } from '../../core/lang';

export interface CreditsSpec {
  title: string;
  /** a dim line under the title */
  tagline: string;
  blocks: { role: string; names: string[] }[];
  /** small print after the names */
  notes: string[];
  /** the last line: it stops in the middle and stays for a moment */
  end: string;
  /** «side» — a column to the right of the picture of the ending; «solo» — over a dark screen of its own */
  place: 'side' | 'solo';
}

/**
 * The credits: a column of names that rolls up the screen, as after a film. A held key or mouse
 * button makes it run faster, Esc ends it.
 */
export interface CreditsUi {
  /** Starts the roll; `done` is called once — the last line has gone, or the roll was skipped. */
  roll(spec: CreditsSpec, done: () => void): void;
  /** Moves the roll by `dt` seconds. */
  step(dt: number): void;
  readonly rolling: boolean;
}

/** pixels of the 1920×1080 layer per second */
const SPEED = 96;
/** how much faster the roll runs while a key is held */
const FAST = 7;
/** the last line stays in the middle this long, s */
const HOLD = 2.6;
const FADE_MS = 500;

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Adds the credits to a 1920×1080 layer that sits above the canvas. */
export function createCredits(layer: HTMLElement): CreditsUi {
  layer.insertAdjacentHTML('beforeend', `<div class="cr"><div class="cr-win"><div class="cr-roll"></div></div><div class="cr-hint">${L('держите любую клавишу — быстрее · Esc — пропустить', 'hold any key — faster · Esc — skip')}</div></div>`);
  const root = layer.lastElementChild as HTMLElement;
  const win = root.querySelector<HTMLElement>('.cr-win')!;
  const roll = root.querySelector<HTMLElement>('.cr-roll')!;
  let done: (() => void) | null = null;
  let y = 0;
  let stopAt = 0;
  let hold = 0;
  const keys = new Set<string>();
  let pointer = false;

  const finish = (): void => {
    const call = done;
    if (!call) return;
    done = null;
    keys.clear();
    pointer = false;
    root.classList.remove('on');
    // the column fades out before the next thing appears
    window.setTimeout(call, FADE_MS);
  };

  window.addEventListener('keydown', (e) => {
    if (!done) return;
    if (e.code === 'Escape') finish();
    else keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('pointerdown', () => {
    if (done) pointer = true;
  });
  window.addEventListener('pointerup', () => (pointer = false));
  window.addEventListener('blur', () => {
    keys.clear();
    pointer = false;
  });

  return {
    get rolling() {
      return done !== null;
    },
    roll(spec, onDone) {
      roll.innerHTML =
        `<div class="cr-title"><i></i><b>${esc(spec.title)}</b><span>${esc(spec.tagline)}</span></div>` +
        spec.blocks.map((b) => `<div class="cr-block"><i>${esc(b.role)}</i>${b.names.map((n) => `<b>${esc(n)}</b>`).join('')}</div>`).join('') +
        `<div class="cr-notes">${spec.notes.map((n) => `<p>${esc(n)}</p>`).join('')}</div>` +
        `<div class="cr-end">${esc(spec.end)}</div>`;
      root.className = `cr on ${spec.place}`;
      const end = roll.querySelector<HTMLElement>('.cr-end')!;
      // the first line comes from under the lower edge; the roll stops when the last one is in the middle
      y = win.clientHeight;
      stopAt = win.clientHeight / 2 - (end.offsetTop + end.offsetHeight / 2);
      hold = HOLD;
      roll.style.transform = `translateY(${y}px)`;
      done = onDone;
    },
    step(dt) {
      if (!done) return;
      const k = keys.size || pointer ? FAST : 1;
      if (y > stopAt) {
        y = Math.max(stopAt, y - SPEED * k * dt);
        roll.style.transform = `translateY(${y.toFixed(1)}px)`;
      } else {
        hold -= dt * k;
        if (hold <= 0) finish();
      }
    },
  };
}
