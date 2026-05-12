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

  const key = 'home_visitors_total';

  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS counters (
        key TEXT PRIMARY KEY,
        value INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    await db.prepare(`
      INSERT INTO counters (key, value, updated_at)
      VALUES (?, 0, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO NOTHING
    `).bind(key).run();

    if (request.method === 'POST') {
      await db.prepare(`
        UPDATE counters
        SET value = value + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE key = ?
      `).bind(key).run();
    }

    const row = await db.prepare(`
      SELECT value
      FROM counters
      WHERE key = ?
      LIMIT 1
    `).bind(key).first();

    return jsonResponse({
      ok: true,
      count: Number(row?.value || 0)
    }, 200);
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: 'Counter update failed.'
    }, 500);
  }
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
