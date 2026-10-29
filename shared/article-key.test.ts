import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { articleKey, isSameArticle, lockArticleKey } from "./article-key.js";

describe("articleKey(記事の印)", () => {
  it("エディタの URL からは記事の id を取る", () => {
    assert.equal(articleKey("/notes/n1234abcd/edit/"), "n1234abcd");
    assert.equal(articleKey("/notes/n1234abcd/edit"), "n1234abcd");
  });
  it("新規作成は new", () => {
    assert.equal(articleKey("/notes/new"), "new");
  });
  it("その形でなければパス全体", () => {
    assert.equal(articleKey("/somewhere/else"), "/somewhere/else");
  });
});

describe("isSameArticle(同じ記事か)", () => {
  it("同じ id なら同じ", () => {
    assert.equal(isSameArticle("n1234", "n1234"), true);
  });
  it("別の id なら別の記事", () => {
    assert.equal(isSameArticle("n1234", "n9999"), false);
  });
  it("新規作成から始めたときは、保存で id が付いても同じ記事とみなす", () => {
    assert.equal(isSameArticle("new", "n1234"), true);
  });
  it("id 付きで始めて新規作成の画面に移ったら別の記事", () => {
    assert.equal(isSameArticle("n1234", "new"), false);
  });
});

describe("lockArticleKey(新規作成の印を id に固定する)", () => {
  it("new で始めて id が付いたら、その id に固定する", () => {
    const ref = { key: "new" };
    lockArticleKey(ref, "n1234");
    assert.equal(ref.key, "n1234");
  });
  it("固定した後は別の id に変えない(別の記事を開いても new 扱いに戻らない)", () => {
    const ref = { key: "new" };
    lockArticleKey(ref, "n1234");
    lockArticleKey(ref, "n9999");
    assert.equal(ref.key, "n1234");
    assert.equal(isSameArticle(ref.key, "n9999"), false);
  });
  it("まだ new のまま、またはエディタ以外のパスなら固定しない", () => {
    const ref = { key: "new" };
    lockArticleKey(ref, "new");
    lockArticleKey(ref, "/dashboard");
    assert.equal(ref.key, "new");
  });
  it("id で始めたときは何もしない", () => {
    const ref = { key: "n1234" };
    lockArticleKey(ref, "n9999");
    assert.equal(ref.key, "n1234");
  });
});
