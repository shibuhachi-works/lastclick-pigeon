// 実際の DOM で、ボタンを押すとページ側が file input の click() を呼ぶ(= ファイル選択ダイアログが開く)作りでも、
// 見張りを入れればダイアログが開かず、その input を控えられることを確かめる。
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { chromium, type Browser, type Page } from "playwright";
import { collectClickLabels } from "./click-labels.js";
import { installFilePickerGuard } from "./file-picker-guard.js";
import { assertClickAllowed } from "./forbidden-click.js";

const PAGE = `<!doctype html><html><body>
  <button id="open" type="button">画像をアップロード</button>
  <script>
    document.getElementById("open").addEventListener("click", () => {
      // note のように、押されたときに file input を作って click() する
      let input = document.getElementById("file");
      if (!input) {
        input = document.createElement("input");
        input.type = "file";
        input.id = "file";
        input.accept = "image/*";
        input.hidden = true;
        document.body.appendChild(input);
      }
      input.click();
    });
  </script>
</body></html>`;

/** 拡張の safeClick と同じ手順(禁止文字の判定 → クリック)。テストのクリックもここを通す(AGENTS.md) */
async function safeClickLike(page: Page, selector: string) {
  const labels = await page.locator(selector).evaluate(collectClickLabels);
  assertClickAllowed(labels, selector);
  await page.locator(selector).click();
}

/** ダイアログが開こうとしたか(開けば playwright に filechooser が届く) */
async function chooserOpened(page: Page, action: () => Promise<void>): Promise<boolean> {
  const chooser = page.waitForEvent("filechooser", { timeout: 1_500 }).then(() => true, () => false);
  await action();
  return chooser;
}

describe("installFilePickerGuard (DOM)", () => {
  let browser: Browser;
  let page: Page;

  before(async () => {
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
    page = await browser.newPage();
  });
  after(async () => {
    await browser?.close();
  });

  const install = () =>
    page.evaluate((fn) => {
      // tsx(esbuild)は中の関数名を保つための __name を差し込むので、ページ側にも用意する
      const f = new Function(`const __name = (f) => f; return (${fn})`)() as typeof installFilePickerGuard;
      (window as unknown as { guard: ReturnType<typeof installFilePickerGuard> }).guard = f();
    }, installFilePickerGuard.toString());

  it("見張りが無ければ、人のクリックでダイアログが開く(前提の確認)", async () => {
    await page.setContent(PAGE);
    assert.equal(await chooserOpened(page, () => safeClickLike(page, "#open")), true);
  });

  it("見張りを入れると、ダイアログは開かず、使われた file input を控える", async () => {
    await page.setContent(PAGE);
    await install();
    assert.equal(await chooserOpened(page, () => safeClickLike(page, "#open")), false);
    const caught = await page.evaluate(() => (window as unknown as { guard: { input: () => HTMLInputElement | null } }).guard.input()?.id ?? null);
    assert.equal(caught, "file");
  });

  it("stop() のあとは元どおり開く", async () => {
    await page.setContent(PAGE);
    await install();
    await page.evaluate(() => (window as unknown as { guard: { stop: () => void } }).guard.stop());
    assert.equal(await chooserOpened(page, () => safeClickLike(page, "#open")), true);
  });
});
