import type Phaser from 'phaser';
import type { Rng } from '../core/rng';
import { BP, deskScreen } from '../data/layout/blueprint';
import { CORAL } from './squares';

type Pt = readonly [number, number];

const INK = 0x262624;
const DOT_SPEED = 520; // px per second along a connector
const DOTS = 90;
const TEXTURES = ['desk', 'laptop', 'office', 'tray', 'board', 'handshake', 'studio', 'box'];

export interface BlueprintTopology {
  /** units owned per source id (job, freelance, …) */
  sources: Record<string, number>;
  subagents: number;
}

interface Route {
  pts: readonly Pt[];
  len: number;
}

interface Dot {
  rect: Phaser.GameObjects.Rectangle;
  route: Route | null;
  key: string;
  dist: number;
}

/** How many subagent laptops are drawn one by one; the rest are a box of laptops with a number. */
export const VISIBLE_SUBAGENTS = BP.slots.length;

/**
 * The living diagram (M04): source nodes, the tray of waiting tasks, the player's desk and the
 * subagents' laptops, joined by connectors with squares running along them. Draws state, decides nothing.
 */
export class BlueprintView {
  private readonly scene: Phaser.Scene;
  private readonly rng: Rng;
  private readonly root: Phaser.GameObjects.Container;
  private readonly lines: Phaser.GameObjects.Graphics;
  private readonly nodes = new Map<string, Phaser.GameObjects.Image>();
  private readonly routes = new Map<string, Route>();
  private readonly dots: Dot[] = [];
  private signature = '';
  /** called when a square reaches a session: the task is closed there */
  onDelivered: (x: number, y: number) => void = () => undefined;

  static preload(scene: Phaser.Scene): void {
    for (const key of TEXTURES) scene.load.image(`node_${key}`, `assets/img/nodes/${key}.webp`);
  }

  constructor(scene: Phaser.Scene, rng: Rng) {
    this.scene = scene;
    this.rng = rng;
    this.lines = scene.add.graphics();
    this.root = scene.add.container(0, 0, [this.lines]).setAlpha(0).setVisible(false);

    this.addNode('tray', 'tray', BP.tray.x, BP.tray.y, BP.tray.scale, false);
    this.addNode('desk', 'desk', BP.desk.x, BP.desk.y, BP.desk.scale, false);
    // Claude on the screen of the player's laptop
    const s = deskScreen();
    const cx = (s.tr[0] + s.bl[0]) / 2;
    const cy = (s.tr[1] + s.bl[1]) / 2;
    const face = scene.add.rectangle(cx, cy, 26, 22, CORAL).setRotation(Math.atan2(s.tr[1] - s.tl[1], s.tr[0] - s.tl[0]));
    this.root.add(face);
    this.route('ses:me', [BP.trayOut, [640, BP.trayOut[1]]]);

    for (let i = 0; i < DOTS; i++) {
      const rect = scene.add.rectangle(0, 0, 11, 11, CORAL).setVisible(false);
      this.root.add(rect);
      this.dots.push({ rect, route: null, key: '', dist: 0 });
    }
  }

  /** The pull-back: the diagram appears after `delayMs`. */
  show(delayMs: number): void {
    this.root.setVisible(true);
    this.scene.tweens.add({ targets: this.root, alpha: 1, delay: delayMs, duration: 450 });
  }

  /** Brings nodes and connectors in line with what is owned. New nodes pop in. */
  sync(t: BlueprintTopology): void {
    const signature = JSON.stringify(t);
    if (signature === this.signature) return;
    this.signature = signature;

    for (const [id, place] of Object.entries(BP.sources)) {
      const key = `src:${id}`;
      if ((t.sources[id] ?? 0) === 0 || this.nodes.has(key)) continue;
      const img = this.addNode(key, place.key, place.x, place.y, place.scale, true);
      // out of the node's right side, along the common trunk, into the tray
      const outY = Math.round(place.y - img.height * place.scale * 0.45);
      const out: Pt = [Math.round(place.x + (img.width * place.scale) / 2 + 8), outY];
      this.route(key, [out, [BP.trunkX, outY], [BP.trunkX, BP.trayIn[1]], BP.trayIn]);
    }

    const out = BP.trayOut;
    const shown = Math.min(t.subagents, VISIBLE_SUBAGENTS);
    for (let i = 0; i < shown; i++) {
      const key = `ses:${i}`;
      if (this.nodes.has(key)) continue;
      const [x, y] = BP.slots[i];
      const img = this.addNode(key, 'laptop', x, y, BP.slotScale, true);
      const f = BP.slotFace;
      const face = this.scene.add.rectangle(x + f.dx, y + f.dy, 14, 12, CORAL).setRotation(f.rot).setAlpha(0);
      this.root.add(face);
      this.scene.tweens.add({ targets: face, alpha: 1, delay: 200, duration: 200 });
      const top = Math.round(y - img.height * BP.slotScale - 2);
      const pts: Pt[] =
        x > 1100
          ? [out, [out[0], BP.busY], [x - 90, BP.busY], [x - 90, y - 60], [x - 70, y - 60]]
          : [out, [out[0], BP.busY], [x, BP.busY], [x, top]];
      this.route(key, pts);
    }
    if (t.subagents > VISIBLE_SUBAGENTS && !this.nodes.has('ses:more')) {
      const m = BP.more;
      const img = this.addNode('ses:more', 'box', m.x, m.y, m.scale, true);
      this.route('ses:more', [out, [out[0], BP.busY], [m.x, BP.busY], [m.x, Math.round(m.y - img.height * m.scale - 6)]]);
    }
    this.redrawLines();
  }

