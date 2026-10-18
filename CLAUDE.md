# Akinai hub — Claude開発引き継ぎ

基準日: 2026-10-14 JST / 1.0.0-rc.3（rc.2エクスポートからの変更は docs/CHANGES-2026-10-14-claude*.md、最新は -claude-3）
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

## 2026-10-14 Claude 第3回（docs/CHANGES-2026-10-14-claude-3.md）

ユーザー決定：LINEのステップ配信・リッチメニュー・個別チャットに対応。「UTAGEでできることは全て」。ビルダー/ファネルのデザインはClaude Designで刷新（Precision Blue）。

- F LINE：画像/ボタン/カルーセル/スタンプ/Flex、リッチメニュー（既定・タグ別）、キーワード自動応答、個別チャット（応答トークン優先）。
- G ページビルダー3画面化（パレット・実物プレビューで選択/ドラッグ/挿入・内容/デザイン/表示パネル・テンプレート一覧・スマホは編集シート）、ファネル図。
- H ポップアップ/非表示要素とボタン動作、離脱・時間経過ポップアップ、動画チャプター、ボタン別クリック計測、フォーム追加項目、配信条件AND/OR、メールA/B、ステップ固定時刻、支払い失敗の管理者通知、イベント予約、パートナー（アフィリエイト）、自動ウェビナー、日別グラフ。
- DB追加：drizzle/0009（line_messages・jobs.payload）、0010（conversions.target）。
- 検証：型検査、単体58、統合91、ブラウザQA 29。外部は全てモック。
- 続き：セクション/1/3・2/3列、画像・アイコンボタン、本文書式、動画メニュー、ウェビナー連動表示、コメント（承認制）、画像ライブラリ、メールA/B勝ち自動配信、本文の出し分け・{{field:}}、クリックでタグ解除、登録基準カウントダウン、Zoom会議自動作成（ZOOM_*）、パートナー商品別・2段報酬、ファネルJSON入出力、LINE動画/音声。単体64・統合96・ブラウザQA 30。
- 第4回：価格の選択肢（1商品最大7通り）、イベントのキャンセル待ち・Googleカレンダー自動登録（GOOGLE_*）・ページ内予約フォーム、パートナーグループ、LINEログイン連携（LINE_LOGIN_*）、配信基準カウントダウン、読者登録/予約の署名Webhook。単体65・統合101・ブラウザQA 31。

## 2026-10-14 Claude 第2回（rc.3、docs/CHANGES-2026-10-14-claude-2.md）

ユーザー決定：会員サイトは greed-learning（別リポジトリ）と連携。購入者の登録・認証はAkinai hub側。買い切りで、更新は自動で受け取れる形、サポートはほぼなし。実装順は A 認証 → B HTMLメール → C 決済 → D ファネル。

- A：OIDCプロバイダー（PKCE・RS256）、購入一覧/商品一覧API、購入・停止の署名Webhook。ライセンス（自動/手動発行、設置先上限、更新期間）と署名付きリリース配布、`pnpm run update`。greed-learning側は同名ブランチで「Akinai hubでログイン」・Webhook受信・講座と商品の紐づけ。
- B：HTMLメール（ブロック/直接）、差し込み、開封・クリック計測、クリックでタグ、開封/クリック条件。
- C：継続課金・分割・無料お試し、オーダーバンプ、ワンクリックアップセル、クーポン、購入者の解約。
- D：訪問者Cookie、ページ計測、登録経路（?ref=）/UTM、A/Bテスト、分析タブ。
- E：UTAGEのページ要素（サブ見出し、箇条書き、画像＋テキスト、音声、プログレス、PDF、吹き出し、FAQ、表、隔離カスタムHTML、人ごとのカウントダウン）、2列・装飾、SEO/OGP、GA4/Metaピクセル、カスタムCSS、閲覧パスワード、期限後の移動先。
- DB追加：drizzle/0007（jobs.html・mail_events）、0008（page_views・conversions）。
- 検証：型検査、単体48、統合80、ブラウザQA 25。外部は全てモック。

## 2026-10-14 Claude 第1回（docs/CHANGES-2026-10-14-claude.md）

