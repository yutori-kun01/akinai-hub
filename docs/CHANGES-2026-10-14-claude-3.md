# 変更記録 — 2026-10-14 Claude 第3回（1.0.0-rc.3 の続き）

依頼：「LINEのステップ配信とリッチメニュー、費用が大きく変わらなければ個別チャットも」「UTAGEでできることは全てしたい」「ページビルダーやファネルのデザインを上げて、より簡単に触れるように」。デザインの基調はユーザー選択の Precision Blue。

## DB（追加マイグレーション。既存SQLは変更なし）

| ファイル | 内容 |
| --- | --- |
| drizzle/0009_line_chat.sql | `line_messages`（チャット履歴）、`jobs.payload`（LINEのメッセージ形式・メールA/Bの区別） |
| drizzle/0010_click_tracking.sql | `conversions.target`（ボタンのクリック計測） |

records の新しい種類：`richMenus` `lineAutoReplies` `events` `bookings` `partners` `payouts`。既存の種類への項目追加は既定値付き（旧データはそのまま読める）。イベントの席・パートナーの月次承認の排他は `system_state`。

## 変更内容

| 区分 | 内容 | 主なファイル | 資料 |
| --- | --- | --- | --- |
| F | LINE：画像/ボタン/カルーセル/スタンプ/Flexの配信（一斉・ステップ・自動応答・チャット）、リッチメニュー（既定・タグ別切替）、キーワード自動応答、個別チャット（応答トークン優先で返信） | lib/line-messages.ts、lib/line-richmenu.ts、app/line-panel.tsx | docs/LINE.md |
| G | ページビルダーを3画面構成に刷新（要素パレット・実物のプレビュー上で選択/ドラッグ/間に追加・内容/デザイン/表示の設定パネル）、テンプレート一覧、セクションのひな形、スマホでは下からの編集シート | app/page-editor.tsx、app/page-blocks.tsx、app/block-fields.tsx | Claude Design（下記） |
| G | ファネル図（ページ・分岐・ステップ配信・成果を1枚で） | app/funnel-map.tsx、lib/funnel-map.ts | |
| H | ポップアップ／最初は非表示の要素とボタンの動作、離脱時・時間経過で開くポップアップ、動画チャプター、ボタン別クリック計測 | app/page-blocks.tsx、lib/analytics.ts | docs/UTAGE-FEATURES.md |
| H | フォームの追加項目（電話・郵便番号・住所・日付・選択・チェック・自由記入） | app/form-fields.tsx、lib/page-schema.ts | |
| H | 配信条件のAND/OR（タグ・購入・開封/クリック・フォーム回答）、メールのA/Bテスト、ステップの固定時刻送信（N日後のHH:MM） | lib/rules.ts、lib/automation.ts、app/rule-editor.tsx | |
| H | 継続課金の失敗を管理画面のお知らせ＋管理者メールで通知 | lib/notify.ts | docs/PAYMENTS.md |
| H | イベント予約、パートナー（アフィリエイト） | lib/events.ts、lib/partners.ts、app/events、app/partner | docs/EVENTS-PARTNERS.md |
| H | 自動ウェビナー（毎日の開始時刻に疑似ライブ）、分析の日別グラフ | app/page-blocks.tsx、app/analytics-panel.tsx | |

デザイン案（Claude Design、非公開の作業用キャンバス）：ビルダー3画面・ファネル図・テンプレート選択・スマホ編集の4画面。実装はこの案に沿っています。

## 検証（この環境、外部サービスはすべてモック）

| 項目 | 結果 |
| --- | --- |
| 型検査 | 成功 |
| 単体テスト | 58件 成功 |
| 独立版ビルド | 成功 |
| 独立版統合（Miniflare＋D1/R2） | 91件 成功 |
| ブラウザQA（Chromium PC/スマホ） | 29件 成功（ビルダーの選択・複製・ドラッグ・画像アップロード・端末別表示、スマホの編集シート、ファネル図、ポップアップ、イベント予約を含む） |

