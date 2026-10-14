# Akinai hub 独立版 — 導入マニュアル

対象: 1.0.0-rc.2（リリース候補）。1つのCloudflare環境に1店舗・1管理者。ChatGPTアカウントは不要です。

この配布版はソースコードを自分のCloudflareへ設置する方式です。Node.js 22.13以上、pnpm 11.25.0、ターミナル操作、Cloudflareアカウント、送信元ドメインが必要です。外部サービスの料金は別途です。無料枠内の運用を保証しません。特に認証の暗号処理・定期処理・保存容量の上限を確認してください。

## 1. インストール

ZIPを展開し、そのフォルダで実行します。WindowsはPowerShell、macOSはターミナルを利用できます。

```sh
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
pnpm exec wrangler login
```

pnpm 11の設定（overrides と、esbuild・workerd などビルドスクリプトの許可）は同梱の pnpm-workspace.yaml にあります。この許可がないと `--frozen-lockfile` が失敗します（2026-10-14修正）。ZIPには秘密情報・実顧客データ・既存店舗IDを含めません。

## 2. D1とR2を作る

CloudflareのR2利用が有効になっていることを確認します。以下の名前は例なので、自分の店舗用の名前に置き換えてください。

```sh
pnpm exec wrangler d1 create my-commerce
pnpm exec wrangler r2 bucket create my-commerce-files
pnpm run setup:standalone
```

ウィザードでWorker名・管理者メールアドレス・公開URL・D1のdatabase_id・R2バケット名を入力します。公開URLはCloudflareで確認できるworkers.devサブドメインか、設定する独自ドメインです。推測で別人のURLを指定しないでください。

`wrangler.standalone.json` が作られます。WORKSPACE_ID=storeは店舗のデータ所有者IDです。運用開始後は変えないでください。

## 3. シークレットを設定

初期設定トークン・認証シークレット・配信停止シークレットは、それぞれ別の32バイト以上の乱数にしてください。パスワード管理アプリで生成・保管できます。次のコマンドは入力内容をソースに保存しません。

```sh
pnpm exec wrangler secret put SETUP_TOKEN --config wrangler.standalone.json
pnpm exec wrangler secret put AUTH_SECRET --config wrangler.standalone.json
pnpm exec wrangler secret put MAIL_TOKEN_SECRET --config wrangler.standalone.json
pnpm exec wrangler secret put MAIL_FROM --config wrangler.standalone.json
```

初回にWorkerが未作成と表示されたら、先に次節のDB移行・ビルド・デプロイを実行し、再度シークレットを設定します。公開直後も管理者設定にはトークンが必要で、販売・配信は無効です。

MAIL_FROMには送信元として認証した `store@example.com` または `店舗名 <store@example.com>` を設定します。使用するメールサービスのキーを `MAIL.md` に沿って追加します。

## 4. DB移行・公開

```sh
node scripts/release/preflight.mjs
pnpm run db:migrate:standalone
pnpm run build:standalone
pnpm run deploy:standalone
```

D1の既存データは消しません。追加マイグレーションを適用します。公開URLを確認し、設定ファイルのPUBLIC_ORIGINが異なる場合は修正後に再ビルド・デプロイします。

## 5. 管理者の初期設定

公開URLの `/setup` を開きます。ADMIN_EMAIL、SETUP_TOKEN、14文字以上のパスワードを入力します。成功したら管理画面に移ります。初期設定は1回のみです。

```sh
pnpm exec wrangler secret delete SETUP_TOKEN --config wrangler.standalone.json
```

以降は `/login` の「管理者はこちら」でログインします。パスワード紛失時は同じ画面のメール認証を使えます（メール接続が必要）。メールも使えない場合の復旧はOPERATIONS.mdを参照。

## 6. 店舗内容を登録

1. 商品名・価格・説明・納品ファイルを登録。商品状態を有効にします。
2. 必要なら講座を作り、商品と関連付け、レッスン本文と動画URLを入力。
3. 販売ページに商品を関連付け、見出し・説明・受付期限を入力。
4. 設定 → 運営情報で送信者名・フッター・銀行振込案内・販売条件・プライバシーポリシーを保存。
5. 設定 → メール配信サービスで使用する会社を選択。
6. 設定 → 導入チェック → 自分宛にテストメールを送り、受信箱で確認。

販売条件は自分の事業に合わせた確定内容を入力してください。サンプルの文面を本番の契約条件として使わないでください。

## 7. メール・購入者ログインを有効にする

設定ファイルの `MAIL_ENABLED` を `true` にし、ビルド・デプロイします。購入者はメールアドレスと6桁コードでログインします。コードは10分・最大5回、セッションは7日です。購入時と同じメールアドレスが必要です。

## 8. 決済と販売開始

銀行振込のみでも運用できます。カードはStripeのテストキーを先に設定します。

```sh
pnpm exec wrangler secret put STRIPE_SECRET_KEY --config wrangler.standalone.json
pnpm exec wrangler secret put STRIPE_WEBHOOK_SECRET --config wrangler.standalone.json
```

StripeのWebhook送信先は `https://自分の公開URL/api/stripe`。イベントは `checkout.session.completed`・`checkout.session.async_payment_succeeded`・`payment_intent.succeeded`（アップセル）・`invoice.paid`・`invoice.payment_failed`・`customer.subscription.deleted`（継続課金・分割）。詳細は docs/PAYMENTS.md。テスト環境と本番環境のWebhook署名キーを混同しないでください。

`COMMERCE_ENABLED=true` にしてテスト用商品でRELEASE-CHECKLIST.mdを実施します。この設定は銀行振込の受付にも必要です。テスト終了後に実商品・本番キーに切り替えます。

## 9. 自動配信とバックアップ

独立版には5分ごとのCronを定義しています。Cloudflare側でトリガーが登録されていることと、管理画面の最終自動処理時刻を確認してください。1回最大10件を処理する小規模運用です。配信時刻にキューが多い場合は遅延します。

ステップ配信は「有効」にしたものだけ自動登録されます。対象タグと広告配信同意のある顧客が対象です。「一時停止」は既存の未送信ステップも停止します。

日次バックアップは `AUTO_BACKUP_ENABLED=true` にして再デプロイすると有効です。納品ファイルを含めて複製するため、保存容量は増加します。保持期限の自動削除はありません。

ページ・フォームの設定は docs/FUNNELS.md、LINE連携は docs/LINE.md を参照してください。
