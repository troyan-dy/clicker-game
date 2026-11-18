import { describe, expect, it } from 'vitest';
import { towerBottleneck, workBottleneck, worldBottleneck } from '../src/game/logic/bottlenecks';
import { createPipe, podsOf, type PipeConfig } from '../src/systems/pipeline/pipeline';
import { cfg } from './fixtures/pipe';

describe('bottlenecks shown to the player', () => {
  it('considers ready approvals before backlog and excludes the player after automatic approval', () => {
    const s = createPipe(cfg);
    expect(workBottleneck(s, cfg, 0, 3)).toBe('you');
    s.ready = Math.ceil(cfg.tuning.readyMax / 2);
    expect(workBottleneck(s, cfg, 0, 1.5)).toBe('you');
    s.backlog = 50;
    expect(workBottleneck(s, cfg, 50, 1.49)).toBe('claude');
    s.noAsk = true;
    expect(workBottleneck(s, cfg, 50, 30)).toBe('claude');
    s.backlog = 0;
    expect(workBottleneck(s, cfg, 50, 30)).toBe('none');
    expect(workBottleneck(s, cfg, 0, 0)).toBe('none');
    s.owned = {};
    expect(workBottleneck(s, cfg, 0, 0)).toBe('tasks');
  });

  it('identifies a waiting player, a full tower, empty beds and a line moving into beds', () => {
    const s = createPipe(cfg);
    const unit = cfg.grid.unit;
    expect(towerBottleneck(s, cfg, 'none')).toBe('none');
    s.queue = unit;
    expect(towerBottleneck(s, cfg, 'none')).toBe('you');
    s.gate = true;
    for (const previous of ['none', 'pods', 'people'] as const)
      expect(towerBottleneck(s, cfg, previous)).toBe(previous);
    s.queue = 0;
    expect(towerBottleneck(s, cfg, 'none')).toBe('people');
    s.asleep = podsOf(s, cfg);
    expect(towerBottleneck(s, cfg, 'none')).toBe('pods');
    s.modules.block = cfg.grid.blocks.length;
    s.asleep = podsOf(s, cfg);
    expect(towerBottleneck(s, cfg, 'none')).toBe('net');
    s.net = Object.fromEntries(cfg.net.map((p) => [p.id, p.max]));
    expect(towerBottleneck(s, cfg, 'none')).toBe('none');
  });

  it('checks world bottlenecks in network, cable and tower order', () => {
    const s = createPipe(cfg);
    s.noAsk = true;
    s.scale = cfg.world.screen - 2;
    const config: PipeConfig = { ...cfg, grid: { ...cfg.grid, appetite: 2 } };
    expect(worldBottleneck(s, config, 'none')).toBe('net');
    expect(worldBottleneck(s, { ...config, net: [] }, 'none')).toBe('none');
    const demand: PipeConfig = { ...cfg, grid: { ...cfg.grid, appetite: 100_000 } };
    s.asleep = 1e9;
    expect(worldBottleneck(s, demand, 'none')).toBe('wire');
    s.asleep = 0;
    s.modules.block = 1;
    expect(worldBottleneck(s, demand, 'none')).toBe('none');
    expect(worldBottleneck(s, demand, 'pods')).toBe('pods');
    s.asleep = podsOf(s, demand);
    expect(worldBottleneck(s, demand, 'none')).toBe('pods');
    s.modules.span = cfg.world.regions.length;
    s.modules.node = cfg.world.regions.reduce((a, b) => a + b, 0);
    s.asleep = podsOf(s, demand);
    expect(worldBottleneck(s, { ...demand, world: { ...demand.world, wire: 1e6 } }, 'none')).toBe(
      'none',
    );
  });
});
