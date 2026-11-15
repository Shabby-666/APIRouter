# API Router · 全网免费 API 中转站

> 一个域名，调用全网免费 API。免 Key、统一 CORS、统一缓存、在线调试。

API Router 把散落在全网的公共接口（随机图片、今日天气、网易云音乐、微博热搜、汇率行情、IP 归属地、论文检索、本地工具……）收敛成统一的 `/api/r/:id` 形式，并补上缓存、超时、编码转换与错误兜底。

- **90 个接口 / 9 大分类**，全部无需注册、无需 API Key
- 亮 / 暗双主题，默认跟随系统，也可手动切换并记住选择
- 内置调试台：参数表单、真实响应、cURL / JavaScript / Python 代码一键复制
- 上游健康监测：实时探测可用性，坏接口一眼可见
- 服务端白名单转发：不是开放代理，天然免疫 SSRF
- GBK 自动转码、JSON 字段提取、图片流式回传
- 零依赖、零构建，静态页 + 3 个 Serverless Function

## 快速开始

### 本地运行

```bash
npm run dev
# → http://localhost:3000
```

本地开发服务器用原生 Node 模拟 Vercel 的静态站点 + Functions，不需要安装任何依赖。

### 部署到 Vercel

```bash
npm i -g vercel
vercel --prod
```

也可以直接把仓库推到 GitHub，在 Vercel 里 **Import Project**，框架选择 **Other**，无需任何环境变量与构建命令。

## 调用方式

```bash
# 随机一言
curl -s "https://your-app.vercel.app/api/r/hitokoto"

# 今日天气（北京）
curl -s "https://your-app.vercel.app/api/r/weather?latitude=39.9042&longitude=116.4074&current=temperature_2m,weather_code&timezone=Asia/Shanghai"

# 随机二次元图片（直接返回图片流）
curl -sL "https://your-app.vercel.app/api/r/alcy-image?style=ycy" -o anime.webp

# 网易云搜索
curl -s "https://your-app.vercel.app/api/r/netease-search?keywords=晴天&limit=5"

# 只取返回 JSON 里的某个字段
curl -s "https://your-app.vercel.app/api/r/netease-search?keywords=晴天&__pick=data.songs.0.name"
```

### 通用参数

| 参数 | 说明 |
| --- | --- |
| `__pick=path.to.field` | 提取 JSON 字段，支持点号与数组下标 |
| `__raw=1` | 跳过本站加工，返回上游原始响应 |
| `__download=1` | 以附件形式下载图片 / 文件 |
| 其他任意参数 | 原样透传给上游，字段名见接口卡片 |
| 缺省参数 | 未传的参数会自动套用示例值，所以 `/api/r/weather` 也能直接返回北京天气 |

### 响应头

| 响应头 | 说明 |
| --- | --- |
| `X-Router-Status` | 上游 HTTP 状态码 |
| `X-Router-Latency` | 上游耗时（毫秒） |
| `X-Router-Upstream` | 实际请求的上游域名 |
| `X-Router-RateLimit-Remaining` | 当前限流窗口剩余额度 |

限流：**120 次 / 分钟 / IP**，内存窗口限流，Serverless 多实例下为尽力而为。

## 接口分类

| 分类 | 代表接口 |
| --- | --- |
| 随机图片 | Lorem Picsum、必应每日壁纸、二次元随机图、MtF 随机图、猫 / 狗 / 狐狸 / 鸭鸭、随机头像、二维码、条形码 |
| 天气环境 | Open-Meteo 实时 / 逐小时 / 7 天、空气质量、地理编码、wttr.in、海洋海浪、美国气象局 |
| 文字文艺 | 一言、今日诗词、英文名言、冷笑话、冷知识、词典、翻译、网页 Markdown、名字猜年龄 / 国籍 |
| 音乐 | 网易云搜索、歌曲详情、歌词、热评、排行榜、歌单、新歌推荐、播放地址 |
| 开发者 | GitHub、npm、Hacker News、JSONPlaceholder、HTTPBin、短链接、真随机数、IP 查询、世界时间、arXiv、Crossref |
| 金融行情 | 实时 / 历史汇率、全球牌价、CoinGecko、币安行情、A 股实时行情 |
| 生活资讯 | 每天 60 秒、微博 / 抖音 / 知乎 / B 站热搜、法定节假日、ISS 位置、地震速报、SpaceX、大都会博物馆 |
| 二次元 | Jikan 动漫数据库、宝可梦图鉴 |
| 本地工具 | UUID、哈希、Base64、时间戳、密码、随机数、配色、Lorem、URL 编解码、JSON 格式化 |

完整清单与实时参数请访问站点首页，或直接请求 `GET /api`。

## 项目结构

```
.
├── api/
│   ├── index.js          # GET /api         接口清单
│   ├── health.js         # GET /api/health  上游健康检查
│   └── r/[id].js         # GET /api/r/:id   中转核心
├── lib/
│   ├── registry.js       # 接口注册表（新增接口只改这里）
│   ├── proxy.js          # URL 拼装 / 请求 / 响应
│   ├── processors.js     # 上游 JSON 加工（网易云、必应、腾讯行情）
│   ├── local.js          # 本地工具实现
│   └── http.js           # CORS / 限流 / 响应工具
├── assets/               # 样式、脚本、图标
├── index.html            # 单页站点
├── server.mjs            # 本地开发服务器
└── vercel.json
```

## 新增一个接口

编辑 `lib/registry.js`，在 `endpoints` 里追加：

```js
{
  id: 'my-api',
  name: '我的接口',
  category: 'dev',
  icon: '🧩',
  desc: '一句话介绍',
  upstream: 'https://api.example.com/path/{param}',
  ttl: 300,
  docs: 'https://api.example.com/docs',
  tags: ['免Key'],
  params: [
    { key: 'param', label: '参数', example: 'hello', desc: '参数说明', required: true },
  ],
}
```

保存后 `/api`、健康检查、前端目录与调试台会自动更新。

## 说明

- 本项目只做技术中转，**不存储任何上游数据**，接口版权与可用性归各上游服务所有。
- 公共免费接口随时可能变更、限流或下线；页面上的健康状态就是为此准备的。
- 请遵守各上游服务条款，不要用于商业转售、爬虫轰炸或违法用途。
- 部分接口（网易云播放地址、CoinGecko、Binance 等）对地区或频率有限制，海外 / 高并发场景请自建缓存。

## License

MIT
