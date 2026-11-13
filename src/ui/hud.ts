export interface Hud {
  setCount(n: number): void;
}

/** HTML layer over the canvas: crisp text. Reads state, decides nothing. */
export function createHud(root: HTMLElement): Hud {
  const count = document.createElement('div');
  count.className = 'hud-count';
  count.textContent = '0';
  const hint = document.createElement('div');
  hint.className = 'hud-hint';
  hint.textContent = 'Жми любую клавишу, чтобы согласиться с Клодом';
  root.append(count, hint);
  return {
    setCount(n) {
      count.textContent = String(n);
    },
  };
}
