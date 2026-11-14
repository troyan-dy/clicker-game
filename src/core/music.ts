/** The background track: one calm loop, started by the first key press or click. */
const TRACK = 'assets/audio/in_the_lobby.ogg';
const VOLUME = 0.3;

let audio: HTMLAudioElement | null = null;
let wanted = true;
let started = false;

function apply(): void {
  if (!started) return;
  if (!audio) {
    audio = new Audio(TRACK);
    audio.loop = true;
    audio.volume = VOLUME;
  }
  if (wanted) void audio.play().catch(() => undefined); // no audio device or the browser said no: the game goes on in silence
  else audio.pause();
}

/** The «Музыка» switch of the menu. */
export function setMusicOn(on: boolean): void {
  wanted = on;
  apply();
}

/** Browsers start audio only after a gesture: call from the first key press or click. */
export function startMusic(): void {
  if (started) return;
  started = true;
  apply();
}
