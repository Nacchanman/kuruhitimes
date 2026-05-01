# くるひもタイムズ — 編集長のための取扱説明書

## 📁 ファイル構成

```
kuruhimotimes/
├─ index.html    ← サイトの骨組み
├─ data.json     ← 編集する内容
└─ README.md     ← この説明書
```

毎日触るのは **`data.json` だけ** です。

---

## 🆕 新仕様(2026年5月)

### ページ構成

#### ホームページ

1. **あしたのアイデア** — **最新3件のみ**表示。タイトルと抜粋を見せる
2. **テッキーズ・ブックレビュー** — note のRSSから最新記事を自動取得(画像付き)
3. **きょう発売のビジネス書** — Xの投稿を埋め込み表示
4. **よく読まれた Five** — ランキング

#### アーカイブページ(`#archive`)

過去のアイデアをすべて時系列で一覧表示。日付・カテゴリ・タイトル・抜粋・ビュー数。

#### 個別記事ページ(`#idea-XX`)

アイデアの本文を表示。

---

## ✏️ あしたのアイデアの追加方法

### 仕組み

`data.json` の `ideas` 配列は、**先頭が最新**になるよう並べます。
記入するのは配列の **一番上に追加するだけ**。

ホームページに表示されるのは **先頭3件のみ**。
4件目以降は **自動的にアーカイブページに移動** します。

### 例:新しいアイデア「アマチュア共和国」を追加する

`data.json` を開いて、`ideas` 配列の **一番上(`[` の直後)** にブロックを追加するだけ。

```json
"ideas": [
  {
    "id": "idea-21",
    "category": "文化",
    "title": "アマチュア共和国",
    "summary": "下手で、いびつで、好きでやっている人たちの経済圏。",
    "tag": "Culture",
    "publishDate": "2026-05-02",
    "readTime": "6分",
    "body": "<p>本文を書く...</p><h3>小見出し</h3><p>続き...</p>"
  },
  {
    "id": "idea-20",
    ...(以下、既存のアイデア)
  },
```

これだけで:
- ホームには「アマチュア共和国」「ローカルファーストAI」「ローカル経済」の3件
- 「沈黙の価値」以下はアーカイブページに自動移動

### 各フィールドの説明

| フィールド | 説明 | 例 |
|---|---|---|
| `id` | 一意のID(変更不可) | `"idea-21"` |
| `category` | カテゴリ | `"テック"`, `"文化"`, `"経済"` |
| `title` | タイトル | `"アマチュア共和国"` |
| `summary` | 1〜2行の抜粋 | `"下手で、いびつで..."` |
| `tag` | 英語タグ | `"Technology"`, `"Culture"` |
| `publishDate` | 公開日 | `"2026-05-02"` |
| `readTime` | 読了目安 | `"5分"`, `"7分"` |
| `body` | 本文(HTML) | `"<p>...</p>"` |

### bodyの書き方(HTML)

| 用途 | タグ | 例 |
|---|---|---|
| 段落 | `<p>...</p>` | `<p>これは段落です。</p>` |
| 小見出し | `<h3>...</h3>` | `<h3>なぜ今</h3>` |
| 強調 | `<strong>...</strong>` | `<strong>重要</strong>` |
| イタリック | `<em>...</em>` | `<em>future</em>` |
| リンク | `<a href="..." target="_blank">...</a>` | リンク |

最初の段落の最初の文字は **自動で大きな朱色のドロップキャップ** になります。

---

## 📚 ブックレビュー(note連携)

```json
"noteConfig": {
  "username": "techno_optimist",
  "displayCount": 3
}
```

**完全自動**。noteで新記事を投稿すれば、サイトに自動で反映されます。
記事のアイキャッチ画像も自動で取得されます。

---

## 🐦 きょう発売のビジネス書(X)

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
3. `postUrls` の3つを最新URLで上書き
4. GitHub にcommit & push → 1〜2分でサイト反映

---

## 🔄 ランキング(よく読まれた Five)

記事ページ(`#idea-XX`)が開かれるたびにビューカウントが+1され、
ホームの末尾に **TOP 5** が自動表示されます。

---

## 🚀 ローカル確認

```
python3 -m http.server 8000
```
→ ブラウザで `http://localhost:8000`

VS Codeなら拡張「Live Server」がラク。

---

## 📧 ニュースレター配信(beehiiv連携・完全自動)

毎週水曜の朝7時に、最新3本のアイデアが自動でメール配信される仕組みです。

