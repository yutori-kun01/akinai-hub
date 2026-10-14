# 変更記録 — 2026-10-14 Claude引き継ぎ作業

基準: 1.0.0-rc.2 開発用エクスポート（基準ソースコミット 2295e8dd8b4ff587d7b41e089b30ba56db695041）。
このリポジトリの最初のコミットがエクスポートそのもの（HANDOFF-INVENTORY.sha256.json の724ファイルとSHA-256一致を確認済み）。以降のコミットが今回の差分。
`git diff <最初のコミット> HEAD` で全差分を取得できる。バージョン表記は rc.2 のまま変更していない。

## DB
- **追加マイグレーションなし。** D1スキーマは変更していない。
- ページブロックに `visibility`（`all` / `desktop` / `mobile`）を追加。records の JSON 内の項目で、zod の既定値 `all` により既存データはそのまま読める。

## 変更内容

| # | 内容 | 主なファイル |
|---|---|---|
| 1 | **pnpm 11で `pnpm install --frozen-lockfile` が失敗する問題を修正。** package.json の npm 形式 `overrides` を pnpm 11 が読まず `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`、次に `ERR_PNPM_IGNORED_BUILDS`（workerd / esbuild 等）で停止していた。購入者の導入手順1で必ず止まる不具合。配布ZIPにも同梱。 | pnpm-workspace.yaml、scripts/release/package.mjs、docs/INSTALL.md |
| 2 | ブラウザQAの仕組み。ビルド済みWorkerをMiniflare（D1/R2）で起動し、メール・LINE・Stripeをモック。Chromium（PC 1366px／iPhone 13相当）で実操作。 | tests/qa-server.mjs、tests/browser-qa.mjs、package.json（`qa:server` / `test:browser`） |
| 3 | 不具合修正：管理者が `/login?admin=1` へ転送されても購入者ログイン画面が出ていた。 | app/login/page.tsx |
| 4 | 不具合修正：URL末尾の `pattern` がブラウザの正規表現（vフラグ）で無効になり、入力チェックが無視されていた。 | app/page-editor.tsx |
| 5 | 読み込み中のヘッダーに「非公開環境」と誤表示していた。 | app/dashboard.tsx |
| 6 | 暖簾ロゴのベクター化と適用（ヘッダー、購入者の本棚、favicon、ブランドページ、ブランドキットSVG）。比較画像は brand-concepts/05-noren-vector-check.png。 | public/brand/*.svg、public/favicon.svg、app/layout.tsx、app/brand/page.tsx、DESIGN_SYSTEM.md |
| 7 | ページビルダー：テンプレート、ブロック複製、ドラッグ並べ替え（↑↓は維持）、ブロック単位の端末別表示、画像の直接アップロード。 | app/page-editor.tsx、app/page-blocks.tsx、app/globals.css、lib/page-schema.ts |
| 8 | 画像アップロードのAPIと公開配信。R2の `<owner>/images/<uuid>.<ext>` に保存し、ファイル内容で PNG/JPEG/WebP/GIF を判定（5MB以下）。GETはこの領域だけを nosniff・sandbox CSP 付きで返す。独立版は店舗IDの一致も確認。 | app/api/assets/route.ts、build/standalone-worker.ts（この経路だけ長期キャッシュを許可） |
| 9 | バックアップ：ページで使用中のアップロード画像を含め、復元時は同じキーへ戻す（URLが変わらないように）。参照先の画像が欠けていてもバックアップ全体は止めない。 | lib/backup.ts |

## 検証結果（2026-10-14、この環境）

| 項目 | 結果 |
|---|---|
| `pnpm install --frozen-lockfile`（クリーン） | 成功（修正前は失敗） |
| `pnpm run typecheck` | 成功 |
| `pnpm test` 単体 | 27/27（rc.2の24 + ページビルダー3） |
| `pnpm run build:standalone` | 成功 |
| `pnpm run test:integration` 独立版統合 | 43/43（rc.2の40 + 画像アップロード・公開配信・バックアップ復元3） |
| `pnpm run test:browser` ブラウザQA | 21/21、コンソールエラー0 |

ブラウザQAで確認した流れ：初期設定→ログアウト→パスワードログイン→運営情報→商品→完了/オプトイン/販売ページ作成（ブロック追加・並べ替え・スマホ幅プレビュー）→テンプレート・複製・ドラッグ・画像アップロード・不正画像の拒否・端末別表示→ステップ配信→（スマホ）メール認証付き読者登録→完了ページ遷移→管理画面でタグ・同意・配信予約を確認→銀行振込申込→本棚の入金待ち→管理者の入金確認→本棚が入金済み→LINE友だち追加URL設定→LINE登録ページ→連携コード発行→署名付きfollow/messageのWebhook→連携完了→完了ページ→管理画面で連携済み表示→390px幅で管理画面の各タブと編集パネルに横はみ出しがないこと→ブランドページ。

Sites版API統合（tests/api-integration.mjs）は元環境用のため未実行。

## 未実施・制約（誇張しないこと）
- ブラウザQAはローカルのChromiumとiPhoneエミュレーション。**実機スマホ、Safari、実ドメインHTTPSでは未確認。**
- メール・LINE・Stripeはモック。実到達・実課金・実LINE端末受信は未確認。独立Cloudflare環境への新規設置も未実施（キーはユーザーが安全な経路で設定する必要がある）。
- 暖簾ロゴは参照画像を見ながら手で作図した左右対称のベクター。トレースではない。横組みの文字は `<text>` 指定でアウトライン化していないため、印刷や外部入稿の前にデザイナーによる確認とアウトライン化が必要。
- アップロード画像の一覧・削除UIはない（未使用画像はR2に残る）。
- UTAGE原本は引き続き未取得。
