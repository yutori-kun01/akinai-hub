# UTAGE機能調査とAkinai hub対応表

調査日: 2026-10-14（UTAGE公式ヘルプ help.utage-system.com の公開記事を検索経由で確認。管理画面には未ログインのため、画面上の細部・最新UIは未確認）
目的: 「UTAGEの代わりとして必要な機能」を漏れなく洗い出し、実装の優先順位を決める。**ここに書いたUTAGE仕様は公開ヘルプからの要約であり、原本データ（実メール・実商品）ではない。**

凡例: ✅ 実装済み / 🟡 一部 / ❌ 未実装 / ➡ 会員サイト（greed-learning）側で担当

## 1. 全体構成（UTAGE）

UTAGEは5つの主要機能＋管理機能で構成される（ヘルプ「UTAGE機能の全体構成」）。

| UTAGE機能 | 内容 | Akinai hub |
|---|---|---|
| ファネル | ファネルグループ＞ファネル＞ステップ（ページ）＞セクション＞行＞要素 | 🟡 ページ単位・一本道（販売/オプトイン/完了） |
| メール・LINE配信 | 配信アカウント＞シナリオ（読者・ラベル・ステップ・リマインダ・アクション） | 🟡 タグ＋ステップ/予約配信 |
| 会員サイト | サイト＞コース（バンドル）＞レッスン、進捗、コメント、段階公開 | ➡ greed-learningと連携（OIDC/権限API） |
| イベント・予約 | セミナー・個別相談の受付、Googleカレンダー、Zoom/Meet発行、リマインド | ❌ |
| パートナー | アフィリエイト案件・報酬・パートナーグループ・月次承認・CSV | ❌ |
| 管理 | 商品管理、メディア管理、独自ドメイン、決済連携、テーマカラー | 🟡 |

## 2. ページビルダー（最優先で詳細化）

### 2.1 構造

