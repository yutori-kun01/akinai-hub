# Akinai hub — Claude開発引き継ぎ

基準日: 2026-10-14 JST / 1.0.0-rc.2
基準ソースコミット: 2295e8dd8b4ff587d7b41e089b30ba56db695041
この一式は独立ホスティング版の開発用エクスポート。実装済みをゼロから作り直さず、ソースを確認して改善を進めること。

## ユーザーの目的と決定事項

- クリエイター「ゆとり」が、UTAGEを使えなくなった場合に備えて所有・移行できる販売・配信基盤を作る。
- 製品名は **Akinai hub**（この表記）。買い切り・セルフホストのプラットフォームとしてTips等で販売予定。価格・サポート・契約条件は未確定。
- Cloudflareを優先。無料枠を活用したいが、無料運用を保証しない。
- Resend依存にせず、Brevo / SendGrid / Mailgun / Postmarkにも対応。
- UIはkijiiに似せない。Precision Blue：白〜オフホワイト、#315EFB、#18243A、上部ナビ、一覧表、右編集パネル。
- ロゴはA案をベースに暖簾へ変更したプレビューが好評。brand-concepts/04-noren-refinement.pngが最新。ただしアプリのSVGマークは旧幾何学マークのままで、暖簾のSVG化・全画面への実装は未完了。生成画像を完成ベクターロゴだと扱わない。
- UTAGE上のメルマガ本文、HTML、ステップ順序・時刻・条件、商品、ファネル、関連ID、画像等は原本を忠実に保管して後で移行したい。**UTAGE原本はまだ取得できていない。ログイン中断で取得件数0。ZIPに実メール原稿や実商品データがあると誤認しないこと。** docs/UTAGE-MIGRATION.mdは保存手順。

## 技術構成

Vinext 1.0.0-beta.5 / React 19 / TypeScript / Vite 8 / Cloudflare Workers + D1 + R2。pnpm 11.25.0、Node 22.13以上。既存DBはrecordsのkind+JSON、jobs、audit、events、認証テーブル、system_state等。1環境1店舗・1管理者を前提。

このフォルダのpackage.jsonは独立版用。ChatGPT Sitesプラグインや元環境の秘密情報がなくても開発できる構成にしてある。元のホストは所有者限定の確認環境で、外部Webhook接続先には使わない。

## 最初の作業

1. このファイル、docs/VALIDATION.md、docs/RELEASE-CHECKLIST.md、docs/FUNNELS.md、docs/LINE.mdを読む。
2. pnpm install --frozen-lockfile で依存を準備。
3. ローカルビルドのみなら wrangler.standalone.example.json を wrangler.standalone.json へコピー。ダミーD1 IDのまま本番デプロイしない。
4. pnpm run typecheck、pnpm test、pnpm run build:standalone、pnpm run test:integration を実行。
5. ローカル開発は pnpm dev。独立環境の作成と実接続はdocs/INSTALL.md。必要なシークレットはmail.environment.exampleに列挙。

統合テストはビルド済みdist/serverをMiniflareで起動し、D1/R2と模擬外部APIで実行。tests/api-integration.mjsは元Sites版向けで、独立版ビルドに対してそのまま実行するテストではない。
既存drizzle SQLを順番に適用する。既適用マイグレーションを改変せず、追加マイグレーションを作る。DrizzleのSQLite式インデックス生成に不正な引用符が出たため、0001/0006等の実SQLを確認してから新規生成を適用する。

## 実装済み

- 管理者初期登録・パスワード、購入者メールOTP、セッション、権限分離、Origin検証。
- 商品・顧客・タグ・注文、銀行振込、Stripe Checkoutと署名Webhook、購入者の本棚、入金後のファイル納品・講座閲覧。
- 5社メールアダプター、予約・ステップ、解除とバウンス等の抑止、Cron、配信キュー。
- ブロック式の販売/オプトイン/完了ページ。見出し・本文・画像URL・YouTube/Vimeo・ボタン・フォーム・固定期限・区切り線。上下並べ替え、配色、スマホ幅プレビュー。
- メール本人確認→同意・証跡保存→タグ→ステップ予約→完了ページ。
- LINE署名Webhook、友だち追加・ブロック、順序逆転と重複対策。認証済みメール顧客が一回限りの10分コードをLINEトークへ送り、1対1で連携。
- LINEテキストのタグ別・予約・ステップ配信。対象タグ/除外タグ/購入後停止/購入必須の共通条件。送信前再確認。
- R2の納品ファイルも含めたバックアップ・復元。復元時の未送信キュー停止、新しいLINEブロック状態を保持。
- 導入ウィザード、チェックリスト、運用・移行資料、Tips販売文のたたき台。

## 2026-10-14 Claude作業（docs/CHANGES-2026-10-14-claude.md）

