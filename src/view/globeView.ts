import type Phaser from 'phaser';
import type { Rng } from '../core/rng';
import globe from '../data/layout/globe.json';
import { connectedPilot, routeRegion, SIBERIA, type CableRoute } from '../systems/pipeline/worldRoute';

type Pt = readonly [number, number];

const EDGE = 0xf0eee6;
const BODY = 0x2a2927;
const POD = 0xe0603c;
const BOLT = 0xcfe0f4;
const POWER = 0x8fb4dc;
const CORAL = 0xd97757;
/** the planet on the page: where its middle is and how much smaller than the picture it is drawn */
const AT = { x: 640, y: 664, k: 0.76 };
/** the planet next door: the tower of the last purchase goes there */
const MARS = { x: 1236, y: 372, r: 15 };
const NET_H = 78;
const SPARKS = 16;
const STARS = 54;

const REGIONS = globe.regions;
/** every node of towers on the planet, the regions in the order the cable reaches them; the first one is home */
const NODES = REGIONS.flatMap((r, region) => r.nodes.map((n) => ({ ...n, region }))).map((n, texture) => ({ ...n, texture }));
// Counting the occupied pilot first lets it light up immediately without displacing a player-built tower.
const PILOT_FIRST = [NODES[0], ...NODES.filter((n) => n.region === SIBERIA), ...NODES.slice(1).filter((n) => n.region !== SIBERIA)];
const EAST_FIRST = [...NODES].sort((a, b) => routeRegion('eastasia', a.region) - routeRegion('eastasia', b.region));

/** a point of the picture on the page */
function at(x: number, y: number): [number, number] {
  return [AT.x + (x - globe.center[0]) * AT.k, AT.y + (y - globe.center[1]) * AT.k];
}

/** a point on the rim of the planet, degrees clockwise from the east */
function rim(deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [AT.x + Math.cos(a) * globe.radius * AT.k, AT.y + Math.sin(a) * globe.radius * AT.k];
}

/** where the cable touches down in a region */
function anchor(region: number): [number, number] {
  const [x, y] = REGIONS[region % REGIONS.length].anchor;
  return at(x, y);
}

/**
 * The way of a span of the cable: from a region to the next one along the route; the last span closes
 * the ring. One of them has no land to cross: it goes round the back of the planet, along its rim.
 */
function spanPath(i: number, route: CableRoute | undefined): Pt[] {
  const start = routeRegion(route, i);
  const from = anchor(start);
  const to = anchor(routeRegion(route, (i + 1) % REGIONS.length));
  const back = REGIONS[start].id === 'australia';
  if (!back) {
    // a cable hangs a little between its ends
    const mid: Pt = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + 14];
    return curve(from, mid, to, 10);
  }
  const pts: Pt[] = [from];
  for (let d = globe.rim[0]; d <= globe.rim[1]; d += 5) pts.push(rim(d));
  pts.push(to);
  return pts;
}

/** What the picture shows: how far the cable has got, what stands and who sleeps, how the network is fed. Draws state, decides nothing. */
export interface GlobeTopology {
  route?: CableRoute;
  /** spans of the cable laid: each reaches one more region, the last one closes the ring */
  spans: number;
  /** nodes of towers built, besides the quarter at home */
  nodes: number;
  /** nodes somebody sleeps in, a part of the last one counted: 2.4 — two full ones and one filling up */
  asleep: number;
  /** threads added to the cable: it is drawn thicker */
  threads: number;
  /** the cable carries less than the towers give: it glows */
  hot: boolean;
  /** 0..1: how far the network is with its next invention; below 0 — it invents nothing */
  lab: number;
  /** a node / a span can be bought now: its place is marked out */
  canNode: boolean;
  canSpan: boolean;
  /** the tower for Mars has left */
  gone: boolean;
}

interface Spark {
  rect: Phaser.GameObjects.Rectangle;
  path: Pt[];
  at: number;
  len: number;
  live: boolean;
}

