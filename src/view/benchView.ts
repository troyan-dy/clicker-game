import type Phaser from 'phaser';
import type { Rng } from '../core/rng';

type Pt = readonly [number, number];

/** who comes for the bread */
export type BirdKind = 'pigeon' | 'sparrow' | 'duck' | 'seagull';

const INK = 0x262624;
const LAWN = 0xbcd1ca;
const CRUST = 0xd4a27f;
const CRUMB = 0xf3e6cf;
const SLICE = 'slice';
/** the same slice lying flat on the grass: a square seen at the angle of the whole picture, with its thickness */
const SLICE_FLAT = 'slice_flat';
const CRUST_SIDE = 0xb98a63;
/** the bench with the player on it: where it stands and how tall it is drawn, px */
const BENCH = { x: 905, y: 546, h: 390 };
/** the hand with the slice, as a part of the picture's width and height from its top left corner */
const HAND = { x: 0.19, y: 0.267 };
/** Claude's body next to the bench, when he throws the bread himself */
const DOG = { x: 648, y: 550, h: 82 };
/** the pictures a kind is drawn with and the height of the standing one, px; the poses of a kind share one scale */
const LOOK: Record<BirdKind, { stand: string; peck?: string; fly?: string; h: number }> = {
  pigeon: { stand: 'node_pigeon', peck: 'node_pigeon_peck', fly: 'node_pigeon_fly', h: 70 },
  sparrow: { stand: 'node_sparrow', h: 42 },
  duck: { stand: 'node_duck', h: 82 },
  seagull: { stand: 'node_seagull', h: 84 },
};
/** where the birds wait: the far row first */
const SPOTS: readonly Pt[] = [
  [170, 486],
  [278, 482],
  [386, 488],
  [494, 483],
  [590, 487],
  [116, 538],
  [226, 542],
  [336, 537],
  [446, 543],
  [552, 538],
];
/** the lawn: the ground the birds stand on and the slices fall on */
const GROUND = { x: 64, y: 440, w: 1216, h: 118 };
const BIRDS = 18;
const SLICES = 26;

interface Bird {
  img: Phaser.GameObjects.Image;
  kind: BirdKind;
  state: 'free' | 'in' | 'wait' | 'eat' | 'out';
  /** index in SPOTS, or -1 for a bird that came for a slice on the lawn */
  spot: number;
  scale: number;
  /** a slice is on its way to this bird, or lies at its feet */
  owed: boolean;
  /** the slice it carries away */
  carry: Slice | null;
  /** seconds until it shifts on its feet again */
  fidget: number;
}

interface Slice {
  img: Phaser.GameObjects.Image;
  live: boolean;
  flying: boolean;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  dur: number;
  /** how many half-turns it makes in the air, and which way it leans */
  turns: number;
  spin: number;
  /** what happens when it lands */
  land: (() => void) | null;
}

/**
 * The park after the credits (M30): the player on a bench, birds on the lawn, whole square slices of
 * bread in the air. Draws what the bench logic says, decides nothing.
 */
export class BenchView {
  private readonly scene: Phaser.Scene;
  private readonly rng: Rng;
  private readonly root: Phaser.GameObjects.Container;
  private readonly birds: Bird[] = [];
  private readonly slices: Slice[] = [];
  /** slices that lie on the lawn, the oldest first */
  private readonly lying: Slice[] = [];
  /** birds in the order they landed: the first one is fed first */
  private readonly queue: Bird[] = [];
  private readonly hand: Pt;
  private readonly dog: Phaser.GameObjects.Image;
  private readonly courierDog: Phaser.GameObjects.Image;
  private autoOn = false;

