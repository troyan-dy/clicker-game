import type Phaser from 'phaser';
import { BP } from '../data/layout/blueprint';
import { CITY } from '../data/layout/city';
import { CORAL } from './squares';

type Pt = readonly [number, number];

const INK = 0x262624;
const GHOST = 0.2; // a company that has not hired the player yet is a pale outline
const DOT_SPEED = 560; // px per second along a connector
const DOTS = 70;

interface Route {
  from: Pt;
  to: Pt;
  len: number;
}

interface Dot {
  rect: Phaser.GameObjects.Rectangle;
  route: Route | null;
  dist: number;
}

/**
 * The city (M16): the player's desk in the middle, company buildings around it. A company that
 * hired the player is drawn in full and sends squares of tasks to the desk. Draws state, decides nothing.
 */
export class CityView {
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly lines: Phaser.GameObjects.Graphics;
  private readonly buildings = new Map<string, Phaser.GameObjects.Image>();
  private readonly routes = new Map<string, Route>();
  private readonly dots: Dot[] = [];
  /** called when a square of tasks reaches the desk */
  onDelivered: (x: number, y: number) => void = () => undefined;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.lines = scene.add.graphics();
    this.root = scene.add.container(0, 0, [this.lines]).setAlpha(0).setVisible(false);

    // far rows first, so that nearer buildings overlap them
    const lots = Object.entries(CITY.lots).sort((a, b) => a[1].y - b[1].y);
    let homeAdded = false;
    const addHome = (): void => {
      const h = CITY.home;
      this.root.add(scene.add.image(h.x, h.y, 'node_desk').setOrigin(0.5, 1).setScale(h.scale * BP.desk.scale));
      homeAdded = true;
    };
    for (const [id, lot] of lots) {
      if (!homeAdded && lot.y > CITY.home.y) addHome();
      const img = scene.add.image(lot.x, lot.y, `node_${lot.key}`).setOrigin(0.5, 1).setAlpha(GHOST);
      img.setScale(Math.min(lot.h / img.height, CITY.maxWidth / img.width));
      this.root.add(img);
      this.buildings.set(id, img);
    }
    if (!homeAdded) addHome();

    for (let i = 0; i < DOTS; i++) {
      const rect = scene.add.rectangle(0, 0, 11, 11, CORAL).setVisible(false);
      this.root.add(rect);
      this.dots.push({ rect, route: null, dist: 0 });
    }
  }

  /** The pull-back: the city appears after `delayMs`. */
  show(delayMs: number): void {
    this.root.setVisible(true);
    this.scene.tweens.add({ targets: this.root, alpha: 1, delay: delayMs, duration: 500 });
  }

  /** Companies that hired the player light up and get a connector to the desk. */
  sync(owned: Record<string, number>): void {
    let changed = false;
    for (const [id, lot] of Object.entries(CITY.lots)) {
      if (!owned[id] || this.routes.has(id)) continue;
      const img = this.buildings.get(id)!;
      const scale = img.scale;
      img.setScale(scale * 0.7);
      this.scene.tweens.add({ targets: img, scale, alpha: 1, duration: 320, ease: 'Back.Out' });

      const from: Pt = [lot.x, lot.y - 22];
      const cx = CITY.home.x;
      const cy = CITY.home.y - 60;
      const len = Math.hypot(cx - from[0], cy - from[1]);
      const k = (len - CITY.homeRadius) / len;
      this.routes.set(id, { from, to: [from[0] + (cx - from[0]) * k, from[1] + (cy - from[1]) * k], len: len - CITY.homeRadius });
      changed = true;
    }
    if (changed) this.redrawLines();
  }

  /** Sends a square of tasks from a company to the desk. */
  flow(id: string): void {
    const route = this.routes.get(id);
    const dot = this.dots.find((d) => !d.route);
    if (!route || !dot) return;
    dot.route = route;
    dot.dist = 0;
    dot.rect.setPosition(route.from[0], route.from[1]).setVisible(true);
  }

  step(dt: number): void {
    for (const d of this.dots) {
      if (!d.route) continue;
      d.dist += DOT_SPEED * dt;
      const { from, to, len } = d.route;
      if (d.dist >= len) {
        this.onDelivered(to[0], to[1]);
        d.route = null;
        d.rect.setVisible(false);
        continue;
      }
      const f = d.dist / len;
      d.rect.setPosition(from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f);
    }
  }

  private redrawLines(): void {
    const g = this.lines;
    g.clear();
    g.lineStyle(2, INK, 1);
    g.fillStyle(INK, 1);
    for (const r of this.routes.values()) {
      g.lineBetween(r.from[0], r.from[1], r.to[0], r.to[1]);
      // an arrowhead at the desk
      const ux = (r.to[0] - r.from[0]) / r.len;
      const uy = (r.to[1] - r.from[1]) / r.len;
      const bx = r.to[0] - ux * 12;
      const by = r.to[1] - uy * 12;
      g.fillTriangle(r.to[0], r.to[1], bx - uy * 6, by + ux * 6, bx + uy * 6, by - ux * 6);
    }
  }
}
