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
const PICKET_H = 86; // a figure with a placard, px
const PICKETS = ['node_picket1', 'node_picket2', 'node_picket3'];
const RESTS = ['node_rest_bench', 'node_rest_chess', 'node_rest_hammock', 'node_rest_picnic', 'node_rest_easel', 'node_rest_fishing'];
const MASCOT = 'mascot';
const POWER = 0x6a9bcc; // what runs from the ziggurat to the things it feeds
const SUN = 0xd4a27f;
const SPARKS = 28;
const POD = 0xe59a84; // a capsule with a sleeper in it: warm against the dark wall
const POD_EMPTY = 0x4a4844; // …and one that is waiting for the next shift
const DRONES = 7;
/** the pictures a service drone is drawn with: flying, at work, with a towel */
const DRONE_LOOK = ['node_drone', 'node_drone_work', 'node_drone_towel'];

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
  /** employers whose door is blocked by a strike: the whole picket is there */
  struck: Record<string, boolean>;
  /** units of robot police on guard at the middle */
  guards: number;
  /**
   * The ziggurat of the screen (M28): `built` — the part of its tiers that stands, `power` — the part of
   * the power asked for that is given, `hour` — how far the day or the night has gone, each 0..1;
   * `tiers` — how many of them stand, `crew` — the part of the capsules that is taken, 0..1 (it dips
   * while the shifts change), `bots` — how many service drones look after the tower.
   */
  grid?: { built: number; power: number; hour: number; night: boolean; tiers: number; crew: number; bots: number };
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
  private readonly police: Phaser.GameObjects.Image[] = [];
  /** small squares of power that run from the ziggurat to what it feeds */
  private readonly sparks: Dot[] = [];
  /** the ziggurat in the middle, coloured in tier by tier */
  private zig?: Lot;
  /** the capsules on the walls of the tower, tier by tier, in the order people lie down in them */
  private heads?: Phaser.GameObjects.Graphics;
  private readonly beds: { x: number; y: number; tier: number }[] = [];
  private lying = '';
  /** the service drones: where each one is, where it flies, how long it still works on the spot */
  private readonly drones: { img: Phaser.GameObjects.Image; tx: number; ty: number; wait: number; t: number }[] = [];
  private tiers = 0;
  private dial?: Phaser.GameObjects.Graphics;
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
    if (layout.park) this.root.add(this.lawn());
    if (layout.belts) this.root.add(this.belts());
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
      const zig = p.id === 'home' && !!layout.grid;
      const scale = this.fit(img, p.h, p.id === 'home' ? layout.homeWidth : undefined);
      img.setScale(scale).setAlpha(p.id === 'home' && !zig ? 1 : GHOST);
      this.root.add(img);
      if (zig) {
        // the ziggurat is built like an employer is taken: the outline first, the colour tier by tier
        const fill = scene.add.image(p.x, p.y, `node_${p.key}`).setOrigin(0.5, 1).setScale(scale);
        fill.setCrop(0, fill.height, fill.width, 0);
        this.root.add(fill);
        this.zig = { ghost: img, fill, scale, shown: 0, target: -1, pickets: [], dogs: [] };
      } else if (p.id in layout.lots) {
        // the same picture in full colour, cut off above the part that is taken
        const fill = scene.add.image(p.x, p.y, `node_${p.key}`).setOrigin(0.5, 1).setScale(scale);
        fill.setCrop(0, fill.height, fill.width, 0);
        this.root.add(fill);
        this.lots.set(p.id, { ghost: img, fill, scale, shown: 0, target: 0, pickets: [], dogs: [] });
      } else this.nodes.set(p.id, img);
    }
    if (layout.grid) {
      this.dial = scene.add.graphics();
      this.heads = scene.add.graphics();
      this.root.add([this.dial, this.heads]);
      // capsules in two rows along the front wall of every tier, on both sides of the cables
      const k = this.zig!.fill.scaleX;
      const left = layout.home.x - (layout.grid.size[0] * k) / 2;
      const top = layout.home.y - layout.grid.size[1] * k;
      layout.grid.faces.forEach(([y, x0, x1, cables, h], tier) => {
        const rows = h > 120 ? [0.2, 0.5, 0.8] : [0.3, 0.72];
        for (const part of rows) {
          for (let x = x0 + 18; x <= x1 - 14; x += 27) {
            if (Math.abs(x - cables) > 40) this.beds.push({ x: left + x * k, y: top + (y + h * part + (x - x0) * layout.grid!.slope) * k, tier });
          }
        }
      });
      // people lie down where they like, not from left to right
      for (let i = this.beds.length - 1; i > 0; i--) {
        const j = rng.int(0, i);
        [this.beds[i], this.beds[j]] = [this.beds[j], this.beds[i]];
      }
      for (let i = 0; i < DRONES; i++) {
        const img = scene.add.image(layout.home.x, layout.home.y - 60, DRONE_LOOK[0]).setOrigin(0.5, 0.5).setVisible(false);
        img.setScale(58 / img.height);
        this.root.add(img);
        this.drones.push({ img, tx: img.x, ty: img.y, wait: 0, t: rng.range(0, 6) });
      }
    }
    this.walkers = new Walkers(scene, this.root, rng);

    for (let i = 0; i < DOTS; i++) {
      const rect = scene.add.rectangle(0, 0, 11, 11, CORAL).setVisible(false);
      this.root.add(rect);
      this.dots.push({ rect, route: null, dist: 0 });
    }
    for (let i = 0; layout.grid && i < SPARKS; i++) {
      const rect = scene.add.rectangle(0, 0, 7, 7, POWER).setVisible(false);
      this.root.add(rect);
      this.sparks.push({ rect, route: null, dist: 0 });
    }
  }

  /** The ending: the screen is shown again at full size with everything on it, after `delayMs`. */
  reveal(t: HubTopology, delayMs: number): void {
    this.scene.tweens.killTweensOf(this.root);
    this.root.setScale(1).setPosition(0, 0).setAlpha(0).setVisible(true);
    this.sync(t);
    this.scene.tweens.add({ targets: this.root, alpha: 1, delay: delayMs, duration: 450 });
  }

  /** The screen fades away where it stands. */
  fade(ms: number): void {
    this.scene.tweens.add({ targets: this.root, alpha: 0, duration: ms, onComplete: () => this.root.setVisible(false) });
  }

  /** The pull-back: the screen appears after `delayMs`. */
  show(delayMs: number): void {
    this.root.setVisible(true);
    this.scene.tweens.add({ targets: this.root, alpha: 1, delay: delayMs, duration: 500 });
  }

  /** The globe of this screen unrolls into the flat map of the next one: it stretches sideways and fades. */
  unroll(ms: number): void {
    const { x } = this.layout.home;
    this.scene.tweens.add({
      targets: this.root,
      scaleX: 1.6,
      x: x * (1 - 1.6),
      alpha: 0,
      duration: ms,
      ease: 'Cubic.In',
      onComplete: () => this.root.setVisible(false),
    });
  }

  /** A crowd marches on the middle from both edges of the map: `count` people with placards. */
  mob(count: number): void {
    const { x, y } = this.layout.home;
    const half = Math.ceil(count / 2);
    this.walkers.spawn('mob', [FIELD.x0 + 30, y + 40], [x - 70, y + 20], half);
    this.walkers.spawn('mob', [FIELD.x1 - 30, y + 40], [x + 70, y + 20], count - half);
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
      this.picket(lot, place, t.struck[id] ? 4 : t.picket && target > 0 ? (target >= 1 ? 2 : 1) : 0);
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
        // tasks run in from an employer; at the ziggurat power runs out to what it feeds
        const route = this.spoke([place.x, place.y - 22], !!this.layout.grid);
        route.pays = false;
        this.routes.set(id, route);
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
      const route = this.spoke(f.above ? [f.x, f.y + 6] : [f.x, f.y - f.h - 6], true);
      // at the ziggurat it is power that runs to the node: the money comes out of it by itself
      if (this.layout.grid) route.pays = false;
      this.routes.set(node, route);
      changed = true;
    }
    if (changed) this.redrawLines();
    if (t.grid) this.syncGrid(t.grid);
    this.rest(Math.min(this.rests.length, t.rest));
    // robot police: androids in a cold blue stand in front of the middle
    while (this.police.length < Math.min(5, t.guards)) {
      const n = this.police.length;
      const { x, y } = this.layout.home;
      const img = this.scene.add.image(x - 116 + n * 58, y + 34 + (n % 2) * 6, 'node_android').setOrigin(0.5, 1).setTint(0x8fb4dd);
      this.root.add(img.setScale(70 / img.height).setAlpha(0));
      this.scene.tweens.add({ targets: img, alpha: 1, duration: 300 });
      this.police.push(img);
    }
  }

  /** The ziggurat: its tiers, the night over the field, what its power reaches, the dial of its day. */
  private syncGrid(g: NonNullable<HubTopology['grid']>): void {
    const zig = this.zig;
    if (zig && g.built !== zig.target) {
      const first = zig.target < 0;
      zig.target = g.built;
      this.scene.tweens.add({ targets: zig, shown: g.built, duration: first ? 0 : 420, ease: 'Cubic.Out', onUpdate: () => this.crop(zig) });
      if (first) {
        zig.shown = g.built;
        this.crop(zig);
      } else this.scene.tweens.add({ targets: [zig.ghost, zig.fill], scale: { from: zig.scale * 1.04, to: zig.scale }, duration: 320, ease: 'Back.Out' });
    }
    // the capsules: on the tiers that stand, taken as far as the shift has lain down
    this.tiers = g.tiers;
    const beds = this.beds.filter((b) => b.tier < g.tiers);
    const taken = Math.round(beds.length * Math.max(0, Math.min(1, g.crew)));
    const key = `${g.tiers}:${taken}`;
    if (this.heads && key !== this.lying) {
      this.lying = key;
      const h = this.heads;
      h.clear();
      beds.forEach((b, i) => {
        h.fillStyle(i < taken ? POD : POD_EMPTY, 1).fillEllipse(b.x, b.y, 9, 5.6);
        h.lineStyle(1, 0xf0eee6, i < taken ? 0.9 : 0.35).strokeEllipse(b.x, b.y, 9, 5.6);
        if (i < taken) h.fillStyle(INK, 1).fillCircle(b.x - 2, b.y, 1.2);
      });
    }
    // the drones that look after them: as many as were bought
    this.drones.forEach((d, i) => {
      const on = i < Math.min(DRONES, g.bots);
      if (on === d.img.visible) return;
      d.img.setVisible(on);
      if (on) this.roam(d, true);
    });
    // short of power, what the ziggurat feeds fades towards its outline
    const lit = 0.3 + 0.7 * g.power;
    for (const lot of this.lots.values()) lot.fill.setAlpha(lit);
    const d = this.dial;
    if (!d) return;
    // the path of the sun over the top of the ziggurat: the sun by day, the moon by night
    const { x, y, h } = this.layout.home;
    const cy = y - h + 46;
    const r = 168;
    d.clear();
    d.lineStyle(2, RULE, 1);
    d.beginPath();
    d.arc(x, cy, r, Math.PI, Math.PI * 2);
    d.strokePath();
    d.lineBetween(x - r - 14, cy, x - r + 14, cy);
    d.lineBetween(x + r - 14, cy, x + r + 14, cy);
    const a = Math.PI * (1 + Math.max(0, Math.min(1, g.hour)));
    const bx = x + Math.cos(a) * r;
    const by = cy + Math.sin(a) * r;
    d.fillStyle(g.night ? POWER : SUN, 1).fillCircle(bx, by, 12);
    d.lineStyle(2, INK, 1).strokeCircle(bx, by, 12);
    if (g.night) d.fillStyle(0xcccac5, 1).fillCircle(bx + 5, by - 4, 8); // a bite out of the moon, the colour of the night paper
  }

  /**
   * The shifts change: `count` people in bathrobes walk out of the tower towards each edge of the map,
   * and as many walk in from there — the two columns pass each other on the way, as on the way to any job.
   */
  shift(count: number): void {
    const { x, y } = this.layout.home;
    const kind: WalkerKind = this.scene.textures.exists('node_sleeper1') ? 'sleeper' : 'person';
    for (const side of [-1, 1]) {
      const door: Pt = [x + side * 150, y + 26];
      const edge: Pt = [side < 0 ? FIELD.x0 + 24 : FIELD.x1 - 24, y + 34];
      this.walkers.spawn(kind, door, edge, count);
      this.walkers.spawn(kind, edge, door, count);
    }
  }

  /** A square of power runs from the ziggurat to the lot `id`, or to the node `farm:<id>`. */
  feed(id: string): void {
    const route = this.routes.get(id);
    const dot = this.sparks.find((d) => !d.route);
    if (!route || !dot) return;
    dot.route = route;
    dot.dist = 0;
    dot.rect.setPosition(route.from[0], route.from[1]).setVisible(true);
  }

  /** A drone picks the next capsule to look after: one on a tier that stands. `now` — it appears there at once. */
  private roam(d: { img: Phaser.GameObjects.Image; tx: number; ty: number; wait: number }, now = false): void {
    const beds = this.beds.filter((b) => b.tier < Math.max(1, this.tiers));
    const bed = beds[this.rng.int(0, Math.max(0, beds.length - 1))];
    if (!bed) return;
    // it hovers just above the capsule, a little to the side of it
    d.tx = bed.x + this.rng.range(-6, 6);
    d.ty = bed.y - 22;
    if (now) d.img.setPosition(d.tx, d.ty);
  }

  /** `want` people with placards stand at the door of a building; the rest of them go. */
  private picket(lot: Lot, place: { x: number; y: number }, want: number): void {
    while (lot.pickets.length < want) {
      const n = lot.pickets.length;
      const img = this.scene.add.image(place.x - 60 - n * 27, place.y + 8 + n * 5, PICKETS[this.rng.int(0, PICKETS.length - 1)]).setOrigin(0.5, 1);
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
      const img = this.scene.add.image(place.x + 62 + n * 26, place.y + 9 + n * 5, 'node_robodog').setOrigin(0.5, 1).setFlipX(true);
      const scale = 54 / img.height;
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
    for (const d of [...this.dots, ...this.sparks]) {
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
    for (const d of this.drones) {
      if (!d.img.visible) continue;
      d.t += dt;
      const dx = d.tx - d.img.x;
      const dy = d.ty - d.img.y;
      const far = Math.hypot(dx, dy);
      if (far > 3) {
        // on its way to the next capsule
        const step = Math.min(far, 120 * dt);
        d.img.setPosition(d.img.x + (dx / far) * step, d.img.y + (dy / far) * step + Math.sin(d.t * 5) * 0.25);
        d.img.setFlipX(dx > 0);
        if (d.img.texture.key !== DRONE_LOOK[0]) d.img.setTexture(DRONE_LOOK[0]);
      } else if (d.wait <= 0) {
        // arrived: it tops up the warm water or straightens a plug for a while
        d.wait = this.rng.range(1.6, 3.6);
        d.img.setTexture(DRONE_LOOK[this.rng.next() < 0.5 ? 1 : 2]);
      } else {
        d.img.y = d.ty + Math.sin(d.t * 4) * 1.6;
        if ((d.wait -= dt) <= 0) this.roam(d);
      }
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

  /** The lawn under the people who rest in the park. */
  private lawn(): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    const park = this.layout.park!;
    const xs = park.slots.map((p) => p[0]);
    const ys = park.slots.map((p) => p[1]);
    const left = Math.min(...xs) - 90;
    const right = Math.max(...xs) + 70;
    const top = Math.min(...ys) - park.h - 4;
    const bottom = Math.max(...ys) + 12;
    g.fillStyle(LAWN, 0.42).fillRoundedRect(left, top, right - left, bottom - top, 26);
    return g;
  }

  /** Conveyor belts from the middle to every employer: two pale rails and the slats between them. */
  private belts(): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    const [mx, my] = this.mid;
    g.lineStyle(2, RULE, 1);
    for (const lot of Object.values(this.layout.lots)) {
      const tx = lot.x;
      const ty = lot.y - 22;
      const len = Math.hypot(tx - mx, ty - my);
      const ux = (tx - mx) / len;
      const uy = (ty - my) / len;
      const from = this.layout.homeRadius;
      for (const side of [-7, 7]) g.lineBetween(mx + ux * from - uy * side, my + uy * from + ux * side, tx - uy * side, ty + ux * side);
      for (let d = from + 8; d < len; d += 16) g.lineBetween(mx + ux * d - uy * 7, my + uy * d + ux * 7, mx + ux * d + uy * 7, my + uy * d - ux * 7);
    }
    return g;
  }

  private fit(img: Phaser.GameObjects.Image, h: number, maxWidth = this.layout.maxWidth): number {
    return Math.min(h / img.height, maxWidth / img.width);
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
