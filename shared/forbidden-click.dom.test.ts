// 実際の DOM で、セレクタ側の文字を「投稿する」に書き換えてもクリックされないことを確かめる。
// 拡張・Playwright 版と同じ部品(collectClickLabels → assertClickAllowed → click)を同じ順で通す。
//
// ブラウザは playwright の chromium。別バージョンの chromium を使う場合は
// PLAYWRIGHT_CHROMIUM_PATH に実行ファイルのパスを入れる。
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { chromium, type Browser, type Page } from "playwright";
import { collectClickLabels } from "./click-labels.js";
import { ForbiddenClickError, assertClickAllowed } from "./forbidden-click.js";

const PAGE = `<!doctype html><html><body>
  <button id="next">公開に進む</button>
  <button id="save">保存</button>
  <button id="publish">投稿する</button>
  <button id="publish2" aria-label="記事を公開する"><span class="icon"></span></button>
  <button id="publish3"><span id="inner">公開する</span></button>
  <input id="submit" type="submit" value="公開">
  <input id="file" type="file" accept="image/*">
  <script>
    window.clicks = [];
    for (const b of document.querySelectorAll("button, input")) {
      b.addEventListener("click", () => window.clicks.push(b.id));
    }
  </script>
</body></html>`;

/** 拡張の safeClick と同じ手順。禁止文字に当たれば投げ、クリックは起きない */
async function safeClickLike(page: Page, selector: string) {
  const labels = await page.locator(selector).evaluate(collectClickLabels);
  assertClickAllowed(labels, selector);
  await page.locator(selector).click();
}

/** 「文字で探してクリックする」という content.ts / draft.ts の使い方を再現する */
async function clickByText(page: Page, texts: string[]) {
  const target = await page.evaluate((ts) => {
    const all = Array.from(document.querySelectorAll<HTMLElement>("button"));
    for (const t of ts) {
      const hit = all.find((el) => el.textContent?.trim().includes(t));
      if (hit) return `#${hit.id}`;
    }
    return null;
  }, texts);
  if (!target) throw new Error("not found");
  await safeClickLike(page, target);
}

describe("forbidden-click (DOM)", () => {
  let browser: Browser;
  let page: Page;

  before(async () => {
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
    page = await browser.newPage();
    await page.setContent(PAGE);
  });
  after(async () => {
    await browser?.close();
  });

  it("「公開に進む」「保存」は押せる", async () => {
    await safeClickLike(page, "#next");
    await safeClickLike(page, "#save");
    assert.deepEqual(await page.evaluate(() => (window as any).clicks), ["next", "save"]);
  });

  it("selectors の確定ボタンの文字を「投稿する」に書き換えても押されない", async () => {
    // selectors/note.json の thumbnail.confirmText が ["投稿する"] に差し替えられた想定
    await assert.rejects(() => clickByText(page, ["投稿する"]), ForbiddenClickError);
    assert.deepEqual(await page.evaluate(() => (window as any).clicks), ["next", "save"]);
  });

  it("aria-label だけが「記事を公開する」のアイコンボタンも押されない", async () => {
    await assert.rejects(() => safeClickLike(page, "#publish2"), ForbiddenClickError);
  });

  it("子要素(span)をクリックしようとしても、親ボタンの文字で止まる", async () => {
    await assert.rejects(() => safeClickLike(page, "#inner"), ForbiddenClickError);
  });

  it("value が「公開」の submit も押されない", async () => {
    await assert.rejects(() => safeClickLike(page, "#submit"), ForbiddenClickError);
    assert.deepEqual(await page.evaluate(() => (window as any).clicks), ["next", "save"]);
  });
  it("file input のファイル名(公開する前の見出し.png)は判定に使わず、選び直しのクリックは通る", async () => {
    await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>("#file")!;
      const dt = new DataTransfer();
      dt.items.add(new File(["x"], "公開する前の見出し.png", { type: "image/png" }));
      input.files = dt.files;
    });
    const labels = await page.locator("#file").evaluate(collectClickLabels);
    assert.ok(!labels.some((l) => l?.includes("公開する")), `ファイル名が混ざっている: ${JSON.stringify(labels)}`);
    assert.doesNotThrow(() => assertClickAllowed(labels, "#file"));
  });
});
