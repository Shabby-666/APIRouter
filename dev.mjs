/**
 * 本地开发服务器：模拟 Vercel 的静态站点 + Serverless Functions。
 * 运行：npm run dev  （无需任何依赖）
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

const catalogHandler = require('./api/index.js');
const healthHandler = require('./api/health.js');
const { handler: proxyHandler } = require('./lib/proxy.js');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function serveStatic(req, res, pathname) {
  let filePath = path.join(ROOT, decodeURIComponent(pathname));
  if (!filePath.startsWith(ROOT)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }
  if (pathname === '/' || pathname === '') filePath = path.join(ROOT, 'index.html');
  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      res.statusCode = 404;
      res.setHeader('content-type', 'text/plain; charset=utf-8');
      return res.end('404 Not Found');
    }
    res.statusCode = 200;
    res.setHeader('content-type', MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    res.setHeader('cache-control', 'no-cache');
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (pathname === '/api' || pathname === '/api/') {
    req.query = Object.fromEntries(url.searchParams);
    return catalogHandler(req, res);
  }

  if (pathname === '/api/health') {
    req.query = Object.fromEntries(url.searchParams);
    return healthHandler(req, res);
  }

  if (pathname.startsWith('/api/r/')) {
    const id = pathname.slice('/api/r/'.length).replace(/\/$/, '');
    req.query = { id, ...Object.fromEntries(url.searchParams) };
    return proxyHandler(req, res);
  }

  if (pathname.startsWith('/api/')) {
    res.statusCode = 404;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: 'API 路由不存在' }, null, 2));
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  API Router  ▸  http://localhost:${PORT}\n`);
});
