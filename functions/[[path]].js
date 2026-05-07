const SITE = {
  name: 'くるひもタイムズ / Kuruhimo Times',
  shortName: 'くるひもタイムズ',
  originFallback: 'https://kuruhitimes.pages.dev',
  defaultOgImage: '/images/og/kuruhimo-times.png',
  description: '次にくるアイデアと、それを支える本を、毎日少しずつ届ける編集室。テクノロジーと暮らしのあいだを、誰かより少し早く歩く小さなメディアです。'
};

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = normalizePath(url.pathname);

  const match = path.match(/^\/(article|share)\/([^/]+)\/?$/);
  if (!match) {
    return context.next();
  }

  const slug = decodeURIComponent(match[2]);
  const data = await loadData(request);
  const post = findPost(data, slug);

  if (!post) {
    return new Response(renderNotFound(url, slug), {
      status: 404,
      headers: htmlHeaders()
    });
  }

  const html = renderArticlePage({ post, data, requestUrl: url });
  return new Response(html, {
    status: 200,
    headers: htmlHeaders()
  });
}

async function loadData(request) {
  const dataUrl = new URL('/data.json', request.url);
  const res = await fetch(dataUrl.toString(), {
    headers: { accept: 'application/json' }
  });

  if (!res.ok) {
    throw new Error('data.json could not be loaded: ' + res.status);
  }

  return res.json();
}

function findPost(data, slug) {
  const collections = [
    { key: 'ideas', label: 'あしたのアイデア', type: 'idea' },
    { key: 'lunches', label: 'きょうのランチ', type: 'lunch' },
    { key: 'quotes', label: 'ことばの標本', type: 'quote' },
    { key: 'posts', label: '記事', type: 'post' },
    { key: 'articles', label: '記事', type: 'post' }
  ];

  for (const collection of collections) {
    const items = Array.isArray(data?.[collection.key]) ? data[collection.key] : [];
    const item = items.find(entry => String(entry?.id || entry?.slug || '') === slug);

    if (item) {
      return {
        ...item,
        id: String(item.id || item.slug || slug),
        collectionKey: collection.key,
        collectionLabel: collection.label,
        type: collection.type
      };
    }
  }

  return null;
}

function renderArticlePage({ post, requestUrl }) {
  const origin = requestUrl.origin || SITE.originFallback;
  const canonicalPath = '/article/' + encodeURIComponent(post.id) + '/';
  const canonicalUrl = absoluteUrl(canonicalPath, origin);

  const title = post.title || post.quote || '無題の記事';
  const siteTitle = title + '｜' + SITE.shortName;
  const description = normalizeDescription(
    post.summary ||
    post.description ||
    post.editorNote ||
    post.body ||
    SITE.description
  );

  const imageUrl = absoluteUrl(selectOgImage(post), origin);
  const published = post.publishDate || post.date || '';
  const updated = post.updatedAt || post.modifiedDate || published;
  const bodyHtml = renderBody(post);
  const cover = selectCoverImage(post);
  const coverHtml = cover
    ? `<figure class="article-cover"><img src="${escapeAttr(absoluteUrl(cover, origin))}" alt=""></figure>`
    : '';

  const place = post.place ? `<span>${escapeHtml(post.place)}</span>` : '';
  const readTime = post.readTime ? `<span>読了 ${escapeHtml(post.readTime)}</span>` : '';
  const category = post.category || post.tag || post.collectionLabel;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(siteTitle)}</title>
<meta name="description" content="${escapeAttr(description)}">
<link rel="canonical" href="${escapeAttr(canonicalUrl)}">

<meta property="og:locale" content="ja_JP">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${escapeAttr(SITE.name)}">
<meta property="og:title" content="${escapeAttr(title)}">
<meta property="og:description" content="${escapeAttr(description)}">
<meta property="og:url" content="${escapeAttr(canonicalUrl)}">
<meta property="og:image" content="${escapeAttr(imageUrl)}">
<meta property="og:image:secure_url" content="${escapeAttr(imageUrl)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeAttr(title)}">
<meta name="twitter:description" content="${escapeAttr(description)}">
<meta name="twitter:image" content="${escapeAttr(imageUrl)}">

${published ? `<meta property="article:published_time" content="${escapeAttr(published)}">` : ''}
${updated ? `<meta property="article:modified_time" content="${escapeAttr(updated)}">` : ''}

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,300;1,9..144,500&family=JetBrains+Mono:wght@300;400;500&family=Shippori+Mincho:wght@400;500;600;700;800&family=Zen+Kaku+Gothic+Antique:wght@300;400;500;700&display=swap" rel="stylesheet">