- pnpm 11のfrozen install失敗を修正（pnpm-workspace.yaml）。
- ブラウザQAの仕組み（tests/qa-server.mjs・tests/browser-qa.mjs、`pnpm run test:browser`）。PC/スマホ相当のChromiumで21項目。不具合3件を修正。
- 暖簾ロゴをSVG化し、ヘッダー・favicon・ブランドページ・ブランドキットに適用（文字はアウトライン化していない）。
- ページビルダー：テンプレート、複製、ドラッグ並べ替え、端末別表示、画像の直接アップロード（R2 images/、バックアップ対象）。
- 単体27・統合43・ブラウザ21。DB追加SQLなし。

## 優先して進める残作業

1. ~~ブラウザでPC/スマホの実操作を検証~~ → ローカルChromium（PC/スマホエミュレーション、外部モック）では2026-10-14に実施済み。残りは実機スマホ・Safari・実ドメインでの確認。
1-2. rc.3の新機能の実接続確認：Stripeテストモード（継続課金・分割・オフセッション決済・Webhook各イベント）、greed-learningとのOIDC/Webhook、メールの開封・クリック計測、リリース署名→更新適用を実環境で一度通す。
2. 独立Cloudflare環境で新規セットアップを通す（2026-10-18にローカルD1・`wrangler dev`・deploy --dry-runでの予行演習は成功。docs/INSTALL.md 1-2）。メール実到達、Stripeテストモード、LINE実アカウントでWebhook/配信/ブロックを確認。キーは安全な経路でユーザーが設定し、架空の接続完了を報告しない。
3. ~~暖簾ロゴのベクター化と適用~~ → 2026-10-14に適用済み。ユーザーによる形の確認、文字のアウトライン化とデザイナーによる最終調整が残り。
4. ~~ページビルダーの操作性拡張~~ → テンプレート・画像アップロード・複製・ドラッグ・ブロック単位の端末別表示は2026-10-14に実装済み。残りは端末別の細部スタイル、アップロード画像の一覧・削除UI。
5. 残るUTAGE機能：Stripe以外の決済代行（会社の決定待ち）、行のネスト・自由配置、Google Meet自動発行。LINE・LINEログイン・Zoom・Googleカレンダーの実アカウントでの確認。
6. UTAGEの原本保全→件数/ハッシュ/対応表→変換可能性の検証。HTMLメールや固定時刻ステップ、差し込み、複雑な分岐を黙ってテキスト・時間差へ劣化変換しない。
7. 買い切り販売条件（価格・返金・設置先数・更新期間の既定値・譲渡可否）とライセンス条項をユーザーと確定。Tips購入者へは「ライセンスを手動発行」で受け渡す運用（docs/LICENSE-UPDATES.md）。サポートは「ほぼなし」の方針を販売ページと規約に明記。

## 重要な制約

- 「UTAGE完全互換」「完成品」「本番検証済み」とは呼ばない。rc.2はリリース候補。
- LINEは1公式アカウント。テキスト/画像/ボタン/カルーセル/スタンプ/Flex、リッチメニュー、自動応答、個別チャットあり（実アカウント未確認）。購入条件には顧客連携が必要。LINEログイン連携あり（同一プロバイダー必須、実アカウント未確認）。既存友だち全件取得、LIFF、受信メディア本体の保存はない。返信は応答トークン（無料）優先、期限切れはプッシュ（通数消費）。
- ブロック式ページ編集（セクションの帯＋1/2・1/3・2/3列）。自由配置・行のネストは未実装。A/B、HTMLメール、開封クリック条件、人ごとのカウントダウン、サブスク・分割、フォーム追加項目、ポップアップ、イベント予約、パートナーは実装済み（実接続未確認）。
- イベントの席は system_state の席キーで排他。予約のある日程の日時変更・削除は禁止。復元時は予約から席を再構築。パートナー報酬は承認で確定し、承認後の返金は差し引かない。
- キュー作成後の本文・日時・ステップ・チャネル変更は禁止し、別の配信として作成。状態・条件は更新可。失敗や結果不明の送信を勝手に再送しない。
- メール・LINE各10件/5分が基本。大量配信には容量設計の追加が必要。
- 外部画像/動画はURLのみ保管。動画本体やDRMはない。
- 認証、所有者分離、メール同意/停止、LINEブロック、入金済み納品、Webhook署名、二重配信防止を拡張時も維持する。
- `AUTH_SECRET` からクライアントシークレット・Webhook署名・ライセンスキーを導出している。変更すると全て変わる。
- カスタムHTMLは隔離iframe（allow-same-origin禁止）でのみ表示する。計測タグはID形式を検証した固定スニペットのみ。任意JSを同一オリジンに出さない。
- 署名済みZIP以外の更新は適用しない（update.mjs）。リリース秘密鍵 release-signing-key.txt をリポジトリ・ZIPに入れない。
- 実メール配信・決済・公開先変更は、対象とテスト/本番を区別して実施。既存データを初期化しない。

