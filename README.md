# くるひもタイムズ — 編集長のための取扱説明書

## 📁 ファイル構成

```
kuruhimo-times/
├─ index.html    ← サイトの骨組み
├─ data.json     ← 編集する内容
└─ README.md     ← この説明書
```

毎日触るのは **`data.json` だけ** です。

---

## 🆕 新仕様(2026年5月)

### ページ構成

1. **あしたのアイデア** — タイトル一覧。クリックで個別記事ページに遷移
2. **テッキーズ・ブックレビュー** — note のRSSから最新記事を自動取得
3. **きょう発売のビジネス書** — Xの投稿を埋め込み表示
4. **よく読まれた Five** — 末尾にランキング表示

### 個別記事ページの仕組み

URL末尾に `#idea-07` のようにハッシュが付くと、その記事の本文ページに遷移します。
通常の `index.html` 1ファイルで完結するので、ファイル管理が楽。

例: `https://kuruhimo-times.pages.dev/#idea-12` → 「修繕の美学」の記事ページ

---

## ✏️ data.jsonの編集ガイド

### 1. アイデア記事を追加・編集する

`ideas` 配列に項目を追加します。

```json
{
  "id": "idea-21",
  "num": "21",
  "category": "テック",
  "title": "AIエージェント常駐社会",
  "summary": "メールを返す、予約を取る、交渉する。",
  "tag": "Technology",
  "publishDate": "2026-05-02",
  "readTime": "7分",
  "body": "<p>本文1段落目。先頭の文字が大きく装飾されます。</p><p>2段落目。</p><h3>小見出し</h3><p>続きの文章。</p>"
}
```

#### bodyの書き方(HTML)

| 用途 | タグ | 例 |
|---|---|---|
| 段落 | `<p>...</p>` | `<p>これは段落です。</p>` |
| 小見出し | `<h3>...</h3>` | `<h3>なぜ今</h3>` |
| 強調 | `<strong>...</strong>` | `<strong>重要</strong>` |
| イタリック | `<em>...</em>` | `<em>future</em>` |
| リンク | `<a href="..." target="_blank">...</a>` | `<a href="https://example.com" target="_blank">参考記事</a>` |

最初の段落の最初の文字は、**自動で大きな朱色のドロップキャップ**になります。

### 2. note記事の連携

```json
"noteConfig": {
  "username": "your_note_username",
  "displayCount": 3
}
```

- `username`: あなたのnoteユーザー名
  - noteのプロフィールURLが `https://note.com/abcde` なら、`abcde` を入れる
- `displayCount`: 表示する記事数(3が推奨)

設定すれば、**noteに新しい記事を投稿するたびに自動で反映**されます。サイト側で何もする必要はありません。

#### 仕組み

- `https://note.com/{username}/rss` というRSSフィードを取得
- ブラウザのCORS制約のため、`api.rss2json.com` という無料サービスを経由
- 失敗した時はnoteのプロフィールページへの直リンクを表示

### 3. Xの投稿の埋め込み

```json
"xPostsConfig": {
  "postUrls": [
    "https://twitter.com/your_username/status/1234567890123456789",
    "https://twitter.com/your_username/status/9876543210987654321",
    "https://twitter.com/your_username/status/5555555555555555555"
  ]
}
```

- 表示したい投稿のURLを3つ並べる
- Xアプリで投稿を長押し →「リンクをコピー」で取得
- 上から順に左→中→右に表示される

#### 毎日の更新フロー

1. 朝、Xで「今日発売の本」について3投稿する
2. 各投稿のURLをコピー
3. `data.json` の `postUrls` 配列を3つのURLで上書き
4. GitHubにpush → 自動でサイト反映

### 4. 創刊日と天気

```json
"site": {
  "weather": "晴れ・知的好奇心",
  "startDate": "2026-03-21"
}
```

`startDate` から自動で「第〇〇号」が計算されます。

---

## 🔄 ランキング(よく読まれた Five)

### 仕組み

- 記事のページが開かれるたびに、CountAPI.dev に「+1」がリクエストされる
- 全記事のビュー数を取得して降順に並べ替え
- 0ビューの記事は表示されない

### カウントされるタイミング

- アイデア記事の個別ページ(`#idea-NN`)を開いた時
- 同じセッション内で同じ記事を何度開いても1回だけ

### namespaceを変えたい場合

`index.html` の `ViewCounter.namespace` を書き換える(集計がリセットされます)。

---

## 🚀 ローカル確認

```
python3 -m http.server 8000
```
→ ブラウザで `http://localhost:8000` を開く

VS Codeなら拡張「Live Server」が一番ラク。

---

## 🌐 Cloudflare Pagesで公開

### 初回(15分)
1. GitHub に「kuruhimo-times」リポジトリを作る
2. 3ファイルをアップロード
3. Cloudflare Pages で連携 → デプロイ

### 日々の更新
1. `data.json` を編集
2. GitHubにcommit & push
3. 1〜2分でサイト反映

---

## 💡 編集のコツ

### おすすめの運用リズム

- **毎日朝**: Xで本を紹介 → URLを `data.json` に貼る → push
- **週に2〜3回**: noteに新記事を書く(自動反映)
- **週に1〜2回**: 新しいアイデア記事を追加

### IDの命名規則

- アイデア: `idea-NN`(NNは2桁の連番)
- 一度つけたIDは変えない(変えるとビュー数が引き継がれない)

### 記事の準備メモ

新しいアイデア記事を書く時、bodyの中身が長くなる場合は、別のテキストエディタで書いてからコピペすると楽です。HTMLの改行は`<p>...</p>` で段落を区切ることだけ意識すればOK。

---

## 🛠 困ったときに

| 症状 | 対処 |
|---|---|
| noteの記事が出ない | `noteConfig.username` を確認。実在するnoteアカウントか? |
| Xの投稿が出ない | 投稿URLが正しいか?投稿が削除されていないか?投稿が非公開になっていないか? |
| ランキングが空 | まだ誰もアクセスしていない時は空で正常 |
| `data.json`が読めない | ローカル時は簡易サーバー必須。Cloudflareでは自動で解決 |

楽しい編集ライフを 🌅