  constructor(scene: Phaser.Scene, rng: Rng) {
    this.scene = scene;
    this.rng = rng;
    if (!scene.textures.exists(SLICE)) {
      // a whole slice of toast bread: a square, of course
      const g = scene.make.graphics({}, false);
      g.fillStyle(CRUST, 1).fillRect(0, 0, 30, 30);
      g.fillStyle(CRUMB, 1).fillRect(4, 4, 22, 22);
      g.lineStyle(2, INK, 1).strokeRect(1, 1, 28, 28);
      g.generateTexture(SLICE, 30, 30);
      g.destroy();
      // lying down: a rhombus two to one, the crust showing as a thin side below it
      const f = scene.make.graphics({}, false);
      const path = (pts: readonly (readonly [number, number])[], close: boolean): void => {
        f.beginPath();
        f.moveTo(pts[0][0], pts[0][1]);
        for (const [x, y] of pts.slice(1)) f.lineTo(x, y);
        if (close) f.closePath();
      };
      const rhomb = (w: number, h: number): [number, number][] => [
        [22, 12 - h],
        [22 + w, 12],
        [22, 12 + h],
        [22 - w, 12],
      ];
      path([[2, 12], [22, 22], [42, 12], [42, 16], [22, 26], [2, 16]], true);
      f.fillStyle(CRUST_SIDE, 1).fillPath();
      path([[2, 12], [2, 16], [22, 26], [42, 16], [42, 12]], false);
      f.lineStyle(2, INK, 1).strokePath();
      path(rhomb(20, 10), true);
      f.fillStyle(CRUST, 1).fillPath();
      path(rhomb(14, 7), true);
      f.fillStyle(CRUMB, 1).fillPath();
      path(rhomb(20, 10), true);
      f.lineStyle(2, INK, 1).strokePath();
      f.generateTexture(SLICE_FLAT, 44, 28);
      f.destroy();
    }
    this.root = scene.add.container(0, 0).setAlpha(0).setVisible(false);
    const lawn = scene.add.graphics();
    lawn.fillStyle(LAWN, 0.42).fillRoundedRect(GROUND.x, GROUND.y, GROUND.w, GROUND.h, 44);
    this.root.add(lawn);
    const bench = scene.add.image(BENCH.x, BENCH.y, 'node_bench').setOrigin(0.5, 1);
    bench.setScale(BENCH.h / bench.height);
    this.root.add(bench);
    this.hand = [BENCH.x - bench.displayWidth / 2 + bench.displayWidth * HAND.x, BENCH.y - BENCH.h + BENCH.h * HAND.y];
    this.dog = scene.add.image(DOG.x, DOG.y, 'node_robodog').setOrigin(0.5, 1).setFlipX(true).setAlpha(0);
    this.dog.setScale(DOG.h / this.dog.height);
    this.courierDog = scene.add.image(0, 0, 'node_robodog').setOrigin(0.5, 1).setVisible(false);
    this.courierDog.setScale(DOG.h / this.courierDog.height);
    this.root.add([this.dog, this.courierDog]);
    for (let i = 0; i < BIRDS; i++) {
      const img = scene.add.image(0, 0, 'node_pigeon').setOrigin(0.5, 1).setVisible(false);
      this.root.add(img);
      this.birds.push({ img, kind: 'pigeon', state: 'free', spot: -1, scale: 1, owed: false, carry: null, fidget: 0 });
    }
    for (let i = 0; i < SLICES; i++) {
      const img = scene.add.image(0, 0, SLICE).setVisible(false);
      this.root.add(img);
      this.slices.push({ img, live: false, flying: false, x0: 0, y0: 0, x1: 0, y1: 0, t: 0, dur: 1, turns: 3, spin: 1, land: null });
    }
  }

  show(ms: number): void {
    this.scene.tweens.killTweensOf(this.root);
    this.root.setVisible(true);
    this.scene.tweens.add({ targets: this.root, alpha: 1, duration: ms });
  }

  hide(ms: number): void {
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.add({ targets: this.root, alpha: 0, duration: ms, onComplete: () => this.root.setVisible(false) });
  }

