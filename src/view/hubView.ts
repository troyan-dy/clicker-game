import type Phaser from 'phaser';
import type { Rng } from '../core/rng';
import type { HubLayout } from '../data/layout/hubs';
import { CORAL } from './squares';
import { Walkers, type WalkerKind } from './walkers';

type Pt = readonly [number, number];

const INK = 0x262624;
const RULE = 0xc9c5b8;
/** the part of the screen a map may draw on: left of the shop, between the header and the news */
const FIELD = { x0: 16, x1: 1324, y0: 284, y1: 1012 };
const GHOST = 0.28; // what is not taken yet is a pale outline
const DOT_SPEED = 560; // px per second along a connector
const DOTS = 80;
const LAWN = 0xbcd1ca;
const ROAD = 0xe4e0d3;
const PICKET_H = 66; // a figure with a placard, px
const PICKETS = ['node_picket1', 'node_picket2', 'node_picket3'];
const RESTS = ['node_rest_bench', 'node_rest_chess', 'node_rest_hammock', 'node_rest_picnic', 'node_rest_easel', 'node_rest_fishing'];
const MASCOT = 'mascot';

/** What the player owns on a big screen: units of the employers and farms of sessions. */
export interface HubTopology {
  /** how much of each employer is taken, 0..1 by source id: the building is coloured in that far from the ground up */
  floors: Record<string, number>;
  /** units owned per farm id */
  farms: Record<string, number>;
  /** the people left without work stand at the buildings with placards (no allowance is paid) */
  picket: boolean;
  /** how many groups of people rest in the park, if the screen has one */
  rest: number;
  /** employers that are being taken right now, little by little: the colour follows without a jump */
  live: Record<string, boolean>;
  /** robot dogs that stand at an employer: the ones that took its jobs, and the pack that is taking the next ones */
  dogs: Record<string, number>;
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
  /** people with placards at the door */
  pickets: Phaser.GameObjects.Image[];
  /** Claude on the roof of a building taken whole */
  flag?: Phaser.GameObjects.Image;
  /** robot dogs that work here */
  dogs: Phaser.GameObjects.Image[];
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
  private readonly rests: Phaser.GameObjects.Image[] = [];
  private resting = 0;
  private readonly rng: Rng;
  private readonly walkers: Walkers;
  private readonly mid: Pt;
  /** called when a square of tasks reaches a farm: the tasks are closed there */
  onDelivered: (x: number, y: number) => void = () => undefined;

