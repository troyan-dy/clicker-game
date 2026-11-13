import type Phaser from 'phaser';
import type { Rng } from '../core/rng';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Square {
  rect: Phaser.GameObjects.Rectangle;
  live: boolean;
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  tx: number;
  ty: number;
  t: number;
  dur: number;
  landColor: number;
}

export const CORAL = 0xd97757;

/** Claude's squares: a pooled burst that flies along an arc into a target and changes colour on the way in. */
export class Squares {
  private readonly pool: Square[] = [];
  private readonly rng: Rng;

  constructor(scene: Phaser.Scene, rng: Rng, size = 500) {
    this.rng = rng;
    for (let i = 0; i < size; i++) {
      const rect = scene.add.rectangle(0, 0, 12, 12, CORAL).setVisible(false);
      this.pool.push({ rect, live: false, x0: 0, y0: 0, cx: 0, cy: 0, tx: 0, ty: 0, t: 0, dur: 1, landColor: CORAL });
    }
  }

  /** `arc` — how far the path bows out, px; `dur` — flight time range, s. */
  fly(from: Rect, to: Rect, count: number, landColor: number, arc: number, dur: readonly [number, number]): void {
    for (let i = 0; i < count; i++) {
      const s = this.pool.find((p) => !p.live);
      if (!s) return;
      s.live = true;
      s.x0 = this.rng.range(from.x, from.x + from.w);
      s.y0 = this.rng.range(from.y, from.y + from.h);
      s.tx = this.rng.range(to.x, to.x + to.w);
      s.ty = this.rng.range(to.y, to.y + to.h);
      s.cx = (s.x0 + s.tx) / 2 + this.rng.range(-arc, arc);
      s.cy = (s.y0 + s.ty) / 2 - this.rng.range(0.2 * arc, arc);
      s.t = 0;
      s.dur = this.rng.range(dur[0], dur[1]);
      s.landColor = landColor;
      const size = this.rng.int(10, 16);
      s.rect.setPosition(s.x0, s.y0).setSize(size, size).setFillStyle(CORAL).setScale(1).setVisible(true);
    }
  }

  step(dt: number): void {
    for (const s of this.pool) {
      if (!s.live) continue;
      s.t += dt / s.dur;
      if (s.t >= 1) {
        s.live = false;
        s.rect.setVisible(false);
        continue;
      }
      const u = s.t;
      const v = 1 - u;
      s.rect.x = v * v * s.x0 + 2 * v * u * s.cx + u * u * s.tx;
      s.rect.y = v * v * s.y0 + 2 * v * u * s.cy + u * u * s.ty;
      if (u > 0.7) s.rect.setFillStyle(s.landColor).setScale(1 - (u - 0.7) * 1.4);
    }
  }
}
