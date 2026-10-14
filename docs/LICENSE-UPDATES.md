# ライセンスと更新配布（買い切り販売）

Akinai hub自体（または任意のセルフホスト製品）を買い切りで販売し、購入者が更新を受け取れるようにする仕組みです。サポート期間は設けず、「更新を受け取れる期間」だけを商品ごとに決められます。

## 販売者側

### 準備（1回だけ）

1. 署名鍵を作る：`pnpm run release:keygen`
   - `release-signing-key.txt`（秘密鍵）… Git・ZIP・サーバーに置かず、オフラインで保管
   - `release-public-key.txt`（公開鍵）… リポジトリに含める（配布ZIPにも同梱され、購入者が署名を検証）
2. 販売用Akinai hubに `RELEASE_PUBLIC_KEY`（公開鍵の文字列）を設定。公開時に署名を検証します。
3. 商品を作り「ライセンス商品」にチェック。設置先の上限（既定1）と、更新を受け取れる期間（月、0で無期限）を決めます。

### 販売・発行

- 自店舗で入金済みになった注文には、自動でライセンスを発行します（購入者の本棚にキーを表示）。
- Tips など外部で売った場合は **連携・ライセンス → ライセンスを手動発行**。購入者はそのメールアドレスでAkinai hubにログインすると、本棚でキーを確認できます。
- 注文を「利用停止」にすると、そのライセンスも停止されます。個別の停止・再開・設置先リセットも同じ画面から行えます。

### リリースの配布

```bash
pnpm run release:package              # release/akinai-hub-<version>.zip
pnpm run release:sign release/akinai-hub-<version>.zip
# → {"version":…,"sha256":…,"size":…,"signature":…} を表示
```

管理画面 → **連携・ライセンス → リリースを登録** で、表示されたJSONを貼り付け、ZIPをアップロードし「公開」で保存します。公開時に、アップロードしたファイルのサイズ・SHA-256・署名を検証します。

## 購入者側

1. 本棚のライセンスキーを `LICENSE_KEY`、販売者のURLを `LICENSE_SERVER` としてサーバーに設定。
2. 1日1回、Cronが更新を確認し、管理画面の **連携・ライセンス → このAkinai hubの更新** に表示します（自動では書き換えません）。
3. 更新の適用（手元の作業フォルダで実行）:

```bash
# .env.update または環境変数に LICENSE_KEY / LICENSE_SERVER を用意
pnpm run update              # 確認のみ：署名を検証し、変更されるファイルを一覧表示
pnpm run update -- --apply   # ファイルを置き換え（置き換え前のファイルは .akinai-update-backup/ に保存）
pnpm run update -- --deploy  # 置き換え → install → D1移行 → ビルド → デプロイ まで実行
```

- ダウンロードしたZIPのサイズ・SHA-256・販売者署名（Ed25519）がすべて一致しない場合は適用しません。
- `wrangler.standalone.json`・`.dev.vars`・`.env*` は上書きしません。ご自身で編集したファイルは警告を出したうえでバックアップします。
- 設置先は `PUBLIC_ORIGIN` 単位で記録されます。上限を超える場合は販売者に設置先リセットを依頼してください。
- 更新期間を過ぎた後に公開されたバージョンは受け取れません（期間内に公開された最新版までは取得できます）。

## 自動更新の例（GitHub Actions）

購入者が自分のリポジトリで運用する場合、週1回 `pnpm run update -- --deploy` を実行するワークフローで自動化できます（`LICENSE_KEY`・`LICENSE_SERVER`・`CLOUDFLARE_API_TOKEN`・`CLOUDFLARE_ACCOUNT_ID` をSecretsに登録）。本番へ無確認で反映されるため、まずは確認のみ（`pnpm run update`）で運用し、慣れてから有効にしてください。

```yaml
on: { schedule: [{ cron: '17 18 * * 1' }], workflow_dispatch: {} }
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run update -- --deploy
        env:
          LICENSE_KEY: ${{ secrets.LICENSE_KEY }}
          LICENSE_SERVER: ${{ secrets.LICENSE_SERVER }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      - run: git add -A && git -c user.name=akinai-update -c user.email=update@invalid commit -m "Akinai hub update" && git push || true
```

## 未確定事項（ユーザーと決める）

- 価格・返金条件・ライセンス条項（設置先数、譲渡可否）・更新期間の既定値。
- サポートは「ほぼなし」の方針。販売ページと規約に明記すること。
