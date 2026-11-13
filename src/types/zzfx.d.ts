declare module 'zzfx' {
  /** volume, randomness, frequency, attack, sustain, release, shape, shapeCurve, slide, deltaSlide,
   *  pitchJump, pitchJumpTime, repeatTime, noise, modulation, bitCrush, delay, sustainVolume, decay, tremolo, filter */
  export function zzfx(...parameters: (number | undefined)[]): AudioBufferSourceNode | undefined;
  export const ZZFX: {
    volume: number;
    sampleRate: number;
    audioContext: AudioContext;
  };
}
