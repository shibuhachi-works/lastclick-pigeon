// 記事編集ページの「見出し画像」のボタンを探す。ブラウザの中で動く(DOM 依存、import なし)。
// 拡張の content script からはそのまま呼び、DOM テストからは page.evaluate でページ側に送って実行する。
// そのため、この関数は外の変数を参照してはいけない。
//
// 実機のボタンは文字も aria-label も無いアイコンボタン(data-id="ButtonIcon"、id は React の useId で不安定)で、
// DOM 上の位置はタイトル欄と同じ main の中とは限らない。そこで画面上の位置で決める:
// 「タイトル欄より上にあり、タイトル欄と横に重なる、文字も aria-label も無いボタン」のうち、タイトルに一番近いもの。
// ヘッダー・ナビ・ダイアログ・メニューの中のアイコンボタンは対象にしない。
// 位置で決まらないときは、従来どおり「同じ main の中でタイトルより前にある最後のアイコンボタン」にする。

export function findEyecatchButton(title: HTMLElement): HTMLElement | null {
  // 注: 内側に名前付き関数(変数に入れたアロー関数も)を作らない
  //     (tsx/esbuild の keepNames が __name を挿入し、ページ側に送ると未定義になる)
  const all = Array.from(document.querySelectorAll<HTMLElement>("button")).filter(
    (b) => !(b.textContent ?? "").trim() && !b.getAttribute("aria-label"),
  );

  const t = title.getBoundingClientRect();
  const above = all.filter((b) => {
    if (b.closest('header, nav, [role="dialog"], [role="menu"], [role="menubar"]')) return false;
    const r = b.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    return r.bottom <= t.top + 4 && r.right > t.left && r.left < t.right;
  });
  above.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom);
  if (above[0]) return above[0];

  const scope = title.closest("main") ?? document.body;
  const before = all.filter(
    (b) => scope.contains(b) && Boolean(b.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING),
  );
  return before[before.length - 1] ?? null;
}
