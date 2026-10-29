import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideGitHubFetch, rawRepoOf, resolveThumbnailUrl } from "./github-url.js";

const BASE = "https://raw.githubusercontent.com/owner/repo/main/posts/2026-10-28-xxx";

describe("rawRepoOf", () => {
  it("raw URL から owner/repo を取る", () => {
    assert.equal(rawRepoOf(`${BASE}/thumbnail.png`), "owner/repo");
  });
  it("raw 以外・http・壊れた URL は null", () => {
    assert.equal(rawRepoOf("https://github.com/owner/repo/blob/main/a.md"), null);
    assert.equal(rawRepoOf("http://raw.githubusercontent.com/owner/repo/main/a.png"), null);
    assert.equal(rawRepoOf("https://example.com/owner/repo/main/a.png"), null);
    assert.equal(rawRepoOf("not a url"), null);
  });
});

describe("decideGitHubFetch", () => {
  it("同じ repo の raw URL → 取りに行き、トークンも付ける", () => {
    const d = decideGitHubFetch(`${BASE}/thumbnail.png`, BASE);
    assert.deepEqual(d, { allowed: true, sendToken: true, url: `${BASE}/thumbnail.png` });
  });
  it("別の repo の raw URL → 取りに行くが、トークンは付けない", () => {
    const d = decideGitHubFetch("https://raw.githubusercontent.com/other/repo/main/x.png", BASE);
    assert.equal(d.allowed, true);
    assert.equal(d.allowed && d.sendToken, false);
  });
  it("raw 以外のホスト(thumbnail: https://example.com/x.png)→ 取りに行かない", () => {
    const d = decideGitHubFetch("https://example.com/x.png", BASE);
    assert.equal(d.allowed, false);
  });
  it("raw.githubusercontent.com.evil.example のような偽ホストも拒む", () => {
    const d = decideGitHubFetch("https://raw.githubusercontent.com.evil.example/o/r/main/x.png", BASE);
    assert.equal(d.allowed, false);
  });
  it("base を省略(md そのものを取るとき)→ raw ならトークンを付けてよい", () => {
    const d = decideGitHubFetch(`${BASE}/article.md`);
    assert.deepEqual(d, { allowed: true, sendToken: true, url: `${BASE}/article.md` });
  });
});

describe("resolveThumbnailUrl", () => {
  it("相対パスは記事のディレクトリ基準", () => {
    assert.equal(resolveThumbnailUrl("./thumbnail.png", BASE), `${BASE}/thumbnail.png`);
    assert.equal(resolveThumbnailUrl("thumbnail.png", `${BASE}/`), `${BASE}/thumbnail.png`);
  });
  it("絶対 URL はそのまま(可否は decideGitHubFetch が決める)", () => {
    assert.equal(resolveThumbnailUrl("https://example.com/x.png", BASE), "https://example.com/x.png");
  });
});
