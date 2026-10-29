// クリック対象から「判定に使う文字」を集める。ブラウザの中で動く(DOM 依存、import なし)。
// 拡張の content script からはそのまま呼び、Playwright 版からは locator.evaluate(collectClickLabels) で
// ページ側に送って実行する。そのため、この関数は外の変数を参照してはいけない。

/**
 * 要素と、その親にあたるボタン(button / role=button / a / submit)の
 * 表示文字・aria-label・title・value を集めて返す。
 */
export function collectClickLabels(el: Element): (string | null)[] {
  const owner = el.closest('button, [role="button"], a, input[type="submit"], input[type="button"]') ?? el;
  const out: (string | null)[] = [];
  for (const node of new Set([el, owner])) {
    out.push(node.textContent, node.getAttribute("aria-label"), node.getAttribute("title"));
    // value は submit / button の表示文字として見る。file input の value はファイル名(C:\fakepath\...)で、
    // 操作のラベルではないので入れない(「公開する前の見出し.png」を選んだ後に選び直せなくなる)
    if (node instanceof HTMLInputElement && node.type !== "file") out.push(node.value);
  }
  return out;
}