  constructor(scene: Phaser.Scene, layout: HubLayout, rng: Rng) {
    this.scene = scene;
    this.layout = layout;
    this.rng = rng;
    this.mid = [layout.home.x, layout.home.y - layout.home.h * 0.42];
    if (!scene.textures.exists(MASCOT)) {
      // Claude's face: a coral square with two eyes
      const g = scene.make.graphics({}, false);
      g.fillStyle(CORAL, 1).fillRect(0, 0, 26, 22);
      g.fillStyle(INK, 1).fillRect(7, 7, 4, 7).fillRect(15, 7, 4, 7);
      g.generateTexture(MASCOT, 26, 22);
      g.destroy();
    }
    this.lines = scene.add.graphics();
    this.root = scene.add.container(0, 0).setAlpha(0).setVisible(false);
    if (layout.backdrop) {
      const b = layout.backdrop;
      const img = scene.add.image(b.x, b.y, `node_${b.key}`).setOrigin(0.5, 1).setAlpha(b.alpha);
      this.root.add(img.setScale(b.h / img.height));
    }
    if (layout.streets) this.root.add(this.streets(layout.streets));
    if (layout.roads) this.root.add(this.roads());
    this.root.add(this.lines);
    for (const [i, [x, y]] of (layout.park?.slots ?? []).entries()) {
      const img = scene.add.image(x, y, RESTS[i % RESTS.length]).setOrigin(0.5, 1).setVisible(false);
      this.root.add(img.setScale(layout.park!.h / img.height));
      this.rests.push(img);
    }

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
        this.lots.set(p.id, { ghost: img, fill, scale, shown: 0, target: 0, pickets: [], dogs: [] });
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

  /** The dive: the camera comes down to this screen — it grows out of the point in its middle. */
  emerge(delayMs: number, ms: number): void {
    const { x, y } = this.layout.home;
    this.root.setVisible(true).setScale(0.12).setPosition(x * 0.88, y * 0.88);
    this.scene.tweens.add({ targets: this.root, scale: 1, x: 0, y: 0, alpha: 1, delay: delayMs, duration: ms, ease: 'Cubic.Out' });
  }

  /** …and the screen it dives into grows around its middle; it is gone before it reaches the shop. */
  diveIn(scale: number, ms: number): void {
    const { x, y } = this.layout.home;
    this.scene.tweens.add({ targets: this.root, alpha: 0, duration: ms * 0.6 });
    this.scene.tweens.add({
      targets: this.root,
      scale,
      x: x * (1 - scale),
      y: (y - this.layout.home.h / 2) * (1 - scale),
      duration: ms,
      ease: 'Cubic.In',
      onComplete: () => this.root.setVisible(false),
    });
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
      // those whose work was taken stand at the door: one, two when the whole building is gone
      this.picket(lot, place, t.picket && target > 0 ? (target >= 1 ? 2 : 1) : 0);
      if (target >= 1 && !lot.flag) this.raiseFlag(lot, place, lot.target > 0);
      this.guard(lot, place, t.dogs[id] ?? 0);
      if (target === lot.target) continue;
      const first = lot.target === 0;
      lot.target = target;
      if (t.live[id]) {
        // taken little by little: the colour simply follows
        this.scene.tweens.killTweensOf(lot);
        lot.shown = target;
        this.crop(lot);
      } else {
        // the colour climbs to the new floor, the building gives a little jump
        this.scene.tweens.add({ targets: lot, shown: target, duration: first ? 0 : 380, ease: 'Cubic.Out', onUpdate: () => this.crop(lot) });
        if (first) {
          lot.shown = target;
          this.crop(lot);
        }
        this.scene.tweens.add({ targets: [lot.ghost, lot.fill], scale: { from: lot.scale * 1.07, to: lot.scale }, duration: 300, ease: 'Back.Out' });
      }
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
    this.rest(Math.min(this.rests.length, t.rest));
  }

  /** `want` people with placards stand at the door of a building; the rest of them go. */
  private picket(lot: Lot, place: { x: number; y: number }, want: number): void {
    while (lot.pickets.length < want) {
      const n = lot.pickets.length;
      const img = this.scene.add.image(place.x - 62 - n * 24, place.y + 6 + n * 5, PICKETS[this.rng.int(0, PICKETS.length - 1)]).setOrigin(0.5, 1);
      const scale = PICKET_H / img.height;
      this.root.add(img.setScale(scale).setAlpha(0));
      this.scene.tweens.add({ targets: img, alpha: 1, scale: { from: scale * 0.7, to: scale }, delay: 500 + n * 250, duration: 260, ease: 'Back.Out' });
      lot.pickets.push(img);
    }
    while (lot.pickets.length > want) {
      const img = lot.pickets.pop()!;
      this.scene.tweens.add({ targets: img, alpha: 0, duration: 400, onComplete: () => img.destroy() });
    }
  }

  /** `want` robot dogs stand at the door of an employer: they work there instead of the people who left. */
  private guard(lot: Lot, place: { x: number; y: number }, want: number): void {
    while (lot.dogs.length < want) {
      const n = lot.dogs.length;
      const img = this.scene.add.image(place.x + 60 + n * 20, place.y + 8 + n * 5, 'node_robodog').setOrigin(0.5, 1).setFlipX(true);
      const scale = 42 / img.height;
      this.root.add(img.setScale(scale).setAlpha(0));
      this.scene.tweens.add({ targets: img, alpha: 1, delay: 900, duration: 250 });
      lot.dogs.push(img);
    }
    while (lot.dogs.length > want) {
      const img = lot.dogs.pop()!;
      this.scene.tweens.add({ targets: img, alpha: 0, duration: 250, onComplete: () => img.destroy() });
    }
  }

  /** Claude's face appears on the roof of a building that is taken whole; `pop` — it has just happened. */
  private raiseFlag(lot: Lot, place: { x: number; y: number }, pop: boolean): void {
    const flag = this.scene.add.image(place.x, place.y - lot.fill.displayHeight + 9, MASCOT).setOrigin(0.5, 1);
    this.root.add(flag);
    lot.flag = flag;
    if (pop) this.scene.tweens.add({ targets: flag, y: { from: flag.y - 46, to: flag.y }, alpha: { from: 0, to: 1 }, duration: 420, delay: 380, ease: 'Bounce.Out' });
  }

  /** `n` groups of people rest in the park: new ones settle in, the others get up and go. */
  private rest(n: number): void {
    if (n === this.resting) return;
    this.rests.forEach((img, i) => {
      const on = i < n;
      if (on === img.visible) return;
      if (on) {
        const scale = img.scale;
        img.setVisible(true).setAlpha(0);
        this.scene.tweens.add({ targets: img, alpha: 1, scale: { from: scale * 0.8, to: scale }, duration: 320, delay: 900, ease: 'Back.Out' });
      } else this.scene.tweens.add({ targets: img, alpha: 0, duration: 400, onComplete: () => img.setVisible(false) });
    });
    this.resting = n;
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

  /**
   * `count` people whose work was taken leave the building of an employer. `toPark` — they are paid
   * an allowance and go to rest: to the park of this screen, or off the map where there is none.
   */
  leave(id: string, count: number, toPark: boolean): void {
    const place = this.layout.lots[id];
    if (!place) return;
    const left = place.x < this.layout.home.x;
    const from: Pt = [place.x + (left ? -30 : 30), place.y + 4];
    const park = this.layout.park;
    if (toPark && park) {
      const [x, y] = park.slots[this.rng.int(0, park.slots.length - 1)];
      this.walkers.spawn('person', from, [x, y - 6], count);
    } else this.walkers.spawn('person', from, [left ? FIELD.x0 + 20 : FIELD.x1 - 20, place.y + 4], count);
  }

  /** `count` bodies of a kind walk from the middle to an employer: a robot to the job it takes, a squad to its work. */
  arrive(id: string, kind: WalkerKind, count = 1): void {
    const place = this.layout.lots[id];
    if (!place) return;
    const { x, y } = this.layout.home;
    this.walkers.spawn(kind, [x + (place.x < x ? -50 : 50), y + 2], [place.x + (place.x < x ? 40 : -40), place.y + 4], count);
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

  /** The street close up: two pale roads that cross in the middle, a lawn in the corner between them. */
  private roads(): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    const { x0, x1, y0, y1 } = FIELD;
    const { x: mx, y: my } = this.layout.home;
    const park = this.layout.park;
    if (park) {
      // the lawn under the people who rest
      const xs = park.slots.map((p) => p[0]);
      const ys = park.slots.map((p) => p[1]);
      const left = Math.min(...xs) - 90;
      const right = Math.max(...xs) + 70;
      const top = Math.min(...ys) - park.h - 4;
      const bottom = Math.max(...ys) + 12;
      g.fillStyle(LAWN, 0.32).fillRoundedRect(left, top, right - left, bottom - top, 26);
    }
    const half = 30; // half the width of a road, measured down the screen
    for (const slope of [0.5, -0.5]) {
      // the road goes through the middle: y = my + slope · (x − mx); cut to the field
      const at = (x: number): number => my + slope * (x - mx);
      const clip = (x: number): number => {
        const y = at(x);
        if (y > y1 - half) return mx + (y1 - half - my) / slope;
        if (y < y0 + half) return mx + (y0 + half - my) / slope;
        return x;
      };
      const xa = clip(x0);
      const xb = clip(x1);
      g.fillStyle(ROAD, 0.85);
      g.beginPath();
      g.moveTo(xa, at(xa) - half);
      g.lineTo(xb, at(xb) - half);
      g.lineTo(xb, at(xb) + half);
      g.lineTo(xa, at(xa) + half);
      g.closePath();
      g.fillPath();
      g.lineStyle(2, RULE, 1);
      g.lineBetween(xa, at(xa) - half, xb, at(xb) - half);
      g.lineBetween(xa, at(xa) + half, xb, at(xb) + half);
      // the dashes of the middle line
      g.lineStyle(3, 0xffffff, 0.9);
      for (let x = xa + 20; x < xb - 40; x += 70) g.lineBetween(x, at(x), x + 34, at(x + 34));
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