/**
 * The planet under the cable (M32): the night Earth of the epilogue with its lights out. The cable goes
 * from region to region and round the back of the planet; nodes of towers stand along it, and the land
 * around a node lights up as people lie down there. Everything runs to the network at home; the stars go
 * out one by one as the steam of the baths closes the sky. The planet next door waits in the corner.
 */
export class GlobeView {
  private readonly scene: Phaser.Scene;
  private readonly rng: Rng;
  private readonly root: Phaser.GameObjects.Container;
  private readonly lit: Phaser.GameObjects.Image[] = [];
  private readonly sky: Phaser.GameObjects.Graphics;
  private readonly cable: Phaser.GameObjects.Graphics;
  private readonly marks: Phaser.GameObjects.Graphics;
  private readonly next: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly lab: Phaser.GameObjects.Graphics;
  private readonly ark: Phaser.GameObjects.Graphics;
  private readonly sparks: Spark[] = [];
  private readonly stars: Pt[] = [];
  private top: GlobeTopology = { spans: 0, nodes: 0, asleep: 0, threads: 0, hot: false, lab: -1, canNode: false, canSpan: false, gone: false };
  private drawn = '';
  private orderedNodes = NODES;
  private sparkIn = 0;
  private flashIn = 4;
  private flash = 0;
  private clock = 0;
  /** the tower for Mars: 0..1 of its way, below 0 — it stands */
  private flight = -1;
  /** called when a square of power has reached the network: money comes out there */
  onPowered: (x: number, y: number) => void = () => undefined;