  /** A bird flies in and waits on the lawn; `snatch` — bread is lying there already: it takes a slice and leaves. */
  land(kind: BirdKind, snatch = false): void {
    const bird = this.birds.find((b) => b.state === 'free');
    if (!bird) return;
    const slice = snatch ? this.lying.shift() : undefined;
    const taken = new Set(this.birds.filter((b) => b.state !== 'free').map((b) => b.spot));
    const free = SPOTS.map((_, i) => i).filter((i) => !taken.has(i));
    if (!slice && !free.length) return;
    const look = LOOK[kind];
    bird.kind = kind;
    bird.state = 'in';
    bird.owed = !!slice;
    bird.carry = slice ?? null;
    bird.spot = slice ? -1 : free[this.rng.int(0, free.length - 1)];
    const [tx, ty] = slice ? [slice.img.x - 30, slice.img.y + 12] : SPOTS[bird.spot];
    // the far row is drawn a little smaller
    const far = ty < 512 ? 0.9 : 1;
    const img = bird.img;
    img.setTexture(look.stand);
    bird.scale = (look.h / img.height) * far;
    const walks = kind === 'duck';
    if (look.fly && !walks) img.setTexture(look.fly);
    img.setScale(bird.scale).setFlipX(false).setAngle(0).setAlpha(1).setVisible(true);
    img.setPosition(-90, walks ? ty : this.rng.range(150, 340));
    this.scene.tweens.add({
      targets: img,
      x: tx,
      y: ty,
      duration: walks ? 2600 : this.rng.range(900, 1400),
      ease: walks ? 'Linear' : 'Sine.Out',
      onComplete: () => {
        img.setTexture(look.stand).setScale(bird.scale);
        bird.state = 'wait';
        bird.fidget = this.rng.range(1.5, 4);
        if (bird.carry) this.eat(bird);
        else {
          this.queue.push(bird);
          if (bird.owed) this.throwTo(bird, 'hand');
        }
      },
    });
  }

  /** A slice flies to the bird that has waited longest: it eats and carries the rest away. */
  feed(from: 'hand' | 'dog'): void {
    const bird = this.queue.shift() ?? this.birds.find((b) => b.state === 'in' && !b.owed);
    if (!bird) {
      this.drop(from);
      return;
    }
    if (bird.state === 'in') bird.owed = true; // it gets its slice the moment it lands
    else this.throwTo(bird, from);
  }

  /** A slice nobody waited for lands on the lawn and lies there. */
  drop(from: 'hand' | 'dog'): void {
    const slice = this.launch(from, [this.rng.range(250, 600), this.rng.range(GROUND.y + 62, GROUND.y + GROUND.h - 16)]);
    if (!slice) return;
    slice.land = () => {
      this.lying.push(slice);
      // more than a few and the oldest is quietly gone
      if (this.lying.length > 5) this.free(this.lying.shift()!);
    };
  }

  /** «Нет»: the bird that waited longest leaves without bread. */
  refuse(): void {
    const bird = this.queue.shift();
    if (bird) this.leave(bird);
  }

  /** The courier brings the next loaf: a robot dog comes out at the edge of the lawn, is at the bench in `seconds`, and runs back. */
  courier(seconds: number): void {
    const img = this.courierDog;
    // it never leaves the picture: beyond the lawn is the shop
    const edge = GROUND.x + GROUND.w - 4;
    const run = 1100;
    const wait = Math.max(0, seconds * 1000 - run);
    this.scene.tweens.killTweensOf(img);
    img.setPosition(edge, BENCH.y + 4).setFlipX(true).setAlpha(0).setVisible(true);
    this.scene.tweens.add({ targets: img, alpha: 1, duration: 250, delay: wait });
    this.scene.tweens.add({
      targets: img,
      x: BENCH.x + 256,
      duration: run,
      delay: wait,
      onComplete: () => {
        img.setFlipX(false);
        this.scene.tweens.add({ targets: img, x: edge, duration: run, delay: 500 });
        this.scene.tweens.add({ targets: img, alpha: 0, duration: 250, delay: 500 + run - 250, onComplete: () => img.setVisible(false) });
      },
    });
  }

  /** Claude throws the bread himself: his body sits down next to the bench — or gets up and goes. */
  auto(on: boolean): void {
    this.autoOn = on;
    this.scene.tweens.add({ targets: this.dog, alpha: on ? 1 : 0, duration: 350 });
  }

