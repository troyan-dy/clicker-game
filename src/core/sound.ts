import { ZZFX, zzfx } from 'zzfx';

export type SoundName = 'yes' | 'buffer' | 'waste' | 'task';

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
    case 'task':
      zzfx(1, 0, 784, 0.004, 0.06, 0.28, 1, 1.6, 0, 0, 392, 0.07);
      break;
    case 'buffer':
      zzfx(0.5, 0, 262, 0.002, 0.01, 0.04, 1, 1);
      break;
    case 'waste':
      zzfx(0.45, 0, 98, 0.002, 0.02, 0.05, 2, 0.6);
      break;
  }
}
