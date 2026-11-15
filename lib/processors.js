/**
 * 上游响应加工器
 * 把第三方接口的原始响应整理成更小、更稳定、前端更好用的结构。
 * 任何异常都会回退到原始响应，保证中转永远可用。
 */

function decodeText(buf, contentType = '') {
  const match = /charset=["']?([\w-]+)/i.exec(contentType);
  const label = match ? match[1].toLowerCase() : 'utf-8';
  try {
    if (label === 'utf-8' || label === 'utf8') return buf.toString('utf8');
    return new TextDecoder(label).decode(buf);
  } catch {
    return buf.toString('utf8');
  }
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const processors = {
  bingWallpaper({ text }) {
    const json = parseJson(text);
    const image = json && json.images && json.images[0];
    if (!image) return null;
    const base = 'https://www.bing.com';
    return {
      ...json,
      data: {
        date: image.startdate,
        endDate: image.enddate,
        title: image.title,
        copyright: image.copyright,
        url: base + image.url,
        full: image.urlbase ? `${base}${image.urlbase}_1920x1080.jpg` : base + image.url,
        thumbnail: image.urlbase ? `${base}${image.urlbase}_400x240.jpg` : base + image.url,
      },
    };
  },

  tencentQuote({ buf, text }) {
    let decoded = text || '';
    if (!decoded || decoded.includes('\uFFFD')) {
      try {
        decoded = new TextDecoder('gbk').decode(buf);
      } catch {
        decoded = buf.toString('utf8');
      }
    }
    const match = /v_([a-z0-9]+)="([^"]*)"/i.exec(decoded);
    if (!match) return null;
    const fields = match[2].split('~');
    const num = (i) => {
      const v = Number(fields[i]);
      return Number.isFinite(v) ? v : null;
    };
    return {
      ok: true,
      data: {
        code: fields[2],
        name: fields[1],
        price: num(3),
        prevClose: num(4),
        open: num(5),
        volume: num(6),
        time: fields[30],
        change: num(31),
        changePercent: num(32),
        high: num(33),
        low: num(34),
        amount: num(37),
        turnover: num(38),
        pe: num(39),
        pb: num(46),
        marketCap: num(45),
        raw: fields,
      },
    };
  },

  neteaseSearch({ text }) {
    const json = parseJson(text);
    if (!json || !json.result) return null;
    const songs = (json.result.songs || []).map((song) => ({
      id: song.id,
      name: song.name,
      artists: (song.ar || song.artists || []).map((a) => a.name),
      album: song.al ? song.al.name : song.album && song.album.name,
      cover: song.al ? song.al.picUrl : song.album && song.album.picUrl,
      duration: song.dt || song.duration,
      fee: song.fee,
    }));
    return {
      ok: true,
      data: {
        total: json.result.songCount || songs.length,
        songs,
      },
      raw: { code: json.code },
    };
  },

  neteaseSong({ text }) {
    const json = parseJson(text);
    if (!json || !json.songs) return null;
    const songs = json.songs.map((song) => ({
      id: song.id,
      name: song.name,
      artists: (song.ar || []).map((a) => a.name),
      album: song.al && song.al.name,
      cover: song.al && song.al.picUrl,
      duration: song.dt,
      publishTime: song.publishTime,
      popularity: song.pop,
    }));
    return { ok: true, data: { total: songs.length, songs } };
  },

  neteaseLyric({ text }) {
    const json = parseJson(text);
    if (!json) return null;
    return {
      ok: true,
      data: {
        lyric: (json.lrc && json.lrc.lyric) || '',
        translation: (json.tlyric && json.tlyric.lyric) || '',
        roma: (json.romalrc && json.romalrc.lyric) || '',
      },
    };
  },

  neteaseComments({ text }) {
    const json = parseJson(text);
    if (!json) return null;
    const map = (c) => ({
      user: c.user && c.user.nickname,
      avatar: c.user && c.user.avatarUrl,
      content: c.content,
      likedCount: c.likedCount,
      time: c.time,
    });
    const hot = (json.hotComments || []).map(map);
    const latest = (json.comments || []).map(map);
    return {
      ok: true,
      data: {
        total: json.total,
        hot,
        latest,
        moreHot: !!json.moreHot,
        more: !!json.more,
      },
    };
  },

  neteaseToplist({ text }) {
    const json = parseJson(text);
    if (!json || !json.list) return null;
    return {
      ok: true,
      data: {
        total: json.list.length,
        lists: json.list.map((item) => ({
          id: item.id,
          name: item.name,
          cover: item.coverImgUrl,
          updateFrequency: item.updateFrequency,
          trackCount: item.trackCount,
          playCount: item.playCount,
          description: item.description,
        })),
      },
    };
  },

  neteasePlaylist({ text }) {
    const json = parseJson(text);
    if (!json || !json.playlist) return null;
    const p = json.playlist;
    return {
      ok: true,
      data: {
        id: p.id,
        name: p.name,
        cover: p.coverImgUrl,
        description: p.description,
        playCount: p.playCount,
        subscribedCount: p.subscribedCount,
        creator: p.creator && p.creator.nickname,
        trackCount: p.trackCount,
        tracks: (p.tracks || []).slice(0, 50).map((t) => ({
          id: t.id,
          name: t.name,
          artists: (t.ar || []).map((a) => a.name),
          album: t.al && t.al.name,
          cover: t.al && t.al.picUrl,
          duration: t.dt,
        })),
      },
    };
  },

  neteaseNewSongs({ text }) {
    const json = parseJson(text);
    if (!json || !Array.isArray(json.result)) return null;
    return {
      ok: true,
      data: {
        total: json.result.length,
        songs: json.result.map((item) => {
          const song = item.song || item;
          return {
            id: song.id,
            name: song.name,
            artists: (song.artists || song.ar || []).map((a) => a.name),
            album: song.album && song.album.name,
            cover: song.album && song.album.picUrl,
            duration: song.duration || song.dt,
          };
        }),
      },
    };
  },
};

function processResponse(name, buf, contentType, text) {
  if (!name || !processors[name]) return null;
  try {
    const result = processors[name]({
      buf,
      text: text === undefined ? decodeText(buf, contentType) : text,
      contentType,
    });
    if (!result) return null;
    return {
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(result),
    };
  } catch {
    return null;
  }
}

module.exports = { decodeText, processResponse, processors };
