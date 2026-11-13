import GUI from 'lil-gui';

export interface Knob {
  key: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export interface TuningPanel {
  toggle(): void;
  /** P: save the current values to .studioigor/captures/tuning/ (dev server) and print them */
  dump(): void;
  /** call after the object was changed from outside (presets) */
  refresh(): void;
}

/** Live tuning panel for a gym: sliders bound to the very object the mechanic reads every step. */
export function createTuningPanel(mechId: string, target: object, knobs: Knob[]): TuningPanel {
  const gui = new GUI({ title: `${mechId} — настройки (Tab)`, width: 340 });
  gui.domElement.style.zIndex = '10';
  const bag = target as Record<string, unknown>;
  for (const k of knobs) {
    if (k.options) gui.add(bag, k.key, k.options);
    else gui.add(bag, k.key, k.min, k.max, k.step);
  }
  gui.hide();
  let shown = false;
  return {
    toggle() {
      shown = !shown;
      if (shown) gui.show();
      else gui.hide();
    },
    dump() {
      const body = JSON.stringify(target, null, 2);
      console.log(`TUNING ${mechId} ${JSON.stringify(target)}`);
      void fetch(`/__tuning?id=${encodeURIComponent(mechId)}`, { method: 'POST', body }).catch(() => undefined);
    },
    refresh() {
      for (const c of gui.controllersRecursive()) c.updateDisplay();
    },
  };
}
