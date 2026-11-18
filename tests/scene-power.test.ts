import { describe, expect, it } from 'vitest';
import {
  networkDials,
  nextBlock,
  revenuePerGW,
  towerFacilities,
  towerPower,
  underpowered,
  worldPower,
} from '../src/game/logic/power';
import { createPipe, replacedOf } from '../src/systems/pipeline/pipeline';
import { cfg } from './fixtures/pipe';

describe('power and capacity on the tower and world screens', () => {
  it('measures all three bars in GW and leaves a hidden line out of the scale', () => {
    const s = createPipe(cfg);
    s.noAsk = true;
    s.scale = cfg.grid.screen - 2;
    s.queue = 59 * cfg.grid.unit;
    s.asleep = cfg.grid.unit;
    const view = towerPower(s, cfg, true);
    expect(view.places).toBeCloseTo(0.1);
    expect(view.came).toBeCloseTo(6);
    expect(view.asks).toBe(1);
    expect(view.top).toBe(6);
    expect(towerPower(s, cfg, false).top).toBe(1);
    const rate = revenuePerGW(s, cfg);
    expect(rate).toBeGreaterThan(0);
    s.asleep = 2 * cfg.grid.unit;
    expect(revenuePerGW(s, cfg)).toBeCloseTo(rate);
    expect(underpowered(s, cfg, false)).toBe(true);
    s.asleep = 10 * cfg.grid.unit;
    expect(underpowered(s, cfg, false)).toBe(false);
  });

  it('shows actual world cable capacity, tower supply and room for new construction', () => {
    const s = createPipe(cfg);
    s.noAsk = true;
    s.scale = cfg.world.screen - 2;
    expect(worldPower(s, cfg)).toMatchObject({
      gives: 0,
      carries: cfg.world.wire,
      asks: 1,
      count: 1,
      room: true,
      threads: true,
    });
    expect(underpowered(s, cfg, true)).toBe(true);
    s.asleep = 20 * cfg.grid.unit;
    s.modules.node = 1;
    const thread = cfg.modules.find((m) => m.kind === 'thread')!;
    s.modules[thread.id] = thread.max;
    const full = worldPower(s, cfg);
    expect(full).toMatchObject({
      gives: 2,
      carries: cfg.world.wire * 2 ** thread.max,
      asks: 1,
      count: 1 + thread.max,
      room: false,
      threads: false,
    });
    expect(full.top).toBe(full.carries);
    expect(underpowered(s, cfg, true)).toBe(false);
  });

  it('opens tower facilities as people arrive and the first tower is built', () => {
    const s = createPipe(cfg);
    const first = 7;
    s.owned.job = 20;
    expect(towerFacilities(s, cfg, first)).toEqual({
      blocks: 0,
      seenPeople: false,
      seenNet: false,
      grown: false,
      park: replacedOf(s, cfg),
    });
    s.modules.hire = 1;
    s.net.copies = 1;
    expect(towerFacilities(s, cfg, first)).toMatchObject({
      seenPeople: true,
      seenNet: true,
      grown: false,
    });
    s.net = {};
    s.modules = { block: first };
    s.asleep = 10 * cfg.grid.unit;
    expect(towerFacilities(s, cfg, first)).toMatchObject({
      blocks: first,
      seenPeople: true,
      seenNet: true,
      grown: true,
      park: 0,
    });
  });

  it('offers the next tower ring in order and warns only while existing beds are empty', () => {
    const s = createPipe(cfg);
    expect(nextBlock(s, cfg, 7)).toMatchObject({ built: 0, add: cfg.grid.blocks[0], idle: true });
    s.queue = cfg.grid.unit;
    s.modules.block = 1;
    expect(nextBlock(s, cfg, 7)).toMatchObject({
      built: 1,
      add: cfg.grid.blocks[1],
      tower: 1,
      ring: 1,
      rings: 6,
      idle: false,
    });
    s.modules.block = 7;
    expect(nextBlock(s, cfg, 7)).toMatchObject({ tower: 2, ring: 1 });
    s.modules.block = cfg.grid.blocks.length;
    expect(nextBlock(s, cfg, 7)).toBeUndefined();
  });

  it('shows only unlocked dials and hides completed tower dials on the world screen', () => {
    const s = createPipe(cfg);
    const ids = (screen: number, all: boolean) =>
      networkDials(s, cfg, screen, all).map((d) => d.id);
    expect(ids(6, true)).toEqual([]);
    expect(ids(7, false)).toEqual(['copies']);
    expect(ids(7, true)).toEqual(['copies', 'think']);
    s.net.think = 1;
    expect(ids(7, false)).toEqual(['copies', 'think']);
    s.net.copies = cfg.net[0].max;
    s.net.halls = cfg.net[2].max;
    expect(ids(8, true)).toEqual(['think', 'halls']);
  });
});
