import GUI from 'lil-gui';

export interface Knob {
  /** the object the mechanic reads; the very same instance */
  target: object;
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
}

export interface TuningPanel {
  toggle(): void;
  /** P: save the current values to .studioigor/captures/tuning/ (dev server) and print them */
  dump(snapshot: object): void;
}

/** Live tuning panel for a gym: sliders bound to the objects the mechanic reads every step. */
export function createTuningPanel(mechId: string, knobs: Knob[]): TuningPanel {
  const gui = new GUI({ title: `${mechId} — настройки (Tab)`, width: 360 });
  gui.domElement.style.zIndex = '10';
  for (const k of knobs) {
    gui.add(k.target as Record<string, unknown>, k.key, k.min, k.max, k.step).name(k.label);
  }
  gui.hide();
  let shown = false;
  return {
    toggle() {
      shown = !shown;
      if (shown) gui.show();
      else gui.hide();
    },
    dump(snapshot) {
      console.log(`TUNING ${mechId} ${JSON.stringify(snapshot)}`);
      void fetch(`/__tuning?id=${encodeURIComponent(mechId)}`, {
        method: 'POST',
        body: JSON.stringify(snapshot, null, 2),
      }).catch(() => undefined);
    },
  };
}
