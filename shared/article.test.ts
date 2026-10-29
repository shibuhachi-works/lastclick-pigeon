import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Marked } from "marked";
import { parse as parseYaml } from "yaml";
import { parseFrontMatter, renderArticle, resolveArticleUrl, splitList } from "./article.js";
import { SAFE_RENDERER } from "./markdown-safe.js";

const md = new Marked({ gfm: true, breaks: true, renderer: SAFE_RENDERER as never });
const convert = { markdown: (s: string) => md.parse(s) as string, yaml: parseYaml };
const fm = (s: string) => parseFrontMatter(s, parseYaml);

describe("resolveArticleUrl", () => {
  it("tree(ディレクトリ)→ article.md と同ディレクトリ", () => {
    assert.deepEqual(resolveArticleUrl("https://github.com/o/r/tree/main/posts/2026-10-28-x/"), {
      mdUrl: "https://raw.githubusercontent.com/o/r/main/posts/2026-10-28-x/article.md",
      baseUrl: "https://raw.githubusercontent.com/o/r/main/posts/2026-10-28-x",
    });
  });
  it("blob(ファイル)と raw はそのファイル", () => {
    const want = {
      mdUrl: "https://raw.githubusercontent.com/o/r/main/posts/x/note.md",
      baseUrl: "https://raw.githubusercontent.com/o/r/main/posts/x",
    };
    assert.deepEqual(resolveArticleUrl("https://github.com/o/r/blob/main/posts/x/note.md"), want);
    assert.deepEqual(resolveArticleUrl("https://raw.githubusercontent.com/o/r/main/posts/x/note.md"), want);
  });
  it("対応しない URL はエラー", () => {
    assert.throws(() => resolveArticleUrl("https://example.com/o/r/tree/main/x"), /対応していない/);
    assert.throws(() => resolveArticleUrl("https://github.com/o/r"), /tree\/blob/);
  });
});

describe("parseFrontMatter(YAML は yaml パッケージ。gray-matter で読めていた形がそのまま読める)", () => {
  it("README の例: key: value / [a, b] / 行末コメント / 引用符", () => {
    const { data, content } = fm(
      ['---', 'title: "見出し: 副題"', "hashtags: [AI, 個人開発]   # 省略可", "magazine: マガジン名       # 省略可", "thumbnail: ./thumbnail.png", "unknown: x", "---", "", "本文"].join("\n"),
    );
    assert.deepEqual(data, { title: "見出し: 副題", hashtags: ["AI", "個人開発"], magazine: "マガジン名", thumbnail: "./thumbnail.png" });
    assert.equal(content, "\n本文");
  });
  it("YAML リスト(空行・コメント行・CRLF 込み)、引用符付きの値の後ろのコメント", () => {
    const { data } = fm('---\r\nhashtags:\r\n  - AI\r\n\r\n  # c\r\n  - "#個人開発"\r\nmagazine: "マガジン名" # 省略可\r\ntitle: t\r\n---\r\nx');
    assert.deepEqual(data, { hashtags: ["AI", "個人開発"], magazine: "マガジン名", title: "t" });
  });
  it("hashtags: #AI #個人開発(引用符なし)は README で許している書き方なので読める", () => {
    assert.deepEqual(fm("---\nhashtags: #AI #個人開発\n---\nx").data.hashtags, ["AI", "個人開発"]);
    assert.deepEqual(fm('---\nhashtags: "a, b" # c\n---\nx').data.hashtags, ["a", "b"]);
    assert.deepEqual(fm("---\nhashtags: a b　c、d\n---\nx").data.hashtags, ["a", "b", "c", "d"]);
  });
  it("null / ~ / コメントだけ / 空 は「無し」。数値は文字列に", () => {
    const { data } = fm("---\nmagazine: ~\nthumbnail: null\nhashtags: # なし\ntitle: 2026\n---\nx");
    assert.deepEqual(data, { title: "2026" });
  });
  it("ブロックスカラー(>- / |-)、エスケープ(\\u \\\" '')を YAML どおりに読む", () => {
    const { data } = fm(['---', "title: >-", "  long", "  title", "magazine: 'Author''s notes'", 'thumbnail: "\\u65e5\\u672c.png"', "---", "x"].join("\n"));
    assert.deepEqual(data, { title: "long title", magazine: "Author's notes", thumbnail: "日本.png" });
  });
  it("空の front matter は直後の --- で閉じる。本文の --- まで取り込まない", () => {
    const src = "---\n---\n# My title\n\n導入文\n\n---\n\n残りの本文";
    assert.deepEqual(fm(src), { data: {}, content: "# My title\n\n導入文\n\n---\n\n残りの本文" });
  });
  it("front matter が無ければそのまま。YAML として壊れていればエラー", () => {
    assert.deepEqual(fm("# t\n\nx"), { data: {}, content: "# t\n\nx" });
    assert.throws(() => fm("---\nhashtags: [a\ntitle: t\n---\nx"), /front matter が YAML として読めません/);
  });
  it("splitList はカンマ・空白・読点・# を受け付ける", () => {
    assert.deepEqual(splitList("#a, b　c、d"), ["a", "b", "c", "d"]);
    assert.deepEqual(splitList("[\"a\", 'b']"), ["a", "b"]);
  });
});

