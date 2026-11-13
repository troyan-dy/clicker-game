import Phaser from 'phaser';
import { logEvent, metrics } from '../../core/metrics';
import type { Rng } from '../../core/rng';
import { LD } from './layout';
import { TICKETS, type LookdevUi } from './lookdevUi';

const STEP = 1 / 60;
const POOL = 600;
const PIPS = 5;
const PAY = 5;
const INCOME = 12.5;
const FLOW_SPEED = 170;
const CORAL = 0xd97757;
const MONEY_ON_DARK = 0x7cc68d;
const MONEY_ON_PAPER = 0x3f7d58;

declare global {
  interface Window {
    __lookdev?: { zoom(): void };
  }
}

interface Square {
  rect: Phaser.GameObjects.Rectangle;
  mode: 'free' | 'flow' | 'fly';
  // fly: quadratic curve from (x0,y0) via (cx,cy) to the money counter
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  tx: number;
  ty: number;
  t: number;
  dur: number;
  green: number;
  // flow: distance travelled along one of the connector lines
  path: number;
  dist: number;
}

interface Route {
  pts: readonly (readonly [number, number])[];
  len: number;
  next: number;
}

/**
 * "This is how the game will look": the full-screen terminal, the pull-back onto the blueprint,
 * squares running along the connectors and flying into the money counter. Not the game loop.
 * The canvas is transparent and sits above the HTML layers, so it only draws the squares.
 */
export class LookdevScene extends Phaser.Scene {
  private readonly rng: Rng;
  private readonly ui: LookdevUi;
  private squares: Square[] = [];
  private routes: Route[] = [];
  private acc = 0;
  private money = 0;
  private shown = -1;
  private pips = 0;
  private ticket = 0;
  private zoomedOnce = false;

  constructor(rng: Rng, ui: LookdevUi) {
    super('lookdev');
    this.rng = rng;
    this.ui = ui;
  }

  create(): void {
    for (let i = 0; i < POOL; i++) {
      const rect = this.add.rectangle(0, 0, 14, 14, CORAL).setVisible(false);
      this.squares.push({
        rect, mode: 'free', x0: 0, y0: 0, cx: 0, cy: 0, tx: 0, ty: 0, t: 0, dur: 1, green: 0, path: 0, dist: 0,
      });
    }
    this.routes = LD.paths.map((pts, i) => {
      let len = 0;
      for (let k = 1; k < pts.length; k++) {
        len += Math.abs(pts[k][0] - pts[k - 1][0]) + Math.abs(pts[k][1] - pts[k - 1][1]);
      }
      return { pts, len, next: 0.3 + i * 0.35 };
    });

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'KeyZ') this.zoom();
      else this.press();
    });
    window.addEventListener('pointerdown', () => this.press());
    window.__lookdev = { zoom: () => this.zoom() };

    this.ui.setTicket(TICKETS[0], 0);
    this.ui.setMoney(0);
    window.__GAME__.ready = true;
  }

  update(_time: number, deltaMs: number): void {
    this.acc += Math.min(deltaMs / 1000, 0.25);
    while (this.acc >= STEP) {
      this.step(STEP);
      this.acc -= STEP;
    }
    const whole = Math.floor(this.money);
    if (whole !== this.shown) {
      this.shown = whole;
      this.ui.setMoney(whole);
    }
  }

  private zoom(): void {
    this.zoomedOnce = true;
    this.ui.toggleZoom();
    logEvent(this.ui.isTerminal() ? 'zoom_in' : 'zoom_out');
  }

  private press(): void {
    metrics.presses++;
    metrics.completed = metrics.presses >= 3;
    logEvent('press');
    this.ui.hit();

    this.pips++;
    this.ui.setTicket(TICKETS[this.ticket], this.pips);
    const done = this.pips >= PIPS;
    this.burst(done ? 26 : 9);
    if (!done) return;

    logEvent('task_done');
    this.money += PAY;
    this.pips = 0;
    this.ticket = (this.ticket + 1) % TICKETS.length;
    this.time.delayedCall(260, () => this.ui.setTicket(TICKETS[this.ticket], 0));
    // the first closed task is the "first purchase" of this mock: the camera pulls back
    if (!this.zoomedOnce && this.ui.isTerminal()) this.time.delayedCall(420, () => this.zoom());
  }

  private burst(count: number): void {
    const term = this.ui.isTerminal();
    const from = term ? LD.askLine : LD.card;
    const to = term ? LD.moneyTerm : LD.moneyPaper;
    for (let i = 0; i < count; i++) {
      const s = this.take();
      if (!s) return;
      s.mode = 'fly';
      s.x0 = this.rng.range(from.x, from.x + from.w);
      s.y0 = this.rng.range(from.y, from.y + from.h);
      const side = this.rng.range(-1, 1);
      s.cx = s.x0 + side * this.rng.range(120, 420);
      s.cy = s.y0 - this.rng.range(40, 260);
      s.tx = to.x + this.rng.range(-70, 70);
      s.ty = to.y + this.rng.range(-14, 14);
      s.t = 0;
      s.dur = this.rng.range(0.5, 0.9);
      s.green = term ? MONEY_ON_DARK : MONEY_ON_PAPER;
      const size = this.rng.int(10, 16);
      s.rect.setPosition(s.x0, s.y0).setSize(size, size).setFillStyle(CORAL).setScale(1).setVisible(true);
    }
  }

  private take(): Square | undefined {
    return this.squares.find((s) => s.mode === 'free');
  }

  private step(dt: number): void {
    const onPaper = !this.ui.isTerminal();
    if (onPaper) this.money += INCOME * dt;

    for (const r of this.routes) {
      r.next -= dt;
      if (r.next > 0 || !onPaper) continue;
      r.next = this.rng.range(1.1, 2.3);
      const s = this.take();
      if (!s) break;
      s.mode = 'flow';
      s.path = this.routes.indexOf(r);
      s.dist = 0;
      s.rect.setSize(13, 13).setFillStyle(CORAL).setScale(1).setVisible(true);
    }

    for (const s of this.squares) {
      if (s.mode === 'flow') this.stepFlow(s, dt, onPaper);
      else if (s.mode === 'fly') this.stepFly(s, dt);
    }
  }

  private stepFlow(s: Square, dt: number, onPaper: boolean): void {
    const r = this.routes[s.path];
    s.dist += FLOW_SPEED * dt;
    if (s.dist >= r.len || !onPaper) {
      s.mode = 'free';
      s.rect.setVisible(false);
      return;
    }
    let left = s.dist;
    for (let k = 1; k < r.pts.length; k++) {
      const [ax, ay] = r.pts[k - 1];
      const [bx, by] = r.pts[k];
      const seg = Math.abs(bx - ax) + Math.abs(by - ay);
      if (left <= seg) {
        const f = left / seg;
        s.rect.setPosition(ax + (bx - ax) * f, ay + (by - ay) * f);
        return;
      }
      left -= seg;
    }
  }

  private stepFly(s: Square, dt: number): void {
    s.t += dt / s.dur;
    if (s.t >= 1) {
      s.mode = 'free';
      s.rect.setVisible(false);
      return;
    }
    const u = s.t;
    const v = 1 - u;
    s.rect.x = v * v * s.x0 + 2 * v * u * s.cx + u * u * s.tx;
    s.rect.y = v * v * s.y0 + 2 * v * u * s.cy + u * u * s.ty;
    if (u > 0.7) s.rect.setFillStyle(s.green).setScale(1 - (u - 0.7) * 1.5);
  }
}
