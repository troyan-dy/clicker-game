import { ZZFX, zzfx } from 'zzfx';

export type SoundName = 'yes' | 'auto' | 'buffer' | 'waste' | 'buy' | 'quip' | 'scale' | 'finale';

let unlocked = false;
ZZFX.volume = 0.25;

/** Browsers start audio only after a gesture: call from the first key press or click. */
export function unlockSound(): void {
  if (unlocked) return;
  unlocked = true;
  void ZZFX.audioContext.resume();
}

/**
 * The single place sounds are played from. `step` raises the pitch of «Да» with each
 * approval of a task, so five presses climb and the payout resolves them.
 */
export function playSound(name: SoundName, step = 0): void {
  if (!unlocked) return;
  switch (name) {
    case 'yes':
      zzfx(0.9, 0, 392 * 2 ** ((step * 2) / 12), 0.004, 0.02, 0.07, 1, 1.4);
      break;
    case 'auto':
      zzfx(0.3, 0, 587, 0.002, 0.01, 0.04, 1, 1.2);
      break;
    case 'buy':
      zzfx(1, 0, 523, 0.004, 0.09, 0.3, 0, 1.4, 0, 0, 262, 0.06);
      break;
    case 'quip':
      zzfx(0.35, 0, 880, 0.002, 0.012, 0.06, 0, 1.7);
      break;
    case 'scale':
      zzfx(0.9, 0, 196, 0.03, 0.22, 0.5, 0, 1.3, 2.2, 0, 0, 0, 0, 0, 0, 0, 0.12);
      break;
    case 'finale':
      zzfx(1, 0, 392, 0.02, 0.3, 0.7, 0, 1.5, 0, 0, 196, 0.09, 0.1);
      break;
    case 'buffer':
      zzfx(0.5, 0, 262, 0.002, 0.01, 0.04, 1, 1);
      break;
    case 'waste':
      zzfx(0.45, 0, 98, 0.002, 0.02, 0.05, 2, 0.6);
      break;
  }
}