describe("renderArticle", () => {
  it("title は front matter 優先。本文の # 見出しはそのまま残る", async () => {
    const a = await renderArticle("---\ntitle: FM\nhashtags: a, b\n---\n# H1\n\n本文", convert);
    assert.equal(a.title, "FM");
    assert.deepEqual(a.hashtags, ["a", "b"]);
    assert.ok(a.html.includes("<h1>H1</h1>"), a.html);
  });
  it("title が無ければ最初の # 見出しを使い、本文からは落とす", async () => {
    const a = await renderArticle("# H1\n\n本文 **太字**", convert);
    assert.equal(a.title, "H1");
    assert.ok(!a.html.includes("<h1>"), a.html);
    assert.ok(a.html.includes("<strong>太字</strong>"), a.html);
  });
  it("override はすべてに優先し、空文字は無視する", async () => {
    const a = await renderArticle("---\ntitle: FM\nhashtags: [a]\nmagazine: M\n---\nx", convert, { title: "OV", hashtags: "#p #q", magazine: "  " });
    assert.equal(a.title, "OV");
    assert.deepEqual(a.hashtags, ["p", "q"]);
    assert.equal(a.magazine, "M");
  });
  it("final: 欄の値が最終。空にしたハッシュタグ・マガジンは front matter に戻らず「なし」", async () => {
    const a = await renderArticle("---\ntitle: FM\nhashtags: [a]\nmagazine: M\n---\nx", convert, {
      title: "FM",
      hashtags: "",
      magazine: "",
      final: true,
    });
    assert.equal(a.title, "FM");
    assert.deepEqual(a.hashtags, []);
    assert.equal(a.magazine, undefined);
  });
  it("final: 本文の # 見出しをそのままタイトル欄に出した場合は、本文から見出しを落とす", async () => {
    const a = await renderArticle("# H1\n\n本文", convert, { title: "H1", hashtags: "", magazine: "", final: true });
    assert.equal(a.title, "H1");
    assert.ok(!a.html.includes("<h1>"), a.html);
  });
  it("final: 見出しと違うタイトルに直した場合は、本文の見出しは残す", async () => {
    const a = await renderArticle("# H1\n\n本文", convert, { title: "別のタイトル", hashtags: "", magazine: "", final: true });
    assert.equal(a.title, "別のタイトル");
    assert.ok(a.html.includes("<h1>"), a.html);
  });
  it("final: タイトル欄が空ならエラー(front matter には戻らない)", async () => {
    await assert.rejects(() => renderArticle("---\ntitle: FM\n---\nx", convert, { title: "", final: true }), /タイトル/);
  });
  it("タイトルがどこにも無ければエラー", async () => {
    await assert.rejects(() => renderArticle("本文だけ", convert), /タイトル/);
  });
  it("thumbnail は相対パスのまま返す(解決は呼び出し側)", async () => {
    const a = await renderArticle("---\ntitle: t\nthumbnail: ./a.png\n---\nx", convert);
    assert.equal(a.thumbnail, "./a.png");
  });
});