<script type="application/ld+json">${jsonLd({ post, title, description, imageUrl, canonicalUrl, published, updated })}</script>
<style>${articleCss()}</style>
</head>
<body>
<div class="paper-grain" aria-hidden="true"></div>

<header class="article-header">
  <a class="brand" href="/" aria-label="くるひもタイムズのトップへ">
    <span class="brand-ja">くるひもタイムズ</span>
    <span class="brand-en">The Kuruhimo Times</span>
  </a>
  <div class="header-rule"></div>
</header>

<main class="article-shell">
  <div class="article-kicker">
    <span>${escapeHtml(post.collectionLabel)}</span>
    ${category ? `<span>${escapeHtml(category)}</span>` : ''}
  </div>

  <h1>${escapeHtml(title)}</h1>

  <div class="article-meta">
    ${published ? `<span>${escapeHtml(formatDate(published))}</span>` : ''}
    ${place}
    ${readTime}
    <span>編集部</span>
  </div>

  ${coverHtml}

  <section class="article-body">
    ${bodyHtml}
  </section>

  <aside class="share-panel" aria-label="記事共有">
    <div>
      <p class="share-label">SHARE THIS POST</p>
      <p class="share-url">${escapeHtml(canonicalUrl)}</p>
    </div>

    <div class="share-actions">
      <button class="copy-button" type="button" data-copy-url="${escapeAttr(canonicalUrl)}">
        <span>リンクをコピー</span>
        <small>Copy URL</small>
      </button>
      <a class="home-button" href="/">
        <span>トップへ戻る</span>
        <small>Back Home</small>
      </a>
    </div>

    <p class="copy-status" aria-live="polite"></p>
  </aside>
</main>

<footer class="article-footer">
  <span>© 2026 The Kuruhimo Times</span>
  <span>Made with curiosity, in Tokyo</span>
</footer>

<script>
(() => {
  const button = document.querySelector('[data-copy-url]');
  const status = document.querySelector('.copy-status');

  if (!button) return;

  button.addEventListener('click', async () => {
    const url = button.getAttribute('data-copy-url');

    try {
      await navigator.clipboard.writeText(url);
      button.classList.add('is-copied');
      button.querySelector('span').textContent = 'コピーしました';

      if (status) {
        status.textContent = 'このURLをXやLINEに貼ると、画像付きのプレビューが表示されます。';
      }

      setTimeout(() => {
        button.classList.remove('is-copied');
        button.querySelector('span').textContent = 'リンクをコピー';
        if (status) status.textContent = '';
      }, 2600);
    } catch (error) {
      window.prompt('このURLをコピーしてください', url);
    }
  });
})();
</script>
</body>
</html>`;
}

function renderNotFound(url, slug) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>記事が見つかりません｜くるひもタイムズ</title>
<meta name="robots" content="noindex">
<style>
body {
  margin: 0;
  padding: 48px;
  background: #f6f1e7;
  color: #12120f;
  font-family: serif;
  line-height: 1.8;
}
a {
  color: #d4391b;
}
</style>
</head>
<body>
<h1>記事が見つかりません</h1>
<p><code>${escapeHtml(slug)}</code> に対応する投稿が data.json に見つかりませんでした。</p>
<p><a href="/">トップへ戻る</a></p>
</body>
</html>`;
}

function renderBody(post) {
  if (post.type === 'quote') {
    const quote = post.quote || post.body || '';
    const author = post.author
      ? `<figcaption>${escapeHtml(post.author)}${post.source ? `『${escapeHtml(post.source)}』` : ''}</figcaption>`
      : '';

    return `<figure class="quote-block"><blockquote>${escapeHtml(quote).replace(/\n/g, '<br>')}</blockquote>${author}</figure>${post.editorNote ? formatPlainText(post.editorNote) : ''}`;
  }

  const body = String(post.body || post.content || post.summary || '').trim();

  if (!body) {
    return '<p>本文を準備中です。</p>';
  }

  if (post.type === 'lunch') {
    return renderLunchBody(body, post.photos || []);
  }

  return formatPlainText(body);
}

function renderLunchBody(body, photos) {
  const used = new Set();

  const photoHtml = index => {
    const photo = photos[index - 1];

    if (!photo) return '';

    used.add(index - 1);

    const src = typeof photo === 'string' ? photo : photo.image;
    const caption = typeof photo === 'string' ? '' : photo.caption;

    if (!src) return '';

    return `<figure class="inline-photo"><img src="${escapeAttr(src)}" alt="" loading="lazy">${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''}</figure>`;
  };

  let html = formatPlainText(body).replace(/\[\[photo:(\d+)\]\]/g, (_, n) => photoHtml(Number(n)));

  const remaining = photos
    .map((photo, index) => ({ photo, index }))
    .filter(item => !used.has(item.index))
    .map(({ photo }) => {
      const src = typeof photo === 'string' ? photo : photo.image;
      const caption = typeof photo === 'string' ? '' : photo.caption;

      if (!src) return '';

      return `<figure class="inline-photo"><img src="${escapeAttr(src)}" alt="" loading="lazy">${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''}</figure>`;
    })
    .filter(Boolean);

  if (remaining.length) {
    html += `<div class="photo-grid">${remaining.join('')}</div>`;
  }

  return html;
}