- **セクション（黄枠）＞行（緑枠）＞要素（青枠）**の3階層。要素は必ず行の中に置く。
- セクション: 背景色・背景画像（表示スタイル選択）、上下余白、内側左右余白（PC/SP別）、**上部/下部固定（追従表示）**。
- 行: 背景色・グラデーション・透明度・最大幅（200〜1200px）、**列分割（最大3列〜）**、列ごとの枠線。
- セクション・行・要素すべてに**表示端末（両方/PCのみ/SPのみ）**。エディタ設定でPC/SP専用要素の表示切替。
- 追加は各所の【＋】→ポップアップから要素選択。サイド「要素一覧」で要素名ホバー→該当箇所へスクロール。
- ページ設定: ページ幅、タイトル・説明・OGP画像・検索エンジン設定、**カスタムJS（head末尾/body先頭/body末尾）・カスタムCSS**、**パスワード保護**（約2時間で再入力）、**表示期限**（基準: 指定日/ステップ登録日/シナリオ配信基準日時/登録基準日/ウェビナー視聴日）。
- ファネル共通設定: 公開/非公開/**期間限定公開**（終了日時と終了後の遷移先URL）、共通JS。
- テーマカラー指定（2026/9）、ページ速度改善・メディアライブラリ対応（2026/8）。

### 2.2 ページ要素（ヘルプ「ページ要素/編集」一覧）

| 要素 | UTAGEの主な設定 | Akinai hub |
|---|---|---|
| テキスト | 書式、Shift+Enterで行間を詰めた改行、リンク | 🟡 本文（書式なし） |
| ヘッドライン | 大きめ初期サイズ | ✅ heading |
| サブヘッド | 中サイズ | ❌ → 追加 |
| ボレット | チェック付き箇条書き | ❌ → 追加 |
| 画像 | リンク先（同タブ/別タブ）、幅、loading（eager/lazy）、width/height | 🟡 URL/代替テキスト |
| 画像＋テキスト | 画像形（四角/角丸/円）、左右位置、幅（比率/px）、文字サイズPC/SP、行間0.7〜2.0、SPで改行しない | ❌ → 追加 |
| 動画 | UTAGE/YouTube/Vimeo、（UTAGE形式のみ）チャプター表示 | ✅ YouTube/Vimeo |
| 動画メニュー | 3〜5話の段階公開 | ❌ |
| 動画チャプター | 連携動画のタイムスタンプ＋タイトル | ❌ |
| 音声 | 音声ファイル埋め込み | ❌ → 追加（URL） |
| ボタン | 動作:URL/ファネル次ステップ/要素へスクロール/要素表示・非表示/**ポップアップ表示**/tel:、テーマ（テキスト/画像）、アイコン、**アニメーション（ズーム/ジャンプ等）**、幅・高さ・色・グラデーション・枠線・角丸、SP文字サイズ、**クリックCV計測（2026/9）** | 🟡 リンク/ページ内アンカー |
| 次へ進むリンク | 次ステップへのテキストリンク | 🟡 |
| 購入ボタン | アップセルページでのワンクリック決済（通常商品1つ、一番上の商品詳細） | ❌ → C で実装 |
| 登録フォーム | 連携シナリオ、リダイレクト先URL（%mail%等の置換をクエリに付与可） | ✅ メール/LINE |
| カスタムフォーム | 入力欄（シナリオ読者項目に紐付け）＋送信ボタン（動作=登録フォーム送信）、決済用の同意項目も自作 | ❌ → 任意項目フォーム |
| 決済フォーム | 商品管理の商品と連携、住所・電話の有無、**同意項目（規約ウィンドウ＋チェック）**、**クーポンコード有無**、URL末尾クーポン、オーダーバンプ | 🟡 銀行/カード・規約同意 |
| カウントダウン | 基準: 指定日時/登録基準日時（ファネル初回登録）/指定ページでの登録・決済時/相対時間（配信基準の60分後等）/初回アクセス（cookie）/ページ表示時。終了後: 何もしない/リダイレクト/要素の表示・非表示。基準不明時の動作も設定 | 🟡 固定期限のみ |
| プログレスバー | 10〜100%（5%刻み）、単色/ストライプ | ❌ → 追加 |
| PDF | ビューワ/ビューワ＋DLリンク/DLリンク | ❌ → 追加（リンク型） |
| 吹き出し | 画像左右、幅、テーマ、名前表記 | ❌ → 追加 |
| アコーディオン | 質問＋開閉回答（FAQ） | ❌ → 追加 |
| 表 | 行列数可変 | ❌ → 追加 |
| 区切り線 | | ✅ |
| 余白 | 高さ | ❌ → 追加 |
| フッター | プライバシー/特商法/会社概要リンク（URL未設定は非表示）、Copyright表記（2026/9） | 🟡 店舗設定の規約表示 |
| コメント | ページへのコメント | ❌ |
| カスタムHTML | 任意HTML（JS/CSSはページ設定推奨） | ❌（安全性のため保留。sandbox iframe案） |
| 自動ウェビナー | 疑似ライブ配信、再生時間に連動して他要素（購入ボタン等）を表示 | ❌ |
| イベント申込フォーム | イベント・予約機能と連携 | ❌ |
| LINE友だち追加ボタン/QR | 登録経路計測の対象 | 🟡 LINEフォーム |

### 2.3 計測・最適化

- **データ（合算/日別）**: ページごとのアクセス数・登録数・登録率・売上件数・購入率・売上金額。→ ❌ D で実装
- **A/Bテスト**: 既存ページ複製または新規、3ページ以上可、同一人物には常に同じページ、テスト中編集は非推奨、敗者はアーカイブ。→ ❌ D で実装
- **登録経路**: 1LPに流入元別URLを発行しアクセス/登録/売上を個別集計。→ ❌ D で実装
- **UTMパラメータ**で広告別の成約集計、ボタンのクリック計測。→ ❌ D で実装
- イグジットポップアップ（PCのみ。SPの戻るボタン型は2026/6で停止）。→ ❌

### 2.4 共有・テンプレート

