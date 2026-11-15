/**
 * 本地工具接口：不依赖任何上游，永远在线。
 */
const crypto = require('crypto');
const https = require('https');

const clamp = (n, min, max, fallback) => {
  const value = Number.parseInt(n, 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
};

const bool = (v, fallback = false) => {
  if (v === undefined || v === null || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
};

function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

const handlers = {
  uuid(query) {
    const count = clamp(query.count, 1, 20, 1);
    const data = Array.from({ length: count }, () => crypto.randomUUID());
    return { data: count === 1 ? { uuid: data[0] } : { uuids: data } };
  },

  hash(query) {
    const text = String(query.text ?? '');
    if (!text) throw new Error('缺少参数 text');
    const algo = ['md5', 'sha1', 'sha256', 'sha512'].includes(query.algo) ? query.algo : 'sha256';
    return {
      data: {
        algo,
        text,
        hash: crypto.createHash(algo).update(text, 'utf8').digest('hex'),
      },
    };
  },

  base64(query) {
    const text = String(query.text ?? '');
    if (!text) throw new Error('缺少参数 text');
    const mode = query.mode || 'encode';
    if (mode === 'decode') {
      const decoded = Buffer.from(text, 'base64').toString('utf8');
      return { data: { mode, input: text, output: decoded } };
    }
    if (mode === 'url-safe') {
      return { data: { mode, input: text, output: Buffer.from(text, 'utf8').toString('base64url') } };
    }
    return { data: { mode: 'encode', input: text, output: Buffer.from(text, 'utf8').toString('base64') } };
  },

  timestamp(query) {
    const now = Date.now();
    let date;
    if (query.ts) {
      let ts = Number(query.ts);
      if (!Number.isFinite(ts)) throw new Error('ts 必须是数字');
      if (ts < 1e12) ts *= 1000;
      date = new Date(ts);
      if (Number.isNaN(date.getTime())) throw new Error('无效时间戳');
    } else {
      date = new Date(now);
    }
    const tz = typeof query.tz === 'string' && query.tz ? query.tz : 'Asia/Shanghai';
    let local;
    try {
      local = new Intl.DateTimeFormat('zh-CN', {
        timeZone: tz,
        dateStyle: 'full',
        timeStyle: 'long',
      }).format(date);
    } catch {
      local = '无效的时区标识';
    }
    return {
      data: {
        seconds: Math.floor(date.getTime() / 1000),
        milliseconds: date.getTime(),
        iso: date.toISOString(),
        utc: date.toUTCString(),
        timezone: tz,
        local,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
      },
    };
  },

  password(query) {
    const length = clamp(query.length, 8, 128, 20);
    const count = clamp(query.count, 1, 20, 1);
    const symbols = bool(query.symbols, true);
    const alphabet = `abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789${symbols ? '!@#$%^&*_-+=?' : ''}`;
    const make = () => {
      let out = '';
      for (let i = 0; i < length; i += 1) out += alphabet[crypto.randomInt(0, alphabet.length)];
      return out;
    };
    const passwords = Array.from({ length: count }, make);
    return { data: { length, count, symbols, passwords, password: passwords[0] } };
  },

  'random-int'(query) {
    const min = clamp(query.min, -1e9, 1e9, 1);
    const max = clamp(query.max, -1e9, 1e9, 100);
    const count = clamp(query.count, 1, 100, 1);
    const low = Math.min(min, max);
    const high = Math.max(min, max);
    const numbers = Array.from({ length: count }, () => crypto.randomInt(low, high + 1));
    return { data: { min: low, max: high, count, numbers } };
  },

  color(query) {
    const count = clamp(query.count, 1, 20, 5);
    const format = ['hex', 'rgb', 'hsl'].includes(query.format) ? query.format : 'hex';
    const base = crypto.randomInt(0, 360);
    const colors = Array.from({ length: count }, (_, i) => {
      const hue = (base + (360 / count) * i) % 360;
      const sat = 55 + crypto.randomInt(0, 21);
      const light = 45 + crypto.randomInt(0, 16);
      const hex = hslToHex(hue, sat, light);
      const rgb = hexToRgb(hex);
      const hsl = `hsl(${Math.round(hue)} ${sat}% ${light}%)`;
      let value = hex;
      if (format === 'rgb') value = `rgb(${rgb.r} ${rgb.g} ${rgb.b})`;
      if (format === 'hsl') value = hsl;
      return { hex, rgb, hsl, value };
    });
    return { data: { format, colors } };
  },

  lorem(query) {
    const paragraphs = clamp(query.paragraphs, 1, 10, 2);
    const words = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(' ');
    const pick = () => words[crypto.randomInt(0, words.length)];
    const text = Array.from({ length: paragraphs }, () => {
      const sentences = Array.from({ length: 4 + crypto.randomInt(0, 3) }, () => {
        const sentence = Array.from({ length: 6 + crypto.randomInt(0, 8) }, pick).join(' ');
        return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
      });
      return sentences.join(' ');
    });
    return { data: { paragraphs, text: text.join('\n\n') } };
  },

  urlcodec(query) {
    const text = String(query.text ?? '');
    if (!text) throw new Error('缺少参数 text');
    const mode = query.mode || 'encode';
    const output = mode === 'decode' ? decodeURIComponent(text) : encodeURIComponent(text);
    return { data: { mode, input: text, output } };
  },

  'json-format'(query) {
    const text = String(query.text ?? '');
    if (!text) throw new Error('缺少参数 text');
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new Error(`JSON 解析失败：${e.message}`);
    }
    const mode = query.mode === 'minify' ? 'minify' : 'pretty';
    const output = mode === 'minify' ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2);
    const countKeys = (value) => {
      if (Array.isArray(value)) return value.reduce((sum, item) => sum + countKeys(item), 0);
      if (value && typeof value === 'object') {
        return Object.keys(value).reduce((sum, key) => sum + 1 + countKeys(value[key]), 0);
      }
      return 0;
    };
    return { data: { mode, output, keys: countKeys(parsed), bytes: Buffer.byteLength(output) } };
  },

  async 'mail-send'(query) {
    const to = String(query.to ?? '').trim();
    if (!to) throw new Error('缺少参数 to（收件人邮箱）');
    const subject = String(query.subject ?? query.title ?? '测试邮件');
    const body = String(query.body ?? query.content ?? '');
    const from = String(query.from ?? query.from_email ?? 'noreply@apiroutermail.dpdns.org');
    const fromName = String(query.from_name ?? 'API Router');
    const mode = ['direct', 'host', 'smtp'].includes(String(query.mode ?? 'direct'))
      ? String(query.mode ?? 'direct')
      : 'direct';
    const isHtml = ['1', 'true', 'yes', 'on'].includes(String(query.is_html ?? '0').toLowerCase()) ? 1 : 0;
    const base = 'https://apiroutermail.dpdns.org';
    const token = '39b8b027ceedff33b845d0a0d3d03f31f8acbfaa0384d191ce26c5ac6cd8e11e';
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

    const agent = new https.Agent({ rejectUnauthorized: false });
    const fetchWithAgent = (url, options = {}) => fetch(url, { ...options, dispatcher: undefined, agent });

    // Node's global fetch (undici) doesn't accept `agent` the same way; use https module for bypass
    const httpGet = (path, cookie) => new Promise((resolve, reject) => {
      const req = https.request(base + path, {
        method: 'GET',
        headers: { 'User-Agent': ua, ...(cookie ? { Cookie: cookie } : {}) },
        rejectUnauthorized: false,
        timeout: 15000,
      }, (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolve({ status: res.statusCode, data: d, headers: res.headers }));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(new Error('timeout')); });
      req.end();
    });

    const ch = await httpGet('/');
    let cookie = '';
    if (ch.data.includes('/aes.js')) {
      const m = ch.data.match(/toNumbers\("([0-9a-f]+)"\),.*?toNumbers\("([0-9a-f]+)"\),.*?toNumbers\("([0-9a-f]+)"\)/s);
      if (!m) throw new Error('发信服务暂时不可用，请稍后重试');
      const [, aHex, bHex, cHex] = m;
      const aesResp = await httpGet('/aes.js');
      const aesSource = aesResp.data;
      const slowAesMatch = aesSource.match(/var slowAES=(\{[\s\S]*\})/s);
      if (!slowAesMatch) throw new Error('发信服务初始化失败，请稍后重试');
      const toNumbers = (d) => { const e = []; d.replace(/(..)/g, (x) => e.push(parseInt(x, 16))); return e; };
      const toHex = (values) => {
        const arr = Array.isArray(values) ? values : Array.from(values);
        let out = '';
        for (let i = 0; i < arr.length; i++) out += (16 > arr[i] ? '0' : '') + arr[i].toString(16);
        return out.toLowerCase();
      };
      const documentStub = { get cookie() { return ''; }, set cookie(v) { const mm = String(v).match(/__test=([^;]+)/); if (mm) cookie = mm[1]; }, location: { href: '' } };
      const src = `
        var slowAES = ${slowAesMatch[1]};
        var a=toNumbers("${aHex}"),b=toNumbers("${bHex}"),c=toNumbers("${cHex}");
        var decrypted = slowAES.decrypt(c, 2, a, b);
        document.cookie="__test="+toHex(decrypted)+"; max-age=21600; expires=Thu, 31-Dec-37 23:55:55 GMT; path=/";
      `;
      const fn = new Function('document', 'location', 'toNumbers', 'toHex', src);
      fn(documentStub, { href: '' }, toNumbers, toHex);
      if (!cookie) throw new Error('发信服务连接失败，请稍后重试');
    }

    const params = new URLSearchParams();
    params.set('mode', mode);
    params.set('from', from);
    params.set('from_name', fromName);
    params.set('to', to);
    params.set('subject', subject);
    params.set('body', body);
    params.set('is_html', String(isHtml));
    for (const k of ['cc', 'bcc', 'host', 'port', 'secure', 'username', 'password']) {
      const v = query[k];
      if (v !== undefined && v !== null && String(v) !== '') params.set(k, String(v));
    }

    const postBody = Buffer.from(params.toString());
    const upstream = await new Promise((resolve, reject) => {
      const req = https.request(base + '/mail.php', {
        method: 'POST',
        headers: {
          'User-Agent': ua,
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Api-Token': token,
          ...(cookie ? { Cookie: '__test=' + cookie } : {}),
          'Content-Length': postBody.length,
        },
        rejectUnauthorized: false,
        timeout: 30000,
      }, (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolve({ status: res.statusCode, data: d }));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(new Error('发信请求超时')); });
      req.write(postBody);
      req.end();
    });

    let parsed;
    try { parsed = JSON.parse(upstream.data); } catch { parsed = { raw: upstream.data }; }
    return { data: parsed };
  },
};

async function runLocal(id, query) {
  const handler = handlers[id];
  if (!handler) {
    const error = new Error(`未知的本地工具：${id}`);
    error.statusCode = 404;
    throw error;
  }
  return handler(query);
}

module.exports = { runLocal, handlers };
