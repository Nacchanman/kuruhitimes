export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return jsonResponse({ ok: true }, 200);
  }

  if (request.method !== 'GET' && request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method Not Allowed' }, 405);
  }

  const db = env.KURUHI_COUNTER_DB;

  if (!db) {
    return jsonResponse({
      ok: false,
      error: 'D1 binding KURUHI_COUNTER_DB is not configured.'
    }, 500);
  }

  try {
    await ensureCountersTable(db);

    if (request.method === 'POST') {
      const body = await readJson(request);
      const id = normalizeArticleId(body?.id);

      if (!id) {
        return jsonResponse({
          ok: false,
          error: 'Article id is required.'
        }, 400);
      }

      const key = articleKey(id);

      await db.prepare(`
        INSERT INTO counters (key, value, updated_at)
        VALUES (?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
          value = value + 1,
          updated_at = CURRENT_TIMESTAMP
      `).bind(key).run();

      const count = await getArticleCount(db, id);

      return jsonResponse({
        ok: true,
        id,
        count
      }, 200);
    }

    const url = new URL(request.url);
    const singleId = normalizeArticleId(url.searchParams.get('id'));
    const rawIds = url.searchParams.get('ids') || '';

    if (singleId) {
      const count = await getArticleCount(db, singleId);

      return jsonResponse({
        ok: true,
        id: singleId,
        count,
        counts: { [singleId]: count }
      }, 200);
    }

    const ids = rawIds
      .split(',')
      .map(normalizeArticleId)
      .filter(Boolean)
      .slice(0, 300);

    if (!ids.length) {
      return jsonResponse({
        ok: true,
        counts: {}
      }, 200);
    }

    const counts = {};

    for (const id of ids) {
      counts[id] = await getArticleCount(db, id);
    }

    return jsonResponse({
      ok: true,
      counts
    }, 200);
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: 'Article counter request failed.'
    }, 500);
  }
}

async function ensureCountersTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS counters (
      key TEXT PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

async function getArticleCount(db, id) {
  const row = await db.prepare(`
    SELECT value
    FROM counters
    WHERE key = ?
    LIMIT 1
  `).bind(articleKey(id)).first();

  return Number(row?.value || 0);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch (error) {
    return {};
  }
}

function normalizeArticleId(value) {
  return String(value || '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .slice(0, 120);
}

function articleKey(id) {
  return 'article_views:' + id;
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'cache-control': 'no-store, max-age=0',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type, accept'
    }
  });
}
