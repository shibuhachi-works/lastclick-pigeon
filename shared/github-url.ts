// GitHub の URL の扱い。拡張と Playwright 版で共通。
//
// GitHub のトークンを付けてよいのは、送り先が raw.githubusercontent.com で、
// かつ記事の md と同じ owner/repo のときだけ。記事の front matter に書かれた
// thumbnail の URL は信用できない(他人の記事を扱う場合)ので、ここで必ず検査する。

export const RAW_HOST = "raw.githubusercontent.com";

/** raw URL から owner/repo を取り出す。raw でなければ null */
export function rawRepoOf(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.hostname !== RAW_HOST) return null;
  const m = u.pathname.match(/^\/([^/]+)\/([^/]+)\//);
  return m ? `${m[1]}/${m[2]}` : null;
}

export type FetchDecision =
  | { allowed: true; sendToken: boolean; url: string }
  | { allowed: false; reason: string; url: string };

/**
 * 取りに行ってよいか、トークンを付けてよいかを決める。
 * - `target`: これから取る URL(thumbnail など。相対パスは `base` で解決済みであること)
 * - `base`: 記事の md がある raw URL(ディレクトリ)。省略時は「同じ repo」の条件を課さない
 *
 * raw.githubusercontent.com 以外は取りに行かない(トークンの有無にかかわらず)。
 * トークンは、base と同じ owner/repo のときだけ付ける。
 */
export function decideGitHubFetch(target: string, base?: string): FetchDecision {
  const targetRepo = rawRepoOf(target);
  if (!targetRepo) {
    return { allowed: false, reason: `${RAW_HOST} 以外の URL は取りに行きません: ${target}`, url: target };
  }
  if (base === undefined) return { allowed: true, sendToken: true, url: target };
  const baseRepo = rawRepoOf(base);
  return { allowed: true, sendToken: baseRepo !== null && baseRepo === targetRepo, url: target };
}

/** front matter の thumbnail(相対パス or 絶対 URL)を、記事の場所を基準に解決する */
export function resolveThumbnailUrl(thumbnail: string, base: string): string {
  return new URL(thumbnail, `${base.replace(/\/$/, "")}/`).toString();
}
