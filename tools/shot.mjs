#!/usr/bin/env node
// Screenshot of a local HTML mockup: node tools/shot.mjs art/concepts/terminal.html out.png [width height]
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const [src, out, w = '1920', h = '1080'] = process.argv.slice(2);
if (!src || !out) {
  console.error('usage: node tools/shot.mjs <file.html> <out.png> [width height]');
  process.exit(2);
}
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('requestfailed', (r) => errors.push(`failed: ${r.url()}`));
await page.goto(pathToFileURL(path.resolve(src)).href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(150);
await page.screenshot({ path: out });
await browser.close();
for (const e of errors) console.error(`shot: ${e}`);
console.log(`shot ok: ${out}`);
process.exit(errors.length ? 1 : 0);
