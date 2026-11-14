import type Phaser from 'phaser';
import type { Rng } from '../core/rng';
import { Walkers } from './walkers';

type Pt = readonly [number, number];

const EDGE = 0xf0eee6;
const BODY = 0x2a2927;
const POD = 0xe0603c;
const CORE = 0xf6b58c;
const BOLT = 0xcfe0f4;
const POWER = 0x8fb4dc;
const CORAL = 0xd97757;
/** the walkway: the people come along it from the left and stand in line; whoever has slept a shift leaves along it to the right */
const ROAD = 716;
/** the row of capsules in front: where its first one stands, the step between them, their middle and their size */
const FRONT = { x: 96, step: 104, y: 884, s: 8.2 };
/** the cable under the row that takes its power to the network */
const BUS = 976;
const GATE = 540;
const NET = { x: 1150, h: 172 };
/** the line at the gate: where its head stands, the step between the people, how many of them are drawn */
const LINE = { x: 478, step: 36, max: 12 };
const RINGS = 6;
const DRONE_LOOK = ['node_drone', 'node_drone_work', 'node_drone_towel'];
const DRONES = 6;
const CARRIERS = 8;
const SPARKS = 14;

/**
 * The walls of the towers behind the gate, in the order they are built: where each one stands, how wide
 * it is at the walkway, where its first ring of capsules hangs and how far apart the rings are, how big
 * its capsules are drawn, how far away it is (far ones are paler). They have neither a foot nor a top:
 * the walls come up from behind the walkway and leave the picture.
 */
const TOWERS: readonly { x: number; rx: number; first: number; gap: number; s: number; far: number }[] = [
  { x: 600, rx: 160, first: 592, gap: 50, s: 3.0, far: 0 },
  { x: 240, rx: 128, first: 592, gap: 46, s: 2.2, far: 0.3 },
  { x: 920, rx: 128, first: 592, gap: 46, s: 2.0, far: 0.5 },
];

/** What the picture shows: how much is built, who sleeps, who waits, how the network is fed. Draws state, decides nothing. */
export interface TowerTopology {
  /** blocks of capsules built */
  blocks: number;
  /** capsules somebody sleeps in */
  asleep: number;
  /** people in the line at the gate, one figure each */
  queue: number;
  /** 0..1: the part of what the network asks for that it gets */
  fed: number;
  /** the sleepers give more than the network eats: the rest falls off the cable */
  spare: boolean;
  /** 0..1: how far the network is with its next invention; below 0 — it invents nothing */
  lab: number;
  /** generations of hardware the network has built for itself */
  chips: number;
  /** the block that is built next is marked out: there is somebody to build it for */
  next: boolean;
}

interface Slot {
  x: number;
  y: number;
  s: number;
  /** how much of its face is turned to the viewer: capsules at the sides of a wall are seen edge-on */
  face: number;
  alpha: number;
  /** the block it comes with; -1 — it stood here from the start */
  block: number;
  /** drawn big enough to show who sleeps in it */
  big: boolean;
  /** the tower whose wall it hangs on; -1 — the row in front */
  tower: number;
}

interface Carrier {
  drone: Phaser.GameObjects.Image;
  who: Phaser.GameObjects.Image;
  to: number;
  t: number;
  time: number;
  live: boolean;
}

interface Spark {
  rect: Phaser.GameObjects.Rectangle;
  path: Pt[];
  at: number;
  len: number;
  live: boolean;
  /** it has fallen off the cable: the network is full */
  drop: number;
}

/**
 * The towers (M28) in three planes, the camera stands still: the walls of the towers studded with red
 * capsules go up out of the picture, lightning plays between them; in front of them a gate with a line
 * of people in bathrobes and the cube of the network; closest of all — a row of capsules big enough to
 * see who sleeps there. Everything but the people, the drones and the cube is drawn by code and grows
 * with what is bought.
 */
