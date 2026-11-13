import Phaser from 'phaser';
import type { Rng } from '../core/rng';
import { logEvent, metrics } from '../core/metrics';
import { PALETTE } from '../data/palette';
import type { Hud } from '../ui/hud';

const W = 1920;
const STEP = 1 / 60;
const KEY_X = W / 2;
const KEY_Y = 760;
const BURST = 14;
const GRAVITY = 2600;
const POOL = 400;

interface Pixel {
  rect: Phaser.GameObjects.Rectangle;
  vx: number;
  vy: number;
  life: number;
}

/** Environment check: the «Да» key, any keyboard key presses it, warm pixels fly. */
export class HelloScene extends Phaser.Scene {
  private key!: Phaser.GameObjects.Container;
  private pixels: Pixel[] = [];
  private acc = 0;
  private readonly rng: Rng;
  private readonly hud: Hud;

  constructor(rng: Rng, hud: Hud) {
    super('hello');
    this.rng = rng;
    this.hud = hud;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.sky);

    const g = this.add.graphics();
    g.fillStyle(PALETTE.cream).fillRect(0, 880, W, 200);
    g.lineStyle(8, PALETTE.ink).lineBetween(0, 880, W, 880);
    g.fillStyle(PALETTE.ink, 0.2).fillEllipse(KEY_X, 900, 520, 60);

    this.key = this.add.container(KEY_X, KEY_Y, [this.drawKey(), this.keyLabel()]);

    for (let i = 0; i < POOL; i++) {
      const rect = this.add.rectangle(0, 0, 20, 20, PALETTE.claude).setVisible(false);
      this.pixels.push({ rect, vx: 0, vy: 0, life: 0 });
    }

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (!e.repeat) this.press();
    });
    this.input.on('pointerdown', () => this.press());

    window.__GAME__.ready = true;
  }

  update(_time: number, deltaMs: number): void {
    this.acc += Math.min(deltaMs / 1000, 0.25);
    while (this.acc >= STEP) {
      this.step(STEP);
      this.acc -= STEP;
    }
  }

  private drawKey(): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    g.fillStyle(PALETTE.ink).fillRoundedRect(-230, -90, 460, 220, 48);
    g.fillStyle(PALETTE.claude).fillRoundedRect(-222, -112, 444, 204, 44);
    g.lineStyle(8, PALETTE.ink).strokeRoundedRect(-222, -112, 444, 204, 44);
    g.fillStyle(PALETTE.white, 0.55).fillRoundedRect(-190, -92, 150, 26, 13);
    return g;
  }

  private keyLabel(): Phaser.GameObjects.Text {
    return this.add
      .text(0, -12, 'ДА', {
        fontFamily: 'Rubik, "Segoe UI", sans-serif',
        fontStyle: '900',
        fontSize: '120px',
        color: '#2a2140',
      })
      .setOrigin(0.5);
  }

  private press(): void {
    metrics.presses++;
    metrics.completed = metrics.presses >= 3;
    logEvent('press');
    this.hud.setCount(metrics.presses);

    this.tweens.killTweensOf(this.key);
    this.key.setScale(1.08, 0.82);
    this.tweens.add({ targets: this.key, scaleX: 1, scaleY: 1, duration: 220, ease: 'Back.Out' });
    this.cameras.main.flash(60, 255, 255, 255, false);

    let spawned = 0;
    for (const p of this.pixels) {
      if (p.life > 0) continue;
      const size = this.rng.int(14, 26);
      p.rect
        .setPosition(KEY_X + this.rng.range(-180, 180), KEY_Y - 110)
        .setSize(size, size)
        .setFillStyle(this.rng.pick(PALETTE.claudeWarm))
        .setVisible(true);
      p.vx = this.rng.range(-520, 520);
      p.vy = this.rng.range(-1500, -700);
      p.life = this.rng.range(0.7, 1.1);
      if (++spawned >= BURST) break;
    }
  }

  private step(dt: number): void {
    for (const p of this.pixels) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vy += GRAVITY * dt;
      p.rect.x += p.vx * dt;
      p.rect.y += p.vy * dt;
      p.rect.rotation += p.vx * dt * 0.004;
      if (p.life <= 0) p.rect.setVisible(false);
    }
  }
}
