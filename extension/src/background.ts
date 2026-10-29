// service worker。役割は 2 つだけ。
//   1. content script に「あなたのタブ ID」を教える(content script は chrome.tabs を使えない)
//   2. content script の代わりに selectors/note.json を読む。content script は note.com の origin で動くので、
//      同梱の selectors.json(chrome-extension://)も raw.githubusercontent.com も自分では fetch できない
// 記事の中身には触らない。
import { loadSelectors } from "./lib/selectors";
import type { Message, SelectorsResponse, WhoAmIResponse } from "./lib/types";

chrome.runtime.onMessage.addListener((msg: Message, sender, sendResponse: (r: WhoAmIResponse | SelectorsResponse) => void) => {
  if (msg?.type === "whoami") {
    sendResponse({ tabId: sender.tab?.id ?? null });
    return;
  }
  if (msg?.type === "selectors") {
    loadSelectors()
      .then((r) => sendResponse({ ok: true, ...r }))
      .catch((e) => sendResponse({ ok: false, error: (e as Error).message }));
    return true; // 非同期で sendResponse する
  }
});