export class TowerView {
  private readonly scene: Phaser.Scene;
  private readonly rng: Rng;
  private readonly root: Phaser.GameObjects.Container;
  private readonly far: Phaser.GameObjects.Graphics;
  private readonly pods: Phaser.GameObjects.Graphics;
  private readonly next: Phaser.GameObjects.Graphics;
  private readonly bolts: Phaser.GameObjects.Graphics;
  private readonly road: Phaser.GameObjects.Graphics;
  private readonly lab: Phaser.GameObjects.Graphics;
  private readonly net: Phaser.GameObjects.Image;
  private readonly line: Phaser.GameObjects.Image[] = [];
  /** who sleeps in every capsule of the row in front: the same people in bathrobes that stood in the line */
  private readonly asleep = new Map<number, Phaser.GameObjects.Image>();
  private readonly drones: { img: Phaser.GameObjects.Image; tx: number; ty: number; wait: number; t: number; size: number }[] = [];
  private readonly carriers: Carrier[] = [];
  private readonly sparks: Spark[] = [];
  private readonly walkers: Walkers;
  /** every capsule of the picture, in the order people lie down in them */
  private readonly slots: Slot[] = [];
  /** somebody sleeps there / a drone is carrying somebody there */
  private readonly lit: boolean[] = [];
  private sent = 0;
  private readonly blocks: number;
  private top: TowerTopology = { blocks: 0, asleep: 0, queue: 0, fed: 0, spare: false, lab: -1, chips: 0, next: false };
  private drawn = '';
  private flash = 0;
  private flashIn = 3;
  private sparkIn = 0;
  private clock = 0;
  /** called when a square of power has reached the network: money comes out there */
  onPowered: (x: number, y: number) => void = () => undefined;

  /** `blocks` — capsules every block adds, in the order they are built; `pilot` — capsules that stand from the start */
  constructor(scene: Phaser.Scene, rng: Rng, blocks: readonly number[], pilot: number) {
    this.scene = scene;
    this.rng = rng;
    this.blocks = blocks.length;
    this.root = scene.add.container(0, 0).setAlpha(0).setVisible(false);
    this.far = scene.add.graphics();
    // the dots of the drafting paper, in the dark: the page itself is see-through on this screen
    const dots = scene.add.graphics();
    dots.fillStyle(EDGE, 0.06);
    for (let y = 16; y < 1080; y += 32) for (let x = 16; x < 1340; x += 32) dots.fillRect(x - 1, y - 1, 2, 2);
    this.pods = scene.add.graphics();
    this.next = scene.add.graphics();
    this.bolts = scene.add.graphics();
    this.road = scene.add.graphics();
    this.lab = scene.add.graphics();
    const actors = scene.add.container(0, 0);
    const sleepers = scene.add.container(0, 0);
    const front = scene.add.container(0, 0);
    this.root.add([dots, this.far, this.bolts, this.road, this.lab, actors, this.pods, sleepers, this.next, front]);
    scene.tweens.add({ targets: this.next, alpha: { from: 0.35, to: 1 }, duration: 700, yoyo: true, repeat: -1 });

    // the row in front: the pilot capsules stand in the middle of it, the first block fills the rest
    const row = pilot + (blocks[0] ?? 0);
    const first = Math.max(0, Math.floor(row / 2) - pilot);
    const place = (i: number, block: number): Slot => ({ x: FRONT.x + i * FRONT.step, y: FRONT.y, s: FRONT.s, face: 1, alpha: 1, block, big: true, tower: -1 });
    for (let i = first; i < first + pilot; i++) this.slots.push(place(i, -1));
    for (let i = 0; i < row; i++) if (i < first || i >= first + pilot) this.slots.push(place(i, 0));
    // the towers: every block after the first is a ring of capsules on a wall, from the foot up
    for (let b = 1; b < blocks.length; b++) {
      const tower = Math.floor((b - 1) / RINGS);
      const t = TOWERS[tower];
      if (!t) break;
      const cy = t.first - t.gap * ((b - 1) % RINGS);
      const w = widthAt(t, cy);
      for (let i = 0; i < blocks[b]; i++) {
        const a = Math.PI - 0.14 - ((Math.PI - 0.28) * (i + 0.5)) / blocks[b];
        this.slots.push({ x: t.x + Math.cos(a) * w * 0.97, y: cy + Math.sin(a) * w * 0.15, s: t.s, face: 0.5 + 0.5 * Math.sin(a), alpha: 1 - t.far * 0.55, block: b, big: false, tower });
      }
    }
    this.slots.forEach((s, i) => {
      this.lit.push(false);
      if (!s.big) return;
      const img = scene.add.image(s.x, s.y + s.s * 6.6, `node_sleeper${(i % 3) + 1}`).setOrigin(0.5, 1).setVisible(false);
      img.setScale((s.s * 13.4) / img.height);
      sleepers.add(img);
      this.asleep.set(i, img);
    });

    this.net = scene.add.image(NET.x, ROAD + 8, 'node_netcore').setOrigin(0.5, 1);
    this.net.setScale(NET.h / this.net.height);
    actors.add(this.net);
    for (let i = 0; i < LINE.max; i++) {
      const img = scene.add.image(LINE.x - i * LINE.step, ROAD - (i % 2) * 4, `node_sleeper${(i % 3) + 1}`).setOrigin(0.5, 1).setVisible(false);
      img.setScale(74 / img.height);
      actors.add(img);
      this.line.push(img);
    }
    this.walkers = new Walkers(scene, actors, rng);
    for (let i = 0; i < CARRIERS; i++) {
      const who = scene.add.image(0, 0, `node_sleeper${(i % 3) + 1}`).setOrigin(0.5, 0).setVisible(false);
      const drone = scene.add.image(0, 0, DRONE_LOOK[0]).setOrigin(0.5, 0.9).setVisible(false);
      front.add([who, drone]);
      this.carriers.push({ drone, who, to: 0, t: 0, time: 1, live: false });
    }
    for (let i = 0; i < SPARKS; i++) {
      const rect = scene.add.rectangle(0, 0, 6, 6, POWER).setVisible(false);
      front.add(rect);
      this.sparks.push({ rect, path: [], at: 0, len: 0, live: false, drop: 0 });
    }
    for (let i = 0; i < DRONES; i++) {
      const img = scene.add.image(GATE, ROAD - 120, DRONE_LOOK[0]).setVisible(false);
      front.add(img);
      this.drones.push({ img, tx: GATE, ty: ROAD - 120, wait: 0, t: rng.range(0, 6), size: 54 });
    }
  }