- pnpm 11のfrozen install失敗を修正（pnpm-workspace.yaml）。
- ブラウザQAの仕組み（tests/qa-server.mjs・tests/browser-qa.mjs、`pnpm run test:browser`）。PC/スマホ相当のChromiumで21項目。不具合3件を修正。
- 暖簾ロゴをSVG化し、ヘッダー・favicon・ブランドページ・ブランドキットに適用（文字はアウトライン化していない）。
- ページビルダー：テンプレート、複製、ドラッグ並べ替え、端末別表示、画像の直接アップロード（R2 images/、バックアップ対象）。
- 単体27・統合43・ブラウザ21。DB追加SQLなし。

## 優先して進める残作業

1. ~~ブラウザでPC/スマホの実操作を検証~~ → ローカルChromium（PC/スマホエミュレーション、外部モック）では2026-10-14に実施済み。残りは実機スマホ・Safari・実ドメインでの確認。
2. 独立Cloudflare環境で新規セットアップを通す。メール実到達、Stripeテストモード、LINE実アカウントでWebhook/配信/ブロックを確認。キーは安全な経路でユーザーが設定し、架空の接続完了を報告しない。
3. ~~暖簾ロゴのベクター化と適用~~ → 2026-10-14に適用済み。ユーザーによる形の確認、文字のアウトライン化とデザイナーによる最終調整が残り。
4. ~~ページビルダーの操作性拡張~~ → テンプレート・画像アップロード・複製・ドラッグ・ブロック単位の端末別表示は2026-10-14に実装済み。残りは端末別の細部スタイル、アップロード画像の一覧・削除UI。
5. 必要に応じてファネル俯瞰図と条件分岐UI、LINEリッチメニュー/Flex等へ拡張。現在は複雑な分岐ツリーではない。
6. UTAGEの原本保全→件数/ハッシュ/対応表→変換可能性の検証。HTMLメールや固定時刻ステップ、差し込み、複雑な分岐を黙ってテキスト・時間差へ劣化変換しない。
7. 買い切り販売条件、ライセンス、更新・サポート・返金、Tips購入後の受渡しをユーザーと確定。

## 重要な制約

- 「UTAGE完全互換」「完成品」「本番検証済み」とは呼ばない。rc.2はリリース候補。
- LINEは1公式アカウント、テキストのみ。購入条件には顧客連携が必要。既存友だち全件取得、LINE Login/LIFFワンタップ連携、チャット返信管理はない。
- ブロック式ページ編集。自由配置、分岐ツリー、A/B、HTMLメール、開封クリック分岐、任意フォーム項目、セッション別カウントダウン、サブスク決済、アフィ管理は未実装。
- キュー作成後の本文・日時・ステップ・チャネル変更は禁止し、別の配信として作成。状態・条件は更新可。失敗や結果不明の送信を勝手に再送しない。
- メール・LINE各10件/5分が基本。大量配信には容量設計の追加が必要。
- 外部画像/動画はURLのみ保管。動画本体やDRMはない。
- 認証、所有者分離、メール同意/停止、LINEブロック、入金済み納品、Webhook署名、二重配信防止を拡張時も維持する。
- 実メール配信・決済・公開先変更は、対象とテスト/本番を区別して実施。既存データを初期化しない。

## 検証状況

2026-10-14時点：型検査、単体27、独立版統合43、ブラウザQA 21（Chromium・外部モック）。frozen installはクリーン状態から成功。以下はrc.2基準版の記録。基準版は型検査・独立版/Sites版ビルド成功。単体24、独立版統合40、Sites版統合21の合計85項目。外部APIは全てモック。rc.2 ZIPのCRC/SHA-256照合済み。rc.2の新規オンライン依存インストールと購入者実機導入は未検証。

## 並行開発

このエクスポートを新しいGitリポジトリ/作業ブランチに置き、上記基準コミットからの変更を記録する。ChatGPT側との受け渡しは変更ファイル一覧・差分・DB追加SQL・テスト結果を添付。本番をそれぞれから上書きせず、統合する担当と対象環境を決める。

## ファイル案内

app/dashboard.tsx:管理UI / app/page-editor.tsx・page-blocks.tsx:編集/表示
app/shop/[owner]/[slug]/page.tsx:公開ページ / app/api/subscribe:読者登録
lib/core.ts・page-schema.ts:入力定義 / lib/server.ts:所有者別CRUDと注文
lib/auth.ts:認証 / lib/automation.ts・mail.ts・line.ts:配信と連携
lib/mail-providers.ts・mail-events.ts:各メールサービス / lib/line-protocol.ts:LINEプロトコル
lib/checkout.ts・app/api/stripe:決済 / lib/backup.ts:保存復元
build/standalone-worker.ts:独立版Worker / db/schema.ts・drizzle/:DB
HANDOFF-INVENTORY.sha256.json:この一式の全ファイルハッシュ
