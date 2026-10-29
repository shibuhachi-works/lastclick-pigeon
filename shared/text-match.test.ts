import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchesAnyText, pwQuote, pwTextIs, textEquals } from "./text-match.js";

describe("textEquals(完全一致)", () => {
  it("「保存」は「下書き保存」に当たらない", () => {
    assert.equal(textEquals("下書き保存", "保存"), false);
    assert.equal(textEquals("保存して閉じる", "保存"), false);
  });
  it("「公開」「公開する」は「公開に進む」に当たらない", () => {
    assert.equal(textEquals("公開に進む", "公開"), false);
    assert.equal(textEquals("公開に進む", "公開する"), false);
    assert.equal(textEquals("公開に進む", "公開に進む"), true);
  });
  it("前後の空白・全角・末尾記号の違いは同じ文字とみなす", () => {
    assert.equal(textEquals(" 保存 ", "保存"), true);
    assert.equal(textEquals("保　存", "保存"), true);
    assert.equal(textEquals("適用 →", "適用"), true);
    assert.equal(textEquals("Ｓａｖｅ", "save"), true);
  });
  it("空・null は一致しない", () => {
    assert.equal(textEquals("", "保存"), false);
    assert.equal(textEquals(null, "保存"), false);
    assert.equal(textEquals("   ", ""), false);
  });
});

describe("matchesAnyText", () => {
  it("textContent か aria-label のどちらかが候補に一致すれば true", () => {
    assert.equal(matchesAnyText(["", "見出し画像"], ["画像を追加", "見出し画像"]), true);
    assert.equal(matchesAnyText(["下書き保存", null], ["保存", "適用"]), false);
  });
});

describe("pwQuote / pwTextIs", () => {
  it("引用符やバックスラッシュを含んでも壊れない", () => {
    assert.equal(pwQuote('say "hi"'), '"say \\"hi\\""');
    assert.equal(pwQuote("a\\b"), '"a\\\\b"');
  });
  it("完全一致セレクタを , で並べる", () => {
    assert.equal(pwTextIs("button", ["保存", "適用"]), 'button:text-is("保存"), button:text-is("適用")');
  });
});