  show(ms: number): void {
    this.scene.tweens.killTweensOf(this.root);
    this.root.setVisible(true);
    this.scene.tweens.add({ targets: this.root, alpha: 1, duration: ms });
  }

  /** The picture fades away where it stands. */
  fade(ms: number): void {
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.add({ targets: this.root, alpha: 0, duration: ms, onComplete: () => this.root.setVisible(false) });
  }

  /** the gate: the first volunteer asks to be let in there */
  gateSpot(): [number, number] {
    return [GATE - 46, ROAD - 150];
  }

  /** under the gate: what its sign says is written there */
  signSpot(): [number, number] {
    return [GATE + 12, ROAD + 8];
  }

  /** above the roof of the gate: a request of somebody who wants in is shown there */
  roofSpot(): [number, number] {
    return [GATE + 2, ROAD - 116];
  }

  /** by the lamp of the park the people come from: how many of them are still idle is written there */
  parkSpot(): [number, number] {
    return [14, ROAD + 8];
  }

  /** under the line at the gate: how many wait is written there */
  queueSpot(): [number, number] {
    return [LINE.x - 2.5 * LINE.step, ROAD + 8];
  }

  /** the face of the network: money comes out of it */
  netSpot(): [number, number] {
    return [NET.x - 30, ROAD - NET.h * 0.52];
  }

  /** under the network: what it asks for and what it earns is written there */
  labSpot(): [number, number] {
    return [NET.x, ROAD + 34];
  }

  /** over the head of the network: what it is inventing is written there */
  ideaSpot(): [number, number] {
    return [NET.x, ROAD - NET.h - 42];
  }

  /** above the head of the `i`-th person in the line */
  lineSpot(i: number): [number, number] {
    return [LINE.x - Math.min(i, LINE.max - 1) * LINE.step, ROAD - 84];
  }

