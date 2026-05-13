# くるひもタイムズ — 編集長のための取扱説明書

## 📁 ファイル構成

```
kuruhimotimes/
├─ index.html                    ← サイトの骨組み
├─ data.json                     ← 公開サイトが読み込む生成済みデータ
├─ content/
│  ├─ settings/site.json         ← サイト設定・外部連携設定
│  ├─ ideas/                     ← あしたのアイデア
│  ├─ quotes/                    ← きょうの言葉
│  └─ lunches/                   ← きょうのランチ
├─ images/uploads/               ← 記事・ランチ用の画像
├─ scripts/build-data-json.mjs   ← content から data.json を生成
├─ scripts/validate-data.mjs     ← data.json の簡易チェック
└─ README.md                     ← この説明書
```

毎日触るのは、基本的に **`content/` 配下のJSONファイル**です。`data.json` はサイト表示用の生成物なので、通常は直接編集しません。

---

## 🆕 新仕様(2026年5月)

### ページ構成

#### ホームページ

1. **あしたのアイデア** — 最新3件のみ表示。タイトルと抜粋を見せる
2. **きょうの言葉** — 引用と編集長コメント
3. **きょうのランチ** — 最新ランチ記事
4. **テッキーズ・ブックレビュー** — note のRSSから最新記事を自動取得(画像付き)
5. **きょう発売のビジネス書** — Xの投稿を埋め込み表示
6. **よく読まれた Five** — ランキング

#### アーカイブページ(`#archive`)

過去のアイデアをすべて時系列で一覧表示。日付・カテゴリ・タイトル・抜粋・ビュー数。

#### 個別記事ページ

| URL | 表示内容 |
|---|---|
| `/#idea-XX` | あしたのアイデアの記事 |
| `/#lunch-XX` | きょうのランチの記事 |

---

## ✏️ あしたのアイデアの追加方法

### 仕組み

`content/ideas/` に、1記事につき1つのJSONファイルを追加します。
ファイル名は `idea-5.json` のように、記事IDと合わせると管理しやすくなります。

GitHubに保存すると、GitHub Actions が `scripts/build-data-json.mjs` を実行し、`data.json` を自動生成します。

### 例: 新しいアイデアを追加する

`content/ideas/idea-5.json` を作成します。

```json
{
  "id": "idea-5",
  "image": "/images/uploads/example.png",
  "category": "文化",
  "title": "アマチュア共和国",
  "summary": "下手で、いびつで、好きでやっている人たちの経済圏。",
  "tag": "Culture",
  "publishDate": "2026-05-13",
  "readTime": "6分",
  "body": "本文を書く。段落を分けたい場合は改行を入れる。\n次の段落を書く。"
}
```

これだけで:
- `publishDate` の新しい順に並び替え
- ホームには最新3件だけ表示
- 4件目以降はアーカイブページへ移動
- `data.json` は自動で再生成

### 各フィールドの説明

| フィールド | 説明 | 例 |
|---|---|---|
| `id` | 一意のID。変更不可 | `"idea-5"` |
| `image` | 一覧・記事上部の画像 | `"/images/uploads/example.png"` |
| `category` | カテゴリ | `"テック"`, `"文化"`, `"経済"` |
| `title` | タイトル | `"アマチュア共和国"` |
| `summary` | 1〜2行の抜粋 | `"下手で、いびつで..."` |
| `tag` | 英語タグ | `"Technology"`, `"Culture"` |
| `publishDate` | 公開日 | `"2026-05-13"` |
| `readTime` | 読了目安 | `"5分"`, `"7分"` |
| `body` | 本文 | 改行区切りのテキスト |

### bodyの書き方

本文は、基本的に **プレーンテキスト + 改行**で書きます。
HTMLタグを直接書く運用は、表示崩れやセキュリティ上のミスにつながるため、必要な場合だけにしてください。

---

## 💬 きょうの言葉の追加方法

`content/quotes/quote-05.json` のようなファイルを作ります。

```json
{
  "id": "quote-05",
  "quote": "引用文を書く。",
  "author": "著者名",
  "source": "出典名",
  "publishDate": "2026-05-13",
  "editorNote": "編集長コメントを書く。"
}
```

---

## 🍽 きょうのランチの追加方法

`content/lunches/lunch-04.json` のようなファイルを作ります。

```json
{
  "id": "lunch-04",
  "title": "ランチ記事のタイトル",
  "place": "店名・場所",
  "publishDate": "2026-05-13",
  "summary": "一覧に出す短い紹介文。",
  "coverImage": "/images/uploads/lunch-cover.jpg",
  "photos": [
    {
      "image": "/images/uploads/lunch-photo.jpg",
      "caption": "写真キャプション"
    }
  ],
  "body": "本文を書く。\n写真を差し込みたい位置には [[photo:01]] のように書く。"
}
```

