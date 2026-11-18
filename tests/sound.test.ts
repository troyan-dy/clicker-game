import { afterEach, expect, it, vi } from 'vitest';

const { tone, resume } = vi.hoisted(() => ({ tone: vi.fn(), resume: vi.fn() }));
vi.mock('zzfx', () => ({ ZZFX: { volume: 1, audioContext: { resume } }, zzfx: tone }));
afterEach(() => vi.unstubAllGlobals());

it('requires a gesture, respects mute and uses the cue and purchase step to set pitch', async () => {
  const { playSound, setSoundOn, unlockSound } = await import('../src/core/sound');
  playSound('yes');
  expect(tone).not.toHaveBeenCalled();
  unlockSound();
  unlockSound();
  expect(resume).toHaveBeenCalledTimes(1);
  setSoundOn(false);
  playSound('buy');
  expect(tone).not.toHaveBeenCalled();
  setSoundOn(true);
  const pitches = { yes: 392, auto: 587, buy: 523, ui: 660, all: 523, quip: 880, scale: 196, finale: 392, buffer: 262, waste: 98 };
  for (const cue of Object.keys(pitches) as Array<keyof typeof pitches>) {
    tone.mockClear();
    playSound(cue);
    expect(tone.mock.calls[0][2]).toBe(pitches[cue]);
  }
  playSound('yes', 6);
  expect(tone.mock.lastCall?.[2]).toBe(784);
  playSound('buy', 12);
  expect(tone.mock.lastCall?.[2]).toBe(1046);
});

it('starts one looping track on the first gesture and resumes the same track after unmute', async () => {
  const { startMusic, setMusicOn } = await import('../src/core/music');
  class Track {
    loop = false;
    volume = 0;
    static instances: Track[] = [];
    readonly src: string;
    constructor(src: string) { this.src = src; Track.instances.push(this); }
    play = vi.fn().mockRejectedValueOnce(Error('blocked')).mockResolvedValue(undefined);
    pause = vi.fn();
  }
  vi.stubGlobal('Audio', Track);
  setMusicOn(false);
  expect(Track.instances).toHaveLength(0);
  startMusic();
  startMusic();
  const [track] = Track.instances;
  expect(track).toMatchObject({ src: 'assets/audio/in_the_lobby.ogg', loop: true, volume: 0.3 });
  expect(track.pause).toHaveBeenCalledTimes(1);
  setMusicOn(true);
  await Promise.resolve();
  setMusicOn(false);
  setMusicOn(true);
  expect(Track.instances).toHaveLength(1);
  expect(track.play).toHaveBeenCalledTimes(2);
  expect(track.pause).toHaveBeenCalledTimes(2);
});
