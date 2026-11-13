import Phaser from 'phaser';
import { logEvent, metrics } from '../core/metrics';
import type { Rng } from '../core/rng';
import { PALETTE } from '../data/palette';
import { LAYOUT as L } from './lookdevLayout';
import type { LookdevHud } from './lookdevHud';

const STEP = 1 / 60;
const POOL = 900;
const PIPS = 5;

interface Pixel {
  rect: Phaser.GameObjects.Rectangle;
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  t: number;
  dur: number;
  spin: number;
  size: number;
  live: boolean;
}

/**
 * "This is how the game will look": room, coder, laptop with Claude, the «ДА» key,
 * the pixel burst flying into the money counter, and a HUD mock. Not the game loop.
 */
export class LookdevScene extends Phaser.Scene {
  private readonly rng: Rng;
  private readonly hud: LookdevHud;
  private key!: Phaser.GameObjects.Container;
  private face!: Phaser.GameObjects.Container;
  private eyes: Phaser.GameObjects.Rectangle[] = [];
  private coder!: Phaser.GameObjects.Image;
  private rays!: Phaser.GameObjects.Graphics;
  private pixels: Pixel[] = [];
  private acc = 0;
  private blinkIn = 2;
  private money = 1279;
  private pips = 0;
  private arrived = 0;

  constructor(rng: Rng, hud: LookdevHud) {
    super('lookdev');
    this.rng = rng;
    this.hud = hud;
  }

  preload(): void {
    this.load.image('bg_room', 'assets/img/bg_room.webp');
    this.load.image('pr_desk_laptop', 'assets/img/pr_desk_laptop.webp');
    this.load.image('ch_coder', 'assets/img/ch_coder.webp');
  }

  create(): void {
    this.add.image(0, 0, 'bg_room').setOrigin(0).setDisplaySize(1920, 1080);

    this.rays = this.add.graphics({ x: L.face.x, y: L.face.y });
    this.rays.fillStyle(PALETTE.white, 0.14);
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Phaser.Math.TAU;
      const w = Phaser.Math.TAU / n / 4;
      this.rays.fillTriangle(
        0,
        0,
        Math.cos(a - w) * 1500,
        Math.sin(a - w) * 1500,
        Math.cos(a + w) * 1500,
        Math.sin(a + w) * 1500,
      );
    }

    this.placeSprite('pr_desk_laptop', L.desk);
    this.face = this.makeFace();
    this.coder = this.placeSprite('ch_coder', L.coder);
    this.key = this.makeKey();

