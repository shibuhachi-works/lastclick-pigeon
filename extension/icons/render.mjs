// icon.svg から各サイズの PNG を作る(全サイズ同じ原稿): node icons/render.mjs
// (リポジトリ直下の Playwright の Chromium で描画: 先に直下で npm ci && npx playwright install chromium。
//  PNG はコミットする。SVG を変えたら実行し直す)
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const dir = path.dirname(new URL(import.meta.url).pathname);
const svg = readFileSync(path.join(dir, "icon.svg"), "utf8");
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});
const page = await browser.newPage();
for (const size of [16, 32, 48, 128]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace(/width="128" height="128"/, `width="${size}" height="${size}"`)}</body></html>`);
  const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  writeFileSync(path.join(dir, `icon${size}.png`), png);
  console.log(`icon${size}.png`);
}
await browser.close();