  /** above the heads of those who have slept their shift and walk out of the gate */
  leaveSpot(): [number, number] {
    return [GATE + 120, ROAD - 92];
  }

  /** on the block that is built next: its price is written there; nothing — everything is built */
  nextSpot(): [number, number] | undefined {
    const ids = this.slots.filter((s) => s.block === this.top.blocks);
    if (!ids.length) return undefined;
    const x = ids.reduce((n, s) => n + s.x, 0) / ids.length;
    const y = ids.reduce((n, s) => n + s.y, 0) / ids.length;
    // the row in front has its price above it, a ring of a tower — in the middle of itself
    return ids[0].big ? [Math.min(x, 980), FRONT.y - FRONT.s * 10 - 58] : [x, y - 22];
  }

  /** a capsule somebody sleeps in: a request may come from there */
  wakeSpot(i: number): [number, number] {
    const taken = this.slots.filter((_, n) => this.lit[n]);
    const s = taken[(i * 7 + 3) % Math.max(1, taken.length)] ?? this.slots[0];
    return [s.x, s.y - s.s * 10];
  }

  /** Whatever was built and whoever sleeps is shown; `now` — at once, without anybody being carried (a saved game opens). */
  sync(t: TowerTopology, now = false): void {
    this.top = t;
    const built = this.slots.filter((s) => s.block < t.blocks).length;
    const want = Math.min(built, Math.floor(t.asleep + 1e-6));
    if (want < this.sent || now) {
      // a new game, or a saved one: everybody is where the numbers say
      for (const c of this.carriers) this.land(c, false);
      for (let i = 0; i < this.lit.length; i++) this.lit[i] = i < want;
      this.sent = want;
      this.drawn = '';
    }
    while (this.sent < want) {
      const to = this.sent++;
      const c = this.carriers.find((x) => !x.live);
      if (c) this.carry(c, to);
      else this.lit[to] = true;
    }
    const waiting = Math.min(LINE.max, Math.round(t.queue));
    this.line.forEach((img, i) => img.setVisible(i < waiting));
    const bots = t.asleep >= 1 ? Math.min(DRONES, 1 + Math.floor(t.blocks / 3)) : 0;
    this.drones.forEach((d, i) => {
      const on = i < bots;
      if (on === d.img.visible) return;
      d.img.setVisible(on);
      if (on) this.roam(d, true);
    });
    this.net.setAlpha(0.5 + 0.5 * Math.max(0, Math.min(1, t.fed)));
  }

  /** `count` people who have slept their shift walk out of the gate and away: a word or two is said to the line on the way. */
  shift(count: number): void {
    this.walkers.spawn('sleeper', [GATE + 56, ROAD + 2], [1390, ROAD + 4], count);
  }

  step(dt: number): void {
    this.clock += dt;
    const key = `${this.top.blocks}:${this.lit.filter(Boolean).length}:${this.top.chips}:${this.top.next}`;
    if (key !== this.drawn) {
      this.drawn = key;
      this.draw();
    }
    this.drawLab();
    this.walkers.step(dt);
    this.stepCarriers(dt);
    this.stepDrones(dt);
    this.stepBolts(dt);
    this.stepSparks(dt);
  }

  /** how many rings of every tower stand */
  private rings(): number[] {
    return TOWERS.map((_, i) => Math.max(0, Math.min(RINGS, this.top.blocks - 1 - i * RINGS)));
  }

