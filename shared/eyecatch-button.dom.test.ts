// 実機の記事編集ページ(固定ヘッダーにアイコンボタン、本文列のタイトル欄の上に見出し画像のアイコンボタン)を
// 模した DOM で、タイトルの上にあるボタンだけを返し、ヘッダーやタイトルより下のボタンを返さないことを確かめる。
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { chromium, type Browser, type Page } from "playwright";
import { findEyecatchButton } from "./eyecatch-button.js";

const PAGE = `<!doctype html><html><head><style>
  body { margin: 0; }
  header { position: fixed; top: 0; left: 0; right: 0; height: 48px; }
  main { width: 600px; margin: 80px auto 0; }
  button { width: 32px; height: 32px; padding: 0; border: 0; }
  textarea { width: 100%; height: 60px; display: block; }
  .side { position: absolute; left: 1000px; top: 90px; }
</style></head><body>
  <button id="eyecatch" type="button" data-id="ButtonIcon" style="position:absolute; top:90px; left:calc(50% - 300px)"></button>
  <header><button id="header-icon" type="button" data-id="ButtonIcon"></button><button type="button">公開に進む</button></header>
  <main>
    <div style="height:48px"></div>
    <textarea id="title" placeholder="記事タイトル"></textarea>
    <div role="toolbar"><button id="bold" type="button" aria-label="太字"></button><button id="below" type="button"></button></div>
    <div contenteditable="true">本文</div>
  </main>
</body></html>`;

describe("findEyecatchButton (DOM)", () => {
  let browser: Browser;
  let page: Page;

  before(async () => {
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
    page = await browser.newPage();
  });
  after(async () => {
    await browser?.close();
  });

  const run = () =>
    page.evaluate((fn) => {
      const f = new Function(`return (${fn})`)() as typeof findEyecatchButton;
      return f(document.getElementById("title")!)?.id ?? null;
    }, findEyecatchButton.toString());

  it("タイトルの上にある、文字も aria-label も無いボタンを返す(ヘッダーやタイトルより下のものは返さない)", async () => {
    await page.setContent(PAGE);
    assert.equal(await run(), "eyecatch");
  });

  it("見出し画像のボタンが DOM 上 main の外にあっても、画面上の位置で見つける", async () => {
    // 上のケースがまさにそれ(#eyecatch は body 直下)。ここでは逆に main の中に置いても同じ結果になることを確かめる
    await page.setContent(PAGE.replace('<button id="eyecatch"', '<span></span><button id="dummy" hidden').replace("<main>", '<main><button id="eyecatch" type="button" data-id="ButtonIcon"></button>'));
    assert.equal(await run(), "eyecatch");
  });

  it("位置で決まらないときは、同じ main の中でタイトルより前にある最後のアイコンボタンにする", async () => {
    // 見出し画像のボタンがタイトルの列の外(横)にある場合
    await page.setContent(PAGE.replace('style="position:absolute; top:90px; left:calc(50% - 300px)"', 'class="side"').replace("<main>", '<main><button id="in-main" type="button"></button>'));
    assert.equal(await run(), "in-main");
  });

  it("候補が無ければ null", async () => {
    await page.setContent(PAGE.replace(/<button id="eyecatch"[^>]*><\/button>/, ""));
    assert.equal(await run(), null);
  });
});
