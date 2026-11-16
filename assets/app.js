/* ============================================================
   API Router · 前端逻辑（零依赖）
   ============================================================ */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const THEME_KEY = 'apirouter:theme';
  const LAST_DEBUG_KEY = 'apirouter:last-debug';

  const state = {
    catalog: null,
    endpoints: [],
    categories: [],
    cat: 'all',
    provider: 'all',
    rtype: 'all',
    query: '',
    onlineOnly: false,
    health: null,
    healthAt: 0,
    active: null,
    last: null,
    responseTab: 'body',
    snippetTab: 'curl',
    quickTab: 'curl',
    sending: false,
    blobUrl: null,
  };

  const WEATHER = {
    0: '晴',
    1: '大部晴朗',
    2: '局部多云',
    3: '阴',
    45: '雾',
    48: '雾凇',
    51: '小毛毛雨',
    53: '毛毛雨',
    55: '强毛毛雨',
    56: '冻毛毛雨',
    57: '强冻毛毛雨',
    61: '小雨',
    63: '中雨',
    65: '大雨',
    66: '冻雨',
    67: '强冻雨',
    71: '小雪',
    73: '中雪',
    75: '大雪',
    77: '米雪',
    80: '阵雨',
    81: '强阵雨',
    82: '暴雨',
    85: '阵雪',
    86: '强阵雪',
    95: '雷暴',
    96: '雷暴伴冰雹',
    99: '强雷暴伴冰雹',
  };

  const QUICK_QUERY = ['天气', '随机图片', '网易云', '热搜', '汇率', 'UUID'];

  /* ---------- 线性图标 ---------- */
  const ICONS = {
    grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    image:
      '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m3 15 5-4 4 3 3-2 6 5"/>',
    weather:
      '<circle cx="8" cy="8" r="3"/><path d="M8 2.8V4M8 12v1.2M3.2 8H4.4M11.6 8h1.2M4.6 4.6l.9.9M10.5 10.5l.9.9M11.4 4.6l-.9.9"/><path d="M9 19h8.5a3 3 0 0 0 .4-6 4.4 4.4 0 0 0-8.4-1.2A3.4 3.4 0 0 0 9 19Z"/>',
    text: '<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="m15 7 2 2"/>',
    music:
      '<circle cx="7" cy="17" r="2.5"/><circle cx="18" cy="15" r="2.5"/><path d="M9.5 17V6l11-2v11"/>',
    dev: '<path d="m9 8-4 4 4 4M15 8l4 4-4 4M13 5l-2 14"/>',
    finance: '<path d="M4 19V5M4 19h16"/><path d="m7 15 4-4 3 3 5-6"/>',
    news: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M7 9h6M7 12h6M7 15h4M16 9h1M16 12h1M16 15h1"/>',
    sparkle:
      '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="M18 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/>',
    tool: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="m16 16 4.5 4.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 6.4"/><path d="M20 4v7h-7"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M15 5.5A1.5 1.5 0 0 0 13.5 4H5.5A1.5 1.5 0 0 0 4 5.5v8A1.5 1.5 0 0 0 5.5 15"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    alert: '<path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5M12 17v.5"/>',
    close: '<path d="M5 5l14 14M19 5 5 19"/>',
    external: '<path d="M7 17 17 7M8 7h9v9"/>',
    hash: '<path d="M9 3 7 21M17 3l-2 18M4 8h16M3 16h16"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
    globe:
      '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.8 5.4 3.8 8.5s-1.3 6-3.8 8.5c-2.5-2.5-3.8-5.4-3.8-8.5S9.5 6 12 3.5Z"/>',
    qr: '<rect x="3.5" y="3.5" width="6" height="6" rx=".5"/><rect x="14.5" y="3.5" width="6" height="6" rx=".5"/><rect x="3.5" y="14.5" width="6" height="6" rx=".5"/><path d="M14.5 14.5h2v2h-2zM20.5 14.5v2M18.5 20.5h2M14.5 20.5h1"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
    pin: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
    wind: '<path d="M3 8h10a2.5 2.5 0 1 0-2.5-3M3 12h14a2.5 2.5 0 1 1-2.5 3M3 16h7"/>',
    quote: '<path d="M9.5 6H5v6h4.5v3H5M19.5 6H15v6h4.5v3H15"/>',
    lyrics: '<path d="M4 5h16M4 10h16M4 15h10M4 20h6"/>',
    flame:
      '<path d="M12 3c3 4 5.5 6.2 5.5 10a5.5 5.5 0 0 1-11 0C6.5 9.2 9 7 12 3Z"/><path d="M12 21a2.5 2.5 0 0 0 2.5-2.5c0-1.6-2.5-4-2.5-4s-2.5 2.4-2.5 4A2.5 2.5 0 0 0 12 21Z"/>',
    calendar:
      '<rect x="3.5" y="5" width="17" height="15" rx="1.5"/><path d="M3.5 9h17M8 3v4M16 3v4"/>',
    language:
      '<path d="M3 5h9M7.5 5v2c0 3-2 6-4.5 7M5 9c1 2.5 3 4.5 5.5 5.5M13 20l4-10 4 10M14.5 16h5"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5Z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20"/>',
    chat: '<path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9h8M8 12h5"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.1M4 12h.1M4 18h.1"/>',
    play: '<circle cx="12" cy="12" r="8.5"/><path d="m10 8.5 5.5 3.5-5.5 3.5v-7Z"/>',
    package:
      '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    activity: '<path d="M3 12h4l2.5-7 4 14L16 12h5"/>',
    rocket:
      '<path d="M12 3c3 2 4.5 5 4.5 9l-2 2h-5l-2-2c0-4 1.5-7 4.5-9Z"/><circle cx="12" cy="9" r="1.5"/><path d="M9.5 14 7 18l3-1M14.5 14 17 18l-3-1M12 14v6"/>',
    key: '<circle cx="8" cy="15" r="3.5"/><path d="m10.5 12.5 8-8M16 5l3 3M14 7l3 3"/>',
    palette:
      '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.6-.2-1-.6-1.4-.4-.4-.6-.8-.6-1.4 0-1.1.9-2 2-2H16a5 5 0 0 0 5-5c0-3.3-4-6.2-9-6.2Z"/><circle cx="7.5" cy="10" r=".8"/><circle cx="10.5" cy="7" r=".8"/><circle cx="14.5" cy="7.5" r=".8"/><circle cx="17" cy="10.5" r=".8"/>',
    branch:
      '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="8" r="2.5"/><path d="M6 8.5v7M18 10.5c0 4-4 3-7.5 4.5"/>',
    terminal: '<path d="m5 7 5 5-5 5M12 17h7"/>',
    barcode: '<path d="M4 6v12M7 6v12M10 6v9M13 6v12M16 6v9M19 6v12"/>',
    waves:
      '<path d="M3 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
    bulb: '<path d="M9 18h6M10 21h4M8 14a5.5 5.5 0 1 1 8 0c-.9.8-1.5 1.8-1.5 3h-5c0-1.2-.6-2.2-1.5-3Z"/>',
    paw: '<circle cx="7" cy="8" r="1.6"/><circle cx="11" cy="6" r="1.6"/><circle cx="15" cy="7" r="1.6"/><circle cx="18" cy="10" r="1.5"/><path d="M8 17c0-2.5 2-4.5 4.5-4.5S17 14.5 17 17c0 1.7-1.4 3-3.1 3-.9 0-1.5-.4-2.1-.4s-1.2.4-2.1.4A2.8 2.8 0 0 1 8 17Z"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="2.5"/><circle cx="9" cy="9" r=".9"/><circle cx="15" cy="9" r=".9"/><circle cx="12" cy="12" r=".9"/><circle cx="9" cy="15" r=".9"/><circle cx="15" cy="15" r=".9"/>',
  };

  const CATEGORY_ICON = {
    image: 'image',
    weather: 'weather',
    text: 'text',
    music: 'music',
    dev: 'dev',
    finance: 'finance',
    life: 'news',
    anime: 'sparkle',
    tool: 'tool',
  };

  const ENDPOINT_ICON = {
    'dicebear-avatar': 'user',
    qrcode: 'qr',
    barcode: 'barcode',
    placeholder: 'image',
    'air-quality': 'wind',
    geocoding: 'pin',
    marine: 'waves',
    wttr: 'terminal',
    hitokoto: 'quote',
    poetry: 'text',
    zenquotes: 'quote',
    kanye: 'quote',
    'dad-joke': 'quote',
    'useless-fact': 'bulb',
    'cat-fact': 'paw',
    'dog-fact': 'paw',
    dictionary: 'book',
    translate: 'language',
    'random-user': 'user',
    microlink: 'globe',
    'jina-reader': 'terminal',
    agify: 'user',
    nationalize: 'globe',
    'netease-lyric': 'lyrics',
    'netease-comments': 'chat',
    'netease-toplist': 'list',
    'netease-playlist': 'list',
    'netease-new': 'sparkle',
    'netease-song-url': 'play',
    'github-user': 'branch',
    'github-repo': 'branch',
    'github-zen': 'branch',
    'github-emojis': 'branch',
    'npm-package': 'package',
    'npm-downloads': 'package',
    'npm-search': 'package',
    'hn-top': 'news',
    'hn-item': 'news',
    jsonplaceholder: 'dev',
    httpbin: 'terminal',
    tinyurl: 'link',
    'random-org': 'dice',
    'ip-lookup': 'globe',
    'ipapi-is': 'globe',
    timeapi: 'clock',
    arxiv: 'book',
    crossref: 'book',
    'frankfurter-history': 'clock',
    'news-60s': 'news',
    'weibo-hot': 'flame',
    'douyin-hot': 'flame',
    'zhihu-hot': 'flame',
    'bilibili-hot': 'flame',
    holidays: 'calendar',
    'iss-location': 'globe',
    earthquake: 'activity',
    spacex: 'rocket',
    'met-museum': 'image',
    'countries-capital': 'globe',
    jikan: 'book',
    pokeapi: 'sparkle',
    uuid: 'hash',
    hash: 'hash',
    base64: 'dev',
    timestamp: 'clock',
    password: 'key',
    'random-int': 'dice',
    color: 'palette',
    lorem: 'text',
    urlcodec: 'link',
    'json-format': 'dev',
  };

  function icon(name, extraClass = '') {
    const body = ICONS[name] || ICONS.grid;
    return `<svg class="icon ${extraClass}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
  }

  function endpointIcon(endpoint) {
    return icon(ENDPOINT_ICON[endpoint.id] || CATEGORY_ICON[endpoint.category] || 'grid');
  }

  function categoryIcon(categoryId) {
    return icon(CATEGORY_ICON[categoryId] || 'grid');
  }

  /* ---------- 基础工具 ---------- */
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  function formatMs(ms) {
    if (!Number.isFinite(ms)) return '—';
    return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
  }

  function timeAgo(iso) {
    if (!iso) return '刚刚';
    const diff = Math.max(0, Date.now() - new Date(iso).getTime());
    if (diff < 15_000) return '刚刚';
    if (diff < 60_000) return `${Math.round(diff / 1000)} 秒前`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)} 分钟前`;
    if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} 小时前`;
    return `${Math.round(diff / 86_400_000)} 天前`;
  }

  function timeoutSignal(ms) {
    try {
      return typeof AbortSignal !== 'undefined' && AbortSignal.timeout
        ? AbortSignal.timeout(ms)
        : undefined;
    } catch {
      return undefined;
    }
  }

  function toast(message, type = 'ok') {
    const box = $('#toasts');
    const node = document.createElement('div');
    node.className = `toast ${type === 'err' ? 'err' : ''}`;
    node.innerHTML = `<span aria-hidden="true">${icon(type === 'err' ? 'alert' : 'check')}</span><span>${escapeHtml(
      message,
    )}</span>`;
    box.appendChild(node);
    setTimeout(() => {
      node.classList.add('out');
      setTimeout(() => node.remove(), 200);
    }, 2600);
  }

  async function copyText(text, label = '已复制') {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
      }
      toast(label);
    } catch {
      toast('复制失败，请手动选择文本', 'err');
    }
  }

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* ignore */
      }
    },
  };

  /* ---------- 主题 ---------- */
  function currentTheme() {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  }

  function paintTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const meta = $('#themeColor');
    if (meta) meta.content = theme === 'dark' ? '#131210' : '#f7f4ee';
    const button = $('#themeToggle');
    if (button) {
      const label = theme === 'dark' ? '切换到亮色主题' : '切换到暗色主题';
      button.setAttribute('aria-label', label);
      button.title = label;
    }
  }

  function initTheme() {
    paintTheme(currentTheme());
    const button = $('#themeToggle');
    if (!button) return;
    button.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      paintTheme(next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* ignore */
      }
    });
  }

  /* ---------- 真实信息 ---------- */
  function renderDate() {
    const now = new Date();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(
      now.getDate(),
    ).padStart(2, '0')} · ${weekdays[now.getDay()]}`;
    const dateNode = $('#todayDate');
    if (dateNode) dateNode.textContent = date;
    const clockNode = $('#liveClock');
    if (clockNode) {
      clockNode.textContent = now.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }
    const yearNode = $('#footerYear');
    if (yearNode) yearNode.textContent = String(now.getFullYear());
  }

  function renderLastDebug() {
    const node = $('#lastDebug');
    if (!node) return;
    let iso = null;
    try {
      iso = localStorage.getItem(LAST_DEBUG_KEY);
    } catch {
      /* ignore */
    }
    node.textContent = iso ? `上次调试 ${timeAgo(iso)}` : '尚未调试';
  }

  function markDebug() {
    try {
      localStorage.setItem(LAST_DEBUG_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    renderLastDebug();
  }

  /* ---------- 目录渲染 ---------- */
  function categoryMeta(id) {
    return state.categories.find((c) => c.id === id) || { name: id, icon: '' };
  }

  function matches(endpoint) {
    const q = state.query.trim().toLowerCase();
    if (state.cat !== 'all' && endpoint.category !== state.cat) return false;
    if (state.provider !== 'all' && endpoint.provider !== state.provider) return false;
    if (state.rtype !== 'all' && endpoint.responseType !== state.rtype) return false;
    if (state.onlineOnly && state.health) {
      const health = state.health.results[endpoint.id];
      if (!health || !health.ok) return false;
    }
    if (!q) return true;
    const haystack = [
      endpoint.name,
      endpoint.id,
      endpoint.desc,
      endpoint.category,
      categoryMeta(endpoint.category).name,
      endpoint.provider || '',
      endpoint.responseType || '',
      ...(endpoint.tags || []),
      ...(endpoint.params || []).map((p) => `${p.key} ${p.label} ${p.desc}`),
    ]
      .join(' ')
      .toLowerCase();
    return q.split(/\s+/).every((part) => haystack.includes(part));
  }

  function healthFor(endpoint) {
    if (endpoint.kind === 'local') return { ok: true, ms: 1, local: true, status: 200 };
    return state.health && state.health.results[endpoint.id];
  }

  function statusHtml(endpoint) {
    const h = healthFor(endpoint);
    if (!h) return '<span class="api-status" title="尚未检测"><i></i>未检测</span>';
    if (h.local) return '<span class="api-status up" title="本地执行"><i></i>本地</span>';
    if (!h.ok) {
      return `<span class="api-status down" title="上游异常${
        h.error ? '：' + escapeHtml(h.error) : ''
      }"><i></i>异常</span>`;
    }
    const slow = h.ms > 2500;
    return `<span class="api-status ${slow ? 'slow' : 'up'}" title="上游耗时 ${formatMs(h.ms)}"><i></i>${
      slow ? '较慢' : '正常'
    }</span>`;
  }

  function rowHtml(endpoint) {
    return `
      <article class="api-row" data-doc="${endpoint.id}" title="查看 API 文档">
        <span class="api-icon" aria-hidden="true">${endpointIcon(endpoint)}</span>
        <div class="api-main">
          <div class="api-heading">
            <h3>${escapeHtml(endpoint.name)}</h3>
            <code class="api-path">${escapeHtml(endpoint.path)}</code>
            ${statusHtml(endpoint)}
          </div>
          <p class="api-desc">${escapeHtml(endpoint.desc)}</p>
          <div class="api-tags">
            ${(endpoint.tags || []).slice(0, 3).map((t) => `<span>${escapeHtml(t)}</span>`).join('')}
          </div>
        </div>
        <div class="api-actions">
          <button class="text-btn" type="button" data-copy="${endpoint.id}" title="复制示例地址">复制</button>
          <button class="text-btn api-open" type="button" data-open-btn="${endpoint.id}" title="打开调试界面">调试</button>
        </div>
      </article>`;
  }


  function syncFilterControls() {
    const cat = document.getElementById('filterCategory');
    if (cat) cat.value = state.cat;
    const prov = document.getElementById('filterProvider');
    if (prov) prov.value = state.provider;
    const rtype = document.getElementById('filterType');
    if (rtype) rtype.value = state.rtype;
  }

  function renderFilterOptions() {
    const catSel = document.getElementById('filterCategory');
    if (catSel) {
      const opts = ['<option value="all">全部分类</option>'].concat(
        state.categories.map((c) => '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>')
      );
      catSel.innerHTML = opts.join('');
      catSel.value = state.cat;
    }
    const provSel = document.getElementById('filterProvider');
    if (provSel) {
      const providers = Array.from(new Set(state.endpoints.map((e) => e.provider || '未知'))).sort((a,b)=>{
        if (a === '本地') return 1; if (b === '本地') return -1; return a.localeCompare(b);
      });
      provSel.innerHTML = ['<option value="all">全部提供商</option>'].concat(
        providers.map((p) => '<option value="' + escapeHtml(p) + '">' + escapeHtml(p) + '</option>')
      ).join('');
      provSel.value = state.provider;
    }
    syncFilterControls();
  }

  function renderFilters() {
    const all = state.endpoints.length;
    const items = [
      `<button class="filter ${state.cat === 'all' ? 'active' : ''}" data-cat="all" role="tab" aria-selected="${
        state.cat === 'all'
      }">${icon('grid')} 全部 <em>${all}</em></button>`,
      ...state.categories.map((c) => {
        const count = state.endpoints.filter((e) => e.category === c.id).length;
        return `<button class="filter ${state.cat === c.id ? 'active' : ''}" data-cat="${
          c.id
        }" role="tab" aria-selected="${state.cat === c.id}">${categoryIcon(c.id)} ${escapeHtml(
          c.name,
        )} <em>${count}</em></button>`;
      }),
    ];
    $('#filters').innerHTML = items.join('');
    syncFilterControls();
  }

  function renderGrid() {
    const list = state.endpoints.filter(matches);
    const grid = $('#grid');
    grid.innerHTML = list.map((endpoint) => rowHtml(endpoint)).join('');
    $('#resultCount').textContent = `${list.length} / ${state.endpoints.length} 个接口`;
    $('#emptyState').hidden = list.length > 0;
    grid.hidden = list.length === 0;
  }

  function renderQuickTags() {
    $('#quickTags').innerHTML = QUICK_QUERY.map(
      (q) => `<button type="button" data-quick="${q}">${q}</button>`,
    ).join('');
  }

  function renderStats() {
    $('#statTotal').textContent = state.endpoints.length;
    $('#statCats').textContent = state.categories.length;
    $('#heroBadge').textContent = `${state.endpoints.length} 个免费接口`;
  }

  /* ---------- 健康检查 ---------- */
  function applyHealth(health) {
    state.health = health;
    state.healthAt = Date.now();
    const values = Object.values(health.results);
    const up = values.filter((v) => v.ok).length;
    const down = values.length - up;
    const pill = $('#healthPill');
    pill.classList.remove('up', 'warn', 'down');
    if (down === 0) pill.classList.add('up');
    else if (up / values.length >= 0.6) pill.classList.add('warn');
    else pill.classList.add('down');
    $('#healthText').textContent = `接口 ${up} / ${values.length} 可用`;
    $('#healthShort').textContent = `${up}/${values.length}`;
    pill.title = `检测于 ${timeAgo(health.checkedAt)}，耗时 ${health.tookMs}ms`;

    const latencies = values
      .filter((v) => v.ok && !v.local && Number.isFinite(v.ms))
      .map((v) => v.ms);
    const avg = latencies.length
      ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length
      : null;

    const upNode = $('#statUp');
    if (upNode) upNode.textContent = `${up}/${values.length}`;
    const latencyNode = $('#statLatency');
    if (latencyNode) latencyNode.textContent = avg === null ? '—' : formatMs(avg);

    $$('#grid .api-row').forEach((row) => {
      const id = row.dataset.doc || row.dataset.open;
      const endpoint = state.endpoints.find((e) => e.id === id);
      if (!endpoint) return;
      const status = row.querySelector('.api-status');
      if (status) status.outerHTML = statusHtml(endpoint);
    });
    $('#resultCount').textContent = `${state.endpoints.filter(matches).length} / ${
      state.endpoints.length
    } 个接口`;
    if (state.onlineOnly) renderGrid();
  }

  async function loadHealth(force = false) {
    const pill = $('#healthPill');
    if (force) {
      pill.classList.remove('up', 'warn', 'down');
      $('#healthText').textContent = '检测中';
      $('#healthShort').textContent = '…';
    }
    try {
      const response = await fetch(`/api/health${force ? `?t=${Date.now()}` : ''}`, {
        cache: 'no-store',
        signal: timeoutSignal(30_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const health = await response.json();
      applyHealth(health);
    } catch {
      $('#healthText').textContent = '状态未知';
      $('#healthShort').textContent = '—';
      pill.classList.add('warn');
    }
  }

  /* ---------- 实时示例 ---------- */
  function refreshImage() {
    const img = $('#demoImage');
    const link = $('#demoImageLink');
    const src = `/api/r/alcy-image?style=ycy&r=${Date.now()}`;
    link.classList.remove('broken');
    img.onload = null;
    img.onerror = () => {
      img.onerror = null;
      link.classList.add('broken');
      img.src = '/assets/fallback.svg';
      link.href = '/api/r/anime-image?type=pc';
    };
    img.src = src;
    link.href = src;
  }

  async function refreshQuote() {
    const quote = $('#demoQuote');
    const from = $('#demoQuoteFrom');
    quote.textContent = '正在从上游取一句话…';
    try {
      const response = await fetch('/api/r/hitokoto?encode=json', {
        signal: timeoutSignal(8_000),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      quote.textContent = `“${data.hitokoto || '人生如逆旅，我亦是行人。'}”`;
      const source = [data.from, data.from_who].filter(Boolean).join(' · ');
      from.textContent = source || '佚名';
    } catch {
      quote.textContent = '“人生如逆旅，我亦是行人。”';
      from.textContent = '苏轼 · 离线兜底';
    }
  }

  function paintWeather({ temp, feels, humidity, wind, code, desc, daily }) {
    if (!Number.isFinite(Number(temp))) throw new Error('invalid temperature');
    const label = desc || WEATHER[code] || '未知';
    $('#demoTemp').textContent = `${Math.round(temp)}°`;
    $('#demoWeatherText').textContent = label;
    $('#demoWeatherExtra').textContent = `体感 ${Math.round(feels)}° · 湿度 ${humidity}% · 风 ${wind} km/h`;

    const range = $('#demoWeatherRange');
    if (range) {
      const highs = ((daily && daily.temperature_2m_max) || []).filter((v) => Number.isFinite(Number(v)));
      const lows = ((daily && daily.temperature_2m_min) || []).filter((v) => Number.isFinite(Number(v)));
      range.textContent =
        highs.length && lows.length
          ? `今日 ${Math.round(Math.min(...lows))}° – ${Math.round(Math.max(...highs))}°`
          : '北京';
    }
  }

  async function refreshWeather() {
    const url =
      '/api/r/weather?latitude=39.9042&longitude=116.4074&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=Asia/Shanghai&forecast_days=6';
    try {
      const response = await fetch(url, { signal: timeoutSignal(12_000) });
      if (!response.ok) throw new Error();
      const data = await response.json();
      const current = data.current || {};
      paintWeather({
        temp: current.temperature_2m,
        feels: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        wind: current.wind_speed_10m,
        code: current.weather_code,
        daily: data.daily,
      });
      return;
    } catch {
      /* 备用上游 */
    }

    try {
      const response = await fetch('/api/r/wttr?city=北京&format=j1&lang=zh', {
        signal: timeoutSignal(12_000),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      const current = (data.current_condition || [])[0] || {};
      const days = (data.weather || []).slice(0, 6);
      paintWeather({
        temp: Number(current.temp_C),
        feels: Number(current.FeelsLikeC),
        humidity: current.humidity,
        wind: current.windspeedKmph,
        code: Number(current.weatherCode),
        desc: ((current.lang_zh || [])[0] || (current.weatherDesc || [])[0] || {}).value,
        daily: {
          temperature_2m_max: days.map((d) => Number(d.maxtempC)),
          temperature_2m_min: days.map((d) => Number(d.mintempC)),
        },
      });
    } catch {
      $('#demoTemp').textContent = '—';
      $('#demoWeatherText').textContent = '上游暂不可用';
      $('#demoWeatherExtra').textContent = '稍后刷新页面重试';
      const range = $('#demoWeatherRange');
      if (range) range.textContent = '北京';
    }
  }

  /* ---------- 文档代码 ---------- */
  function quickSnippet(tab) {
    const url = `${location.origin}/api/r/hitokoto`;
    if (tab === 'fetch') {
      return `const res = await fetch("${url}");\nconst data = await res.json();\n\nconsole.log(data.hitokoto, "——", data.from);`;
    }
    if (tab === 'python') {
      return `import requests\n\nr = requests.get("${url}", timeout=10)\nprint(r.json()["hitokoto"])`;
    }
    return `curl -s "${url}"\n# {"hitokoto":"...", "from":"..."}`;
  }

  function renderQuickCode() {
    $('#quickCode').textContent = quickSnippet(state.quickTab);
  }

  /* ---------- 调试弹窗 ---------- */
  function endpointById(id) {
    return state.endpoints.find((e) => e.id === id) || null;
  }

  function paramsOf(endpoint) {
    const saved = store.get(`apirouter:params:${endpoint.id}`, null);
    const values = {};
    for (const param of endpoint.params || []) {
      values[param.key] =
        saved && typeof saved[param.key] === 'string' ? saved[param.key] : param.example || '';
    }
    return values;
  }

  function buildQuery(endpoint, values) {
    const used = new Set();
    let template = endpoint.path;
    const search = new URLSearchParams();
    for (const param of endpoint.params || []) {
      const value = values[param.key];
      if (value === undefined || value === '') continue;
      if (template.includes(`{${param.key}}`)) {
        template = template.split(`{${param.key}}`).join(encodeURIComponent(value));
        used.add(param.key);
      } else {
        search.set(param.key, value);
      }
    }
    const query = search.toString();
    return query ? `${template}?${query}` : template;
  }

  function absolute(path) {
    return `${location.origin}${path}`;
  }

  function updateUrlPreview() {
    const endpoint = state.active;
    if (!endpoint) return;
    const values = {};
    $$('#paramForm [data-key]').forEach((input) => {
      values[input.dataset.key] = input.value;
    });
    store.set(`apirouter:params:${endpoint.id}`, values);
    const path = buildQuery(endpoint, values);
    $('#urlPreview').textContent = path;
    $('#urlPreview').title = absolute(path);
    $('#openUrl').href = path;
    if (state.responseTab === 'request' && state.last) renderResponse();
    $('#snippetCode').textContent = snippetFor(state.snippetTab, path, endpoint);
  }

  function snippetFor(tab, path, endpoint) {
    const url = absolute(path);
    const binary = endpoint.category === 'image';
    const plainText =
      endpoint.category === 'image' ||
      endpoint.id === 'jina-reader' ||
      (endpoint.tags || []).some((tag) => tag.includes('纯文本'));
    if (tab === 'curl') {
      return binary ? `curl -sL "${url}" -o "${endpoint.id}.img"` : `curl -s "${url}"`;
    }
    if (tab === 'fetch') {
      if (binary) {
        return `const res = await fetch("${url}");\nconst blob = await res.blob();\ndocument.querySelector("img").src = URL.createObjectURL(blob);`;
      }
      if (plainText) {
        return `const res = await fetch("${url}");\nconst text = await res.text();\nconsole.log(text);`;
      }
      return `const res = await fetch("${url}");\nconst data = await res.json();\nconsole.log(data);`;
    }
    if (binary) {
      return `import requests\n\nr = requests.get("${url}", timeout=20)\nopen("${endpoint.id}.img", "wb").write(r.content)`;
    }
    if (plainText) {
      return `import requests\n\nr = requests.get("${url}", timeout=20)\nprint(r.text)`;
    }
    return `import requests\n\nr = requests.get("${url}", timeout=20)\nprint(r.json())`;
  }

  function openModal(endpoint) {
    state.active = endpoint;
    state.last = null;
    state.responseTab = 'body';
    state.snippetTab = 'curl';
    $('#modalIcon').innerHTML = endpointIcon(endpoint);
    $('#modalTitle').textContent = endpoint.name;
    $('#modalPath').textContent = endpoint.path;
    $('#modalDesc').textContent = endpoint.desc;
    const note = $('#modalNote');
    if (endpoint.note) {
      note.hidden = false;
      note.textContent = `注意：${endpoint.note}`;
    } else {
      note.hidden = true;
    }
    const docs = $('#modalDocs');
    if (docs) {
      docs.hidden = false;
      docs.onclick = (e) => {
        e.preventDefault();
        closeModal();
        openDocs(endpoint);
      };
    }

    const values = paramsOf(endpoint);
    const form = $('#paramForm');
    const cat = categoryMeta(endpoint.category);
    const meta = $('#modalMeta');
    if (meta) {
      meta.innerHTML = [
        `<span>分类 <b>${escapeHtml(cat.name)}</b></span>`,
        `<span>${endpoint.kind === 'local' ? '本地执行' : '服务端中转'}</span>`,
        `<span>缓存 <b>${endpoint.ttl > 0 ? `${endpoint.ttl}s` : '实时'}</b></span>`,
        ...(endpoint.tags || []).slice(0, 2).map((tag) => `<span>${escapeHtml(tag)}</span>`),
      ].join('');
    }
    const shortcut = /Mac|iPhone|iPad/i.test(navigator.platform || '') ? '⌘↵' : 'Ctrl↵';
    const kbd = $('#sendBtn kbd');
    if (kbd) kbd.textContent = shortcut;
    if (!endpoint.params || endpoint.params.length === 0) {
      form.innerHTML = '<p>这个接口不需要参数，直接发送即可。</p>';
    } else {
      form.innerHTML = endpoint.params
        .map((param) => {
          const value = values[param.key] ?? '';
          const wide = (param.label || '').length + (param.desc || '').length > 30;
          const control = param.options
            ? `<select data-key="${param.key}">${param.options
                .map(
                  (option) =>
                    `<option value="${escapeHtml(option)}" ${option === value ? 'selected' : ''}>${
                      option === '' ? '（不传）' : escapeHtml(option)
                    }</option>`,
                )
                .join('')}</select>`
            : `<input data-key="${param.key}" value="${escapeHtml(value)}" placeholder="${escapeHtml(
                param.example || '',
              )}" spellcheck="false" autocomplete="off" />`;
          return `<div class="field ${wide ? 'full' : ''}">
            <label for="f-${param.key}"><span>${escapeHtml(param.label || param.key)}${
              param.required ? ' <b class="req">*</b>' : ''
            }</span><code>${escapeHtml(param.key)}</code></label>
            ${control}
            <small title="${escapeHtml(param.desc || '')}">${escapeHtml(param.desc || '')}</small>
          </div>`;
        })
        .join('');
    }

    $$('#modal [data-tabs="response"] button').forEach((b) =>
      b.classList.toggle('active', b.dataset.tab === 'body'),
    );
    $$('#modal [data-tabs="snippet"] button').forEach((b) =>
      b.classList.toggle('active', b.dataset.tab === 'curl'),
    );
    $('#responseStatus').className = 'status-chip';
    $('#responseStatus').textContent = '—';
    $('#responseTime').textContent = '';
    $('#responseSize').textContent = '';
    renderEmptyResponse();

    updateUrlPreview();
    $('#modal').hidden = false;
    document.body.style.overflow = 'hidden';
    try {
      history.replaceState(null, '', `#api=${endpoint.id}`);
    } catch {
      /* ignore */
    }
    setTimeout(() => {
      const first = $('#paramForm input, #paramForm select');
      if (first) first.focus({ preventScroll: true });
    }, 60);
  }

  function closeModal() {
    $('#modal').hidden = true;
    document.body.style.overflow = '';
    if (state.blobUrl) {
      URL.revokeObjectURL(state.blobUrl);
      state.blobUrl = null;
    }
    state.active = null;
    state.last = null;
    if (location.hash.startsWith('#api=')) {
      try {
        history.replaceState(null, '', `${location.pathname}${location.search}`);
      } catch {
        /* ignore */
      }
    }
  }

  function renderParamTable(endpoint) {
    const params = endpoint.params || [];
    if (!params.length) {
      return '<p class="docs-muted">此接口无需参数，直接请求即可（部分接口仍支持可选透传参数）。</p>';
    }
    const rows = params.map((p) => {
      const req = p.required ? '<span class="docs-badge req">必填</span>' : '<span class="docs-badge opt">可选</span>';
      const opts = p.options && p.options.length ? `<div class="docs-sub"><b>可选值：</b>${p.options.map((o) => `<code>${escapeHtml(o === '' ? '(空)' : o)}</code>`).join(' ')}</div>` : '';
      const ex = p.example ? `<div class="docs-sub"><b>示例：</b><code>${escapeHtml(p.example)}</code></div>` : '';
      return `<tr>
        <td><code>${escapeHtml(p.key)}</code><div>${escapeHtml(p.label || '')}</div></td>
        <td>${req}</td>
        <td>${escapeHtml(p.desc || '')}${opts}${ex}</td>
      </tr>`;
    }).join('');
    return `<div class="docs-table-wrap"><table class="docs-table"><thead><tr><th>参数</th><th>必填</th><th>说明 / 示例</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function upstreamUsageHtml(endpoint) {
    const up = escapeHtml(endpoint.upstream || '—');
    const kind = endpoint.kind === 'local' ? '本地实现（本站服务直接处理，无需外部上游调用）' : 'HTTP 上游中转';
    let mapping = '';
    if (endpoint.kind !== 'local') {
      mapping = `<p>本站会将你传入的参数按接口定义映射/透传到上游接口，并返回处理后的结果（除非使用 <code>__raw=1</code> 获取上游原始响应）。</p>`;
      if ((endpoint.path || '').includes('{')) {
        mapping += `<p>路径中的 <code>{参数}</code> 会被替换为对应参数值后再请求上游。</p>`;
      }
      if (endpoint.process) {
        mapping += `<p>响应处理：<code>${escapeHtml(endpoint.process)}</code>（本站会对上游响应做结构整理/字段提取，便于直接使用）。</p>`;
      }
    } else {
      mapping = `<p>该接口由本站本地逻辑实现，输入参数与行为以本文档为准，返回结构化 JSON 结果。</p>`;
    }
    return `
      <section class="docs-section">
        <h4>上游 / 实现方式</h4>
        <dl class="docs-dl">
          <div><dt>类型</dt><dd>${kind}</dd></div>
          <div><dt>上游地址</dt><dd><code>${up}</code></dd></div>
          <div><dt>本站路径</dt><dd><code>${escapeHtml(endpoint.path)}</code></dd></div>
          <div><dt>缓存 (TTL)</dt><dd>${endpoint.ttl > 0 ? `${endpoint.ttl} 秒` : '实时 / 不缓存'}</dd></div>
        </dl>
        ${mapping}
      </section>`;
  }

  function openDocs(endpoint) {
    if (!endpoint) return;
    const modal = $('#docsModal');
    const cat = categoryMeta(endpoint.category);
    $('#docsIcon').innerHTML = endpointIcon(endpoint);
    $('#docsTitle').textContent = endpoint.name;
    $('#docsPath').textContent = endpoint.path;
    const example = endpoint.example || endpoint.path;
    const tags = (endpoint.tags || []).map((t) => `<span class="docs-tag">${escapeHtml(t)}</span>`).join('');
    const note = endpoint.note ? `<section class="docs-section docs-note"><h4>注意事项</h4><p>${escapeHtml(endpoint.note)}</p></section>` : '';
    const common = `<section class="docs-section"><h4>通用参数（本站支持）</h4>
      <ul class="docs-list">
        <li><code>__pick</code>：从 JSON 响应中提取字段，如 <code>data.0.name</code></li>
        <li><code>__raw=1</code>：返回上游原始响应（不做本站加工）</li>
        <li><code>__download=1</code>：以附件形式下载（适用于图片/文件类响应）</li>
        <li>未传参数时，本站可能自动填充示例参数以便直接调用（以实际返回为准）</li>
      </ul></section>`;
    $('#docsBody').innerHTML = `
      <div class="docs-hero">
        <p>${escapeHtml(endpoint.desc || '')}</p>
        <div class="docs-meta-line">${tags}<span class="docs-tag muted">分类：${escapeHtml(cat.name || '')}</span><span class="docs-tag muted">ID：${escapeHtml(endpoint.id)}</span></div>
      </div>
      <section class="docs-section">
        <h4>请求方式</h4>
        <p>通过本站统一入口调用（GET）：</p>
        <pre class="docs-pre"><code>${escapeHtml(absolute(endpoint.path))}</code></pre>
        <p>示例请求：</p>
        <pre class="docs-pre"><code>${escapeHtml(absolute(example))}</code></pre>
      </section>
      <section class="docs-section">
        <h4>请求参数</h4>
        ${renderParamTable(endpoint)}
      </section>
      ${upstreamUsageHtml(endpoint)}
      ${note}
      ${common}
      <section class="docs-section">
        <h4>调用示例</h4>
        <pre class="docs-pre"><code>${escapeHtml(`curl -s "${absolute(example)}"`)}\n\n${escapeHtml(`fetch("${absolute(example)}").then(r=>r.json()).then(console.log)`)}\n\n${escapeHtml(`import requests\nprint(requests.get("${absolute(example)}").json())`)}</code></pre>
      </section>
    `;
    const debugBtn = $('#docsDebugBtn');
    if (debugBtn) {
      debugBtn.onclick = () => { closeDocs(); openModal(endpoint); };
    }
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    try { history.replaceState(null, '', `#doc=${endpoint.id}`); } catch {}
  }

  function closeDocs() {
    const modal = $('#docsModal');
    if (modal) modal.hidden = true;
    document.body.style.overflow = '';
    if (location.hash.startsWith('#doc=')) {
      try { history.replaceState(null, '', `${location.pathname}${location.search}`); } catch {}
    }
  }

  function openFromHash() {
    const hash = location.hash || '';
    let match = /^#doc=([\w-]+)$/.exec(hash);
    if (match) {
      const endpoint = endpointById(decodeURIComponent(match[1]));
      if (endpoint) openDocs(endpoint);
      return;
    }
    match = /^#api=([\w-]+)$/.exec(hash);
    if (match) {
      const endpoint = endpointById(decodeURIComponent(match[1]));
      if (endpoint) openModal(endpoint);
    }
  }

  function renderEmptyResponse() {
    $('#responseBody').innerHTML = `
      <div class="response-empty">
        ${icon('terminal')}
        <p>点击「发送请求」查看真实响应</p>
        <small>请求经过本站中转，自动带上 CORS 与缓存头</small>
      </div>`;
  }

  function highlightJson(text) {
    const pattern =
      /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)/g;
    let out = '';
    let cursor = 0;
    let match;
    while ((match = pattern.exec(text))) {
      out += escapeHtml(text.slice(cursor, match.index));
      if (match[1] !== undefined) {
        out += `<span class="${match[2] ? 'tok-key' : 'tok-str'}">${escapeHtml(match[1])}</span>`;
        if (match[2]) out += escapeHtml(match[2]);
      } else if (match[3] !== undefined) {
        out += `<span class="${match[3] === 'null' ? 'tok-null' : 'tok-bool'}">${match[3]}</span>`;
      } else {
        out += `<span class="tok-num">${match[4]}</span>`;
      }
      cursor = pattern.lastIndex;
    }
    out += escapeHtml(text.slice(cursor));
    return out;
  }

  function renderResponse() {
    const body = $('#responseBody');
    const last = state.last;
    if (!last) return renderEmptyResponse();

    if (state.responseTab === 'headers') {
      body.innerHTML = `<dl class="header-list">${last.headers
        .map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`)
        .join('')}</dl>`;
      return;
    }

    if (state.responseTab === 'request') {
      body.innerHTML = `<pre class="response-pre"><span class="req-line">GET ${escapeHtml(
        last.url,
      )}</span>${escapeHtml(
        [
          'accept: */*',
          'user-agent: Mozilla/5.0 ... (API Router Demo)',
          '',
          `# 经 API Router 转发，上游耗时 ${formatMs(last.ms)}`,
          `# 接收 ${formatBytes(last.size)}，状态 ${last.status}`,
        ].join('\n'),
      )}</pre>`;
      return;
    }

    if (last.kind === 'image' && last.blobUrl) {
      body.innerHTML = `
        <div class="image-preview">
          <img src="${last.blobUrl}" alt="接口返回的图片" />
          <div class="image-tools">
            <span>${escapeHtml(last.contentType)} · ${formatBytes(last.size)}</span>
            <a class="text-btn" href="${last.blobUrl}" target="_blank" rel="noreferrer">新窗口查看</a>
            <a class="text-btn" href="${escapeHtml(last.url)}${
              last.url.includes('?') ? '&' : '?'
            }__download=1" download>下载</a>
          </div>
        </div>`;
      return;
    }

    if (last.kind === 'json') {
      body.innerHTML = `<pre class="response-pre json">${highlightJson(last.pretty)}</pre>`;
      return;
    }

    body.innerHTML = `<pre class="response-pre">${escapeHtml(last.body)}</pre>`;
  }

  function setTabs(group, tab) {
    $$(`[data-tabs="${group}"] button`).forEach((button) =>
      button.classList.toggle('active', button.dataset.tab === tab),
    );
  }

  async function sendRequest() {
    if (!state.active || state.sending) return;
    const endpoint = state.active;
    const path = $('#urlPreview').textContent;
    const button = $('#sendBtn');
    const status = $('#responseStatus');

    state.sending = true;
    button.classList.add('loading');
    button.disabled = true;
    status.className = 'status-chip load';
    status.textContent = '请求中';
    $('#responseTime').textContent = '';
    $('#responseSize').textContent = '';

    const started = performance.now();
    try {
      const response = await fetch(path, { headers: { accept: '*/*' } });
      const blob = await response.blob();
      const ms = performance.now() - started;
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const headers = Array.from(response.headers.entries());
      const text = await blob.text();

      if (state.blobUrl) URL.revokeObjectURL(state.blobUrl);
      state.blobUrl = null;

      const kind = contentType.startsWith('image/')
        ? 'image'
        : /json/.test(contentType) || /^\s*[[{]/.test(text)
          ? 'json'
          : 'text';

      let pretty = text;
      if (kind === 'json') {
        try {
          pretty = JSON.stringify(JSON.parse(text), null, 2);
        } catch {
          pretty = text;
        }
      }

      const LIMIT = 150_000;
      const truncate = (value) =>
        value.length > LIMIT
          ? `${value.slice(0, LIMIT)}\n\n… 内容过长，已截断（完整响应请用「新窗口打开」）`
          : value;
      pretty = truncate(pretty);
      const displayBody = truncate(text);

      if (kind === 'image') state.blobUrl = URL.createObjectURL(blob);

      state.last = {
        status: response.status,
        kind,
        contentType,
        headers,
        url: path,
        ms,
        size: blob.size,
        pretty,
        body: displayBody,
        blobUrl: state.blobUrl,
      };

      const ok = response.ok;
      status.className = `status-chip ${ok ? 'ok' : 'err'}`;
      status.textContent = `${response.status} ${response.statusText || (ok ? 'OK' : 'ERROR')}`;
      $('#responseTime').textContent = formatMs(ms);
      $('#responseSize').textContent = formatBytes(blob.size);
      state.responseTab = 'body';
      setTabs('response', 'body');
      renderResponse();

      if (!ok) toast(`上游返回 ${response.status}，可切换响应头查看`, 'err');
    } catch (error) {
      const ms = performance.now() - started;
      const message = `请求失败：${error.message}\n\n可能原因：\n· 网络不可达\n· 上游限流或超时\n· 该接口要求特殊参数`;
      state.last = {
        status: 0,
        kind: 'error',
        contentType: 'text/plain',
        headers: [],
        url: path,
        ms,
        size: 0,
        pretty: message,
        body: message,
        blobUrl: null,
      };
      status.className = 'status-chip err';
      status.textContent = '请求失败';
      $('#responseTime').textContent = formatMs(ms);
      $('#responseSize').textContent = '—';
      state.responseTab = 'body';
      setTabs('response', 'body');
      renderResponse();
      toast('请求失败，请检查网络或稍后再试', 'err');
    } finally {
      state.sending = false;
      button.classList.remove('loading');
      button.disabled = false;
      markDebug();
    }
  }

  /* ---------- 事件 ---------- */
  function bindEvents() {
    let timer = null;
    $('#search').addEventListener('input', (event) => {
      state.query = event.target.value;
      clearTimeout(timer);
      timer = setTimeout(renderGrid, 90);
    });

    const filterCategory = $('#filterCategory');
    if (filterCategory) filterCategory.addEventListener('change', (event) => {
      state.cat = event.target.value || 'all';
      renderFilters();
      renderGrid();
    });
    const filterProvider = $('#filterProvider');
    if (filterProvider) filterProvider.addEventListener('change', (event) => {
      state.provider = event.target.value || 'all';
      renderGrid();
    });
    const filterType = $('#filterType');
    if (filterType) filterType.addEventListener('change', (event) => {
      state.rtype = event.target.value || 'all';
      renderGrid();
    });
    const resetFilters = $('#resetFilters');
    if (resetFilters) resetFilters.addEventListener('click', () => {
      state.cat = 'all';
      state.provider = 'all';
      state.rtype = 'all';
      state.query = '';
      state.onlineOnly = false;
      const search = $('#search'); if (search) search.value = '';
      const online = $('#onlineOnly'); if (online) online.classList.remove('active');
      syncFilterControls();
      renderFilters();
      renderGrid();
    });

    $('#filters').addEventListener('click', (event) => {
      const button = event.target.closest('[data-cat]');
      if (!button) return;
      state.cat = button.dataset.cat;
      renderFilters();
      renderGrid();
    });

    $('#quickTags').addEventListener('click', (event) => {
      const button = event.target.closest('[data-quick]');
      if (!button) return;
      state.query = button.dataset.quick;
      $('#search').value = state.query;
      state.cat = 'all';
      renderFilters();
      renderGrid();
      $('#catalog').scrollIntoView({ behavior: 'smooth' });
    });

    $('#grid').addEventListener('click', async (event) => {
      const copy = event.target.closest('[data-copy]');
      if (copy) {
        event.stopPropagation();
        const endpoint = endpointById(copy.dataset.copy);
        if (endpoint) copyText(absolute(endpoint.example), '示例地址已复制');
        return;
      }
      const debugBtn = event.target.closest('[data-open-btn]');
      if (debugBtn) {
        event.stopPropagation();
        const endpoint = endpointById(debugBtn.dataset.openBtn);
        if (endpoint) openModal(endpoint);
        return;
      }
      const row = event.target.closest('[data-doc]');
      if (!row) return;
      const endpoint = endpointById(row.dataset.doc);
      if (endpoint) openDocs(endpoint);
    });

    $('#clearSearch').addEventListener('click', () => {
      state.query = '';
      state.cat = 'all';
      state.provider = 'all';
      state.rtype = 'all';
      state.onlineOnly = false;
      $('#search').value = '';
      $('#onlineOnly').classList.remove('active');
      syncFilterControls();
      renderFilters();
      renderGrid();
    });

    $('#onlineOnly').addEventListener('click', (event) => {
      state.onlineOnly = !state.onlineOnly;
      event.currentTarget.classList.toggle('active', state.onlineOnly);
      renderGrid();
    });

    $('#refreshHealth').addEventListener('click', (event) => {
      const button = event.currentTarget;
      const original = button.textContent;
      button.disabled = true;
      button.textContent = '检测中…';
      loadHealth(true).finally(() => {
        button.disabled = false;
        button.textContent = original;
        toast('上游状态已更新');
      });
    });

    $('#healthPill').addEventListener('click', () => {
      $('#catalog').scrollIntoView({ behavior: 'smooth' });
      loadHealth(true);
    });

    $('#refreshImage').addEventListener('click', refreshImage);
    $('#refreshQuote').addEventListener('click', refreshQuote);

    $('#modal').addEventListener('click', (event) => {
      if (event.target.closest('[data-close]')) closeModal();
    });
    const docsModal = $('#docsModal');
    if (docsModal) {
      docsModal.addEventListener('click', (event) => {
        if (event.target.closest('[data-docs-close]')) closeDocs();
      });
    }

    $('#paramForm').addEventListener('input', updateUrlPreview);
    $('#paramForm').addEventListener('change', updateUrlPreview);

    $('#resetBtn').addEventListener('click', () => {
      if (!state.active) return;
      try {
        localStorage.removeItem(`apirouter:params:${state.active.id}`);
      } catch {
        /* ignore */
      }
      openModal(state.active);
      toast('参数已重置为示例值');
    });

    $('#copyUrl').addEventListener('click', () =>
      copyText(absolute($('#urlPreview').textContent), '请求地址已复制'),
    );
    $('#copySnippet').addEventListener('click', () =>
      copyText($('#snippetCode').textContent, '代码已复制'),
    );
    $('#copyQuick').addEventListener('click', () =>
      copyText($('#quickCode').textContent, '代码已复制'),
    );
    $('#sendBtn').addEventListener('click', sendRequest);

    document.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-tabs] button[data-tab]');
      if (!tab) return;
      const group = tab.closest('[data-tabs]').dataset.tabs;
      const name = tab.dataset.tab;
      setTabs(group, name);
      if (group === 'response') {
        state.responseTab = name;
        renderResponse();
      } else if (group === 'snippet') {
        state.snippetTab = name;
        if (state.active) {
          $('#snippetCode').textContent = snippetFor(
            name,
            $('#urlPreview').textContent,
            state.active,
          );
        }
      } else if (group === 'quick') {
        state.quickTab = name;
        renderQuickCode();
      }
    });

    document.addEventListener('keydown', (event) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (event.key === '/' && !typing) {
        event.preventDefault();
        $('#search').focus();
        $('#search').select();
      }
      if (event.key === 'Escape') {
        const docsModal = $('#docsModal');
        if (docsModal && !docsModal.hidden) closeDocs();
        else if (!$('#modal').hidden) closeModal();
        else if (document.activeElement === $('#search')) $('#search').blur();
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !$('#modal').hidden) {
        event.preventDefault();
        sendRequest();
      }
    });
  }

  /* ---------- 启动 ---------- */
  async function boot() {
    initTheme();
    renderDate();
    renderQuickTags();
    renderQuickCode();
    renderLastDebug();
    bindEvents();
    refreshQuote();
    refreshWeather();
    setInterval(renderDate, 30_000);

    try {
      const response = await fetch('/api', {
        headers: { accept: 'application/json' },
        cache: 'no-store',
        signal: timeoutSignal(15_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const catalog = await response.json();
      if (!catalog || !Array.isArray(catalog.endpoints)) throw new Error('返回格式异常');

      state.catalog = catalog;
      state.endpoints = catalog.endpoints;
      state.categories = catalog.categories;

      renderStats();
      renderFilterOptions();
      renderFilters();
      renderGrid();
      refreshImage();
      loadHealth();
      openFromHash();
      window.addEventListener('hashchange', openFromHash);
    } catch (error) {
      $('#heroBadge').textContent = '接口清单加载失败';
      $('#grid').innerHTML = `
        <div class="empty-state" style="border-top:1px solid var(--line)">
          ${icon('alert')}
          <h3>未能读取接口清单</h3>
          <p>请确认站点运行在 Vercel（或本地 npm run dev）环境，且 /api 路由可访问。</p>
          <button class="text-btn" onclick="location.reload()">重新加载</button>
        </div>`;
      $('#resultCount').textContent = '0 个接口';
      toast(`加载失败：${error.message}`, 'err');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
