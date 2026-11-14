// The licence texts of everything third-party in the build → public/LICENSES.txt. Runs before every build.
import fs from 'node:fs';

const PARTS = [
  ['Phaser', 'phaser', 'LICENSE.md', 'https://github.com/phaserjs/phaser'],
  ['ZzFX', 'zzfx', 'LICENSE', 'https://github.com/KilledByAPixel/ZzFX'],
  ['JetBrains Mono (font)', '@fontsource/jetbrains-mono', 'LICENSE', 'https://github.com/JetBrains/JetBrainsMono'],
  ['Source Serif 4 (font)', '@fontsource/source-serif-4', 'LICENSE', 'https://github.com/adobe-fonts/source-serif'],
];

const game = JSON.parse(fs.readFileSync('package.json', 'utf8'));
let out = `Да, Клод ${game.version} — third-party licences\n\n`;
out += 'Music: "In the Lobby" by Umplix — CC0 1.0 (public domain), https://opengameart.org/content/in-the-lobby\n';
out += 'Pictures: generated with an image model from the author\'s descriptions.\n';
for (const [name, pkg, file, url] of PARTS) {
  const version = JSON.parse(fs.readFileSync(`node_modules/${pkg}/package.json`, 'utf8')).version;
  const text = fs.readFileSync(`node_modules/${pkg}/${file}`, 'utf8').trim();
  out += `\n${'='.repeat(72)}\n${name} ${version} — ${url}\n${'='.repeat(72)}\n\n${text}\n`;
}
fs.writeFileSync('public/LICENSES.txt', out);
console.log(`public/LICENSES.txt: ${PARTS.length} licences, ${out.length} characters`);
