import type Phaser from 'phaser';
import { BP } from '../data/layout/blueprint';
import { CITY } from '../data/layout/city';
import { CORAL } from './squares';

type Pt = readonly [number, number];

const INK = 0x262624;
const GHOST = 0.2; // what is not bought yet is a pale outline
const DOT_SPEED = 560; // px per second along a connector
const DOTS = 80;
const HOME: Pt = [CITY.home.x, CITY.home.y - 60];

export type FarmNode = keyof typeof CITY.farms;

/** What the player owns in the city: contracts with companies and server capacity. */
export interface CityTopology {
  /** units owned per source id; a company is hired when its id is above zero */
  owned: Record<string, number>;
  racks: number;
  halls: number;
  datacentres: number;
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

/**
 * The city (M16): the player's desk in the middle, company buildings around it, the server room and
 * the datacentre next to it. Companies send squares of tasks to the desk, the desk hands them to the
 * servers. Draws state, decides nothing.
 */
export class CityView {
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly lines: Phaser.GameObjects.Graphics;
  private readonly nodes = new Map<string, Phaser.GameObjects.Image>();
  private readonly routes = new Map<string, Route>();
  private readonly dots: Dot[] = [];
  private serversKey = '';
  /** called when a square of tasks reaches the servers: the tasks are closed there */
  onDelivered: (x: number, y: number) => void = () => undefined;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.lines = scene.add.graphics();
    this.root = scene.add.container(0, 0, [this.lines]).setAlpha(0).setVisible(false);

    // far rows first, so that nearer buildings overlap them
    const places: { id: string; key: string; x: number; y: number; h: number }[] = [
      ...Object.entries(CITY.lots).map(([id, lot]) => ({ id, ...lot })),
      { id: 'servers', key: 'rack', ...CITY.farms.servers },
      { id: 'dc', key: 'datacenter', ...CITY.farms.dc },
      { id: 'home', key: 'desk', x: CITY.home.x, y: CITY.home.y, h: 0 },
    ].sort((a, b) => a.y - b.y);
    for (const p of places) {
      const img = scene.add.image(p.x, p.y, `node_${p.key}`).setOrigin(0.5, 1);
      if (p.id === 'home') img.setScale(CITY.home.scale * BP.desk.scale);
      else img.setAlpha(GHOST).setScale(this.fit(img, p.h));
      this.root.add(img);
      this.nodes.set(p.id, img);
    }

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

  /** Whatever was bought lights up and gets a connector: companies → the desk → the servers. */
  sync(t: CityTopology): void {
    let changed = false;
    for (const [id, lot] of Object.entries(CITY.lots)) {
      if (!t.owned[id] || this.routes.has(id)) continue;
      this.light(id);
      this.routes.set(id, this.spoke([lot.x, lot.y - 22], false));
      changed = true;
    }

    // the server room grows from one rack into a row of them
    const serversKey = t.halls > 0 ? 'racks' : 'rack';
    const servers = this.nodes.get('servers')!;
    if (t.racks + t.halls > 0 && serversKey !== this.serversKey) {
      this.serversKey = serversKey;
      servers.setTexture(`node_${serversKey}`).setScale(this.fit(servers, CITY.farms.servers.h));
      this.light('servers');
      const f = CITY.farms.servers;
      this.routes.set('servers', this.spoke([f.x, f.y - f.h - 6], true));
      changed = true;
    }
    if (t.datacentres > 0 && !this.routes.has('dc')) {
      this.light('dc');
      const f = CITY.farms.dc;
      this.routes.set('dc', this.spoke([f.x, f.y + 6], true));
      changed = true;
    }
    if (changed) this.redrawLines();
  }

  /** Sends a square along a connector: a company id → the desk, `servers` / `dc` → from the desk to the servers. */
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
  }

  private fit(img: Phaser.GameObjects.Image, h: number): number {
    return Math.min(h / img.height, CITY.maxWidth / img.width);
  }

  private light(id: string): void {
    const img = this.nodes.get(id)!;
    const scale = img.scale;
    img.setScale(scale * 0.7);
    this.scene.tweens.add({ targets: img, scale, alpha: 1, duration: 320, ease: 'Back.Out' });
  }

  /**
   * A straight connector between a node and the edge of the desk. Companies send tasks in;
   * `outward` connectors carry them from the desk to the servers, where they become money.
   */
  private spoke(node: Pt, outward: boolean): Route {
    const full = Math.hypot(HOME[0] - node[0], HOME[1] - node[1]);
    const k = (full - CITY.homeRadius) / full;
    const edge: Pt = [node[0] + (HOME[0] - node[0]) * k, node[1] + (HOME[1] - node[1]) * k];
    const len = full - CITY.homeRadius;
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
