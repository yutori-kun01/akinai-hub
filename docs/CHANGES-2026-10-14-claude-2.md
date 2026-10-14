# 変更記録 — 2026-10-14 Claude 第2回（1.0.0-rc.3）

依頼：「UTAGEの完全代替に近い機能」「会員サイト（greed-learning）は別で連携」「買い切り販売のためのユーザー登録・認証」「更新は自動で受け取れる、サポートはほぼなし」。実装順は A 認証基盤 → B HTMLメール・計測 → C 決済拡張 → D ファネル分析、続けて UTAGE のページ要素の拡充。
UTAGEの調査結果は docs/UTAGE-FEATURES.md（公開ヘルプの要約。UTAGE原本データは引き続き未取得）。

## DB（追加マイグレーション。既存SQLは変更なし）

| ファイル | 内容 |
| --- | --- |
| drizzle/0007_mail_tracking.sql | `jobs.html`、`mail_events`（開封・クリック） |
| drizzle/0008_funnel_analytics.sql | `page_views`、`conversions` |

records のJSON項目追加（既定値で旧データはそのまま読める）：商品の支払い方法・ライセンス設定、ページのアップセル/バンプ/A/B/SEO/パスワード等、新しい種類 `apps` `licenses` `releases` `coupons`、顧客・注文の `attribution`。OIDC署名鍵・認可コードは `system_state`。

## 変更内容

| 区分 | 内容 | 主なファイル | 資料 |
| --- | --- | --- | --- |
| A | OpenID Connectプロバイダー（認可コード＋PKCE、RS256、userinfoに購入一覧）、購入一覧・商品一覧API、購入/停止の署名Webhook（送信時点の状態で再構成・再試行） | lib/oidc.ts、lib/webhooks.ts、lib/jwt.ts、app/api/oidc/* | docs/MEMBER-SITE.md |
| A | ライセンス（入金で自動発行／手動発行、設置先上限、更新期間、停止）、署名付きリリース配布、購入側の毎日の更新確認と `pnpm run update`（既定は確認のみ、置き換え前のバックアップ） | lib/licenses.ts、app/api/license/*、scripts/release/{keygen,sign,update,zip}.mjs | docs/LICENSE-UPDATES.md |
| A | 管理画面「連携・ライセンス」、購入者の本棚にライセンスキー表示 | app/integrations-panel.tsx、app/purchases/page.tsx | |
| A | greed-learning 側：「Akinai hubでログイン」、Webhook受信、講座と商品の紐づけ、購入者のパスコード不要登録（別リポジトリ・同名ブランチ） | yutori-kun01/greed-learning | greed-learning/docs/AKINAI-HUB.md |
| B | HTMLメール（ブロック／HTML直接）、差し込み（`{{name}}` `%name%`等）、開封・クリック計測、クリックでタグ付与、開封/クリック条件、配信ごとの率 | lib/mail-html.ts、lib/tracking.ts、app/mail-editor.tsx、app/api/mail/{o,c} | docs/MAIL.md |
| C | 継続課金・分割払い・無料お試し、オーダーバンプ、ワンクリックアップセル（認証要求時はCheckoutへ）、クーポン、購入者の解約、管理者の利用停止でStripeも解約 | lib/billing.ts、lib/pricing.ts、app/api/purchase/{upsell,cancel}、app/api/coupon | docs/PAYMENTS.md |
| D | 訪問者Cookie、ページ表示の計測、登録経路（`?ref=`）・UTMの紐づけ、A/Bテスト（同じURLで固定振り分け）、分析タブ | lib/analytics.ts、lib/ab.ts、app/analytics-panel.tsx、app/api/{track,analytics} | docs/FUNNEL-ANALYTICS.md |
| E | ページ要素の追加（サブ見出し、箇条書き、画像＋テキスト、音声、プログレスバー、PDF、吹き出し、FAQ、表、余白、隔離表示のカスタムHTML、人ごとのカウントダウン）、2列・色・文字サイズ・ボタンの動き・下部固定、SEO/OGP、GA4/Metaピクセル、カスタムCSS、閲覧パスワード、期限後の移動先 | app/block-fields.tsx、app/page-blocks.tsx、lib/page-schema.ts、lib/page-access.ts | docs/UTAGE-FEATURES.md |

## 検証（この環境、外部サービスはすべてモック）

| 項目 | 結果 |
| --- | --- |
| 型検査 | 成功 |
| 単体テスト | 48件 成功 |
| 独立版ビルド | 成功 |
| 独立版統合（Miniflare＋D1/R2） | 80件 成功（追加37件：OIDC・Webhook・ライセンス・署名リリース・HTMLメール・計測・クーポン・バンプ・アップセル・継続課金・分割・A/B・分析・新要素・パスワード等） |
| ブラウザQA（Chromium PC/スマホ） | 25件 成功 |
| greed-learning | 型検査・vitest 146件・lint（エラー0）・next build 成功 |
| 配布ZIP | `release:package` → `release:sign` → 署名検証、更新スクリプトのZIP展開とパス検査を単体テスト |

## 未実施・注意

- 実Cloudflare環境、実ドメインHTTPS、実メール到達、Stripeテストモード（継続課金・オフセッション決済・Webhook）、LINE実機、greed-learningとの実接続は未確認。
- Stripe APIのバージョン差（invoiceのsubscription参照位置）は旧新両方を読むが、実イベントでの確認が必要。
- 開封計測は画像表示に依存し、Apple Mail等の事前読み込みやセキュリティ製品のクリックで多めに数えられる。
- A/BテストとカウントダウンはCookie・ブラウザ保存に依存（端末が変われば別扱い）。
- 未実装（UTAGEにある主なもの）：イベント・予約、パートナー（アフィリエイト）、LINEリッチメニュー/Flex/個別チャット、自動ウェビナー、動画チャプター、イグジットポップアップ、セクション/行の多段レイアウト（現状は全幅＋2列）、メールA/B。
