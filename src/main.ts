import Phaser from 'phaser';
import '@fontsource/rubik/cyrillic-500.css';
import '@fontsource/rubik/cyrillic-700.css';
import '@fontsource/rubik/cyrillic-900.css';
import '@fontsource/rubik/latin-500.css';
import '@fontsource/rubik/latin-700.css';
import '@fontsource/rubik/latin-900.css';
import '@fontsource/jetbrains-mono/cyrillic-500.css';
import '@fontsource/jetbrains-mono/cyrillic-700.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import '@fontsource/jetbrains-mono/latin-700.css';
import './ui/style.css';
import { readArgs } from './core/args';
import { installMetrics } from './core/metrics';
import { createRng } from './core/rng';
import { createLookdevHud } from './gyms/lookdevHud';
import { LookdevScene } from './gyms/LookdevScene';
import { createHud } from './ui/hud';
import { HelloScene } from './view/HelloScene';

const args = readArgs(window.location.search);
installMetrics();

const rng = createRng(args.seed);
const ui = document.getElementById('ui')!;

function pickScene(): Phaser.Scene {
  if (args.gym === 'lookdev') {
    return new LookdevScene(rng, createLookdevHud(ui, 'assets/img/ui_card_company.webp'));
  }
  return new HelloScene(rng, createHud(ui));
}

// canvas text needs the web fonts before the first frame
await Promise.all([
  document.fonts.load('900 64px Rubik', 'ДА $0'),
  document.fonts.load('700 32px Rubik', 'Да'),
  document.fonts.load('500 24px "JetBrains Mono"', 'Клод'),
]).catch(() => undefined);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1920,
  height: 1080,
  backgroundColor: '#4cc9f0',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [pickScene()],
});
