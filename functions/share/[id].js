export async function onRequestGet({ params, request, env }) {
  const url = new URL(request.url);
  const origin = url.origin;
  const id = params.id;

  const escapeHTML = value =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const absoluteUrl = value => {
    if (!value) return "";
    const str = String(value).trim();
    if (/^https?:\/\//i.test(str)) return str;
    if (str.startsWith("/")) return origin + str;
    return origin + "/" + str.replace(/^\.?\//, "");
  };

  const plainText = html =>
    String(html || "")
      .replace(/<[^>]*>/g, "")
      .replace(/\[\[photo:\d+\]\]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  async function fetchDataJson() {
    const dataUrl = origin + "/data.json";
    let response = null;

    if (env && env.ASSETS) {
      response = await env.ASSETS.fetch(new Request(dataUrl, request));
    }

    if (!response || !response.ok) {
      response = await fetch(dataUrl, {
        headers: { "cache-control": "no-cache" }
      });
    }

    if (!response.ok) {
      throw new Error("data.json could not be loaded: " + response.status);
    }

    return response.json();
  }

  try {
    const data = await fetchDataJson();

    const ideas = Array.isArray(data.ideas) ? data.ideas : [];
    const lunches = Array.isArray(data.lunches) ? data.lunches : [];

    const idea = ideas.find(item => item.id === id);
    const lunch = lunches.find(item => item.id === id);
    const item = lunch || idea;

    if (!item) {
      return Response.redirect(origin + "/", 302);
    }

    const isLunch = !!lunch;
    const photos = Array.isArray(item.photos) ? item.photos : [];

    const firstPhoto = photos[0]
      ? (typeof photos[0] === "string" ? photos[0] : photos[0].image)
      : "";

    const image = isLunch
      ? (item.coverImage || firstPhoto || "")
      : (item.image || "");

    const title = item.title || "くるひもタイムズ";
    const section = isLunch ? "きょうのランチ" : "あしたのアイデア";

    const description =
      item.summary ||
      plainText(item.body).slice(0, 140) ||
      "くるひもタイムズの記事です。";

    const targetUrl = origin + "/#" + encodeURIComponent(id);
    const shareUrl = origin + "/share/" + encodeURIComponent(id);
    const imageUrl = absoluteUrl(image);

    const ogImage = imageUrl
      ? `<meta property="og:image" content="${escapeHTML(imageUrl)}">
<meta property="og:image:secure_url" content="${escapeHTML(imageUrl)}">
<meta name="twitter:image" content="${escapeHTML(imageUrl)}">`
      : "";

    const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">

<title>${escapeHTML(title)} | くるひもタイムズ</title>
<meta name="description" content="${escapeHTML(description)}">
<link rel="canonical" href="${escapeHTML(shareUrl)}">

<meta property="og:type" content="article">
<meta property="og:site_name" content="くるひもタイムズ">
<meta property="og:title" content="${escapeHTML(title)}">
<meta property="og:description" content="${escapeHTML(description)}">
<meta property="og:url" content="${escapeHTML(shareUrl)}">
${ogImage}

<meta name="twitter:card" content="${imageUrl ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${escapeHTML(title)}">
<meta name="twitter:description" content="${escapeHTML(description)}">

<script>
  setTimeout(function () {
    location.replace(${JSON.stringify(targetUrl)});
  }, 700);
</script>

<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    background: #f6f1e7;
    color: #12120f;
    font-family: serif;
  }

  main {
    max-width: 720px;
    padding: 40px 24px;
    text-align: center;
  }

  .eyebrow {
    color: #d4391b;
    letter-spacing: .18em;
    font-size: 12px;
    margin-bottom: 20px;
  }

  h1 {
    font-size: clamp(28px, 6vw, 52px);
    line-height: 1.25;
    margin: 0 0 16px;
  }

  p {
    color: #6f6a5f;
    line-height: 1.8;
  }

  a {
    color: #d4391b;
  }
</style>
</head>

<body>
<main>
  <div class="eyebrow">${escapeHTML(section)}</div>
  <h1>${escapeHTML(title)}</h1>
  <p>${escapeHTML(description)}</p>
  <p><a href="${escapeHTML(targetUrl)}">記事を開く →</a></p>
</main>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300"
      }
    });
  } catch (error) {
    return new Response("Preview generation error: " + error.message, {
      status: 500,
      headers: {
        "content-type": "text/plain; charset=utf-8"
      }
    });
  }
}
