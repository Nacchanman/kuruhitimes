export async function onRequest({ params, request, env }) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const id = decodeURIComponent(params.id || "");

  const escapeHTML = value =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const stripHTML = value =>
    String(value || "")
      .replace(/<[^>]*>/g, "")
      .replace(/\[\[photo:\d+\]\]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const absoluteUrl = value => {
    if (!value) return "";
    const str = String(value).trim();
    if (!str) return "";
    if (/^https?:\/\//i.test(str)) return encodeURI(str);
    if (str.startsWith("/")) return encodeURI(origin + str);
    return encodeURI(origin + "/" + str.replace(/^\.?\//, ""));
  };

  const getValue = value => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      return (
        value.image ||
        value.url ||
        value.path ||
        value.src ||
        value.file ||
        value.publicUrl ||
        value.publicURL ||
        ""
      );
    }
    return "";
  };

  async function fetchDataJson() {
    const dataRequest = new Request(origin + "/data.json", {
      method: "GET",
      headers: {
        "accept": "application/json",
        "cache-control": "no-cache"
      }
    });

    let response = null;

    if (env && env.ASSETS) {
      response = await env.ASSETS.fetch(dataRequest);
    }

    if (!response || !response.ok) {
      response = await fetch(origin + "/data.json", {
        headers: {
          "accept": "application/json",
          "cache-control": "no-cache"
        }
      });
    }

    if (!response.ok) {
      throw new Error("data.json could not be loaded: " + response.status);
    }

    return response.json();
  }

  function normalizeId(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/^#/, "")
      .replace(/^\/?share\//, "")
      .trim();
  }

  function looseIdMatch(itemId, requestedId) {
    const a = normalizeId(itemId);
    const b = normalizeId(requestedId);
    if (!a || !b) return false;
    if (a === b) return true;

    // lunch-1 / lunch-01 / lunch-001 の揺れを吸収
    const ma = a.match(/^([a-z]+)-0*(\d+)$/);
    const mb = b.match(/^([a-z]+)-0*(\d+)$/);
    if (ma && mb && ma[1] === mb[1] && ma[2] === mb[2]) return true;

    return false;
  }

  function getArray(data, keys) {
    for (const key of keys) {
      if (Array.isArray(data[key])) return data[key];
    }
    return [];
  }

  function findItem(data, requestedId) {
    const ideas = getArray(data, ["ideas", "ideaPosts", "articles"]);
    const lunches = getArray(data, ["lunches", "lunch", "lunchPosts", "lunchItems", "lunchesConfig"]);

    let idea = ideas.find(item => looseIdMatch(item.id, requestedId));
    let lunch = lunches.find(item => looseIdMatch(item.id, requestedId));

    // 念のため、全配列からも探す
    if (!idea && !lunch) {
      for (const [key, value] of Object.entries(data)) {
        if (!Array.isArray(value)) continue;

        const found = value.find(item => item && looseIdMatch(item.id, requestedId));

        if (found) {
          if (normalizeId(requestedId).startsWith("lunch-") || key.toLowerCase().includes("lunch")) {
            lunch = found;
          } else {
            idea = found;
          }
          break;
        }
      }
    }

    if (lunch) return { item: lunch, type: "lunch" };
    if (idea) return { item: idea, type: "idea" };
    return { item: null, type: "" };
  }

  function pickImage(item, type) {
    if (!item) return "";

    const directCandidates = [
      item.coverImage,
      item.cover,
      item.thumbnail,
      item.thumbnailImage,
      item.image,
      item.mainImage,
      item.ogImage
    ];

    for (const candidate of directCandidates) {
      const value = getValue(candidate);
      if (value) return value;
    }

    const photoLists = [
      item.photos,
      item.images,
      item.gallery,
      item.photoGallery,
      item.lunchPhotos
    ];

    for (const list of photoLists) {
      if (!Array.isArray(list)) continue;

      for (const photo of list) {
        const value = getValue(photo);
        if (value) return value;
      }
    }

    return "";
  }

  function buildHTML({ title, description, imageUrl, section, targetUrl, shareUrl }) {
    const imageTags = imageUrl
      ? `<meta property="og:image" content="${escapeHTML(imageUrl)}">
<meta property="og:image:secure_url" content="${escapeHTML(imageUrl)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:image" content="${escapeHTML(imageUrl)}">`
      : "";

    return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">

<title>${escapeHTML(title)} | くるひもタイムズ</title>
<meta name="description" content="${escapeHTML(description)}">
<link rel="canonical" href="${escapeHTML(shareUrl)}">

<meta property="og:locale" content="ja_JP">
<meta property="og:type" content="article">
<meta property="og:site_name" content="くるひもタイムズ">
<meta property="og:title" content="${escapeHTML(title)}">
<meta property="og:description" content="${escapeHTML(description)}">
<meta property="og:url" content="${escapeHTML(shareUrl)}">
${imageTags}

<meta name="twitter:card" content="${imageUrl ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${escapeHTML(title)}">
<meta name="twitter:description" content="${escapeHTML(description)}">

<script>
  setTimeout(function () {
    location.replace(${JSON.stringify(targetUrl)});
  }, 600);
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
    max-width: 760px;
    padding: 40px 24px;
    text-align: center;
  }

  img {
    max-width: 100%;
    border: 1px solid rgba(18,18,15,.18);
    margin-bottom: 28px;
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
  ${imageUrl ? `<img src="${escapeHTML(imageUrl)}" alt="">` : ""}
  <div class="eyebrow">${escapeHTML(section)}</div>
  <h1>${escapeHTML(title)}</h1>
  <p>${escapeHTML(description)}</p>
  <p><a href="${escapeHTML(targetUrl)}">記事を開く →</a></p>
</main>
</body>
</html>`;
  }

  try {
    const data = await fetchDataJson();
    const found = findItem(data, id);

    if (!found.item) {
      return Response.redirect(origin + "/", 302);
    }

    const item = found.item;
    const type = found.type;

    const title = item.title || "くるひもタイムズ";
    const section = type === "lunch" ? "きょうのランチ" : "あしたのアイデア";

    const description =
      item.summary ||
      item.description ||
      stripHTML(item.body).slice(0, 140) ||
      "くるひもタイムズの記事です。";

    const imageUrl = absoluteUrl(pickImage(item, type));

    const targetUrl = origin + "/#" + encodeURIComponent(item.id || id);
    const shareUrl = origin + "/share/" + encodeURIComponent(item.id || id);

    const html = buildHTML({
      title,
      description,
      imageUrl,
      section,
      targetUrl,
      shareUrl
    });

    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store, max-age=0"
      }
    });
  } catch (error) {
    return new Response("Preview generation error: " + error.message, {
      status: 500,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store, max-age=0"
      }
    });
  }
}