## 未実施・注意

- LINE実アカウント（リッチメニュー公開・チャット・Flex表示）、実メール到達、Stripeテストモード、Zoom等の参加URLの実運用は未確認。
- LINEの料金（応答メッセージは通数に含まれない等）は公式の最新情報で確認すること。
- 未実装のUTAGE機能：セクション/行の多段レイアウト（現状は全幅＋2列）、画像ボタン・アイコン、動画メニュー（段階公開）、コメント、自動ウェビナーの再生時間連動表示、メールA/Bの勝ちパターン自動配信、イベントの会議URL自動発行・有料イベント、パートナーのグループ・多段報酬、ファネルのテンプレート共有（JSON入出力）。

## 第3回の続き（「残りも続けて実装して」）

| 内容 | 主なファイル |
| --- | --- |
| セクション（背景色・背景画像・余白の帯）、1/2・1/3・2/3列、スマホ別の文字サイズ | app/page-blocks.tsx、app/block-fields.tsx |
| 画像ボタン・アイコン付きボタン、画像のリンク先、本文の太字・下線・リンク | lib/page-schema.ts |
| 動画メニュー（日付／初回表示N日後に順次公開）、自動ウェビナーの再生N分後に要素を表示 | app/page-blocks.tsx |
| ページのコメント（承認制）と管理画面の承認 | app/api/comments、app/comment-panel.tsx |
| 画像ライブラリ（アップロード済みから選ぶ・未使用画像の削除） | app/api/assets/library、app/image-library.tsx |
| メールA/B：一部で試して勝ちパターンを残りへ自動配信 | lib/automation.ts |
| メール本文の出し分け（タグ・フォーム回答）、`{{field:キー}}` 差し込み、クリックでタグ解除 | lib/mail-html.ts、lib/tracking.ts |
| 登録日時からのカウントダウン | app/shop/[owner]/[slug]/page.tsx |
| イベント：Zoom会議の自動作成、日程ごとの参加URL、有料イベントの案内 | lib/zoom.ts |
| パートナー：商品別報酬、2段目報酬 | lib/partners.ts |
| ファネルのJSON書き出し・読み込み | lib/funnel-map.ts |
| LINEの動画・音声メッセージ | lib/line-messages.ts |

DB追加SQLなし（records のJSON項目追加のみ、既定値つき）。検証：型検査、単体64、統合96、ブラウザQA 30 すべて成功（外部はモック。Zoom・LINE・メール・Stripeの実接続は未確認）。

まだ無いもの：1商品に複数価格、Stripe以外の決済代行、LINEログイン連携、行のネスト・自由配置、配信基準のカウントダウン、イベントのカレンダーAPI連携・キャンセル待ち、パートナーの案件・グループ管理、ページ内へのイベント予約フォーム埋め込み。

## 第4回（「どんどん進めて」）

| 内容 | 主なファイル |
| --- | --- |
| 価格の選択肢（1商品に一括・分割・継続課金など最大7通り、販売ページでプラン選択） | lib/pricing.ts、app/price-options.tsx |
| イベントのキャンセル待ち（自動繰り上げ）、Googleカレンダー自動登録（サービスアカウント）、ページ内のイベント予約フォーム | lib/events.ts、lib/gcal.ts、app/api/events/info |
| パートナーグループ | lib/partners.ts、app/partner-panel.tsx |
| LINEログインでのワンタップ連携 | lib/line-login.ts、app/api/line/login |
| 指定した配信の到着時刻からのカウントダウン | app/shop/[owner]/[slug]/page.tsx |
| 読者登録・イベント予約/キャンセルの署名Webhook | lib/webhooks.ts |

DB追加SQLなし。検証：型検査、単体65、統合101、ブラウザQA 31（外部はモック。Google・LINEログイン・Zoomの実接続は未確認）。

まだ無いもの：Stripe以外の決済代行（どの会社を使うかの決定が必要）、行の入れ子・自由配置、Google Meetの自動発行。
