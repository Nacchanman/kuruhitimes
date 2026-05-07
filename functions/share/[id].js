export async function onRequest({ params, request, env }) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const requestedId = decodeURIComponent(params.id || "");

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
    const dataUrl = origin + "/data.json";

    let response = null;

    if (env && env.ASSETS) {
      response = await env.ASSETS.fetch(
        new Request(dataUrl, {
          method: "GET",
          headers: {
            accept: "application/json",
            "cache-control": "no-cache"
          }
        })
      );
    }

    if (!response || !response.ok) {
      response = await fetch(dataUrl, {
        headers: {
          accept: "application/json",
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
      .replace(/_/g, "-")
      .trim();
  }

  function looseIdMatch(itemId, targetId) {
    const a = normalizeId(itemId);
    const b = normalizeId(targetId);

    if (!a || !b) return false;
    if (a === b) return true;

    // lunch-1 / lunch-01 / lunch-001 を同一扱いにする
    const ma = a.match(/^([a-z]+)-0*(\d+)$/);
    const mb = b.match(/^([a-z]+)-0*(\d+)$/);

    if (ma && mb && ma[1] === mb[1] && ma[2] === mb[2]) {
      return true;
    }

    return false;
  }

  function collectArraysDeep(value, keyPath = "", result = []) {
    if (!value || typeof value !== "object") return result;

    if (Array.isArray(value)) {
      result.push({
        keyPath,
        items: value
      });

      value.forEach((item, index) => {
        collectArraysDeep(item, `${keyPath}[${index}]`, result);
      });

      return result;
    }

    Object.entries(value).forEach(([key, child]) => {
      collectArraysDeep(child, keyPath ? `${keyPath}.${key}` : key, result);
    });

    return result;
  }

  function isLunchKey(keyPath) {
    return /lunch|ランチ/i.test(keyPath || "");
  }

  function isIdeaKey(keyPath) {
    return /idea|ideas|article|articles|アイデア/i.test(keyPath || "");
  }

  function findByIdFromArrays(arrays, id, preferredType) {
    for (const group of arrays) {
      if (!Array.isArray(group.items)) continue;

      const keyIsLunch = isLunchKey(group.keyPath);
      const keyIsIdea = isIdeaKey(group.keyPath);

      if (preferredType === "lunch" && !keyIsLunch) continue;
      if (preferredType === "idea" && !keyIsIdea) continue;

      const found = group.items.find(item => {
        return item && typeof item === "object" && looseIdMatch(item.id, id);
      });

      if (found) {
        return found;
      }
    }

    return null;
  }

  function findFirstFromArrays(arrays, preferredType) {
    for (const group of arrays) {
      if (!Array.isArray(group.items)) continue;

      const keyIsLunch = isLunchKey(group.keyPath);
      const keyIsIdea = isIdeaKey(group.keyPath);

      if (preferredType === "lunch" && !keyIsLunch) continue;
      if (preferredType === "idea" && !keyIsIdea) continue;

      const found = group.items.find(item => {
        return item && typeof item === "object" && (item.title || item.summary || item.body);
      });

      if (found) {
        return found;
      }
    }

    return null;
  }

  function findItem(data, id) {
    const normalized = normalizeId(id);
    const preferredType = normalized.startsWith("lunch")
      ? "lunch"
      : normalized.startsWith("idea")
        ? "idea"
        : "";

    const arrays = collectArraysDeep(data);

    // 1. まずID完全・ゆるめ一致で探す
    let item = null;

    if (preferredType) {
      item = findByIdFromArrays(arrays, id, preferredType);
      if (item) return { item, type: preferredType };
    }

    // 2. preferredTypeなしでも全配列から探す
    for (const group of arrays) {
      const found = group.items.find(entry => {
        return entry && typeof entry === "object" && looseIdMatch(entry.id, id);
      });

      if (found) {
        const type = isLunchKey(group.keyPath) || normalizeId(found.id).startsWith("lunch")
          ? "lunch"
          : "idea";

        return { item: found, type };
      }
    }

    // 3. lunch-01 で見つからない場合は、ランチ配列の先頭を使う
    //    LINEプレビューがホームになるのを防ぐための保険
    if (preferredType === "lunch") {
      item = findFirstFromArrays(arrays, "lunch");
      if (item) return { item, type: "lunch" };
    }

    // 4. ideaでも同様に保険
    if (preferredType === "idea") {
      item = findFirstFromArrays(arrays, "idea");
      if (item) return { item, type: "idea" };
    }

    return { item: null, type: "" };
  }

  function extractImageFromHTML(value) {
    const text = String(value || "");
    const match = text.match(/<img[^>]+src=["']([^"']+)["']/i);
    return match ? match[1] : "";
  }

  function extractImageFromMarkdown(value) {
    const text = String(value || "");
    const match = text.match(/!\[[^\]]*\]\(([^)]+)\)/);
    return match ? match[1] : "";
  }

  function pickImage(item, type) {
    if (!item) return "";

    const directCandidates = [
      item.coverImage,
      item.cover_image,
      item.cover,
      item.thumbnail,
      item.thumbnailImage,
      item.thumbnail_image,
      item.image,
      item.mainImage,
      item.main_image,
      item.ogImage,
      item.og_image
    ];

    for (const candidate of directCandidates) {
      const value = getValue(candidate);
      if (value) return value;
    }

    const photoLists = [
      item.photos,
      item.photo,
      item.images,
      item.gallery,
      item.photoGallery,
      item.lunchPhotos,
      item.lunch_photos
    ];

    for (const list of photoLists) {
      if (!Array.isArray(list)) continue;

      for (const photo of list) {
        const value = getValue(photo);
        if (value) return value;
      }
    }

    const fromHTML = extractImageFromHTML(item.body);
    if (fromHTML) return fromHTML;

    const fromMarkdown = extractImageFromMarkdown(item.body);
    if (fromMarkdown) return fromMarkdown;

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
    const found = findItem(data, requestedId);

    if (!found.item) {
      return Response.redirect(origin + "/", 302);
    }

    const item = found.item;
    const type = found.type || (normalizeId(requestedId).startsWith("lunch") ? "lunch" : "idea");

    const title = item.title || "くるひもタイムズ";
    const section = type === "lunch" ? "きょうのランチ" : "あしたのアイデア";

    const description =
      item.summary ||
      item.description ||
      stripHTML(item.body).slice(0, 140) ||
      "くるひもタイムズの記事です。";

    const imageUrl = absoluteUrl(pickImage(item, type));

    const targetId = item.id || requestedId;
    const targetUrl = origin + "/#" + encodeURIComponent(targetId);
    const shareUrl = origin + "/share/" + encodeURIComponent(requestedId);

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