- ファネル共有（他ユーザーへテンプレート配布）。→ 🟡 内蔵テンプレートのみ。JSONエクスポート/インポートで代替予定。

## 3. 商品・決済

| UTAGE | 内容 | Akinai hub |
|---|---|---|
| 商品管理＞商品詳細（価格ラインナップ） | 1商品に複数価格。支払回数=一回/複数回・分割/継続課金 | 🟡 一回払いのみ → C |
| 決済代行 | Stripe、UnivaPay、FirstPayment、テレコムクレジット等 | 🟡 Stripe＋銀行振込 |
| オーダーバンプ | 決済フォームで同時購入する追加商品 | ❌ → C |
| ワンクリックアップセル | 購入直後のアップセルページで購入ボタン1つ | ❌ → C |
| 継続課金の失敗通知 | 2回目以降失敗時の通知先 | ❌ → C（Stripe webhook） |
| クーポン | コード入力/URL付与、対象商品指定 | ❌ → C |
| サンクスページ出し分け | オーダーバンプ購入有無で分岐（2026/9） | ❌ → D |
| 購入後アクション | 購入者を指定シナリオへ登録→そこでラベル付与 | ✅ 購入でタグ/停止条件 |

## 4. メール・LINE配信

| UTAGE | Akinai hub |
|---|---|
| 一斉・ステップ・リマインダ配信 | ✅ 一斉/予約/ステップ（リマインダ=固定時刻は❌） |
| HTMLメール（ページ編集と同じエディタ） | ❌ → B |
| 開封・クリック計測（計測画像/リンク経由。画像OFFだと開封は記録されない） | ❌ → B |
| 配信条件（ラベル/シナリオ/クリック・開封、AND/OR） | 🟡 タグ/除外タグ/購入 → B・Dで開封・クリック条件 |
| 置き換え文字（%name%等）・本文の条件分岐（テキストのみ） | ❌ → B（差し込み） |
| リンククリック時アクション（シナリオ登録/停止等） | ❌ → B |
| メールA/Bテスト | ❌ |
| 登録フォーム・読者項目（フリー項目、必須） | ❌ → 任意項目 |
| アクション（シナリオ遷移/ラベル/LINE送信/リッチメニュー変更/webhook/バンドルコース登録、複数同時） | 🟡 タグ → 外部Webhook（A）で会員サイト連携 |
| LINE: テキスト/ボタン/画像/カルーセル/音声/動画/スタンプ、テンプレート | 🟡 テキストのみ |
| LINE: リッチメニュー（URL/メッセージ/テンプレ送信/切替、デフォルト） | ❌ |
| LINE: 個別チャット、自動応答、通知 | ❌ |
| LINE: 登録経路（LINEログイン認証推奨/画像認証） | 🟡 10分コード連携 |

## 5. 会員サイト（greed-learningで担当）

UTAGE: コース基本設定（開放日・締切・登録からの日数）、レッスン段階公開、完了で次を開放、受講停止時の動作、進捗率・CSV、レッスンごとのコメント、バンドルコース、商品購入でコース開放。

greed-learning（既存）: 講座/レッスン、進捗、ブックマーク、前提講座・読了数・ポイントによる開放、プラン/enrollment単位のアクセス制御、TipTapエディタ、Better Auth。

→ **Akinai hubが購入者ID（OIDC）と購入権限を発行し、greed-learningがそれを受けてenrollmentを付与する**構成にする（docs/MEMBER-SITE.md）。

## 6. イベント・予約 / パートナー

いずれも未実装。優先度は A〜D の後。パートナー（アフィリエイト）はCookie30日・後勝ち、月次承認、振込はCSVで手動、という仕様が参考になる。

## 7. 実装順（ユーザー合意 2026-10-14）

