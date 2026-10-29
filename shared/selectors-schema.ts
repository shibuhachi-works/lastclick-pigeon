// selectors/*.json の形の検査。拡張(GitHub から取る)と Playwright 版(ローカルで読む)で共通。
//
// GitHub の main を変えられる人は、この JSON で拡張の動きを変えられる。
// だから「どの URL を開くか」「どんな正規表現を使うか」は、使う前に必ずここで確かめる。
// 「どのボタンを押すか」の守りは shared/forbidden-click.ts が別に持つ。

/** 拡張が新しいタブで開いてよい origin。ここ以外は同梱の値に戻す */
export const ALLOWED_NOTE_ORIGINS: readonly string[] = ["https://note.com", "https://editor.note.com"];

const MAX_SELECTOR_LEN = 2000;
const MAX_TEXT_LEN = 100;
const MAX_PATTERN_LEN = 200;

export type SelectorsJson = {
  version: number;
  newNoteUrl: string;
  loginUrlPattern: string;
  title: string;
  body: string;
  thumbnail: {
    fileInput: string;
    addButton: string;
    addButtonText: string[];
    /** 見出し画像のボタンを押して出るメニューの「画像をアップロード」の文字。省略時は ["画像をアップロード"] */
    uploadMenuText: string[];
    confirmText: string[];
  };
  openPublishSettingsText: string[];
  publishSettings: {
    hashtagInput: string;
    magazineToggleText: string[];
    magazineItem: string;
    /** マガジン名の行にある「追加」ボタンの文字。省略時は ["追加"] */
    magazineAddButtonText: string[];
    publishButtonText: string[];
  };
};

export class SelectorsValidationError extends Error {
  constructor(message: string) {
    super(`selectors の形が不正です: ${message}`);
    this.name = "SelectorsValidationError";
  }
}

function fail(msg: string): never {
  throw new SelectorsValidationError(msg);
}

function obj(v: unknown, name: string): Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) fail(`${name} はオブジェクトである必要があります`);
  return v as Record<string, unknown>;
}

function str(v: unknown, name: string, max = MAX_SELECTOR_LEN): string {
  if (typeof v !== "string" || v.trim() === "") fail(`${name} は空でない文字列である必要があります`);
  if (v.length > max) fail(`${name} が長すぎます(${v.length} > ${max})`);
  return v;
}

function strList(v: unknown, name: string): string[] {
  if (!Array.isArray(v) || v.length === 0) fail(`${name} は空でない文字列の配列である必要があります`);
  return v.map((s, i) => str(s, `${name}[${i}]`, MAX_TEXT_LEN));
}

/** 開いてよい note の URL か(https で、origin が許可リストにある) */
export function isAllowedNoteUrl(url: string): boolean {
  try {
    return ALLOWED_NOTE_ORIGINS.includes(new URL(url).origin);
  } catch {
    return false;
  }
}

/**
 * JSON を検査して、型の付いた値を返す。通らなければ SelectorsValidationError。
 * 呼び出し側は、GitHub から取った値が通らなければ同梱の値に戻す。
 */
export function validateSelectorsJson(input: unknown): SelectorsJson {
  const o = obj(input, "selectors");

  if (typeof o.version !== "number" || !Number.isInteger(o.version) || o.version < 1) fail("version は 1 以上の整数");

  const newNoteUrl = str(o.newNoteUrl, "newNoteUrl", 300);
  if (!isAllowedNoteUrl(newNoteUrl)) fail(`newNoteUrl は ${ALLOWED_NOTE_ORIGINS.join(" / ")} のどれかで始まる必要があります: ${newNoteUrl}`);

  const loginUrlPattern = str(o.loginUrlPattern, "loginUrlPattern", MAX_PATTERN_LEN);
  try {
    new RegExp(loginUrlPattern);
  } catch {
    fail("loginUrlPattern が正規表現として不正");
  }

  const t = obj(o.thumbnail, "thumbnail");
  const p = obj(o.publishSettings, "publishSettings");

  return {
    version: o.version,
    newNoteUrl,
    loginUrlPattern,
    title: str(o.title, "title"),
    body: str(o.body, "body"),
    thumbnail: {
      fileInput: str(t.fileInput, "thumbnail.fileInput"),
      addButton: str(t.addButton, "thumbnail.addButton"),
      addButtonText: strList(t.addButtonText, "thumbnail.addButtonText"),
      uploadMenuText: t.uploadMenuText === undefined ? ["画像をアップロード"] : strList(t.uploadMenuText, "thumbnail.uploadMenuText"),
      confirmText: strList(t.confirmText, "thumbnail.confirmText"),
    },
    openPublishSettingsText: strList(o.openPublishSettingsText, "openPublishSettingsText"),
    publishSettings: {
      hashtagInput: str(p.hashtagInput, "publishSettings.hashtagInput"),
      magazineToggleText: strList(p.magazineToggleText, "publishSettings.magazineToggleText"),
      magazineItem: str(p.magazineItem, "publishSettings.magazineItem"),
      magazineAddButtonText:
        p.magazineAddButtonText === undefined ? ["追加"] : strList(p.magazineAddButtonText, "publishSettings.magazineAddButtonText"),
      publishButtonText: strList(p.publishButtonText, "publishSettings.publishButtonText"),
    },
  };
}