  /** Sends a square along a connector: `src:<id>` → tray, `ses:me` / `ses:<i>` / `ses:more` → a session. */
  flow(key: string): void {
    const route = this.routes.get(key);
    const dot = this.dots.find((d) => !d.route);
    if (!route || !dot) return;
    dot.route = route;
    dot.key = key;
    dot.dist = 0;
    dot.rect.setPosition(route.pts[0][0], route.pts[0][1]).setVisible(true);
  }

  /** the connector of a random subagent out of `count`; the ones beyond the slots share the box */
  randomSession(count: number): string {
    if (count <= 0) return '';
    const i = this.rng.int(0, count - 1);
    return i < VISIBLE_SUBAGENTS ? `ses:${i}` : 'ses:more';
  }

  step(dt: number): void {
    for (const d of this.dots) {
      if (!d.route) continue;
      d.dist += DOT_SPEED * dt;
      if (d.dist >= d.route.len) {
        const end = d.route.pts[d.route.pts.length - 1];
        if (d.key.startsWith('ses:')) this.onDelivered(end[0], end[1]);
        d.route = null;
        d.rect.setVisible(false);
        continue;
      }
      let left = d.dist;
      for (let k = 1; k < d.route.pts.length; k++) {
        const [ax, ay] = d.route.pts[k - 1];
        const [bx, by] = d.route.pts[k];
        const seg = Math.abs(bx - ax) + Math.abs(by - ay);
        if (left <= seg) {
          const f = left / seg;
          d.rect.setPosition(ax + (bx - ax) * f, ay + (by - ay) * f);
          break;
        }
        left -= seg;
      }
    }
  }

  private addNode(id: string, texture: string, x: number, y: number, scale: number, pop: boolean): Phaser.GameObjects.Image {
    const img = this.scene.add.image(x, y, `node_${texture}`).setOrigin(0.5, 1).setScale(scale);
    this.root.add(img);
    this.nodes.set(id, img);
    if (pop) {
      img.setScale(scale * 0.6).setAlpha(0);
      this.scene.tweens.add({ targets: img, scale, alpha: 1, duration: 280, ease: 'Back.Out' });
    }
    return img;
  }

  private route(key: string, pts: readonly Pt[]): void {
    let len = 0;
    for (let k = 1; k < pts.length; k++) {
      len += Math.abs(pts[k][0] - pts[k - 1][0]) + Math.abs(pts[k][1] - pts[k - 1][1]);
    }
    this.routes.set(key, { pts, len });
  }

  private redrawLines(): void {
    const g = this.lines;
    g.clear();
    g.lineStyle(2, INK, 1);
    for (const r of this.routes.values()) {
      for (let k = 1; k < r.pts.length; k++) {
        g.lineBetween(r.pts[k - 1][0], r.pts[k - 1][1], r.pts[k][0], r.pts[k][1]);
      }
      // a small arrowhead where the connector arrives
      const [ex, ey] = r.pts[r.pts.length - 1];
      const [px, py] = r.pts[r.pts.length - 2];
      const dx = Math.sign(ex - px);
      const dy = Math.sign(ey - py);
      g.fillStyle(INK, 1);
      g.fillTriangle(ex, ey, ex - dx * 12 - dy * 6, ey - dy * 12 - dx * 6, ex - dx * 12 + dy * 6, ey - dy * 12 + dx * 6);
    }
  }
}