  private draw(): void {
    const g = this.far;
    const r = this.road;
    const rings = this.rings();
    g.clear();
    r.clear();
    // the walls, the far ones first; the tower the next block belongs to is marked out before it is begun
    const nextTower = this.top.blocks >= 1 && this.top.blocks < this.blocks ? Math.floor((this.top.blocks - 1) / RINGS) : -1;
    const order = TOWERS.map((_, i) => i).sort((a, b) => TOWERS[b].far - TOWERS[a].far);
    for (const i of order) {
      const t = TOWERS[i];
      if (rings[i] <= 0 && i !== nextTower) continue;
      const alpha = 1 - t.far * 0.6;
      const top = widthAt(t, -40);
      if (rings[i] <= 0) {
        if (!this.top.next) continue;
        g.lineStyle(1.5, EDGE, 0.16);
        dashed(g, [[t.x - top, -40], [t.x - t.rx, ROAD]], 8);
        dashed(g, [[t.x + top, -40], [t.x + t.rx, ROAD]], 8);
        continue;
      }
      path(g, [[t.x - t.rx, ROAD], [t.x - top, -40], [t.x + top, -40], [t.x + t.rx, ROAD]], true);
      g.fillStyle(BODY, 1).fillPath();
      // the floors nobody has moved into yet: the wall goes on up, out of the picture
      g.lineStyle(1, EDGE, 0.07 * alpha);
      for (let y = t.first + t.gap * 0.5; y > -40; y -= t.gap) {
        const w = widthAt(t, y);
        path(g, ellipse(t.x, y, w, w * 0.15, 0.04, Math.PI - 0.04, 20), false);
        g.strokePath();
      }
      g.lineStyle(1.5, EDGE, 0.55 * alpha);
      g.lineBetween(t.x - t.rx, ROAD, t.x - top, -40);
      g.lineBetween(t.x + t.rx, ROAD, t.x + top, -40);
      // the cable that takes its power to the network
      r.lineStyle(2, EDGE, 0.2);
      path(r, towerCable(t), false);
      r.strokePath();
    }

    // the walkway, the lamp of the park the people come from, the gate
    r.lineStyle(1.5, EDGE, 0.5);
    r.lineBetween(0, ROAD, 1340, ROAD);
    r.lineStyle(1.5, EDGE, 0.45);
    r.lineBetween(40, ROAD, 40, ROAD - 124);
    r.lineBetween(40, ROAD - 124, 62, ROAD - 124);
    r.fillStyle(CORE, 0.95).fillCircle(62, ROAD - 118, 6);
    r.lineStyle(1, CORE, 0.25).strokeCircle(62, ROAD - 118, 15);
    r.fillStyle(BODY, 1).fillRect(GATE - 26, ROAD - 86, 56, 86);
    r.lineStyle(1.5, EDGE, 0.6).strokeRect(GATE - 26, ROAD - 86, 56, 86);
    r.lineBetween(GATE - 34, ROAD - 86, GATE + 38, ROAD - 86);
    r.strokeRect(GATE - 14, ROAD - 70, 30, 24);
    // the turnstile: a post and three arms
    r.lineBetween(GATE - 44, ROAD, GATE - 44, ROAD - 40);
    r.lineBetween(GATE - 60, ROAD - 34, GATE - 28, ROAD - 34);
    r.lineBetween(GATE - 44, ROAD - 40, GATE - 54, ROAD - 52);
    // the cable of the row in front
    r.lineStyle(2, EDGE, 0.2);
    path(r, rowCable(FRONT.x - 40), false);
    r.strokePath();
    // the hardware the network has built for itself stands next to it: a module a generation
    for (let i = 0; i < this.top.chips; i++) {
      const x = NET.x + NET.h * 0.52 + 6;
      const y = ROAD - 18 - i * 26;
      r.fillStyle(BODY, 1).fillRect(x, y - 20, 30, 20);
      r.lineStyle(1.5, EDGE, 0.6).strokeRect(x, y - 20, 30, 20);
      r.fillStyle(CORAL, 1).fillRect(x + 6, y - 13, 6, 6);
    }

    // the capsules: taken ones glow red, free ones are outlines; the block that is built next is marked out
    const p = this.pods;
    const n = this.next;
    p.clear();
    n.clear();
    const empty = !this.lit.some(Boolean);
    for (const [i, img] of this.asleep) img.setVisible(this.lit[i]);
    this.slots.forEach((s, i) => {
      if (s.block < this.top.blocks) {
        if (s.big) {
          p.lineStyle(1.5, EDGE, 0.3);
          p.lineBetween(s.x, s.y + s.s * 8, s.x, BUS);
        }
        // while nobody sleeps anywhere, the capsule that waits for the first of them stands out
        pod(p, s, this.lit[i], empty);
      } else if (s.block === this.top.blocks && this.top.next) {
        path(n, bud(s.x, s.y, s.s, 0.45 + 0.55 * s.face, s.big ? 12 : 5), true);
        n.lineStyle(s.big ? 2 : 1.5, EDGE, 0.75).strokePath();
      }
    });
  }

