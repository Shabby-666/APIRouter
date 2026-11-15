/**
 * 本地工具接口：不依赖任何上游，永远在线。
 */
const crypto = require('crypto');

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
};

function runLocal(id, query) {
  const handler = handlers[id];
  if (!handler) {
    const error = new Error(`未知的本地工具：${id}`);
    error.statusCode = 404;
    throw error;
  }
  return handler(query);
}

module.exports = { runLocal, handlers };
