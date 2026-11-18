import { describe, expect, it } from 'vitest';
import {
  automaticCall,
  automaticWork,
  chooseEnding,
  enterMarket,
  finaleAction,
} from '../src/game/logic/stages';
import { createPipe } from '../src/systems/pipeline/pipeline';
import { freshMeta, packSave, unpackSave } from '../src/systems/save/save';
import { cfg } from './fixtures/pipe';

describe('changing market and ending the run', () => {
  it('resets pickets and benefits but retains calls already earned and the scheduler', () => {
    const s = createPipe(cfg);
    const call = { at: 'job', kind: 1, left: 3 };
    const calls = { taken: 12, wait: 17, list: [call] };
    const said = {};
    const market = cfg.sources.find((x) => x.bribe)!.screen;
    s.strikes = ['job'];
    s.allowance = 2;
    expect(enterMarket(s, cfg, market, calls, said)).toEqual({
      announceAllowance: true,
      introduceSquads: true,
    });
    expect(s.strikes).toEqual([]);
    expect(s.allowance).toBe(0);
    expect(calls).toEqual({ taken: 12, wait: 17, list: [] });
    expect(enterMarket(s, cfg, market, calls, said)).toEqual({
      announceAllowance: false,
      introduceSquads: false,
    });
    s.allowance = 1;
    expect(enterMarket(s, cfg, cfg.grid.screen, calls, {})).toEqual({
      announceAllowance: false,
      introduceSquads: false,
    });
    expect(s.allowance).toBe(0);
  });

  it('waits for the launch once, and uses an immediate ending for a campaign without the world', () => {
    const s = createPipe(cfg);
    expect(finaleAction(s, cfg, 1, false, false)).toBeUndefined();
    s.noAsk = true;
    s.scale = cfg.scales.length;
    s.modules.ark = 1;
    expect(finaleAction(s, cfg, cfg.world.screen, false, false)).toBe('depart');
    expect(finaleAction(s, cfg, cfg.world.screen, false, true)).toBeUndefined();
    expect(finaleAction(s, cfg, cfg.world.screen, true, false)).toBeUndefined();
    const short = { ...cfg, scales: [], sources: [] };
    expect(finaleAction(s, short, 2, false, false)).toBe('ending');
  });

  it('resumes the chosen postgame mode and only handles calls older than two seconds', () => {
    const meta = freshMeta();
    const s = createPipe(cfg);
    const calls = [{ at: 'work', kind: 0, left: 8 }];
    chooseEnding(meta, 1);
    const save = packSave({
      state: s,
      meta,
      feed: { said: {}, shown: [] },
      at: 1,
      seconds: 1,
      won: true,
    });
    expect(unpackSave(save, cfg)?.meta.auto).toBe(true);
    expect(automaticWork(meta.auto, 0.99, false)).toEqual({ approve: false, sign: false });
    expect(automaticWork(meta.auto, 1, true)).toEqual({ approve: true, sign: true });
    expect(automaticCall(meta.auto, calls, 10)).toBe(false);
    calls[0].left -= 0.01;
    expect(automaticCall(meta.auto, calls, 10)).toBe(true);
    chooseEnding(meta, 0);
    expect(automaticCall(meta.auto, calls, 10)).toBe(false);
    expect(automaticWork(meta.auto, 1, true)).toEqual({ approve: false, sign: false });
  });
});