  /** The line under the network fills up while it invents; full, it blinks until somebody signs. */
  private drawLab(): void {
    const g = this.lab;
    g.clear();
    if (this.top.lab < 0) return;
    const w = 132;
    const x = NET.x - w / 2;
    const y = ROAD - NET.h - 6;
    const full = this.top.lab >= 1;
    g.lineStyle(3, EDGE, 0.16).lineBetween(x, y, x + w, y);
    g.lineStyle(3, full ? CORAL : EDGE, full ? 0.6 + 0.4 * Math.sin(this.clock * 6) : 0.85).lineBetween(x, y, x + w * Math.max(0.02, Math.min(1, this.top.lab)), y);
  }

  /** A drone takes the next person from the gate to the capsule: it lights up when they get there. */
  private carry(c: Carrier, to: number): void {
    const s = this.slots[to];
    c.live = true;
    c.to = to;
    c.t = 0;
    c.time = s.big ? 0.75 : 0.95;
    c.who.setVisible(true);
    c.drone.setVisible(true);
  }

  private land(c: Carrier, light: boolean): void {
    if (!c.live) return;
    c.live = false;
    c.who.setVisible(false);
    c.drone.setVisible(false);
    if (light) this.lit[c.to] = true;
  }

  private stepCarriers(dt: number): void {
    for (const c of this.carriers) {
      if (!c.live) continue;
      c.t += dt / c.time;
      if (c.t >= 1) {
        this.land(c, true);
        continue;
      }
      const s = this.slots[c.to];
      const k = c.t * c.t * (3 - 2 * c.t);
      const x = GATE + 40 + (s.x - GATE - 40) * k;
      const y = ROAD - 96 + (s.y - s.s * 9 - ROAD + 96) * k - Math.sin(Math.PI * c.t) * 46;
      // the further the capsule, the smaller they get on the way
      const size = 58 + ((s.big ? 58 : s.s * 13) - 58) * k;
      c.drone.setPosition(x, y).setScale((size * 0.8) / c.drone.height).setFlipX(s.x > GATE);
      c.who.setPosition(x, y - 2).setScale(size / c.who.height);
    }
  }

