// Two supervised runs of issue #5: close the first player's window to start the second.
// Start Vite, then: node tools/play-world-fork.mjs http://127.0.0.1:5173
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const url = new URL('/?gym=agree&state=zig&save=1&seed=7&lang=ru', process.argv[2] ?? 'http://127.0.0.1:5173');
const events = JSON.parse(await readFile(new URL('./inputs/world-entry.json', import.meta.url), 'utf8'));
const options = process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM }
  : { channel: existsSync(chromium.executablePath()) ? 'chromium' : 'chrome' };
const setup = await chromium.launch(options);
let save;
try {
  const page = await setup.newPage();
  await page.goto(url.href);
  await page.waitForFunction(() => window.__gym);
  const start = Date.now();
  for (const event of events) {
    await new Promise(resolve => setTimeout(resolve, Math.max(0, start + event.t * 1000 - Date.now())));
    await page.evaluate(event.eval);
  }
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  save = await page.evaluate(() => localStorage.getItem('da-klod-save'));
  if (!save) throw Error('Не удалось получить общее сохранение.');
} finally {
  await setup.close();
}

for (const goal of ['Увеличьте доход уже первой покупкой.', 'Подготовьте место для дальнейшего строительства.']) {
  console.log(`\nЦель: ${goal}\nДо покупки спросите, куда игрок поведёт кабель и почему. Запишите следующую покупку. Закройте окно после соединения веток.`);
  const browser = await chromium.launch({ ...options, headless: false });
  try {
    // No offline earnings while the other player was playing; both get the same wallet and map.
    const value = JSON.stringify({ ...JSON.parse(save), at: Date.now() });
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
      storageState: { cookies: [], origins: [{ origin: url.origin, localStorage: [{ name: 'da-klod-save', value }] }] },
    });
    await page.goto(url.href);
    await page.waitForEvent('close', { timeout: 0 });
  } finally {
    await browser.close();
  }
}
