import Phaser from 'phaser';
import '@fontsource/jetbrains-mono/cyrillic-400.css';
import '@fontsource/jetbrains-mono/cyrillic-700.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-700.css';
import '@fontsource/source-serif-4/cyrillic-400.css';
import '@fontsource/source-serif-4/cyrillic-600.css';
import '@fontsource/source-serif-4/latin-400.css';
import '@fontsource/source-serif-4/latin-600.css';
import './ui/style.css';
import { readArgs } from './core/args';
import { installMetrics } from './core/metrics';
import { createRng } from './core/rng';
import { AgreeGym } from './gyms/agree/AgreeGym';
import { createLookdevUi } from './gyms/lookdev/lookdevUi';
import { LookdevScene } from './gyms/lookdev/LookdevScene';
import { createHud } from './ui/hud';
import { mountUiScale } from './ui/scale';
import { createTerminal } from './ui/terminal/terminal';
import { HelloScene } from './view/HelloScene';

const args = readArgs(window.location.search);
installMetrics();

const rng = createRng(args.seed);
const stage = document.getElementById('stage')!;
const ui = document.getElementById('ui')!;
mountUiScale(stage, ui);

// ?gym=agree — M01 · ?gym=hello — environment check · otherwise the look-dev scene
function pickScene(): Phaser.Scene {
  if (args.gym === 'agree') return new AgreeGym(rng, createTerminal(ui), args.debug);
  if (args.gym === 'hello') return new HelloScene(rng, createHud(ui));
  return new LookdevScene(rng, createLookdevUi(ui, 'assets/img/scene_blueprint.webp'));
}
const hello = args.gym === 'hello';
stage.classList.toggle('overlay-canvas', !hello);

// text needs the web fonts before the first frame
await Promise.all([
  document.fonts.load('700 32px "JetBrains Mono"', 'Да $0'),
  document.fonts.load('400 24px "JetBrains Mono"', 'Клод'),
  document.fonts.load('600 64px "Source Serif 4"', 'Да $0'),
  document.fonts.load('400 24px "Source Serif 4"', 'Магазин'),
]).catch(() => undefined);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1920,
  height: 1080,
  transparent: !hello,
  backgroundColor: '#4cc9f0',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [pickScene()],
});