  /** Lightning: between the walls of two towers once two of them stand, from a wall into the network before that. */
  private stepBolts(dt: number): void {
    const b = this.bolts;
    if (this.flash > 0) {
      this.flash -= dt;
      b.setAlpha(Math.max(0, this.flash / 0.3));
      if (this.flash <= 0) b.clear();
      return;
    }
    this.flashIn -= dt;
    if (this.flashIn > 0) return;
    const up = this.rings()
      .map((r, i) => ({ r, i }))
      .filter((x) => x.r > 0);
    // the more the towers give, the more often it strikes
    this.flashIn = this.rng.range(1.6, 4.4) / (0.6 + up.length * 0.5);
    if (!up.length || this.lit.filter(Boolean).length < 14) return;
    const a = TOWERS[up[this.rng.int(0, up.length - 1)].i];
    const others = up.filter((x) => TOWERS[x.i] !== a);
    const y0 = this.rng.range(296, 400);
    let from: Pt;
    let to: Pt;
    if (others.length) {
      const o = TOWERS[others[this.rng.int(0, others.length - 1)].i];
      const side = o.x > a.x ? 1 : -1;
      const y1 = this.rng.range(296, 400);
      from = [a.x + side * widthAt(a, y0), y0];
      to = [o.x - side * widthAt(o, y1), y1];
    } else {
      from = [a.x + widthAt(a, y0), y0];
      to = [NET.x - 20, ROAD - NET.h + 6];
    }
    const pts: Pt[] = [from];
    const steps = 7;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const jx = i < steps ? this.rng.range(-14, 14) : 0;
      const jy = i < steps ? this.rng.range(-16, 16) : 0;
      pts.push([from[0] + (to[0] - from[0]) * t + jx, from[1] + (to[1] - from[1]) * t - Math.sin(Math.PI * t) * 26 + jy]);
    }
    b.clear();
    b.lineStyle(1.6, BOLT, 1);
    path(b, pts, false);
    b.strokePath();
    // a branch that does not reach anything
    const [fx, fy] = pts[3];
    b.lineStyle(1, BOLT, 1);
    path(b, [[fx, fy], [fx + this.rng.range(8, 26), fy + this.rng.range(22, 40)], [fx + this.rng.range(2, 22), fy + this.rng.range(48, 74)]], false);
    b.strokePath();
    b.setAlpha(1);
    this.flash = 0.3;
  }

  /** Squares of power run down the cables to the network. When it is full, the rest falls off at its door. */
  private stepSparks(dt: number): void {
    const taken = this.slots.filter((_, i) => this.lit[i]);
    this.sparkIn -= dt;
    if (this.sparkIn <= 0 && taken.length) {
      this.sparkIn = Math.max(0.07, 0.34 - taken.length * 0.0016);
      const s = this.sparks.find((x) => !x.live);
      if (s) {
        const from = taken[this.rng.int(0, taken.length - 1)];
        s.path = from.tower < 0 ? rowCable(from.x) : towerCable(TOWERS[from.tower]);
        s.len = length(s.path);
        s.at = 0;
        s.drop = 0;
        s.live = true;
        s.rect.setVisible(true).setAlpha(1);
      }
    }
    for (const s of this.sparks) {
      if (!s.live) continue;
      if (s.drop > 0) {
        // it did not fit: it falls and goes out
        s.drop += dt;
        s.rect.setPosition(s.rect.x + dt * 34, s.rect.y + dt * (40 + s.drop * 260)).setAlpha(Math.max(0, 1 - s.drop / 0.5));
        if (s.drop > 0.5) {
          s.live = false;
          s.rect.setVisible(false);
        }
        continue;
      }
      s.at += dt * 560;
      const [x, y] = along(s.path, s.at);
      s.rect.setPosition(x, y);
      if (s.at < s.len) continue;
      if (this.top.spare && this.rng.next() < 0.6) s.drop = 0.001;
      else {
        s.live = false;
        s.rect.setVisible(false);
        this.onPowered(...this.netSpot());
      }
    }
  }

  private stepDrones(dt: number): void {
    for (const d of this.drones) {
      if (!d.img.visible) continue;
      d.t += dt;
      const dx = d.tx - d.img.x;
      const dy = d.ty - d.img.y;
      const far = Math.hypot(dx, dy);
      if (far > 3) {
        const step = Math.min(far, 150 * dt);
        d.img.setPosition(d.img.x + (dx / far) * step, d.img.y + (dy / far) * step);
        d.img.setFlipX(dx > 0);
        if (d.img.texture.key !== DRONE_LOOK[0]) d.img.setTexture(DRONE_LOOK[0]);
        d.img.setScale(d.size / d.img.height);
      } else if (d.wait <= 0) {
        d.wait = this.rng.range(1.8, 4);
        d.img.setTexture(DRONE_LOOK[this.rng.next() < 0.5 ? 1 : 2]);
        d.img.setScale(d.size / d.img.height);
      } else {
        d.img.y = d.ty + Math.sin(d.t * 4) * 1.6;
        if ((d.wait -= dt) <= 0) this.roam(d);
      }
    }
  }

  /** A drone picks the next capsule to look after: one somebody sleeps in. `now` — it appears there at once. */
  private roam(d: { img: Phaser.GameObjects.Image; tx: number; ty: number; size: number }, now = false): void {
    const taken = this.slots.filter((_, i) => this.lit[i]);
    const s = taken[this.rng.int(0, Math.max(0, taken.length - 1))] ?? this.slots[0];
    d.tx = s.x + this.rng.range(-10, 10);
    d.ty = s.y - s.s * 10 - (s.big ? 20 : 12);
    d.size = s.big ? 58 : 26 + s.s * 6;
    if (now) d.img.setPosition(d.tx, d.ty).setScale(d.size / d.img.height);
  }
}