  step(dt: number): void {
    for (const s of this.slices) {
      if (!s.flying) continue;
      s.t += dt / s.dur;
      const u = Math.min(1, s.t);
      // an arc: the slice is thrown up, tumbles end over end, and comes down flat on the grass
      s.img.x = s.x0 + (s.x1 - s.x0) * u;
      s.img.y = s.y0 + (s.y1 - s.y0) * u - Math.sin(Math.PI * u) * 120;
      if (u < 0.82) {
        // seen edge-on and face-on in turn: that is what a tumbling slice looks like
        s.img.setAngle(s.spin * u * 40);
        s.img.setScale(1, Math.max(0.16, Math.abs(Math.cos(u * Math.PI * s.turns))));
      } else if (s.img.texture.key !== SLICE_FLAT) s.img.setTexture(SLICE_FLAT).setAngle(0).setScale(1);
      if (u < 1) continue;
      s.flying = false;
      // it lands with a small hop and settles
      this.scene.tweens.add({ targets: s.img, y: s.img.y - 5, scaleY: 0.86, duration: 70, yoyo: true });
      const land = s.land;
      s.land = null;
      land?.();
    }
    for (const b of this.birds) {
      if (b.carry && b.state === 'out') b.carry.img.setPosition(b.img.x - 6, b.img.y - 4);
      if (b.state !== 'wait') continue;
      b.fidget -= dt;
      if (b.fidget > 0) continue;
      // a waiting bird shifts on its feet or looks the other way for a moment
      b.fidget = this.rng.range(1.5, 4.5);
      if (this.rng.next() < 0.35) b.img.setFlipX(!b.img.flipX);
      else this.scene.tweens.add({ targets: b.img, y: b.img.y - 7, duration: 110, yoyo: true });
    }
  }

  private throwTo(bird: Bird, from: 'hand' | 'dog'): void {
    const slice = this.launch(from, [bird.img.x + 30, bird.img.y - 12]);
    if (!slice) {
      this.leave(bird);
      return;
    }
    bird.owed = true;
    slice.land = () => {
      bird.carry = slice;
      this.eat(bird);
    };
  }

  /** A slice leaves the hand (or Claude) for a point on the lawn. */
  private launch(from: 'hand' | 'dog', to: Pt): Slice | null {
    const slice = this.slices.find((s) => !s.live);
    if (!slice) return null;
    const [x, y] = from === 'dog' && this.autoOn ? [DOG.x - 34, DOG.y - DOG.h * 0.55] : this.hand;
    slice.live = true;
    slice.flying = true;
    slice.x0 = x;
    slice.y0 = y;
    slice.x1 = to[0];
    slice.y1 = to[1];
    slice.t = 0;
    slice.dur = this.rng.range(0.42, 0.56);
    slice.turns = this.rng.int(2, 4);
    slice.spin = this.rng.next() < 0.5 ? -1 : 1;
    slice.img.setTexture(SLICE).setPosition(x, y).setScale(1).setAngle(0).setAlpha(1).setVisible(true);
    return slice;
  }

  /** The bird pecks at its slice for a moment and takes off with what is left: the whole slice. */
  private eat(bird: Bird): void {
    const look = LOOK[bird.kind];
    const img = bird.img;
    bird.state = 'eat';
    img.setFlipX(false);
    if (look.peck) img.setTexture(look.peck).setScale(bird.scale);
    else img.setAngle(24);
    this.scene.time.delayedCall(this.rng.range(550, 900), () => this.leave(bird));
  }

  /** The bird flies off to the left, with its slice if it has one. */
  private leave(bird: Bird): void {
    const look = LOOK[bird.kind];
    const img = bird.img;
    bird.state = 'out';
    bird.owed = false;
    const i = this.queue.indexOf(bird);
    if (i >= 0) this.queue.splice(i, 1);
    img.setAngle(0).setTexture(look.fly ?? look.stand).setScale(bird.scale).setFlipX(true);
    this.scene.tweens.killTweensOf(bird.carry?.img ?? []);
    bird.carry?.img.setTexture(SLICE).setScale(0.8).setAngle(0);
    const walks = bird.kind === 'duck';
    this.scene.tweens.add({
      targets: img,
      x: -110,
      y: walks ? img.y : this.rng.range(140, 330),
      duration: walks ? 2600 : this.rng.range(1000, 1400),
      ease: walks ? 'Linear' : 'Sine.In',
      onComplete: () => {
        img.setVisible(false);
        if (bird.carry) this.free(bird.carry);
        bird.carry = null;
        bird.spot = -1;
        bird.state = 'free';
      },
    });
  }

  private free(slice: Slice): void {
    slice.live = false;
    slice.flying = false;
    slice.land = null;
    slice.img.setVisible(false);
  }
}