    for (let i = 0; i < POOL; i++) {
      const rect = this.add.rectangle(0, 0, 20, 20, PALETTE.claude).setVisible(false).setDepth(10);
      this.pixels.push({ rect, x0: 0, y0: 0, cx: 0, cy: 0, t: 0, dur: 1, spin: 0, size: 20, live: false });
    }

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (!e.repeat) this.press();
    });
    this.input.on('pointerdown', () => this.press());

    this.hud.setMoney(this.money);
    window.__GAME__.ready = true;
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.25);
    this.rays.rotation += dt * 0.12;
    this.acc += dt;
    while (this.acc >= STEP) {
      this.step(STEP);
      this.acc -= STEP;
    }
  }

  private placeSprite(
    key: string,
    at: { x: number; bottom: number; height: number },
  ): Phaser.GameObjects.Image {
    const img = this.add.image(at.x, at.bottom, key).setOrigin(0.5, 1);
    img.setScale(at.height / img.height);
    return img;
  }

  private makeFace(): Phaser.GameObjects.Container {
    const s = L.face.size;
    const g = this.add.graphics();
    g.fillStyle(PALETTE.claude).fillRoundedRect(-s / 2, -s / 2, s, s, s * 0.24);
    g.lineStyle(7, PALETTE.ink).strokeRoundedRect(-s / 2, -s / 2, s, s, s * 0.24);
    g.fillStyle(PALETTE.white, 0.6).fillRoundedRect(-s * 0.36, -s * 0.38, s * 0.26, s * 0.09, s * 0.045);
    g.fillStyle(PALETTE.ink).fillRoundedRect(-s * 0.13, s * 0.17, s * 0.26, s * 0.07, s * 0.035);
    const e = s * 0.13;
    this.eyes = [-1, 1].map((side) =>
      this.add.rectangle(side * s * 0.19, -s * 0.03, e, e * 1.25, PALETTE.ink),
    );
    const face = this.add.container(L.face.x, L.face.y, [g, ...this.eyes]);
    this.tweens.add({
      targets: face,
      y: L.face.y - 5,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    return face;
  }

  private makeKey(): Phaser.GameObjects.Container {
    const { w, h } = L.key;
    const g = this.add.graphics();
    g.fillStyle(PALETTE.ink).fillRoundedRect(-w / 2 - 6, -h / 2 + 4, w + 12, h + 22, 30);
    g.fillStyle(PALETTE.claude).fillRoundedRect(-w / 2, -h / 2 - 12, w, h, 26);
    g.lineStyle(7, PALETTE.ink).strokeRoundedRect(-w / 2, -h / 2 - 12, w, h, 26);
    g.fillStyle(PALETTE.white, 0.6).fillRoundedRect(-w / 2 + 22, -h / 2 + 2, w * 0.3, 16, 8);
    const label = this.add
      .text(0, -12, 'ДА', {
        fontFamily: 'Rubik',
        fontStyle: '900',
        fontSize: `${Math.round(h * 0.62)}px`,
        color: '#2a2140',
      })
      .setOrigin(0.5);
    return this.add.container(L.key.x, L.key.y, [g, label]);
  }

  private press(): void {
    metrics.presses++;
    metrics.completed = metrics.presses >= 3;
    logEvent('press');

    this.tweens.killTweensOf(this.key);
    this.key.setScale(1.07, 0.78);
    this.tweens.add({ targets: this.key, scaleX: 1, scaleY: 1, duration: 240, ease: 'Back.Out' });

    this.tweens.killTweensOf(this.coder);
    this.coder.setAngle(2.5);
    this.tweens.add({ targets: this.coder, angle: 0, duration: 260, ease: 'Back.Out' });

    this.face.setScale(1.16);
    this.tweens.add({ targets: this.face, scale: 1, duration: 260, ease: 'Back.Out' });

    this.cameras.main.flash(70, 255, 255, 255, false);
    this.hud.hitBubble();

    this.pips = (this.pips % PIPS) + 1;
    this.hud.setPips(this.pips);
    const done = this.pips === PIPS;
    this.burst(done ? 44 : 24);
    if (done) this.floatPay();
  }

  private burst(count: number): void {
    let spawned = 0;
    for (const p of this.pixels) {
      if (p.live) continue;
      const b = L.bubble;
      p.x0 = this.rng.range(b.x, b.x + b.w);
      p.y0 = this.rng.range(b.y, b.y + b.h);
      const out = this.rng.range(200, 520);
      const ang = this.rng.range(-Math.PI, 0) + (p.x0 < b.x + b.w / 2 ? -0.4 : 0.4);
      p.cx = p.x0 + Math.cos(ang) * out * 1.4;
      p.cy = p.y0 + Math.sin(ang) * out + this.rng.range(140, 380);
      p.t = 0;
      p.dur = this.rng.range(0.55, 1.0);
      p.spin = this.rng.range(-7, 7);
      p.size = this.rng.int(14, 30);
      p.live = true;
      p.rect
        .setPosition(p.x0, p.y0)
        .setSize(p.size, p.size)
        .setFillStyle(this.rng.pick(PALETTE.claudeWarm))
        .setRotation(0)
        .setScale(1)
        .setVisible(true);
      if (++spawned >= count) break;
    }
  }

  private floatPay(): void {
    const t = this.add
      .text(L.bubble.x + L.bubble.w / 2, L.bubble.y, '+$5', {
        fontFamily: 'Rubik',
        fontStyle: '900',
        fontSize: '120px',
        color: '#39d353',
        stroke: '#2a2140',
        strokeThickness: 18,
      })
      .setOrigin(0.5)
      .setDepth(11)
      .setScale(0.4);
    this.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.Out' });
    this.tweens.add({
      targets: t,
      y: t.y - 150,
      alpha: 0,
      delay: 450,
      duration: 450,
      ease: 'Quad.In',
      onComplete: () => t.destroy(),
    });
  }

  private step(dt: number): void {
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) {
      this.blinkIn = this.rng.range(2.2, 4.2);
      this.tweens.add({ targets: this.eyes, scaleY: 0.12, duration: 70, yoyo: true });
    }

    let landed = 0;
    for (const p of this.pixels) {
      if (!p.live) continue;
      p.t += dt / p.dur;
      if (p.t >= 1) {
        p.live = false;
        p.rect.setVisible(false);
        landed++;
        continue;
      }
      const u = p.t;
      const v = 1 - u;
      p.rect.x = v * v * p.x0 + 2 * v * u * p.cx + u * u * L.money.x;
      p.rect.y = v * v * p.y0 + 2 * v * u * p.cy + u * u * L.money.y;
      p.rect.rotation += p.spin * dt;
      if (u > 0.72) p.rect.setFillStyle(PALETTE.money).setScale(1 - (u - 0.72) * 1.6);
    }
    if (landed > 0) {
      this.arrived += landed;
      // every 8 landed pixels are worth a dollar in this mock
      const dollars = Math.floor(this.arrived / 8);
      if (dollars > 0) {
        this.arrived -= dollars * 8;
        this.money += dollars;
        this.hud.setMoney(this.money);
      }
    }
  }
}
