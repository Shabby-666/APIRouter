const { publicCatalog } = require('../lib/registry');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-methods', 'GET,OPTIONS');
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: '仅支持 GET 请求' }));
  }

  const proto = (
    req.headers['x-forwarded-proto'] || (req.socket && req.socket.encrypted ? 'https' : 'http')
  ).split(',')[0];
  const host = (req.headers['x-forwarded-host'] || req.headers.host || 'localhost').split(',')[0];
  const catalog = publicCatalog();

  const payload = {
    ok: true,
    ...catalog,
    baseUrl: `${proto}://${host}`,
    usage: {
      proxy: '/api/r/:id?...',
      pick: '?__pick=data.url 提取 JSON 字段',
      raw: '?__raw=1 跳过加工，返回上游原始响应',
      download: '?__download=1 以附件形式下载',
      health: '/api/health',
      rateLimit: '120 次 / 分钟 / IP（尽力而为）',
    },
  };

  res.statusCode = 200;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('cache-control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
  res.end(JSON.stringify(payload, null, 2));
};
