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
import { TAGLINE, TITLE } from './content/credits';
import { readArgs } from './core/args';
import { L, LANG } from './core/lang';
import { installMetrics } from './core/metrics';
import { createRng } from './core/rng';
import { playSound } from './core/sound';
import { GameScene } from './game/GameScene';
import { createLookdevUi } from './gyms/lookdev/lookdevUi';
import { LookdevScene } from './gyms/lookdev/LookdevScene';
import { createBench } from './ui/bench/bench';
import { createBlueprint } from './ui/blueprint/blueprint';
import { createCard } from './ui/card/card';
import { createCredits } from './ui/credits/credits';
import { createHud } from './ui/hud';
import { mountUiScale } from './ui/scale';
import { createTerminal } from './ui/terminal/terminal';
import { HelloScene } from './view/HelloScene';

const args = readArgs(window.location.search);
// the page speaks the language of the game: index.html is written in English
document.documentElement.lang = LANG;
document.querySelector('meta[name="description"]')?.setAttribute('content', `${TITLE} — ${TAGLINE}`);
installMetrics();

const rng = createRng(args.seed);
const stage = document.getElementById('stage')!;
const ui = document.getElementById('ui')!;
mountUiScale(stage, ui);

// the game · ?gym=agree — the same scene for tuning and captures · ?gym=lookdev — the look-dev scene · ?gym=hello — environment check
function pickScene(): Phaser.Scene {
  if (__TOOLS__ && args.gym === 'hello') return new HelloScene(rng, createHud(ui));
  if (__TOOLS__ && args.gym === 'lookdev') return new LookdevScene(rng, createLookdevUi(ui, 'assets/img/scene_blueprint.webp'));
  {
    const gym = __TOOLS__ && args.gym === 'agree';
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
    // the credits roll above the picture and below the dialogs
    const credits = createCredits(over);
    const card = createCard(over, () => playSound('ui'));
    // a gym saves and shows the menu only when asked; a capture never touches the player's save
    const save = !args.capture && (gym ? args.save : true);
    const menu = args.menu || (!gym && !args.capture);
    // a tuning session may open on a later screen: ?gym=agree&state=city|gov|planet|street|zig|world|finale|bench
    const start = gym ? ({ city: 3, intern: 3, standup: 3, manager: 3, gov: 4, planet: 5, street: 6, zig: 7, world: 8, finale: 9, bench: 10 }[args.state] ?? 0) : 0;
    // the terminal lies on top of the paper, the bench after the credits — on top of both
    const term = createTerminal(layer);
    const bench = createBench(layer);
    return new GameScene(rng, term, paper, card, credits, bench, { overlay: args.debug, save, gym, menu, start, demo: gym ? args.state : '' });
  }
}
const hello = __TOOLS__ && args.gym === 'hello';
stage.classList.toggle('overlay-canvas', !hello);

// text needs the web fonts before the first frame
await Promise.all([
  document.fonts.load('700 32px "JetBrains Mono"', L('Да $0', 'Yes $0')),
  document.fonts.load('400 24px "JetBrains Mono"', L('Клод', 'Claude')),
  document.fonts.load('600 64px "Source Serif 4"', L('Да $0', 'Yes $0')),
  document.fonts.load('400 24px "Source Serif 4"', L('Магазин', 'Shop')),
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
