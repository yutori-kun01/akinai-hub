# LINE接続と配信 — 1.0.0-rc.2

対象は独立ホスティング版の1店舗・1公式アカウントです。Sitesの所有者限定プレビューではLINEからWebhookにアクセスできないため、実接続は独立版で行います。

## 設定

1. LINE公式アカウントでMessaging APIを有効にし、チャネルのChannel secretとChannel access tokenを取得。
2. Cloudflare Workersのシークレットに `LINE_CHANNEL_SECRET` と `LINE_CHANNEL_ACCESS_TOKEN` を登録。コード、配布ZIP、フォームに秘密情報を書かないでください。
3. 管理画面「LINE連携」に表示されるWebhook URL `https://自分のドメイン/api/line/webhook` をLINE DevelopersのMessaging APIに登録。「検証」を実施し、Webhook利用と再送を有効化。
4. 管理画面で友だち追加URL（https://lin.ee/... または https://line.me/...）と友だち追加時のタグを保存。
5. 最初は `LINE_ENABLED=false`。自分で友だち追加・ブロック・解除を行い、管理画面の状態を確認。
6. テスト用の対象タグを自分だけに付け、1件のテキスト配信を準備。送信する段階で `LINE_ENABLED=true` に変更し、Cronまたは設定画面の自動処理を実行。実端末で受信を確認。

## 登録ページ・メール顧客との連携

オプトインページの登録方法をLINEにすると、友だち追加ボタンと本人確認付き連携の導線を表示します。購入者はメール認証でログインし、配信・連携に同意して、10分間有効な `AKINAI-...` のコードを発行。そのコードを公式アカウントのトークに送ると、署名検証済みのLINEユーザーとメール顧客を結び付けます。コードは1回のみ利用可能です。

コードは第三者に渡さないでください。1つのメール顧客と1つのLINEユーザーを1対1で連携します。既に他の組み合わせと連携済みの場合は自動的に上書きしません。

登録ページのタグは連携成功時にLINE友だちへ付与します。LINEだけの友だちにはメール配信同意を付けません。既存の友だちでWebhookがまだ届いていない場合、一度ブロック・解除し、follow通知を受信してください。通常のトークだけでは配信同意扱いにしません。

## 配信

「メール・LINE」または「ステップ配信」で配信先をLINEに変更。件名は管理用、送信するのは本文のみ（最大5000文字）。対象タグ／除外タグ／購入条件を設定可能。1回のCronで最大10件をLINEへ送信します。メールは別枠で最大10件です。

- LINEの受付済みは端末への到達・開封を保証しません。
- Webhook署名を加工前の本文で検証。重複イベントと順序が入れ替わったブロック通知を処理します。
- APIに一意のretry keyを付与。結果不明・失敗時は自動再送をせず、履歴確認が必要です。
- ブロックした友だちへの未送信分は対象外にします。ブロック解除時に過去の配信済み／対象外ステップを再送しません。
- バックアップ復元は未送信ジョブを停止し、バックアップより新しいLINEブロック状態を保持します。
- LINEの送信枠・料金・審査等は各アカウント契約に従います。

未対応：LINE Login/LIFFによるワンタップ連携、リッチメニュー編集、画像・Flexメッセージ、チャット返信画面、複数公式アカウント、既存友だち全件の取得。実アカウントでの到達テストは未実施です。

## 参照した公式仕様

- https://developers.line.biz/en/docs/messaging-api/verify-webhook-signature/
- https://developers.line.biz/en/docs/messaging-api/retrying-api-request/
- https://developers.line.biz/en/docs/messaging-api/receiving-messages/
