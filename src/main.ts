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
import { playSound } from './core/sound';
import { GameScene } from './game/GameScene';
import { createLookdevUi } from './gyms/lookdev/lookdevUi';
import { LookdevScene } from './gyms/lookdev/LookdevScene';
import { createBlueprint } from './ui/blueprint/blueprint';
import { createCard } from './ui/card/card';
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

// the game · ?gym=agree — the same scene for tuning and captures · ?gym=lookdev — the look-dev scene · ?gym=hello — environment check
function pickScene(): Phaser.Scene {
  if (args.gym === 'hello') return new HelloScene(rng, createHud(ui));
  if (args.gym === 'lookdev') return new LookdevScene(rng, createLookdevUi(ui, 'assets/img/scene_blueprint.webp'));
  {
    const gym = args.gym === 'agree';
    // one 1920×1080 container: the paper blueprint below, the terminal on top of it
    const layer = document.createElement('div');
    layer.className = 'ui1080';
    ui.append(layer);
    // captions and dialogs live in a layer of their own, above the canvas
    const top = document.createElement('div');
    top.id = 'top';
    top.innerHTML = '<div class="ui1080"></div>';
    stage.append(top);
    mountUiScale(stage, top);
    const over = top.firstElementChild as HTMLElement;
    const paper = createBlueprint(layer, over);
    const card = createCard(over, () => playSound('ui'));
    // a gym saves and shows the menu only when asked; a capture never touches the player's save
    const save = !args.capture && (gym ? args.save : true);
    const menu = args.menu || (!gym && !args.capture);
    return new GameScene(rng, createTerminal(layer), paper, card, { overlay: args.debug, save, gym, menu });
  }
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
