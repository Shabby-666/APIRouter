/**
 * 全站健康检查：并行探测所有上游（只读取响应头，不下载响应体）。
 * 结果在实例内存中缓存 45 秒，配合 CDN 缓存，避免上游被打爆。
 */
const { endpoints, buildExampleQuery } = require('../lib/registry');

const CACHE_TTL = 45_000;
const PROBE_TIMEOUT = 4_500;
const CONCURRENCY = 20;

let cache = { at: 0, payload: null };

async function probe(endpoint) {
  const startedAt = Date.now();
  try {
    const url = buildExampleQuery(endpoint);
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(PROBE_TIMEOUT),
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 APIRouter/1.0',
        accept: '*/*',
        ...(endpoint.headers || {}),
      },
    });
    if (response.body) {
      try {
        await response.body.cancel();
      } catch {
        /* ignore */
      }
    }
    return {
      ok: response.status < 400,
      status: response.status,
      ms: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - startedAt,
      error: error.name === 'TimeoutError' ? 'timeout' : 'unreachable',
    };
  }
}

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-methods', 'GET,OPTIONS');
    res.statusCode = 204;
    return res.end();
  }

  const now = Date.now();
  if (!cache.payload || now - cache.at > CACHE_TTL) {
    const targets = endpoints.filter((e) => e.kind !== 'local');
    const startedAt = Date.now();
    const results = await runPool(targets, probe, CONCURRENCY);
    const statuses = {};
    targets.forEach((endpoint, index) => {
      statuses[endpoint.id] = results[index];
    });
    endpoints.forEach((endpoint) => {
      if (endpoint.kind === 'local') statuses[endpoint.id] = { ok: true, status: 200, ms: 1, local: true };
    });
    cache = {
      at: now,
      payload: {
        checkedAt: new Date(now).toISOString(),
        tookMs: Date.now() - startedAt,
        total: endpoints.length,
        up: Object.values(statuses).filter((s) => s.ok).length,
        down: Object.values(statuses).filter((s) => !s.ok).length,
        results: statuses,
      },
    };
  }

  res.statusCode = 200;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('cache-control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  res.end(JSON.stringify(cache.payload));
};
