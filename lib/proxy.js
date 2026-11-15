/**
 * 中转核心：白名单校验 → 拼装上游 URL → 请求 → 加工 → 回传。
 */
const { getEndpoint } = require('./registry');
const { processResponse } = require('./processors');
const { runLocal } = require('./local');
const { rateLimit, sendJson, sendBuffer, sendText, sendOptions } = require('./http');

const RESERVED = new Set(['__pick', '__raw', '__download', '__pretty']);
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 APIRouter/1.0';
const TIMEOUT_MS = 15_000;
const MAX_BYTES = 8 * 1024 * 1024;

function firstValue(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** 从原始 URL 解析 query，避免 Vercel 把路径参数 id 与同名 query 参数合并。 */
function parseQuery(req) {
  const raw = req.url || '';
  const mark = raw.indexOf('?');
  if (mark === -1) return {};
  const params = new URLSearchParams(raw.slice(mark + 1));
  const out = {};
  for (const [key, value] of params) {
    if (out[key] === undefined) out[key] = value;
    else if (Array.isArray(out[key])) out[key].push(value);
    else out[key] = [out[key], value];
  }
  return out;
}

/** 路径里的接口 ID 才是权威来源，query 里的 id 属于上游参数。 */
function endpointIdFromRequest(req, query) {
  const raw = (req.url || '').split('?')[0];
  const match = /\/api\/r\/([^/]+)\/?$/.exec(raw);
  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  return firstValue(query.id);
}

function buildUpstreamUrl(endpoint, query) {
  let template = endpoint.upstream;
  const used = new Set();
  const search = new URLSearchParams();
  const encode = (value) =>
    endpoint.rawPath ? String(value).replace(/\s/g, '%20') : encodeURIComponent(value);
  const provided = new Set();

  for (const [rawKey, rawValue] of Object.entries(query || {})) {
    const key = String(rawKey);
    if (RESERVED.has(key) || key.startsWith('__')) continue;
    const value = firstValue(rawValue);
    if (value === undefined || value === null || String(value) === '') continue;
    provided.add(key);
    let str = String(value);
    if (str.length > 2000) continue;
    if (/^(#|%23)/i.test(str) && /(color|bgcolor|fg|bg)$/i.test(key)) {
      str = str.replace(/^(#|%23)/i, '');
    }
    if (template.includes(`{${key}}`)) {
      template = template.split(`{${key}}`).join(encode(str));
      used.add(key);
    } else {
      search.set(key, str);
    }
  }

  // 没传的参数用示例值补齐，保证「复制即用」：/api/r/weather 也能直接返回北京天气
  for (const param of endpoint.params || []) {
    if (provided.has(param.key) || used.has(param.key)) continue;
    if (param.example === undefined || param.example === null || param.example === '') continue;
    if (template.includes(`{${param.key}}`)) continue;
    let str = String(param.example);
    if (/^(#|%23)/i.test(str) && /(color|bgcolor|fg|bg)$/i.test(param.key)) {
      str = str.replace(/^(#|%23)/i, '');
    }
    search.set(param.key, str);
  }

  // 没有提供值的路径参数，用示例值兜底，避免请求必然 404
  template = template.replace(/\{([^}]+)\}/g, (_, key) => {
    if (used.has(key)) return '';
    const param = (endpoint.params || []).find((p) => p.key === key);
    return encode((param && param.example) || '');
  });

  const url = new URL(template);
  for (const [key, value] of search) url.searchParams.set(key, value);
  return url;
}

function pickPath(value, path) {
  if (!path) return value;
  return path.split('.').reduce((acc, segment) => {
    if (acc === undefined || acc === null) return undefined;
    if (Array.isArray(acc)) {
      const index = Number(segment);
      return Number.isInteger(index) ? acc[index] : undefined;
    }
    return acc[segment];
  }, value);
}

async function handler(req, res) {
  if (req.method === 'OPTIONS') return sendOptions(res);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendJson(res, 405, { ok: false, error: '仅支持 GET 请求', code: 'METHOD_NOT_ALLOWED' });
  }

  const id = endpointIdFromRequest(req, req.query || {});
  const endpoint = getEndpoint(id);
  if (!endpoint) {
    return sendJson(res, 404, {
      ok: false,
      error: `接口 ${id || ''} 不存在`,
      hint: '访问 /api 获取全部可用接口列表',
      code: 'NOT_FOUND',
    });
  }

  const limit = rateLimit(req, 120);
  if (!limit.ok) {
    return sendJson(
      res,
      429,
      {
        ok: false,
        error: '请求过于频繁，请稍后再试',
        code: 'RATE_LIMITED',
        retryAfter: limit.retryAfter,
      },
      { 'retry-after': String(limit.retryAfter) },
    );
  }

  const startedAt = Date.now();
  const query = parseQuery(req);
  const pick = firstValue(query.__pick);
  const raw = firstValue(query.__raw) === '1';

  // 本地工具：不访问上游
  if (endpoint.kind === 'local') {
    try {
      const result = runLocal(endpoint.id, query);
      const body = { ok: true, endpoint: endpoint.id, ...result };
      if (pick) {
        const picked = pickPath(body, pick);
        if (picked === undefined) {
          return sendJson(res, 404, {
            ok: false,
            error: `字段 ${pick} 不存在`,
            code: 'PICK_NOT_FOUND',
            endpoint: endpoint.id,
          });
        }
        return sendJson(res, 200, { ok: true, pick, data: picked }, {
          'x-router-latency': String(Date.now() - startedAt),
        });
      }
      return sendJson(res, 200, body, {
        'x-router-latency': String(Date.now() - startedAt),
      });
    } catch (error) {
      return sendJson(res, error.statusCode || 400, {
        ok: false,
        error: error.message,
        code: 'LOCAL_ERROR',
        endpoint: endpoint.id,
      });
    }
  }

  let url;
  try {
    url = buildUpstreamUrl(endpoint, query);
  } catch {
    return sendJson(res, 400, { ok: false, error: '无法构建上游地址', code: 'BAD_REQUEST' });
  }

  if (!/^https?:$/.test(url.protocol)) {
    return sendJson(res, 400, { ok: false, error: '不允许的协议', code: 'BAD_PROTOCOL' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let upstream;
  let buffer;
  try {
    upstream = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': USER_AGENT,
        accept: '*/*',
        ...(endpoint.headers || {}),
      },
    });
    if (raw && endpoint.binaryRaw) {
      buffer = Buffer.alloc(0);
    } else {
      buffer = Buffer.from(await upstream.arrayBuffer());
    }
  } catch (error) {
    clearTimeout(timer);
    const timedOut = error.name === 'AbortError' || error.code === 'UND_ERR_CONNECT_TIMEOUT';
    return sendJson(
      res,
      timedOut ? 504 : 502,
      {
        ok: false,
        error: timedOut ? '上游响应超时，请稍后重试' : '无法连接上游服务',
        code: timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNREACHABLE',
        endpoint: endpoint.id,
        upstream: url.host,
        latency: Date.now() - startedAt,
      },
      { 'x-router-endpoint': endpoint.id, 'x-router-latency': String(Date.now() - startedAt) },
    );
  } finally {
    clearTimeout(timer);
  }

  const latency = Date.now() - startedAt;

  if (buffer.length > MAX_BYTES) {
    return sendJson(res, 413, {
      ok: false,
      error: '上游响应超过 8MB 限制',
      code: 'RESPONSE_TOO_LARGE',
      endpoint: endpoint.id,
    });
  }

  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  const isImage = contentType.startsWith('image/');
  const isSvg = contentType.includes('svg');
  const headers = {
    'x-router-endpoint': endpoint.id,
    'x-router-upstream': url.host,
    'x-router-status': String(upstream.status),
    'x-router-latency': String(latency),
    'x-router-ratelimit-remaining': String(limit.remaining),
    'x-content-type-options': 'nosniff',
  };

  if (endpoint.cache === 'no-store') {
    headers['cache-control'] = 'no-store, no-cache, must-revalidate';
  } else if (endpoint.ttl > 0) {
    headers['cache-control'] = `public, max-age=0, s-maxage=${endpoint.ttl}, stale-while-revalidate=${Math.min(
      endpoint.ttl * 4,
      86400,
    )}`;
  } else if (isImage || isSvg) {
    headers['cache-control'] = 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600';
  } else {
    headers['cache-control'] = 'no-store';
  }

  const download = firstValue(query.__download) === '1';
  if (download) headers['content-disposition'] = `attachment; filename="${endpoint.id}"`;

  // 文本类上游统一转成 UTF-8，避免 GBK 响应在浏览器里变乱码
  const textual =
    contentType.startsWith('text/') ||
    /json|xml|javascript|geo\+json|x-www-form-urlencoded/i.test(contentType);

  if (textual) {
    let body = buffer.toString('utf8');
    const charsetMatch = /charset=["']?([\w-]+)/i.exec(contentType);
    const charset = (endpoint.charset || (charsetMatch ? charsetMatch[1] : 'utf-8')).toLowerCase();
    if (charset && !['utf-8', 'utf8', 'us-ascii'].includes(charset)) {
      try {
        body = new TextDecoder(charset).decode(buffer);
      } catch {
        /* 保留 utf8 结果 */
      }
    }

    const processed = raw ? null : processResponse(endpoint.process, buffer, contentType, body);
    if (processed) {
      body = processed.body;
    }

    if (pick) {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        const fallback = body.trim();
        if (upstream.ok) {
          return sendText(res, 200, fallback, headers);
        }
        return sendJson(res, upstream.status, { ok: false, error: fallback.slice(0, 500), code: 'UPSTREAM_ERROR' }, headers);
      }
      const picked = pickPath(parsed, pick);
      if (picked === undefined) {
        return sendJson(res, 404, { ok: false, error: `字段 ${pick} 不存在`, code: 'PICK_NOT_FOUND', endpoint: endpoint.id }, headers);
      }
      return sendJson(res, 200, { ok: true, pick, data: picked }, headers);
    }

    return sendText(res, upstream.status, body, {
      ...headers,
      'content-type': processed
        ? processed.contentType
        : /^text\/html/i.test(contentType)
          ? 'text/plain; charset=utf-8'
          : `${contentType.split(';')[0]}; charset=utf-8`,
    });
  }

  if (pick) {
    return sendJson(res, 400, {
      ok: false,
      error: '二进制 / 图片响应不支持 __pick，请直接使用图片地址',
      code: 'PICK_NOT_SUPPORTED',
    });
  }

  return sendBuffer(res, upstream.status, buffer, contentType, headers);
}

module.exports = { handler, buildUpstreamUrl };
