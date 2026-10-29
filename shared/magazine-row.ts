// 公開設定の「マガジン」一覧から、指定した名前の行の「追加」ボタンを探す。ブラウザの中で動く(DOM 依存、import なし)。
// 拡張の content script からはそのまま呼び、Playwright 版や DOM テストからは page.evaluate で
// ページ側に送って実行する。そのため、この関数は外の変数を参照してはいけない。
//
// 実機の一覧は「マガジン名 + 追加ボタン」の行が並ぶ形。名前と一致する要素から親をたどり、
// 最初にボタンを含む祖先を「その名前の行」とみなす。行より上(一覧全体)は見ない:
// 別のマガジンの「追加」を押してしまわないため(行に「追加」が無い = 追加済みなどは、押さずに返す)。

export type MagazineRowResult = {
  /** 行の「追加」ボタン。行に無ければ null */
  button: HTMLElement | null;
  /** 名前の行(ボタンを含む祖先)が見つかったか。false なら名前自体が一覧に無い */
  rowFound: boolean;
};

export function findMagazineRowButton(name: string, addTexts: readonly string[]): MagazineRowResult {
  // 注: 内側に名前付き関数を作らない(tsx/esbuild の keepNames が __name を挿入し、ページ側に送ると未定義になる)
  const target = name.replace(/\s+/g, "");
  if (target === "") return { button: null, rowFound: false };
  const addNorm = addTexts.map((t) => t.replace(/\s+/g, ""));

  const nodes = Array.from(document.querySelectorAll<HTMLElement>("body *")).filter(
    (el) => el.children.length <= 1 && (el.textContent ?? "").replace(/\s+/g, "") === target && !el.closest("button"),
  );
  for (const node of nodes) {
    let cur: HTMLElement | null = node;
    for (let depth = 0; cur && depth < 8; depth++, cur = cur.parentElement) {
      const buttons = Array.from(cur.querySelectorAll<HTMLElement>("button"));
      if (buttons.length === 0) continue;
      // 最初にボタンを含む祖先 = この名前の行。ここで決める(上へは行かない)
      const add = buttons.filter(
        (b) =>
          addNorm.includes((b.textContent ?? "").replace(/\s+/g, "")) ||
          addNorm.includes((b.getAttribute("aria-label") ?? "").replace(/\s+/g, "")),
      );
      return { button: add.length === 1 ? add[0] : null, rowFound: true };
    }
  }
  return { button: null, rowFound: false };
}
