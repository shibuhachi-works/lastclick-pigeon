// ビルドした拡張(extension/dist)を実際の Chromium に読み込み、ポップアップから下書きを作るまでを通しで確かめる。
// 部品ごとのテストでは分からない「拡張として読み込めるか」「依存を上げても md → HTML → note のエディタまで通るか」を見る。
//
// note のエディタは本物の代わりに、同じセレクタに当たる模擬ページを返す(note.com には出ていかない)。
// 先に extension で `npm run build` が要る(CI では build してからこのテストを動かす)。
// ブラウザは playwright の chromium(拡張は headless shell では動かないので、channel: "chromium" を使う)。
// 別の chromium を使う場合は PLAYWRIGHT_CHROMIUM_PATH に実行ファイルのパスを入れる。
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium, type BrowserContext, type Page } from "playwright";

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../extension/dist");

// note の記事編集ページを模したもの。タイトル欄と本文(ProseMirror)だけを持ち、貼り付けは text/html をそのまま入れる
const EDITOR = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>note</title></head><body>
  <textarea id="title" placeholder="記事タイトル"></textarea>
  <div id="body" class="ProseMirror" contenteditable="true"></div>
  <script>
    document.getElementById("body").addEventListener("paste", (e) => {
      e.preventDefault();
      e.currentTarget.innerHTML = e.clipboardData.getData("text/html");
    });
  </script>
</body></html>`;

const ARTICLE = `---
title: 起動テストの記事
hashtags: [テスト]
---

## 見出しです

本文の **太字** と

- 箇条書き 1
- 箇条書き 2
`;

describe("拡張の起動と、ポップアップから下書きを作るまで(E2E)", () => {
  let context: BrowserContext;
  let userDataDir: string;
  let extensionId: string;

  before(async () => {
    assert.ok(existsSync(path.join(DIST, "manifest.json")), "extension/dist がありません。先に extension で npm run build をしてください");
    userDataDir = mkdtempSync(path.join(tmpdir(), "pigeon-e2e-"));
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
    context = await chromium.launchPersistentContext(userDataDir, {
      ...(executablePath ? { executablePath } : { channel: "chromium" }),
      headless: true,
      args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`],
    });
    // note には出ていかない。エディタは模擬ページを返す
    await context.route(/^https:\/\/(editor\.)?note\.com\//, (route) =>
      route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: EDITOR }),
    );
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker", { timeout: 15_000 }));
    extensionId = new URL(worker.url()).host;
  });
  after(async () => {
    await context?.close();
    if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
  });

  it("service worker が起動し、ポップアップがエラーなく開く", async () => {
    assert.match(extensionId, /^[a-p]{32}$/);
    const popup = await context.newPage();
    const errors: string[] = [];
    popup.on("pageerror", (e) => errors.push(e.message));
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    assert.equal((await popup.locator("#submit").textContent())?.trim(), "note の下書きを作成");
    await popup.waitForTimeout(500);
    assert.deepEqual(errors, []);
    await popup.close();
  });

  it("md ファイルを選んで「note の下書きを作成」を押すと、エディタにタイトルと本文が入って止まる", async () => {
    const popup = await context.newPage();
    const errors: string[] = [];
    popup.on("pageerror", (e) => errors.push(e.message));
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.setInputFiles("#markdown-file", { name: "article.md", mimeType: "text/markdown", buffer: Buffer.from(ARTICLE) });
    await popup.locator("#fields").waitFor({ state: "visible" });
    assert.equal(await popup.locator("#title").inputValue(), "起動テストの記事");

    // 新しいタブは about:blank で作られてから note の URL に移るので、作られたあとで URL を待つ
    const editorPromise = context.waitForEvent("page", { timeout: 15_000 });
    // 拡張のボタンなので、禁止文字の判定(「投稿する」「公開する」)に当たらないことは文言で明らか
    await popup.locator("#submit").click();
    const editor: Page = await editorPromise.catch(async (e) => {
      throw new Error(`note のタブが開きませんでした。ポップアップの表示: ${await popup.locator("#status").textContent()} (${(e as Error).message})`);
    });
    await editor.waitForURL(/note\.com/, { timeout: 15_000 });

    // 本文の確認待ちのバナー(✅)が出るまで待つ
    const banner = editor.locator("#lastclick-pigeon-banner");
    await banner.getByText("タイトル・本文・見出し画像を入れました").waitFor({ timeout: 30_000 });

    assert.equal(await editor.locator("#title").inputValue(), "起動テストの記事");
    const body = await editor.locator("#body").innerHTML();
    assert.match(body, /<h2[^>]*>見出しです<\/h2>/);
    assert.match(body, /<strong>太字<\/strong>/);
    assert.match(body, /<li>箇条書き 1<\/li>/);
    assert.deepEqual(errors, []);
  });
});