1. **A 認証基盤**: OIDCプロバイダー、権限API、署名Webhook（会員サイト連携）＋買い切りライセンスと自動更新。
2. **B HTMLメール**: HTML本文、差し込み、開封・クリック計測、クリック条件。
3. **C 決済拡張**: Stripeサブスク/分割、オーダーバンプ、ワンクリックアップセル、クーポン。
4. **D ファネル**: ステップ分岐、A/Bテスト、登録経路/UTM、ページ別KPI。
5. ページ要素の拡充（上表の「→ 追加」）。

## 出典（UTAGE公式ヘルプ）

- [UTAGEマニュアル（ページ一覧）](https://help.utage-system.com/knowledge-allpages)
- [UTAGE機能の全体構成](https://help.utage-system.com/archives/25099) / [「ファネル」機能の全体構成](https://help.utage-system.com/archives/23486)
- [ファネルのページ編集方法](https://help.utage-system.com/archives/1562) / [構成要素（セクション／行／要素）](https://help.utage-system.com/archives/19013) / [ページ設定](https://help.utage-system.com/archives/4489) / [ファネル共通設定](https://help.utage-system.com/archives/4757)
- [ページ要素【ボタン】](https://help.utage-system.com/archives/3502) / [【画像】](https://help.utage-system.com/archives/3310) / [【画像＋テキスト】](https://help.utage-system.com/archives/3869) / [【動画】](https://help.utage-system.com/archives/3325) / [【動画メニュー】](https://help.utage-system.com/archives/3884) / [【動画チャプター】](https://help.utage-system.com/archives/19601) / [【カウントダウン】](https://help.utage-system.com/archives/3702) / [【プログレスバー】](https://help.utage-system.com/archives/4205) / [【吹き出し】](https://help.utage-system.com/archives/5419) / [【アコーディオン】](https://help.utage-system.com/archives/6586) / [【表】](https://help.utage-system.com/archives/3555) / [【ヘッドライン】](https://help.utage-system.com/archives/3412) / [【サブヘッド】](https://help.utage-system.com/archives/3423) / [【ボレット】](https://help.utage-system.com/archives/3437) / [【音声】](https://help.utage-system.com/archives/3533) / [【登録フォーム】](https://help.utage-system.com/archives/3359) / [【カスタムフォーム】](https://help.utage-system.com/archives/3729) / [【決済フォーム】](https://help.utage-system.com/archives/2705) / [【購入ボタン】](https://help.utage-system.com/archives/3787) / [【フッター】](https://help.utage-system.com/archives/3393) / [【カスタムHTML】](https://help.utage-system.com/archives/4220) / [【自動ウェビナー】](https://help.utage-system.com/archives/3209)
- [ポップアップ機能](https://help.utage-system.com/archives/3276) / [セクション固定](https://help.utage-system.com/archives/10415) / [表示期限](https://help.utage-system.com/archives/4036) / [パスワード保護](https://help.utage-system.com/archives/21934)
- [商品詳細(価格ラインナップ)](https://help.utage-system.com/archives/1615) / [クーポン機能](https://help.utage-system.com/archives/26138)
- [A/Bテスト](https://help.utage-system.com/archives/5546) / [登録経路](https://help.utage-system.com/archives/6033) / [UTM成約集計](https://help.utage-system.com/archives/5892) / [ページKPI](https://help.utage-system.com/archives/2426)
- [開封・クリック判定の仕組み](https://help.utage-system.com/archives/11127) / [配信条件](https://help.utage-system.com/archives/9656) / [メール一斉送信](https://help.utage-system.com/archives/1722) / [シナリオアクション](https://help.utage-system.com/archives/1688)
- [LINEリッチメニュー](https://help.utage-system.com/archives/4902) / [LINEテンプレート](https://help.utage-system.com/archives/5511)
- [会員サイトのコース設定](https://help.utage-system.com/archives/1889) / [コメント機能](https://help.utage-system.com/archives/6287) / [受講状況](https://help.utage-system.com/archives/10491)
- [パートナー機能の全体構成](https://help.utage-system.com/archives/24086)
- [アップデート 2026/9](https://help.utage-system.com/archives/28813) / [2026/8](https://help.utage-system.com/archives/28318)