function formatPlainText(text) {
  const value = String(text || '').trim();

  if (!value) return '';

  if (/<\/?[a-z][\s\S]*>/i.test(value)) {
    return value;
  }

  return value
    .split(/\n\s*\n/g)
    .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function selectOgImage(post) {
  return (
    post.ogImage ||
    post.og_image ||
    post.coverImage ||
    post.cover ||
    post.image ||
    firstPhoto(post) ||
    SITE.defaultOgImage
  );
}

function selectCoverImage(post) {
  return (
    post.coverImage ||
    post.cover ||
    post.image ||
    firstPhoto(post) ||
    ''
  );
}

function firstPhoto(post) {
  const photos = Array.isArray(post.photos) ? post.photos : [];
  const first = photos.find(Boolean);

  if (!first) return '';

  return typeof first === 'string' ? first : first.image || '';
}

function normalizeDescription(value) {
  return String(value || '')
    .replace(/\[\[photo:\d+\]\]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 150);
}

function absoluteUrl(path, origin) {
  const value = String(path || '').trim();

  if (!value) {
    return new URL(SITE.defaultOgImage, origin).toString();
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith('//')) {
    return 'https:' + value;
  }

  return new URL(value.startsWith('/') ? value : '/' + value, origin).toString();
}

function normalizePath(pathname) {
  return pathname.replace(/\/+/g, '/');
}

function formatDate(value) {
  const raw = String(value || '');
  const d = new Date(raw);

  if (Number.isNaN(d.getTime())) {
    return raw;
  }

  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(d);
}

function htmlHeaders() {
  return {
    'content-type': 'text/html; charset=UTF-8',
    'cache-control': 'public, max-age=120'
  };
}

function jsonLd({ title, description, imageUrl, canonicalUrl, published, updated }) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image: [imageUrl],
    datePublished: published || undefined,
    dateModified: updated || published || undefined,
    mainEntityOfPage: canonicalUrl,
    author: {
      '@type': 'Organization',
      name: SITE.shortName
    },
    publisher: {
      '@type': 'Organization',
      name: SITE.shortName
    }
  }).replace(/</g, '\\u003c');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}

