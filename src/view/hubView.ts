import type Phaser from 'phaser';
import type { Rng } from '../core/rng';
import type { HubLayout } from '../data/layout/hubs';
import { CORAL } from './squares';
import { Walkers } from './walkers';

type Pt = readonly [number, number];

const INK = 0x262624;
const RULE = 0xc9c5b8;
/** the part of the screen a map may draw on: left of the shop, between the header and the news */
const FIELD = { x0: 16, x1: 1324, y0: 284, y1: 1012 };
const GHOST = 0.28; // what is not taken yet is a pale outline
const DOT_SPEED = 560; // px per second along a connector
const DOTS = 80;

/** What the player owns on a big screen: units of the employers and farms of sessions. */
export interface HubTopology {
  /** how much of each employer is taken, 0..1 by source id: the building is coloured in that far from the ground up */
  floors: Record<string, number>;
  /** units owned per farm id */
  farms: Record<string, number>;
}

interface Route {
  from: Pt;
  to: Pt;
  len: number;
  /** squares that arrive here have been turned into money */
  pays: boolean;
}

interface Dot {
  rect: Phaser.GameObjects.Rectangle;
  route: Route | null;
  dist: number;
}

/** An employer on the map: the pale outline, the coloured part over it, and how much of it is shown. */
interface Lot {
  ghost: Phaser.GameObjects.Image;
  fill: Phaser.GameObjects.Image;
  scale: number;
  /** the part coloured in right now, 0..1 */
  shown: number;
  target: number;
}

/**
 * A big screen (M16–M18): the previous screen as a node in the middle, employers around it, farms
 * of sessions next to it. An employer is taken unit by unit: its building is coloured in from the
 * ground up, squares of tasks run from it to the middle, the middle hands them to the farms.
 * Draws state, decides nothing.
 */
export class HubView {
  private readonly scene: Phaser.Scene;
  private readonly layout: HubLayout;
  private readonly root: Phaser.GameObjects.Container;
  private readonly lines: Phaser.GameObjects.Graphics;
  private readonly lots = new Map<string, Lot>();
  private readonly nodes = new Map<string, Phaser.GameObjects.Image>();
  private readonly routes = new Map<string, Route>();
  private readonly lit = new Map<string, string>();
  private readonly dots: Dot[] = [];
  private readonly walkers: Walkers;
  private readonly mid: Pt;
  /** called when a square of tasks reaches a farm: the tasks are closed there */
  onDelivered: (x: number, y: number) => void = () => undefined;

  constructor(scene: Phaser.Scene, layout: HubLayout, rng: Rng) {
    this.scene = scene;
    this.layout = layout;
    this.mid = [layout.home.x, layout.home.y - layout.home.h * 0.42];
    this.lines = scene.add.graphics();
    this.root = scene.add.container(0, 0).setAlpha(0).setVisible(false);
    if (layout.backdrop) {
      const b = layout.backdrop;
      const img = scene.add.image(b.x, b.y, `node_${b.key}`).setOrigin(0.5, 1).setAlpha(b.alpha);
      this.root.add(img.setScale(b.h / img.height));
    }
    if (layout.streets) this.root.add(this.streets(layout.streets));
    this.root.add(this.lines);

    // far rows first, so that nearer nodes overlap them
    const places = [
      ...Object.entries(layout.lots).map(([id, p]) => ({ id, ...p })),
      ...Object.entries(layout.farms).map(([id, p]) => ({ id: `farm:${id}`, key: p.key, x: p.x, y: p.y, h: p.h })),
      { id: 'home', ...layout.home },
    ].sort((a, b) => a.y - b.y);
    for (const p of places) {
      const img = scene.add.image(p.x, p.y, `node_${p.key}`).setOrigin(0.5, 1);
      const scale = this.fit(img, p.h);
      img.setScale(scale).setAlpha(p.id === 'home' ? 1 : GHOST);
      this.root.add(img);
      if (p.id in layout.lots) {
        // the same picture in full colour, cut off above the part that is taken
        const fill = scene.add.image(p.x, p.y, `node_${p.key}`).setOrigin(0.5, 1).setScale(scale);
        fill.setCrop(0, fill.height, fill.width, 0);
        this.root.add(fill);
        this.lots.set(p.id, { ghost: img, fill, scale, shown: 0, target: 0 });
      } else this.nodes.set(p.id, img);
    }
    this.walkers = new Walkers(scene, this.root, rng);

    for (let i = 0; i < DOTS; i++) {
      const rect = scene.add.rectangle(0, 0, 11, 11, CORAL).setVisible(false);
      this.root.add(rect);
      this.dots.push({ rect, route: null, dist: 0 });
    }
  }

  /** The pull-back: the screen appears after `delayMs`. */
  show(delayMs: number): void {
    this.root.setVisible(true);
    this.scene.tweens.add({ targets: this.root, alpha: 1, delay: delayMs, duration: 500 });
  }

  /** The next pull-back: the whole screen shrinks into one node — its middle lands at the foot (x, y) of that node. */
  shrinkTo(x: number, y: number, scale: number, ms: number): void {
    this.scene.tweens.add({
      targets: this.root,
      scale,
      x: x - this.layout.home.x * scale,
      y: y - this.layout.home.y * scale,
      alpha: 0,
      duration: ms,
      ease: 'Cubic.InOut',
      onComplete: () => this.root.setVisible(false),
    });
  }

