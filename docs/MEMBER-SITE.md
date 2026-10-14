# 会員サイト連携（OpenID Connect）

Akinai hubを「購入者のログイン窓口」にして、別の会員サイト（greed-learning など）へログインと購入状況を渡します。会員サイトはパスワードを持たず、購入者はAkinai hubのメール認証コードだけで入れます。

## できること

| 機能 | エンドポイント | 備考 |
| --- | --- | --- |
| ディスカバリー | `/.well-known/openid-configuration` | Issuer は `PUBLIC_ORIGIN` |
| ログイン | `/api/oidc/authorize` | 認可コード＋PKCE（S256必須）。未ログインならメール認証画面へ |
| トークン | `/api/oidc/token` | `client_secret_basic` / `client_secret_post`。コードは1回限り・2分有効 |
| 署名鍵 | `/api/oidc/jwks` | RS256。初回利用時に生成し `system_state` に保存 |
| ユーザー情報 | `/api/oidc/userinfo` | `sub`・`email`・`name`、scope `entitlements` で購入一覧 |
| 購入一覧の照会 | `/api/oidc/entitlements?email=` | クライアント認証（Basic）。会員サイトの照合用 |
| 商品一覧 | `/api/oidc/products` | クライアント認証。講座と商品を紐づける画面用（ID・名称のみ） |
| 購入・停止通知 | 連携アプリのWebhook URLへPOST | `entitlement.granted` / `entitlement.revoked` |

- 連携アプリは管理者だけが登録します（同意画面・動的登録なし）。
- `sub` はメールアドレスから導出した不変の値です（店舗ごとに異なる）。
- 購入一覧は「入金済み」の注文だけです。「会員サイトに渡す商品」を選ぶと、その商品だけを渡します。

## Webhook

```
POST <Webhook URL>
Akinai-Event-Id: hook:<app>:<order>:<status>
Akinai-Signature: t=<UNIX秒>,v1=<HMAC-SHA256(クライアントシークレット, t + "." + 本文) の16進>

{"id":"hook:…","type":"entitlement.granted","created":"2026-…Z",
 "data":{"email":"…","name":"…","orderId":"…","productId":"…","productName":"…","status":"active"}}
```

- 本文は**送信時点の注文状態**から作ります。再送が遅れて届いても、最新の状態を表します。受信側は `orderId` で上書き保存してください（`created` が古いものは無視）。
- 2xx 以外は 2・4・8・16・32 分後に再試行し、6回失敗で停止して「Webhook送信履歴」に表示します。メールと違い機械間の冪等な通知なので自動再試行します。
- 受信側は時刻のずれ5分以内のみ受け付けてください（リプレイ対策）。
- 連携アプリを新しく作ると、既存の入金済み注文も順次通知されます。
- バックアップから復元した場合、未送信の通知は停止されます。会員サイトは次回ログイン時の購入一覧で補正されます。

## 設定（Akinai hub側）

1. `PUBLIC_ORIGIN`（https）と `AUTH_SECRET`（32文字以上）を設定済みであること。
2. 管理画面 → **連携・ライセンス** → **連携アプリを追加**。リダイレクトURIとWebhook URLは会員サイトの案内に従います（greed-learning は `docs/AKINAI-HUB.md`）。
3. 表示された Issuer・クライアントID・クライアントシークレットを会員サイトに設定。シークレットは再表示しません（再発行は可能。再発行すると旧シークレットは即無効）。
4. 「Webhookテスト」で疎通を確認。

## 注意

- `AUTH_SECRET` を変更すると、クライアントシークレット・Webhook署名・ライセンスキーがすべて変わります。
- 停止した連携アプリは、ログイン・トークン発行・通知がすべて止まります。
- 実ドメインでの接続確認は未実施です（統合テストは模擬環境）。
