// ボタンを「文字で探す」ときの一致判定。拡張と Playwright 版で共通。
//
// 部分一致だと「保存」が「下書き保存」に、「公開」が「公開に進む」に当たってしまう。
// ここでは正規化(全角→半角・空白除去・末尾記号除去・小文字化)したうえでの完全一致だけを許す。
import { normalizeLabel } from "./forbidden-click.js";

/** 表示文字 `label` が候補 `candidate` と(正規化後に)完全一致するか */
export function textEquals(label: string | null | undefined, candidate: string): boolean {
  if (!label) return false;
  const n = normalizeLabel(label);
  return n !== "" && n === normalizeLabel(candidate);
}

/** 要素の文字の集合(textContent・aria-label など)が候補のどれかに完全一致するか */
export function matchesAnyText(labels: ReadonlyArray<string | null | undefined>, candidates: readonly string[]): boolean {
  return candidates.some((c) => labels.some((l) => textEquals(l, c)));
}

/**
 * Playwright の text セレクタ用に文字を引用する。`"` や `\` を含んでも壊れない。
 * 例: pwQuote('保存') → '"保存"'
 */
export function pwQuote(text: string): string {
  return JSON.stringify(text);
}

/** 候補リストを Playwright の完全一致セレクタ(`tag:text-is("…")`)に変換する */
export function pwTextIs(tag: string, texts: readonly string[]): string {
  return texts.map((t) => `${tag}:text-is(${pwQuote(t)})`).join(", ");
}