`photos` の1枚目は `[[photo:01]]`、2枚目は `[[photo:02]]` のように本文内で参照できます。

---

## 🖼 画像の置き場所

画像は `images/uploads/` に置き、JSONでは次のように参照します。

```json
"image": "/images/uploads/example.png"
```

画像パスは `/images/uploads/...` のように `/` から始めると、どのページからでも安定して表示できます。

---

## 📚 ブックレビュー(note連携)

設定は `content/settings/site.json` で管理します。

```json
"noteConfig": {
  "username": "techno_optimist",
  "displayCount": 3
}
```

noteで新記事を投稿すれば、サイトに自動で反映されます。記事のアイキャッチ画像も自動で取得されます。

---

## 🐦 きょう発売のビジネス書(X)

設定は `content/settings/site.json` で管理します。

```json
"xPostsConfig": {
  "accountUrl": "https://x.com/newbookforbiz",
  "postUrls": [
    "https://x.com/newbookforbiz/status/1234...",
    "https://x.com/newbookforbiz/status/5678...",
    "https://x.com/newbookforbiz/status/9012..."
  ]
}
```

毎日の運用:
1. Xで「今日発売の本」3冊を投稿
2. 各投稿のシェア →「リンクをコピー」
3. `postUrls` を最新URLで上書き
4. GitHub にcommit & push → 1〜2分でサイト反映

---

## 🔄 ランキング(よく読まれた Five)

記事ページ(`#idea-XX`)が開かれるたびにビューカウントが+1され、ホームの末尾に TOP 5 が自動表示されます。

---

## 📧 ニュースレター配信(beehiiv手動配信・週10分)

毎週水曜の朝、編集長が10分以内で配信できる仕組み。完全自動配信はbeehiivのMaxプランが必要なため、無料プランでは手動運用になります。

### 仕組み

サイトに **編集長専用画面**(`/#editor-tools`)があります。
ここで「最新3本のアイデア」を、ニュースレター用テキストに自動整形します。

サイトを公開した後、以下のURLをスマホ・PCのブックマークに入れておいてください:

```
https://kuruhitimes.pages.dev/#editor-tools
```

### 毎週水曜の朝のフロー(10分)

1. ブックマークから `#editor-tools` を開く
2. 「件名をコピー」ボタンで件名をコピー
3. 「本文をコピー」ボタンで本文をコピー
4. [app.beehiiv.com](https://app.beehiiv.com) で新規ポストを作成
5. 件名と本文を貼り付ける
6. プレビュー確認後に配信

### コツ

- **テンプレートを保存**: 一度配信したポストをbeehiivでテンプレート保存しておく
- **配信前にプレビュー**: PC表示・スマホ表示を確認する
- **テスト配信**: 自分宛にテスト送信してから本配信すると安心

---

## 🚀 ローカル確認

```bash
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開きます。

### data.json を手元で再生成する

```bash
node scripts/build-data-json.mjs
```

### data.json を検証する

```bash
node scripts/validate-data.mjs
```

検証では、ID重複、必須フィールド、日付形式、画像パス、公開日の並び順をチェックします。

---

## 💡 編集のコツ

### 新しいアイデアを書く流れ

1. `content/ideas/` に新しいJSONファイルを作る
2. `id` は既存記事と被らない連番にする
3. `publishDate` は `YYYY-MM-DD` 形式で書く
4. 画像を使う場合は `images/uploads/` に置く
5. GitHubで保存 → 自動で `data.json` が更新される

### IDの命名規則

- 形式: `idea-N`, `quote-N`, `lunch-N`
- 一度つけたIDは変えない
- どの番号を次に使うか分からなくなったら、現在のIDの最大値+1を選ぶ

---

## 🛠 困ったときに

| 症状 | 対処 |
|---|---|
| ホームに古いアイデアが残っている | `publishDate` と `data.json` の再生成結果を確認 |
| 新記事がホームに出ない | `content/ideas/` に追加されているか、GitHub Actions が成功しているか確認 |
| 記事ページが開かない | `id` が他と被っていないか確認 |
| 画像が出ない | 画像パスが `/images/uploads/...` になっているか確認 |
| noteの記事が出ない | `noteConfig.username` を確認 |
| Xの投稿が出ない | URL が正しいか、投稿が削除されていないか確認 |

楽しい編集ライフを 🌅
