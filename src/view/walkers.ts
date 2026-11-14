import type Phaser from 'phaser';
import type { Rng } from '../core/rng';

const SPEED = 80; // px per second
const HEIGHT = 46; // px a figure is drawn at
const KINDS = 3;
const POOL = 24;

interface Walker {
  img: Phaser.GameObjects.Image;
  live: boolean;
  /** seconds until it steps out of the door */
  wait: number;
  dir: number;
  /** it walks until it crosses this x, then fades */
  limit: number;
  baseY: number;
  t: number;
}

/**
 * The laid-off programmers (M19): small figures with cardboard boxes that walk out of a building
 * whose work the player has taken over, and off the picture. Pooled; draws, decides nothing.
 */
export class Walkers {
  private readonly rng: Rng;
  private readonly pool: Walker[] = [];

  constructor(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, rng: Rng) {
    this.rng = rng;
    for (let i = 0; i < POOL; i++) {
      const img = scene.add.image(0, 0, 'node_person1').setOrigin(0.5, 1).setVisible(false);
      img.setScale(HEIGHT / img.height);
      parent.add(img);
      this.pool.push({ img, live: false, wait: 0, dir: 1, limit: 0, baseY: 0, t: 0 });
    }
  }

  /** `count` figures leave the door at (x, y) one after another and walk towards `limit`. */
  spawn(x: number, y: number, limit: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const w = this.pool.find((p) => !p.live);
      if (!w) return;
      w.live = true;
      w.wait = i * 0.45 + this.rng.range(0, 0.2);
      w.dir = limit < x ? -1 : 1;
      w.limit = limit;
      w.baseY = y + this.rng.range(-4, 6);
      w.t = this.rng.range(0, 6);
      // the pictures walk to the right: turned around for the way left
      w.img.setTexture(`node_person${this.rng.int(1, KINDS)}`).setFlipX(w.dir < 0).setPosition(x, w.baseY).setAlpha(0).setVisible(true);
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
      const x = w.img.x + w.dir * SPEED * dt;
      const gone = w.dir < 0 ? x <= w.limit : x >= w.limit;
      // a small bob of the step; out of the door it appears, at the edge it fades
      w.img.setPosition(x, w.baseY - Math.abs(Math.sin(w.t * 9)) * 2.5);
      w.img.setAlpha(gone ? w.img.alpha - dt * 3 : Math.min(1, w.img.alpha + dt * 5));
      if (gone && w.img.alpha <= 0) {
        w.live = false;
        w.img.setVisible(false);
      }
    }
  }
}