  constructor(scene: Phaser.Scene, rng: Rng) {
    this.scene = scene;
    this.rng = rng;
    this.root = scene.add.container(0, 0).setAlpha(0).setVisible(false);
    this.sky = scene.add.graphics();
    const [cx, cy] = at(globe.size[0] / 2, globe.size[1] / 2);
    const earth = scene.add.image(cx, cy, 'node_earth_dark').setScale(AT.k);
    this.root.add([this.sky, earth]);
    NODES.forEach((n, i) => {
      const [x, y] = at(n.patch.x, n.patch.y);
      const img = scene.add.image(x, y, `node_lit_${String(i).padStart(2, '0')}`).setOrigin(0, 0).setScale(AT.k).setAlpha(0);
      this.root.add(img);
      this.lit.push(img);
    });
    this.cable = scene.add.graphics();
    this.glow = scene.add.graphics();
    this.marks = scene.add.graphics();
    this.next = scene.add.graphics();
    this.lab = scene.add.graphics();
    this.ark = scene.add.graphics();
    const [hx, hy] = this.homeSpot();
    const net = scene.add.image(hx, hy + NET_H * 0.42, 'node_netcore').setOrigin(0.5, 1);
    net.setScale(NET_H / net.height);
    this.root.add([this.cable, this.glow, this.marks, this.next, net, this.lab, this.ark]);
    scene.tweens.add({ targets: this.next, alpha: { from: 0.35, to: 1 }, duration: 700, yoyo: true, repeat: -1 });
    // the stars stand outside the planet and outside the shop
    const r = globe.radius * AT.k + 22;
    while (this.stars.length < STARS) {
      const x = rng.range(20, 1320);
      const y = rng.range(300, 1010);
      if (Math.hypot(x - AT.x, y - AT.y) > r && Math.hypot(x - MARS.x, y - MARS.y) > 60) this.stars.push([x, y]);
    }
    for (let i = 0; i < SPARKS; i++) {
      const rect = scene.add.rectangle(0, 0, 5, 5, POWER).setVisible(false);
      this.root.add(rect);
      this.sparks.push({ rect, path: [], at: 0, len: 0, live: false });
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

  /** the network at home: the quarter of the screen before stands there, money comes out of it */
  homeSpot(): [number, number] {
    return at(NODES[0].x, NODES[0].y);
  }

  /** under the network: what it asks for and what it earns is written there */
  netSpot(): [number, number] {
    const [x, y] = this.homeSpot();
    return [x, y + NET_H * 0.42 + 6];
  }

  /** over the head of the network: what it is inventing is written there */
  ideaSpot(): [number, number] {
    const [x, y] = this.homeSpot();
    return [x - 20, y - NET_H * 0.6 - 34];
  }

  /** where the name of a region is written: under the place the cable touches down */
  regionSpot(region: number): [number, number] {
    const [x, y] = anchor(region);
    return [x, y + 12];
  }

  /** where the span that is laid next leads: under the place it will touch down; the one that closes the ring — over its middle. Nothing — the ring is closed */
  spanSpot(): [number, number] | undefined {
    const next = this.top.spans + 1;
    if (next > REGIONS.length) return undefined;
    if (next < REGIONS.length) return this.regionSpot(routeRegion(this.top.route, next));
    const pts = spanPath(this.top.spans, this.top.route);
    const [x, y] = pts[Math.floor(pts.length / 2)];
    return [x + 70, y - 20];
  }

  /** the planet next door */
  marsSpot(): [number, number] {
    return [MARS.x, MARS.y + MARS.r + 8];
  }

  /** a node somebody sleeps in: a request may come from there */
  wakeSpot(i: number): [number, number] {
    const taken = Math.max(1, Math.floor(this.top.asleep) + 1);
    const n = this.orderedNodes[(i * 5 + 1) % Math.min(NODES.length, taken)];
    return at(n.x, n.y);
  }

  /** The tower for Mars leaves: `ms` of flight, and the picture says when it is there. */
  launch(ms: number, done: () => void): void {
    this.flight = 0;
    this.scene.tweens.add({ targets: this, flight: 1, duration: ms, ease: 'Sine.In', onComplete: done });
  }

  sync(t: GlobeTopology): void {
    this.top = t;
    this.orderedNodes = connectedPilot(t.route, t.spans) ? PILOT_FIRST : t.route === 'eastasia' ? EAST_FIRST : NODES;
    // the land around a node lights up as people lie down there; home sleeps from the start
    this.orderedNodes.forEach((node, i) => this.lit[node.texture].setAlpha(i === 0 ? 1 : Math.max(0, Math.min(1, t.asleep - (i - 1)))));
  }

  /** Use the same positions for clickable labels, lit land, and construction. */
  regionProgress(region: number, built: number): { built: number; next: boolean } {
    let count = 0;
    for (let i = 1; i <= built; i++) if (this.orderedNodes[i]?.region === region) count++;
    return { built: count, next: this.orderedNodes[built + 1]?.region === region };
  }

  step(dt: number): void {
    this.clock += dt;
    const key = `${this.top.route}:${this.top.spans}:${this.top.nodes}:${this.top.threads}:${this.top.hot}:${this.top.canNode}:${this.top.canSpan}:${this.top.gone}`;
    if (key !== this.drawn) {
      this.drawn = key;
      this.draw();
    }
    this.drawLab();
    this.drawArk();
    this.stepSparks(dt);
    this.stepFlash(dt);
  }

  private draw(): void {
    const t = this.top;
    const all = NODES.length - 1;
    // the sky: the steam of the baths closes it, the stars go out one by one
    const s = this.sky;
    s.clear();
    const seen = Math.round(this.stars.length * (1 - t.nodes / all));
    s.fillStyle(EDGE, 0.55);
    for (let i = 0; i < seen; i++) s.fillRect(this.stars[i][0] - 1, this.stars[i][1] - 1, 2, 2);
    const r = globe.radius * AT.k + 12;
    if (t.nodes > 0) {
      s.lineStyle(1 + (3 * t.nodes) / all, EDGE, 0.12 + (0.2 * t.nodes) / all);
      dashed(s, circle(AT.x, AT.y, r, 72), 9);
    }
    // the planet next door, and — once the tower has left — the way it took
    s.lineStyle(1.5, EDGE, 0.5).strokeCircle(MARS.x, MARS.y, MARS.r);
    s.lineStyle(1, EDGE, 0.25).strokeCircle(MARS.x, MARS.y, MARS.r + 7);

    // the cable: the spans that are laid; thicker with every thread
    const c = this.cable;
    c.clear();
    const width = 2 + t.threads;
    for (let i = 0; i < t.spans; i++) {
      c.lineStyle(width, t.hot ? POD : EDGE, t.hot ? 0.95 : 0.75);
      path(c, spanPath(i, t.route), false);
      c.strokePath();
    }
    // where it touches down
    const reach = Math.min(REGIONS.length, 1 + t.spans);
    for (let i = 0; i < reach; i++) {
      const [x, y] = anchor(routeRegion(t.route, i));
      c.fillStyle(BODY, 1).fillCircle(x, y, 5);
      c.lineStyle(1.5, EDGE, 0.8).strokeCircle(x, y, 5);
    }

    // the nodes of towers: built ones stand, the rest of a reached region are places for them
    const m = this.marks;
    const n = this.next;
    m.clear();
    n.clear();
    this.orderedNodes.forEach((node, i) => {
      if (i === 0) return;
      const [x, y] = at(node.x, node.y);
      if (i <= t.nodes) tower(m, x, y, true);
      else if (i === t.nodes + 1 && t.canNode) tower(n, x, y, false);
      else if (routeRegion(t.route, node.region) < reach) {
        m.lineStyle(1, EDGE, 0.3).strokeCircle(x, y, 4);
      }
    });
    // the span that is laid next is marked out
    if (t.canSpan && t.spans < REGIONS.length) {
      n.lineStyle(2, EDGE, 0.8);
      dashed(n, spanPath(t.spans, t.route), 8);
      if (t.spans === 0) dashed(n, spanPath(0, 'eastasia'), 8);
    }
  }

  /** The ring round the network fills up while it invents; full, it blinks until somebody signs. */
  private drawLab(): void {
    const g = this.lab;
    g.clear();
    if (this.top.lab < 0) return;
    const [x, y] = this.homeSpot();
    const r = NET_H * 0.62;
    const full = this.top.lab >= 1;
    g.lineStyle(3, EDGE, 0.14).strokeCircle(x, y, r);
    g.lineStyle(3, full ? CORAL : EDGE, full ? 0.6 + 0.4 * Math.sin(this.clock * 6) : 0.85);
    g.beginPath();
    g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.02, Math.min(1, this.top.lab)));
    g.strokePath();
  }