  /** Whatever was bought shows: buildings are coloured in, connectors appear — employers → the middle → the farms. */
  sync(t: HubTopology): void {
    let changed = false;
    for (const [id, place] of Object.entries(this.layout.lots)) {
      const lot = this.lots.get(id)!;
      const target = Math.min(1, t.floors[id] ?? 0);
      if (target === lot.target) continue;
      const first = lot.target === 0;
      lot.target = target;
      // the colour climbs to the new floor, the building gives a little jump
      this.scene.tweens.add({ targets: lot, shown: target, duration: first ? 0 : 380, ease: 'Cubic.Out', onUpdate: () => this.crop(lot) });
      if (first) {
        lot.shown = target;
        this.crop(lot);
      }
      this.scene.tweens.add({ targets: [lot.ghost, lot.fill], scale: { from: lot.scale * 1.07, to: lot.scale }, duration: 300, ease: 'Back.Out' });
      if (!this.routes.has(id)) {
        this.routes.set(id, this.spoke([place.x, place.y - 22], false));
        changed = true;
      }
    }
    for (const [id, f] of Object.entries(this.layout.farms)) {
      if (!f.ids.some((farm) => t.farms[farm] > 0)) continue;
      // a farm node may grow: one rack becomes a row of them
      const key = f.upgrade && t.farms[f.upgrade.farm] > 0 ? f.upgrade.key : f.key;
      const node = `farm:${id}`;
      if (this.lit.get(node) === key) continue;
      const img = this.nodes.get(node)!;
      img.setTexture(`node_${key}`).setScale(this.fit(img, f.h));
      this.lit.set(node, key);
      const scale = img.scale;
      img.setScale(scale * 0.7);
      this.scene.tweens.add({ targets: img, scale, alpha: 1, duration: 320, ease: 'Back.Out' });
      this.routes.set(node, this.spoke(f.above ? [f.x, f.y + 6] : [f.x, f.y - f.h - 6], true));
      changed = true;
    }
    if (changed) this.redrawLines();
  }

  /** Sends a square along a connector: an employer id → the middle, `farm:<node>` → from the middle to that farm. */
  flow(id: string): void {
    const route = this.routes.get(id);
    const dot = this.dots.find((d) => !d.route);
    if (!route || !dot) return;
    dot.route = route;
    dot.dist = 0;
    dot.rect.setPosition(route.from[0], route.from[1]).setVisible(true);
  }

  /** `count` laid-off programmers leave the building of an employer and walk off the map, away from the middle. */
  leave(id: string, count: number): void {
    const place = this.layout.lots[id];
    if (!place) return;
    const limit = place.x < this.layout.home.x ? FIELD.x0 + 20 : FIELD.x1 - 20;
    this.walkers.spawn(place.x + (place.x < this.layout.home.x ? -30 : 30), place.y + 4, limit, count);
  }

  step(dt: number): void {
    for (const d of this.dots) {
      if (!d.route) continue;
      d.dist += DOT_SPEED * dt;
      const { from, to, len, pays } = d.route;
      if (d.dist >= len) {
        if (pays) this.onDelivered(to[0], to[1]);
        d.route = null;
        d.rect.setVisible(false);
        continue;
      }
      const f = d.dist / len;
      d.rect.setPosition(from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f);
    }
    this.walkers.step(dt);
  }

  /** Shows the taken part of a building: full colour up to `shown` of its height, the outline above. */
  private crop(lot: Lot): void {
    const h = lot.fill.height;
    const taken = Math.round(h * lot.shown);
    lot.fill.setCrop(0, h - taken, lot.fill.width, taken);
    lot.ghost.setAlpha(lot.shown >= 1 ? 0 : GHOST);
  }

  /** A city plan: two families of pale lines at the isometric angle, `gap` px apart. */
  private streets(gap: number): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    g.lineStyle(2, RULE, 0.9);
    const { x0, x1, y0, y1 } = FIELD;
    for (const slope of [0.5, -0.5]) {
      // y = slope · x + c; every line is cut to the field
      for (let c = -1200; c <= 2200; c += gap) {
        const xa = Math.max(x0, Math.min(x1, (slope > 0 ? y0 - c : y1 - c) / slope));
        const xb = Math.max(x0, Math.min(x1, (slope > 0 ? y1 - c : y0 - c) / slope));
        const ya = slope * xa + c;
        const yb = slope * xb + c;
        if (xb - xa < 4 || ya < y0 - 1 || ya > y1 + 1 || yb < y0 - 1 || yb > y1 + 1) continue;
        g.lineBetween(xa, ya, xb, yb);
      }
    }
    return g;
  }

  private fit(img: Phaser.GameObjects.Image, h: number): number {
    return Math.min(h / img.height, this.layout.maxWidth / img.width);
  }

  /**
   * A straight connector between a node and the edge of the middle. Employers send tasks in;
   * `outward` connectors carry them from the middle to a farm, where they become money.
   */
  private spoke(node: Pt, outward: boolean): Route {
    const [mx, my] = this.mid;
    const full = Math.hypot(mx - node[0], my - node[1]);
    const len = full - this.layout.homeRadius;
    const k = len / full;
    const edge: Pt = [node[0] + (mx - node[0]) * k, node[1] + (my - node[1]) * k];
    return outward ? { from: edge, to: node, len, pays: true } : { from: node, to: edge, len, pays: false };
  }

  private redrawLines(): void {
    const g = this.lines;
    g.clear();
    g.lineStyle(2, INK, 1);
    g.fillStyle(INK, 1);
    for (const r of this.routes.values()) {
      g.lineBetween(r.from[0], r.from[1], r.to[0], r.to[1]);
      // an arrowhead where the tasks arrive
      const ux = (r.to[0] - r.from[0]) / r.len;
      const uy = (r.to[1] - r.from[1]) / r.len;
      const bx = r.to[0] - ux * 12;
      const by = r.to[1] - uy * 12;
      g.fillTriangle(r.to[0], r.to[1], bx - uy * 6, by + ux * 6, bx + uy * 6, by - ux * 6);
    }
  }
}
