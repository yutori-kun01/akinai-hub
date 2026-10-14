# メールサービス設定

共通: MAIL_FROM（認証済み送信元）、MAIL_TOKEN_SECRET（32バイト以上の乱数）、フッター。管理画面で1社を選択します。シークレットは `pnpm exec wrangler secret put 変数名 --config wrangler.standalone.json` で設定。

| サービス | 必要な変数 | 注意点 |
|---|---|---|
| Resend | RESEND_API_KEY | 認証済みドメインを使用 |
| Brevo | BREVO_API_KEY | transactional APIを利用。配信内容・契約に対応するアカウントが必要 |
| SendGrid | SENDGRID_API_KEY | Mail Send権限と送信元認証 |
| Mailgun | MAILGUN_API_KEY, MAILGUN_DOMAIN | MAILGUN_REGIONはusまたはeu。契約リージョンに合わせる |
| Postmark | POSTMARK_SERVER_TOKEN, POSTMARK_BROADCAST_STREAM_ID | 広告配信はBroadcastストリーム、取引通知はPOSTMARK_TRANSACTIONAL_STREAM_ID（既定outbound） |

認証メールは取引通知の経路を使います。Postmarkもアプリの設定完了判定ではBroadcastストリームIDが必要です。画面の設定済みはキーの存在確認で、認証済み・配達済みを保証しません。

## 配信通知（Webhook）

送信先は `https://自分の公開URL/api/mail/webhooks/サービスID`。サービスIDは resend / brevo / sendgrid / mailgun / postmark。

- Resend: RESEND_WEBHOOK_SECRETを設定。Svix署名を検証。email.delivered / email.bounced / email.complained。
- Brevo: BREVO_WEBHOOK_TOKENに十分長い乱数を設定。Webhook側をBearer認証にして同じ値を指定。delivered / hardBounce / invalid / spam / unsubscribed。
- SendGrid: Signed Event Webhookを有効にし、表示されるVerification KeyをSENDGRID_WEBHOOK_PUBLIC_KEYに設定。delivered / bounce / spamreport / unsubscribe / group_unsubscribe。
- Mailgun: APIキーと別のHTTP Webhook Signing KeyをMAILGUN_WEBHOOK_SIGNING_KEYに設定。delivered / permanent failure / complained / unsubscribed。
- Postmark: POSTMARK_WEBHOOK_PASSWORDに十分長い乱数を設定。Basic認証のusernameはcommerce、passwordはその値。Delivery / Bounce / SpamComplaint / SubscriptionChangeを設定。

到達通知は配信履歴の補足に表示。バウンス・苦情は送信抑止リストへ追加し、同じ店舗の送信前に照合します。広告配信停止は広告だけを止め、取引通知・認証コードは継続します。バウンス・苦情のある宛先への認証メールは停止します。

Provider通知とジョブの受付番号を照合して履歴に反映します。送信APIの応答前に通知が届いた場合など、履歴への照合ができないケースがありますが、独立版では宛先の抑止自体は保存します。到達保証・開封分析・クリック分析は含みません。

署名キーを登録するだけでは通知は届きません。各サービス側でWebhookを作成し、テスト通知を確認してください。

## 失敗時

失敗・タイムアウト・処理中断は自動再送しません。サービス側の配信履歴で受付の有無を確認し、必要な宛先だけ新しい配信として作成します。設定の変更で他社へ勝手に再送することはありません。

公式資料:
- https://resend.com/docs/dashboard/webhooks/introduction
- https://developers.brevo.com/docs/secured-webhooks
- https://www.twilio.com/docs/sendgrid/for-developers/tracking-events/getting-started-event-webhook-security-features
- https://documentation.mailgun.com/docs/mailgun/user-manual/webhooks/securing-webhooks
- https://postmarkapp.com/developer/webhooks/webhooks-overview
