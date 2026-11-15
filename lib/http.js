/**
 * 轻量 HTTP 工具：CORS、JSON 响应、客户端 IP、内存限流。
 */

const buckets = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded) && forwarded.length) return forwarded[0];
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

/** 简单的固定窗口限流，Serverless 多实例下为「尽力而为」。 */
function rateLimit(req, max = MAX_REQUESTS) {
  const ip = getClientIp(req);
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || now - bucket.start > WINDOW_MS) {
    buckets.set(ip, { start: now, count: 1 });
    if (buckets.size > 5000) {
      for (const [key, value] of buckets) {
        if (now - value.start > WINDOW_MS) buckets.delete(key);
      }
    }
    return { ok: true, remaining: max - 1, reset: WINDOW_MS };
  }
  bucket.count += 1;
  if (bucket.count > max) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.ceil((bucket.start + WINDOW_MS - now) / 1000),
      reset: bucket.start + WINDOW_MS - now,
    };
  }
  return { ok: true, remaining: max - bucket.count, reset: bucket.start + WINDOW_MS - now };
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,HEAD,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Accept, Authorization',
  'access-control-expose-headers':
    'X-Router-Endpoint, X-Router-Upstream, X-Router-Latency, X-Router-Status, X-Router-RateLimit-Remaining',
};

function setHeaders(res, headers) {
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined || value === null) continue;
    res.setHeader(key, value);
  }
}

function sendJson(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload, null, 2);
  setHeaders(res, {
    ...CORS,
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  });
  res.statusCode = status;
  res.end(body);
}

function sendText(res, status, body, headers = {}) {
  setHeaders(res, {
    ...CORS,
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  });
  res.statusCode = status;
  res.end(body);
}

function sendBuffer(res, status, buffer, contentType, headers = {}) {
  setHeaders(res, {
    ...CORS,
    'content-type': contentType || 'application/octet-stream',
    ...headers,
  });
  res.statusCode = status;
  res.end(buffer);
}

function sendOptions(res) {
  setHeaders(res, { ...CORS, 'access-control-max-age': '86400' });
  res.statusCode = 204;
  res.end();
}

module.exports = { CORS, getClientIp, rateLimit, setHeaders, sendJson, sendText, sendBuffer, sendOptions };