### 仕組み

```
あなた: data.jsonを編集 → GitHubにpush
   ↓
GitHub Actions: rss.xmlを自動生成
   ↓
Cloudflare Pages: サイトとRSSを公開
   ↓
beehiiv: 毎週水曜7時にRSSをチェックして配信 ✉️
```

普段の運用は変わりません。`data.json` を更新してpushするだけで、メールも自動配信されます。

### 初回セットアップ(30分・一度だけ)

#### 1. beehiivアカウントを作る

1. [beehiiv.com](https://www.beehiiv.com) にアクセス
2. Sign up → メールアドレスとパスワード
3. パブリケーション名を「くるひもタイムズ」に
4. URLを決める(例: `kuruhimotimes` → `kuruhimotimes.beehiiv.com`)

#### 2. RSS to Email を設定

1. 左サイドバー → **Settings**
2. **Integrations** タブ
3. **RSS to Email** を探して有効化
4. RSS URL に `https://kuruhitimes.pages.dev/rss.xml` を入れる(自分のサイトURLに合わせる)
5. 配信設定:
   - 配信頻度: **Weekly**(毎週)
   - 曜日: **Wednesday**(水曜)
   - 時刻: **7:00 AM**(タイムゾーンを Asia/Tokyo に)

#### 3. data.json に beehiiv URL を設定

```json
"beehiivConfig": {
  "publicationUrl": "https://kuruhimotimes.beehiiv.com"
}
```

これでサイトの購読フォームが、beehiivの登録ページに繋がります。

#### 4. GitHub Actions を有効化

リポジトリの **Settings → Actions → General**:
- **Workflow permissions**: 「Read and write permissions」に変更
- **Save**

これでGitHub Actionsが`rss.xml`を自動更新できるようになります。

#### 5. 確認

`data.json` を編集してpushすると:
- 数十秒後に GitHub Actions が動く
- リポジトリに `rss.xml` が自動コミットされる
- Cloudflareがサイトを再デプロイ
- `https://kuruhitimes.pages.dev/rss.xml` でRSSが見られる

### 日々の運用

何もしなくてOK。普段通り `data.json` に新しいアイデアを追加するだけ。
毎週水曜の朝7時に、最新3本が自動でメール配信されます。

### beehiivのデザインを編集する

1. beehiiv の **Design** メニューでメールテンプレートをカスタマイズ
2. ヘッダー画像、ロゴ、フォントなどを設定
3. RSS to Email の設定で、メール本文のテンプレートを選ぶ

beehiivはミニマルな雑誌風のテンプレートが用意されているので、くるひもタイムズの世界観にも合わせやすいです。

---

## 🌐 Cloudflare Pagesで公開

### 初回(15分)
1. GitHub にリポジトリを作る
2. 3ファイルをアップロード
3. Cloudflare Pages で連携 → デプロイ

### 日々の更新
1. `data.json` を編集
2. GitHubにcommit & push
3. 1〜2分でサイト反映

---

## 💡 編集のコツ

### 新しいアイデアを書く流れ

1. `data.json` を開く
2. `ideas` 配列の先頭に新しいオブジェクトを追加
3. `id` だけは絶対に他と被らないよう連番(idea-21, idea-22...)
4. GitHubで保存 → サイトに反映
5. 自動で4件目以降がアーカイブに移動

### IDの命名規則

- 形式: `idea-NN`(NNは2桁の連番、例: `idea-22`)
- **一度つけたIDは絶対に変えない**(変えるとビュー数が引き継がれない)
- どの番号を次に使うか分からなくなったら、現在のIDの最大値+1を選ぶ

### URLの仕組み

| URL | 表示内容 |
|---|---|
| `/` または `/#` | ホーム |
| `/#archive` | アーカイブ一覧 |
| `/#idea-12` | 「修繕の美学」の記事 |
| `/#reviews` | ホームのブックレビューにスクロール |

記事URLは外部に共有もできます。

---

## 🛠 困ったときに

| 症状 | 対処 |
|---|---|
| ホームに古いアイデアが残っている | 配列の並び順を確認(最新が一番上か?) |
| 新記事がホームに出ない | `data.json` の先頭にちゃんと追加されているか確認 |
| 記事ページが開かない | `id` フィールドが他と被っていないか確認 |
| noteの記事が出ない | `noteConfig.username` を確認 |
| Xの投稿が出ない | URL が正しいか?投稿が削除されていないか? |

楽しい編集ライフを 🌅
