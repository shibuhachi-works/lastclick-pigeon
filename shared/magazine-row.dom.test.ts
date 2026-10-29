// 実機の公開設定ページ(マガジン名 + 「追加」ボタンの行が並ぶ)を模した DOM で、
// 指定した名前の行の「追加」だけを返し、別の行の「追加」を返さないことを確かめる。
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { chromium, type Browser, type Page } from "playwright";
import { findMagazineRowButton } from "./magazine-row.js";

const PAGE = `<!doctype html><html><body>
  <section>
    <h2>マガジン</h2>
    <ul id="list">
      <li class="row"><div><span>開発日記</span><small>12 本</small></div><button id="add-1" type="button">追加</button></li>
      <li class="row"><div><span>ズボラな健康・美容の調査ファイル</span><small>3 本</small></div><button id="added-2" type="button" data-active="true">追加済</button></li>
      <li class="row"><div><span>読書メモ</span></div><button id="add-3" type="button">追加</button></li>
    </ul>
  </section>
  <button id="publish" type="button">投稿する</button>
</body></html>`;

describe("findMagazineRowButton (DOM)", () => {
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

  const run = (name: string) =>
    page.evaluate(
      ([fn, n]) => {
        const f = new Function(`return (${fn})`)() as typeof findMagazineRowButton;
        const r = f(n, ["追加"]);
        return { id: r.button?.id ?? null, rowFound: r.rowFound };
      },
      [findMagazineRowButton.toString(), name] as const,
    );

  it("名前の行の「追加」を返す", async () => {
    assert.deepEqual(await run("開発日記"), { id: "add-1", rowFound: true });
    assert.deepEqual(await run("読書メモ"), { id: "add-3", rowFound: true });
  });

  it("行に「追加」が無い(追加済み)ときは、別の行の「追加」を返さない", async () => {
    assert.deepEqual(await run("ズボラな健康・美容の調査ファイル"), { id: null, rowFound: true });
  });

  it("一覧に無い名前は rowFound=false", async () => {
    assert.deepEqual(await run("存在しないマガジン"), { id: null, rowFound: false });
  });
});