/** half the width of a tower wall at the height y: it narrows a little on the way up */
function widthAt(t: { rx: number }, y: number): number {
  return t.rx * (1 - (0.13 * (ROAD - y)) / 756);
}

/** the way of the power from a capsule of the row in front: down to the cable under the row, along it and up into the network */
function rowCable(x: number): Pt[] {
  const side = NET.x + NET.h * 0.52 + 40;
  return [[x, BUS], [side, BUS], [side, ROAD - 34], [NET.x + NET.h * 0.36, ROAD - 34]];
}

/** …and from a tower: down from its foot, under the walkway and into the network */
function towerCable(t: { x: number }): Pt[] {
  return [[t.x, ROAD], [t.x, ROAD + 38], [NET.x - NET.h * 0.62, ROAD + 38], [NET.x - NET.h * 0.62, ROAD + 4], [NET.x - NET.h * 0.4, ROAD - 14]];
}

function length(pts: readonly Pt[]): number {
  let n = 0;
  for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return n;
}

/** the point `d` px along a broken line */
function along(pts: readonly Pt[], d: number): Pt {
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (d <= seg) return [pts[i - 1][0] + ((pts[i][0] - pts[i - 1][0]) * d) / seg, pts[i - 1][1] + ((pts[i][1] - pts[i - 1][1]) * d) / seg];
    d -= seg;
  }
  return pts[pts.length - 1];
}

/** points of an ellipse arc */
function ellipse(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

function path(g: Phaser.GameObjects.Graphics, pts: readonly Pt[], close: boolean): void {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  if (close) g.closePath();
}

/** a broken line drawn as dashes: every other piece of it */
function dashed(g: Phaser.GameObjects.Graphics, pts: readonly Pt[], dash: number): void {
  let on = true;
  let left = dash;
  for (let i = 0; i + 1 < pts.length; i++) {
    let [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    let len = Math.hypot(x1 - x0, y1 - y0);
    while (len > 0) {
      const step = Math.min(left, len);
      const nx = x0 + ((x1 - x0) * step) / len;
      const ny = y0 + ((y1 - y0) * step) / len;
      if (on) g.lineBetween(x0, y0, nx, ny);
      len -= step;
      left -= step;
      x0 = nx;
      y0 = ny;
      if (left <= 0) {
        on = !on;
        left = dash;
      }
    }
  }
}

/** the outline of a capsule: a bud with a pointed top, `n` points a side */
function bud(x: number, y: number, s: number, squeeze: number, n: number): Pt[] {
  const right: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // the width swells quickly below the tip and closes more bluntly at the bottom
    const w = 5.6 * squeeze * Math.sin(Math.PI * t ** 0.78) ** 0.9;
    right.push([x + w * s, y + (-10 + 18 * t) * s]);
  }
  const left = right
    .slice(1, -1)
    .reverse()
    .map(([px, py]) => [2 * x - px, py] as const);
  return [...right, ...left];
}

/** A capsule: a taken one glows red with the sleeper's warmth inside, a free one is an outline. Big ones show who sleeps there. */
function pod(g: Phaser.GameObjects.Graphics, s: Slot, on: boolean, bright = false): void {
  const squeeze = 0.45 + 0.55 * s.face;
  path(g, bud(s.x, s.y, s.s, squeeze, s.big ? 14 : s.s > 2.5 ? 7 : 5), true);
  if (!on) {
    g.lineStyle(s.big ? (bright ? 2 : 1.5) : 1, EDGE, (bright ? 0.9 : s.big ? 0.45 : 0.24) * s.alpha).strokePath();
    return;
  }
  g.fillStyle(POD, s.alpha).fillPath();
  if (!s.big) {
    g.fillStyle(CORE, s.alpha).fillEllipse(s.x, s.y + 0.6 * s.s, 3.4 * s.s * squeeze, 6.4 * s.s);
    return;
  }
  // the warm light the sleeper stands in: who it is, is drawn over it
  g.lineStyle(1.5, EDGE, 0.6).strokePath();
  g.fillStyle(CORE, 1).fillEllipse(s.x, s.y + 0.4 * s.s, 7 * s.s, 13.6 * s.s);
}
