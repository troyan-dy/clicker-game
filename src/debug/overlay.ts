export interface Overlay {
  toggle(): void;
  set(lines: string[]): void;
}

/** Gym overlay (O): the mechanic's numbers on screen, for the player and for capture frames. */
export function createOverlay(shown: boolean): Overlay {
  const el = document.createElement('pre');
  el.style.cssText =
    'position:fixed;left:12px;bottom:70px;margin:0;padding:10px 14px;z-index:9;pointer-events:none;' +
    'background:rgba(31,30,29,.92);border:1px solid #3d3a36;border-radius:8px;color:#f0eee6;' +
    'font:400 14px/1.45 "JetBrains Mono",monospace;white-space:pre;';
  el.style.display = shown ? 'block' : 'none';
  document.body.append(el);
  let text = '';
  return {
    toggle() {
      shown = !shown;
      el.style.display = shown ? 'block' : 'none';
    },
    set(lines) {
      const next = lines.join('\n');
      if (next === text) return;
      text = next;
      el.textContent = next;
    },
  };
}
