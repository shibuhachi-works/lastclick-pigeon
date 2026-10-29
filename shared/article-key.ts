// 「どの記事で入力を始めたか」の印。バナーの「公開設定を入れる」「もう一度入れる」を押したときに、
// 別の記事が開いていれば入れない(別の記事の公開設定を書き換えないため)。

/**
 * URL のパスから記事の印を取る。note のエディタは `/notes/<id>/edit/` の形なので `<id>` を使い、
 * その形でなければパス全体を使う。新規作成の `/notes/new` は "new"
 */
export function articleKey(pathname: string): string {
  const m = pathname.match(/\/notes\/([^/]+)/);
  return m ? m[1]! : pathname;
}

/**
 * 入力を始めたときの印(start)と今の印(now)が同じ記事か。
 * 始めたときが新規作成("new")なら、保存で id の付いた URL に変わるので同じ記事とみなす
 */
export function isSameArticle(start: string, now: string): boolean {
  return start === now || start === "new";
}

/** 入力を始めた記事の印。新規作成("new")から始めたときは、保存で id が付いた時点で固定する */
export type ArticleKeyRef = { key: string };

/**
 * 新規作成("new")から始めたなら、記事の id が付いた最初の時点でその id に固定する(以後は "new" 扱いにしない)。
 * 固定しないと、保存で id の付いた記事 A から別の記事 B に移ったあとも "new" が何にでも一致し、B に入れてしまう。
 * 固定した後は変えない
 */
export function lockArticleKey(ref: ArticleKeyRef, now: string): void {
  if (ref.key === "new" && now !== "new" && !now.startsWith("/")) ref.key = now;
}
