// 見出し画像を入れるあいだ、note がファイル選択ダイアログ(Finder など)を開こうとしたら止める。
//
// note の見出し画像のボタンやメニューの「画像をアップロード」は、押されると note 側が file input の click() を呼ぶ。
// 拡張が起こすクリックは合成イベントなのでふつうは開かないが、人がその少し前にタブを触っていると
// ブラウザが「人の操作の直後」とみなしてダイアログが開き、画像の入力が止まってしまう。
// file input に届く click を capture 段階で preventDefault すれば、ダイアログは開かない(標準の挙動)。
// 止めた input は note がまさに使おうとしたものなので、そこへ直接画像を渡す。
//
// content.ts から使うほか、テストでは関数の文字列をページに入れて動かすので、外の関数や import に頼らない。

export type FilePickerGuard = {
  /** 止めたときの file input。無ければ null */
  input: () => HTMLInputElement | null;
  /** 見張りをやめる(必ず呼ぶ) */
  stop: () => void;
};

export function installFilePickerGuard(): FilePickerGuard {
  let caught: HTMLInputElement | null = null;
  const onClick = (e: Event) => {
    const target = e.composedPath()[0] ?? e.target;
    if (target instanceof HTMLInputElement && target.type === "file") {
      e.preventDefault();
      caught = target;
    }
  };
  document.addEventListener("click", onClick, true);
  return {
    input: () => caught,
    stop: () => document.removeEventListener("click", onClick, true),
  };
}
