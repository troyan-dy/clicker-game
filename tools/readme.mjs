#!/usr/bin/env node
// The pictures of the README in both languages → docs/img/<lang>/*.webp
//   node tools/readme.mjs          everything
//   node tools/readme.mjs art      only the drawn pages (art/readme/*.html)
//   node tools/readme.mjs shots    only the game frames (needs `npm run build:gym` first)
// The game frames come from one scripted tour of the six screens (tools/inputs/tour.json):
// a frame is taken every 2 s, FRAMES says which of them is which screen.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const LANGS = ['en', 'ru'];
const ART = ['hero', 'pipeline', 'scale'];
const FRAMES = { '1-terminal': 4, '2-desk': 10, '3-city': 17, '4-state': 24, '5-planet': 32, '6-factory': 41 };
const QUALITY = 0.9;
const what = process.argv[2] ?? 'all';

const browser = await chromium.launch();
const page = await browser.newPage();

/** PNG bytes → a WebP file: the browser's own encoder, nothing to install */
async function webp(png, out) {
  const data = await page.evaluate(
    async ([b64, q]) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      return c.toDataURL('image/webp', q).split(',')[1];
    },
    [png.toString('base64'), QUALITY],
  );
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(data, 'base64'));
  console.log(`${out}  ${Math.round(fs.statSync(out).size / 1024)} KB`);
}

if (what !== 'shots') {
  const sheet = await browser.newPage();
  for (const lang of LANGS) {
    for (const name of ART) {
      // 1600 px wide, as tall as the page turns out
      await sheet.setViewportSize({ width: 1600, height: 400 });
      await sheet.goto(`${pathToFileURL(path.resolve(`art/readme/${name}.html`)).href}?lang=${lang}`, { waitUntil: 'load' });
      await sheet.evaluate(() => document.fonts.ready);
      await sheet.waitForTimeout(150);
      await webp(await sheet.screenshot({ fullPage: true }), `docs/img/${lang}/${name}.webp`);
    }
  }
  await sheet.close();
}

if (what !== 'art') {
  for (const lang of LANGS) {
    const dir = `.studioigor/captures/readme/${lang}`;
    const run = spawnSync(
      process.execPath,
      ['tools/capture.mjs', '--dir', 'dist-gym', '--url', `/?lang=${lang}`, '--out', dir, '--duration', '84', '--every', '2', '--width', '1600', '--height', '900',
        '--inputs', 'tools/inputs/tour.json', '--wait-for', 'window.__GAME__?.ready', '--seed', '7', '--timeout', '240'],
      { stdio: 'inherit' },
    );
    if (run.status !== 0) process.exit(run.status ?? 1);
    for (const [name, n] of Object.entries(FRAMES)) {
      await webp(fs.readFileSync(`${dir}/frame_${String(n).padStart(3, '0')}.png`), `docs/img/${lang}/${name}.webp`);
    }
  }
}
await browser.close();