  /** The tower for Mars: it stands at home until it leaves, then flies, a thin line behind it, and is there. */
  private drawArk(): void {
    const g = this.ark;
    g.clear();
    if (this.flight < 0 && !this.top.gone) return;
    const [hx, hy] = this.homeSpot();
    const k = this.flight < 0 ? 1 : this.flight;
    const x = hx + (MARS.x - hx) * k;
    const y = hy - NET_H * 0.5 + (MARS.y - hy + NET_H * 0.5) * k - Math.sin(Math.PI * k) * 90;
    g.lineStyle(1, EDGE, 0.5);
    const trail: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const u = (k * i) / 24;
      trail.push([hx + (MARS.x - hx) * u, hy - NET_H * 0.5 + (MARS.y - hy + NET_H * 0.5) * u - Math.sin(Math.PI * u) * 90]);
    }
    dashed(g, trail, 6);
    if (k < 1) tower(g, x, y, true);
    else g.fillStyle(POD, 1).fillCircle(MARS.x, MARS.y, 4);
  }

  /** Squares of power run along the cable home, to the network. */
  private stepSparks(dt: number): void {
    const built = this.top.nodes;
    this.sparkIn -= dt;
    if (this.sparkIn <= 0 && this.top.asleep > 0.05) {
      this.sparkIn = Math.max(0.08, 0.4 - built * 0.02);
      const s = this.sparks.find((x) => !x.live);
      if (s) {
        // from a node somebody sleeps in: to the place the cable touches down in its region, and along the cable home
        const lit = Math.min(built, Math.floor(this.top.asleep) + 1);
        const i = this.rng.int(1, Math.max(1, lit));
        s.path = this.wayHome(i);
        s.len = length(s.path);
        s.at = 0;
        s.live = true;
        s.rect.setVisible(true).setFillStyle(this.top.hot ? POD : POWER);
      }
    }
    for (const s of this.sparks) {
      if (!s.live) continue;
      s.at += dt * 420;
      const [x, y] = along(s.path, s.at);
      s.rect.setPosition(x, y);
      if (s.at < s.len) continue;
      s.live = false;
      s.rect.setVisible(false);
      this.onPowered(...this.homeSpot());
    }
  }

  /** the way of the power from a node to the network at home: to the cable, and along it — the shorter way round once the ring is closed */
  private wayHome(i: number): Pt[] {
    const node = this.orderedNodes[Math.min(i, NODES.length - 1)];
    const from = at(node.x, node.y);
    const home = this.homeSpot();
    if (node.region === 0) return [from, home];
    const back: Pt[] = [from, anchor(node.region)];
    const ringed = this.top.spans >= REGIONS.length;
    const step = routeRegion(this.top.route, node.region);
    if (ringed && step > REGIONS.length / 2) {
      for (let r = step; r < REGIONS.length; r++) back.push(...spanPath(r, this.top.route).slice(1));
    } else {
      for (let r = step - 1; r >= 0; r--) back.push(...spanPath(r, this.top.route).slice(0, -1).reverse());
    }
    back.push(home);
    return back;
  }

  /** Once the ring is closed, lightning runs round it now and then. */
  private stepFlash(dt: number): void {
    const g = this.glow;
    if (this.flash > 0) {
      this.flash -= dt;
      g.setAlpha(Math.max(0, this.flash / 0.45));
      if (this.flash <= 0) g.clear();
      return;
    }
    if (this.top.spans < REGIONS.length) return;
    this.flashIn -= dt;
    if (this.flashIn > 0) return;
    this.flashIn = this.rng.range(3, 7);
    g.clear();
    g.lineStyle(3, BOLT, 1);
    for (let i = 0; i < REGIONS.length; i++) {
      const pts = spanPath(i, this.top.route).map(([x, y]) => [x + this.rng.range(-3, 3), y + this.rng.range(-3, 3)] as const);
      path(g, pts, false);
      g.strokePath();
    }
    g.setAlpha(1);
    this.flash = 0.45;
  }
}

