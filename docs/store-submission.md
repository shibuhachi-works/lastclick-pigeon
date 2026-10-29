# Chrome ウェブストアに出す手順(人の作業)

拡張をストアに置くまでの手順。**ストアに上げる・公開するのは人の作業**(AI はやらない)。
掲載文・権限の理由・プライバシーの回答はすべて `extension/store/listing.md` にある。画面に貼るだけ。

## 0. 先に決めること

- **公開範囲**: 最初は「限定公開(Unlisted)」を勧める。`selectors/note.json` は 2026-10-29 に実機で全工程 ✓ を確認済みだが、note の画面が変わると ✗ になりうるので、最初は様子を見る。限定公開なら URL を知っている人だけがインストールでき、審査は通常と同じ。実機で通ったら「公開」に切り替える(再審査なしで切り替えられる)
- **プライバシーポリシーの URL**: 審査で必須。https://shibuhachi.works/lastclick-pigeon/privacy/ を使う(portfolio リポジトリの `src/pages/lastclick-pigeon/privacy.astro`。文面は `docs/PRIVACY.md` と同じに保つ)。ホームページ URL は https://shibuhachi.works/lastclick-pigeon/

## 1. 準備(1 回だけ)

1. Chrome ウェブストアのデベロッパー登録(Google アカウント、登録料は 1 回だけ): https://chrome.google.com/webstore/devconsole
2. 登録後、デベロッパー ダッシュボードの「アカウント」で、メールアドレスの確認と、公開者名の設定を済ませる(公開者名はストアに表示される)

## 2. ZIP を作る

```bash
cd extension
npm ci
npm run package     # → extension/release/lastclick-pigeon-for-note-<version>.zip
```

- `manifest.json` の `version` を上げるのは、ストアに上げ直すとき(同じ version は再アップロードできない)
- ZIP の中身は `dist/` の中身そのもの(`manifest.json` が直下)。中に `.map` やソースは入らない
- 画像(アイコン・スクリーンショット)を作り直すときだけ、リポジトリ直下で `npm ci && npx playwright install chromium` をしてから `npm run icons` / `npm run screenshots`(画像はコミット済みなので、普段は不要)

## 3. ストアに上げる

1. ダッシュボード →「新しいアイテム」→ ZIP を上げる
2. **ストアの掲載情報**: `extension/store/listing.md` の「基本」「詳細な説明」を貼る。カテゴリは「仕事効率化」、言語は「日本語」
3. **画像**: スクリーンショット `extension/store/screenshot-1.png` 〜 `screenshot-5.png`(1280x800、5 枚とも)を番号順に上げる。可能なら実機で note のエディタに入力された状態も 1 枚撮って足す(記事本文・アカウント名が写らないもの)。小さなプロモタイルは `extension/store/promo-small.png`
4. **プライバシーへの取り組み**: `listing.md` の「単一の目的」「権限の理由」「リモートコード」「データの使用」をそのまま回答する。プライバシーポリシー URL を入れる
5. **公開設定**: 公開範囲を「限定公開」にする(0. の判断どおり)。配布地域はすべて
6. 「審査のため送信」

## 4. 審査中・審査後

- 審査は通常 1〜3 日。ホスト権限が付いているので、権限の理由が薄いと差し戻される。差し戻しのメールが来たら、本文を Issue に貼れば AI が回答案と修正 PR を作る
- 通ったら、限定公開の URL を実機確認する人に渡す
- 実機で通ったら「公開」に切り替え、`docs/ROADMAP.md` の「Chrome ウェブストアに公開」にチェックを入れる(PR)

## 5. 次に上げ直すとき

1. `manifest.json` の `version` を上げる(例: 0.1.0 → 0.1.1)
2. `npm run package` → ダッシュボードの「パッケージ」→「新しいパッケージをアップロード」
3. 掲載情報・プライバシーの回答に変更があれば `listing.md` を先に直してから画面に反映する

## 守ること(AGENTS.md / extension/README と同じ)

- 説明文に「認証情報を扱わない」「公開ボタンは押さない」「非公式ツール」を明記する(listing.md に入っている)
- `host_permissions` を増やさない(増やすと審査が厳しくなる)
- セレクタの修正だけなら、`selectors/note.json` を main に push すれば全ユーザーに届く。ストアの再申請は不要