## 検証状況

2026-10-14 第4回時点：型検査、単体65、独立版統合101、ブラウザQA 31（Chromium・外部モック）。第3回の続き時点：単体64、統合96、ブラウザQA 30。第3回時点：単体58、統合91、ブラウザQA 29。第2回（rc.3）時点：単体48、統合80、ブラウザQA 25。greed-learningは型検査・vitest 146・lint・build。第1回時点：単体27、統合43、ブラウザQA 21。frozen installはクリーン状態から成功。以下はrc.2基準版の記録。基準版は型検査・独立版/Sites版ビルド成功。単体24、独立版統合40、Sites版統合21の合計85項目。外部APIは全てモック。rc.2 ZIPのCRC/SHA-256照合済み。rc.2の新規オンライン依存インストールと購入者実機導入は未検証。

## 並行開発

このエクスポートを新しいGitリポジトリ/作業ブランチに置き、上記基準コミットからの変更を記録する。ChatGPT側との受け渡しは変更ファイル一覧・差分・DB追加SQL・テスト結果を添付。本番をそれぞれから上書きせず、統合する担当と対象環境を決める。

## ファイル案内

app/dashboard.tsx:管理UI / app/page-editor.tsx・page-blocks.tsx:編集/表示
app/shop/[owner]/[slug]/page.tsx:公開ページ / app/api/subscribe:読者登録
lib/core.ts・page-schema.ts:入力定義 / lib/server.ts:所有者別CRUDと注文
lib/auth.ts:認証 / lib/automation.ts・mail.ts・line.ts:配信と連携
lib/mail-providers.ts・mail-events.ts:各メールサービス / lib/line-protocol.ts:LINEプロトコル
lib/checkout.ts・app/api/stripe:決済 / lib/backup.ts:保存復元
build/standalone-worker.ts:独立版Worker（/.well-known転送・訪問者Cookie） / db/schema.ts・drizzle/:DB
lib/oidc.ts・webhooks.ts・jwt.ts:会員サイト連携 / lib/licenses.ts・scripts/release/:ライセンスと更新配布
lib/mail-html.ts・tracking.ts:HTMLメールと計測 / lib/billing.ts・pricing.ts:決済拡張 / lib/analytics.ts・ab.ts:分析とA/B
app/integrations-panel.tsx・mail-editor.tsx・analytics-panel.tsx・block-fields.tsx:管理UI追加分
lib/line-messages.ts・line-richmenu.ts・app/line-panel.tsx:LINE拡張 / app/funnel-map.tsx・lib/funnel-map.ts:ファネル図
lib/rules.ts・app/rule-editor.tsx:配信条件AND/OR / lib/notify.ts:運営のお知らせ / app/form-fields.tsx:フォーム追加項目
lib/events.ts・zoom.ts・gcal.ts・app/events・app/event-editor.tsx・event-booking.tsx:イベント予約 / app/api/comments・comment-panel.tsx:コメント / app/api/assets/library・image-library.tsx:画像ライブラリ / lib/partners.ts・app/partner・app/partner-panel.tsx:パートナー
lib/pricing.ts・app/price-options.tsx:価格の選択肢 / lib/line-login.ts・app/api/line/login:LINEログイン連携
HANDOFF-INVENTORY.sha256.json:この一式の全ファイルハッシュ