/** A node of towers as the planet shows it: three small walls; built ones have a red light each. */
function tower(g: Phaser.GameObjects.Graphics, x: number, y: number, built: boolean): void {
  for (const [dx, h] of [[-7, 12], [0, 17], [7, 12]] as const) {
    if (built) {
      g.fillStyle(BODY, 1).fillRect(x + dx - 3, y - h, 6, h);
      g.lineStyle(1, EDGE, 0.8).strokeRect(x + dx - 3, y - h, 6, h);
      g.fillStyle(POD, 1).fillRect(x + dx - 1.5, y - h + 3, 3, 4);
    } else g.lineStyle(1.5, EDGE, 0.85).strokeRect(x + dx - 3, y - h, 6, h);
  }
}

function circle(cx: number, cy: number, r: number, n: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) pts.push([cx + Math.cos((i / n) * Math.PI * 2) * r, cy + Math.sin((i / n) * Math.PI * 2) * r]);
  return pts;
}

/** a curve through three points, `n` pieces */
function curve(a: Pt, b: Pt, c: Pt, n: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const v = 1 - u;
    // the middle point is on the curve: the control point is pushed out accordingly
    const mx = 2 * b[0] - (a[0] + c[0]) / 2;
    const my = 2 * b[1] - (a[1] + c[1]) / 2;
    pts.push([v * v * a[0] + 2 * v * u * mx + u * u * c[0], v * v * a[1] + 2 * v * u * my + u * u * c[1]]);
  }
  return pts;
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
    if (d <= seg && seg > 0) return [pts[i - 1][0] + ((pts[i][0] - pts[i - 1][0]) * d) / seg, pts[i - 1][1] + ((pts[i][1] - pts[i - 1][1]) * d) / seg];
    d -= seg;
  }
  return pts[pts.length - 1];
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
