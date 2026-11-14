import type Phaser from 'phaser';
import type { Rng } from '../core/rng';

type Pt = readonly [number, number];

/** who walks: a laid-off worker with a box, or Claude in a body from the factory */
export type WalkerKind = 'person' | 'android' | 'robodog';

/** the pictures a kind is drawn with, its height on the screen and its speed, px per second */
const LOOK: Record<WalkerKind, { keys: readonly string[]; h: number; speed: number }> = {
  person: { keys: ['node_person1', 'node_person2', 'node_person3'], h: 46, speed: 80 },
  android: { keys: ['node_android'], h: 58, speed: 110 },
  robodog: { keys: ['node_robodog'], h: 42, speed: 170 },
};
const POOL = 36;

interface Walker {
  img: Phaser.GameObjects.Image;
  live: boolean;
  /** seconds until it steps out of the door */
  wait: number;
  x: number;
  y: number;
  /** the unit vector of its way and what is left of it, px */
  ux: number;
  uy: number;
  left: number;
  speed: number;
  t: number;
}

/**
 * Small figures that walk across a picture (M19, M24, M25): laid-off people with cardboard boxes
 * leave a building, androids and robot dogs go from the factory to the place they take.
 * Pooled; draws, decides nothing.
 */
export class Walkers {
  private readonly rng: Rng;
  private readonly pool: Walker[] = [];

  constructor(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, rng: Rng) {
    this.rng = rng;
    for (let i = 0; i < POOL; i++) {
      const img = scene.add.image(0, 0, 'node_person1').setOrigin(0.5, 1).setVisible(false);
      parent.add(img);
      this.pool.push({ img, live: false, wait: 0, x: 0, y: 0, ux: 1, uy: 0, left: 0, speed: 0, t: 0 });
    }
  }

  /** `count` figures of a kind leave `from` one after another, walk to `to` and fade there. */
  spawn(kind: WalkerKind, from: Pt, to: Pt, count: number): void {
    const look = LOOK[kind];
    for (let i = 0; i < count; i++) {
      const w = this.pool.find((p) => !p.live);
      if (!w) return;
      const y = from[1] + this.rng.range(-4, 6);
      const dx = to[0] - from[0];
      const dy = to[1] + this.rng.range(-6, 6) - y;
      const len = Math.max(1, Math.hypot(dx, dy));
      w.live = true;
      w.wait = i * 0.45 + this.rng.range(0, 0.2);
      w.x = from[0];
      w.y = y;
      w.ux = dx / len;
      w.uy = dy / len;
      w.left = len;
      w.speed = look.speed;
      w.t = this.rng.range(0, 6);
      // the pictures walk to the right: turned around for the way left
      w.img.setTexture(look.keys[this.rng.int(0, look.keys.length - 1)]);
      w.img.setScale(look.h / w.img.height).setFlipX(dx < 0).setPosition(w.x, w.y).setAlpha(0).setVisible(true);
    }
  }

  step(dt: number): void {
    for (const w of this.pool) {
      if (!w.live) continue;
      if (w.wait > 0) {
        w.wait -= dt;
        continue;
      }
      w.t += dt;
      const gone = w.left <= 0;
      if (!gone) {
        const d = w.speed * dt;
        w.x += w.ux * d;
        w.y += w.uy * d;
        w.left -= d;
      }
      // a small bob of the step; out of the door it appears, at the end of its way it fades
      w.img.setPosition(w.x, w.y - Math.abs(Math.sin(w.t * 9)) * 2.5);
      w.img.setAlpha(gone ? w.img.alpha - dt * 3 : Math.min(1, w.img.alpha + dt * 5));
      if (gone && w.img.alpha <= 0) {
        w.live = false;
        w.img.setVisible(false);
      }
    }
  }
}
