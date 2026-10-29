// 「絶対に押さないボタン」の判定。Chrome 拡張と Playwright 版の両方が、クリックの直前に必ずここを通る。
//
// 設計の芯: 投稿・公開ボタンはスクリプトから押さない。
// 押さない文字の一覧は selectors/note.json とは無関係に、このファイルに直接書く。
// JSON が差し替えられても、ここが変わらない限り公開ボタンは押せない。

/** 完全一致で禁止する文字(正規化後に比較) */
export const FORBIDDEN_CLICK_TEXTS: readonly string[] = [
  "投稿する",
  "公開する",
  "投稿",
  "公開",
  "有料で公開する",
  "予約投稿",
  "予約投稿する",
  "今すぐ公開",
  "今すぐ公開する",
  "記事を公開",
  "記事を公開する",
  "更新する", // 公開済み記事の再公開
  "Publish",
  "Post",
  "Tweet",
  "Share",
];

/** 部分一致で禁止する文字。「有料で投稿する」「今すぐ公開する」などの派生を拾う */
export const FORBIDDEN_CLICK_SUBSTRINGS: readonly string[] = ["投稿する", "公開する"];

export class ForbiddenClickError extends Error {
  constructor(label: string, context?: string) {
    super(`公開・投稿ボタンはスクリプトから押しません: 「${label}」${context ? ` (${context})` : ""}`);
    this.name = "ForbiddenClickError";
  }
}

/** 全角→半角、空白除去、末尾の記号除去をしてから比較する */
export function normalizeLabel(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\s　]+/g, "")
    .replace(/[!！?？.。…→›»]+$/g, "")
    .toLowerCase();
}

export function isForbiddenClickText(text: string | null | undefined): boolean {
  if (!text) return false;
  const n = normalizeLabel(text);
  if (!n) return false;
  if (FORBIDDEN_CLICK_TEXTS.some((t) => normalizeLabel(t) === n)) return true;
  return FORBIDDEN_CLICK_SUBSTRINGS.some((s) => n.includes(normalizeLabel(s)));
}

/**
 * クリック対象の表示文字・aria-label・value などをまとめて渡す。
 * 1 つでも禁止文字に当たれば ForbiddenClickError を投げる。
 */
export function assertClickAllowed(labels: ReadonlyArray<string | null | undefined>, context?: string): void {
  for (const label of labels) {
    if (isForbiddenClickText(label)) throw new ForbiddenClickError(label!.trim(), context);
  }
}