function articleCss() {
  return `
:root {
  --paper: #f6f1e7;
  --paper-2: #efe8d9;
  --ink: #12120f;
  --ink-2: #2a2825;
  --ink-3: #5a564e;
  --vermilion: #d4391b;
  --vermilion-soft: #e88a73;
  --gold: #b8975a;
  --rule: rgba(18, 18, 15, .16);
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: 'Zen Kaku Gothic Antique', sans-serif;
  line-height: 1.9;
  font-feature-settings: 'palt';
  -webkit-font-smoothing: antialiased;
}

.paper-grain {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(ellipse at 15% 10%, rgba(212,57,27,.06), transparent 48%),
    radial-gradient(ellipse at 84% 84%, rgba(184,151,90,.08), transparent 46%);
}

.paper-grain::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .05 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: .62;
  mix-blend-mode: multiply;
}

.article-header,
.article-shell,
.article-footer {
  position: relative;
  z-index: 1;
}

.article-header {
  max-width: 1120px;
  margin: 0 auto;
  padding: 32px clamp(22px, 5vw, 48px) 0;
}

.brand {
  display: inline-grid;
  text-decoration: none;
  color: var(--ink);
  gap: 2px;
}

.brand-ja {
  font-family: 'Shippori Mincho', serif;
  font-weight: 800;
  font-size: clamp(24px, 4vw, 42px);
  letter-spacing: -.05em;
}

.brand-en {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 15px;
  color: var(--ink-3);
  letter-spacing: .06em;
}

.header-rule {
  height: 1px;
  background: rgba(18,18,15,.34);
  margin-top: 24px;
  box-shadow: 0 8px 0 rgba(18,18,15,.06);
}

.article-shell {
  max-width: 920px;
  margin: 0 auto;
  padding: clamp(52px, 8vw, 92px) clamp(22px, 5vw, 48px) 84px;
}

.article-kicker {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 24px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: var(--vermilion);
}

.article-kicker span {
  border: 1px solid rgba(212,57,27,.24);
  border-radius: 999px;
  padding: 6px 12px;
  background: rgba(246,241,231,.64);
  backdrop-filter: blur(8px);
}

h1 {
  font-family: 'Shippori Mincho', serif;
  font-size: clamp(38px, 7vw, 78px);
  font-weight: 800;
  line-height: 1.18;
  letter-spacing: -.055em;
  margin: 0 0 24px;
}

.article-meta {
  display: flex;
  gap: 10px 16px;
  flex-wrap: wrap;
  padding-bottom: 34px;
  border-bottom: 1px solid rgba(18,18,15,.28);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  letter-spacing: .08em;
  color: var(--ink-3);
}

.article-cover {
  margin: clamp(34px, 6vw, 58px) 0 0;
  border: 1px solid rgba(18,18,15,.18);
  background: var(--paper-2);
  box-shadow: 0 26px 70px rgba(18,18,15,.16);
  overflow: hidden;
}

.article-cover img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 620px;
  object-fit: cover;
}

.article-body {
  margin-top: clamp(42px, 6vw, 64px);
  font-family: 'Shippori Mincho', serif;
  font-size: clamp(18px, 2.15vw, 22px);
  line-height: 2.12;
  letter-spacing: .015em;
}

.article-body p {
  margin: 0 0 1.75em;
}

.article-body a {
  color: var(--vermilion);
  text-underline-offset: .2em;
}

.article-body h2,
.article-body h3 {
  line-height: 1.4;
  margin: 2.2em 0 .9em;
}

.article-body h2 {
  font-size: 1.45em;
}

.article-body h3 {
  font-size: 1.18em;
}

.inline-photo,
.photo-grid {
  margin: 2.4em 0;
}

.inline-photo img,
.photo-grid img {
  width: 100%;
  height: auto;
  display: block;
  border: 1px solid rgba(18,18,15,.16);
  box-shadow: 0 20px 54px rgba(18,18,15,.12);
}

figcaption {
  margin-top: 10px;
  font-family: 'Zen Kaku Gothic Antique', sans-serif;
  font-size: 13px;
  line-height: 1.7;
  color: var(--ink-3);
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.quote-block {
  margin: 0;
  padding: 36px;
  border-left: 3px solid var(--vermilion);
  background: rgba(239,232,217,.72);
}

.quote-block blockquote {
  margin: 0;
  font-size: 1.28em;
  line-height: 1.9;
}

.share-panel {
  margin-top: clamp(54px, 8vw, 86px);
  padding: 24px;
  border: 1px solid rgba(18,18,15,.18);
  background: linear-gradient(135deg, rgba(246,241,231,.9), rgba(239,232,217,.82));
  box-shadow: 0 24px 70px rgba(18,18,15,.12);
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 22px;
  align-items: center;
}

.share-label {
  margin: 0 0 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: .18em;
  color: var(--vermilion);
}

.share-url {
  margin: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--ink-3);
  overflow-wrap: anywhere;
}

.share-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.copy-button,
.home-button {
  appearance: none;
  border: 1px solid rgba(18,18,15,.72);
  border-radius: 999px;
  background: var(--ink);
  color: var(--paper);
  padding: 13px 18px;
  min-width: 154px;
  cursor: pointer;
  text-decoration: none;
  display: inline-grid;
  gap: 0;
  font-family: 'Zen Kaku Gothic Antique', sans-serif;
  line-height: 1.25;
  transition:
    transform .25s ease,
    background .25s ease,
    color .25s ease,
    border-color .25s ease;
}

.copy-button span,
.home-button span {
  font-weight: 700;
  font-size: 14px;
}

.copy-button small,
.home-button small {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: .14em;
  opacity: .72;
}

.home-button {
  background: transparent;
  color: var(--ink);
  border-color: rgba(18,18,15,.28);
}

.copy-button:hover,
.home-button:hover {
  transform: translateY(-2px);
}

.copy-button.is-copied {
  background: var(--vermilion);
  border-color: var(--vermilion);
}

.copy-status {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 13px;
  color: var(--vermilion);
}

.article-footer {
  max-width: 1120px;
  margin: 0 auto;
  padding: 28px clamp(22px, 5vw, 48px) 40px;
  border-top: 1px solid rgba(18,18,15,.18);
  display: flex;
  justify-content: space-between;
  gap: 20px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: .12em;
  color: var(--ink-3);
  text-transform: uppercase;
}

@media (max-width: 760px) {
  .article-shell {
    padding-top: 42px;
  }

  .share-panel {
    grid-template-columns: 1fr;
  }

  .share-actions {
    justify-content: stretch;
  }

  .copy-button,
  .home-button {
    width: 100%;
    justify-items: center;
  }

  .photo-grid {
    grid-template-columns: 1fr;
  }

  .article-footer {
    flex-direction: column;
  }
}
`;
}
