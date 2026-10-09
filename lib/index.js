/* ============================================================================
 * dsh-jt-startup — Host 半侧（极兔速递 · 极速干线启动画面）
 * ----------------------------------------------------------------------------
 * 做四件事：
 *   1) 在 index.html 里注入「启动界面」：首屏兜底 + 关键 CSS + 配置 + 运行时
 *   2) 提供 /jt-startup/splash.css · splash.js · config 三个路由
 *   3) 提供 /jt-startup/inventory.json —— 读取 ~/.dsh 下真实的 skills 与已装插件，
 *      启动动画的「权限认证」阶段播的是真数据，不做模拟清单
 *   4) 把配置持久化到 ~/.dsh/jt-startup.json（设置页经 /jt-startup/config 读写）
 *
 * 说明：配置刻意不走 settings 命名空间，而是自带一份 JSON + 自带设置面板
 * （与 dsh-startup-screen / dsh-meme 同款做法），不受 dsh-settings 版本变更影响。
 * ========================================================================== */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const CONFIG_FILE = path.join(DSH_HOME, 'jt-startup.json')
const LEGACY_CONFIG_FILE = path.join(DSH_HOME, 'dsh-startup.json')

const NS = 'dsh-jt-startup'
const ROUTE_BASE = '/jt-startup'

/** 插件版本：读自己的 package.json，避免源码与版本号两处各写一份。 */
const PLUGIN_VERSION = (() => {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'))
    const v = String(pkg.version || '').trim()
    return v || '0.0.0'
  } catch (err) {
    return '0.0.0'
  }
})()

/** 默认配置：字段与 lib/splash.js 的 DEFAULTS 一一对应。
 *  品牌色取极兔速递标准红；站场文案默认上海全球总部。 */
const DEFAULTS = {
  enabled: true,
  mode: 'session',            // always | session | daily
  theme: 'light',             // light | dark
  speed: 1,
  requireInteraction: true,   // 「确认接入 / 确认身份」两个节点等待用户
  allowSkip: true,
  sound: true,                // 界面音效（WebAudio 现场合成，无音频文件）
  soundVolume: 0.5,
  identity: 'JT-DEVELOPER',   // ← 设置页里可改的「访问身份」
  identityId: 'JT0001',       // 工牌号（十六进制指纹的种子）
  hub: 'SHANGHAI · GLOBAL HQ',
  inventory: true,            // 「权限认证」阶段读取真实 skills/plugins
  background: true,           // 背景层：贸易航线地球 + 可选照片（lib/assets/bg.*）
  accent: '#d8232a'           // 极兔红
}

const TEXT_KEYS = ['identity', 'identityId', 'hub']
const COLOR_KEYS = ['accent']
const ENUMS = {
  mode: ['always', 'session', 'daily'],
  theme: ['light', 'dark']
}
const BOOL_KEYS = ['enabled', 'requireInteraction', 'allowSkip', 'sound', 'inventory', 'background']
/** 数值字段的合法区间（越界即夹取）。 */
const RANGES = {
  speed: [0.35, 3],
  soundVolume: [0, 1]
}

function normalize(input) {
  const out = { ...DEFAULTS }
  const src = input && typeof input === 'object' ? input : {}
  for (const key of Object.keys(DEFAULTS)) {
    if (!(key in src) || src[key] === undefined || src[key] === null) continue
    const value = src[key]
    if (BOOL_KEYS.includes(key)) {
      out[key] = value === true || value === 'true' || value === 1 || value === '1'
    } else if (ENUMS[key]) {
      out[key] = ENUMS[key].includes(value) ? value : DEFAULTS[key]
    } else if (key === 'speed' || RANGES[key]) {
      const [lo, hi] = RANGES[key] || RANGES.speed
      const n = Number(value)
      out[key] = Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : DEFAULTS[key]
    } else if (COLOR_KEYS.includes(key)) {
      const s = String(value).trim()
      out[key] = /^#[0-9a-fA-F]{3,8}$/.test(s) ? s : DEFAULTS[key]
    } else if (TEXT_KEYS.includes(key)) {
      out[key] = String(value).slice(0, 64)
    } else {
      out[key] = value
    }
  }
  if (!String(out.identity).trim()) out.identity = DEFAULTS.identity
  if (!String(out.identityId).trim()) {
    out.identityId = String(out.identity).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
  }
  if (!String(out.identityId).trim()) out.identityId = 'JT0001'
  return out
}

/** 第一次落盘前，若用户用过 dsh-startup-screen 并配过身份，把身份带过来。 */
function seedFromLegacy() {
  try {
    const raw = JSON.parse(fs.readFileSync(LEGACY_CONFIG_FILE, 'utf8'))
    const patch = {}
    if (raw && typeof raw.identity === 'string' && raw.identity.trim()) patch.identity = raw.identity
    if (raw && typeof raw.identityId === 'string' && raw.identityId.trim()) patch.identityId = raw.identityId
    return patch
  } catch (err) {
    return {}
  }
}

function readConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8')
    return normalize(JSON.parse(raw))
  } catch (err) {
    return normalize(seedFromLegacy())
  }
}

function writeConfig(next) {
  const cfg = normalize(next)
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true })
  const tmp = CONFIG_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), 'utf8')
  fs.renameSync(tmp, CONFIG_FILE)
  return cfg
}

/** 静态文件按 mtime 缓存，改完插件刷新页面即生效。 */
function makeReader(rel) {
  let cache = null
  return function read() {
    const file = path.join(PACKAGE_ROOT, rel)
    try {
      const st = fs.statSync(file)
      if (!cache || cache.mtimeMs !== st.mtimeMs) {
        cache = { mtimeMs: st.mtimeMs, text: fs.readFileSync(file, 'utf8') }
      }
      return cache.text
    } catch (err) {
      return ''
    }
  }
}

const readSplashCss = makeReader('lib/splash.css')
const readSplashJs = makeReader('lib/splash.js')

/** 内联脚本里绝对不能出现 `</script>`。 */
function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, '')
}

/* ── 真实能力清单：~/.dsh/skills + 各 profile 里声明的 dsh 插件 ──────────
 * 只读目录与 package.json，不做任何写操作；读不到就如实返回空清单，
 * 动画端会显示「离线预览 · 未读取真实清单」，绝不编造数据。 */

function listSkillNames() {
  const dir = path.join(DSH_HOME, 'skills')
  let entries = []
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch (err) {
    return []
  }
  const out = []
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    let name = entry.name
    try {
      const md = fs.readFileSync(path.join(dir, entry.name, 'SKILL.md'), 'utf8')
      const hit = /^name:\s*(.+)$/m.exec(md.slice(0, 4000))
      if (hit && hit[1].trim()) name = hit[1].trim().slice(0, 64)
    } catch (err) { /* 没有 SKILL.md 就用目录名 */ }
    out.push({ name, source: '~/.dsh/skills/' + entry.name })
  }
  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}

function looksLikeDshPlugin(pkgJson, depName) {
  if (pkgJson && pkgJson.dsh) return true
  const n = String(depName || '').toLowerCase()
  return n === 'dshmarket' || n.startsWith('dsh-') || n.includes('/dsh-')
}

function countTools(pkgJson) {
  const declared = pkgJson && pkgJson.dsh && pkgJson.dsh.tools
  return Array.isArray(declared) ? declared.length : null
}

function listPlugins() {
  const profilesDir = path.join(DSH_HOME, 'profiles')
  let profiles = []
  try {
    profiles = fs.readdirSync(profilesDir, { withFileTypes: true })
  } catch (err) {
    return []
  }
  const seen = new Map()
  for (const profile of profiles) {
    if (!profile.isDirectory() || profile.name.startsWith('.')) continue
    let deps = {}
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(profilesDir, profile.name, 'package.json'), 'utf8'))
      deps = pkg && typeof pkg.dependencies === 'object' ? pkg.dependencies : {}
    } catch (err) { continue }
    for (const dep of Object.keys(deps)) {
      if (dep.startsWith('@deepseek-ai/')) continue          // 宿主本体不算插件
      let pkgJson = null
      try {
        pkgJson = JSON.parse(fs.readFileSync(
          path.join(profilesDir, profile.name, 'node_modules', dep, 'package.json'), 'utf8'))
      } catch (err) { /* 目录联接 / 未安装：按名字仍算一条已声明项 */ }
      if (!looksLikeDshPlugin(pkgJson, dep)) continue
      const prev = seen.get(dep)
      const version = String((pkgJson && pkgJson.version) || deps[dep] || '')
      if (prev && prev.version === version) {
        prev.source += ' · ' + profile.name
        continue
      }
      seen.set(dep, {
        name: dep,
        version,
        tools: countTools(pkgJson),
        source: '~/.dsh/profiles/' + profile.name
      })
    }
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
}

function buildInventory() {
  const startedAt = Date.now()
  const skills = listSkillNames()
  const plugins = listPlugins()
  return {
    ok: true,
    skills,
    plugins,
    counts: { skills: skills.length, plugins: plugins.length },
    elapsed_ms: Date.now() - startedAt,
    generated_at: new Date().toISOString()
  }
}

/** 可选照片背景：用户把照片放进 lib/assets/bg.{jpg|png|webp|avif} 即生效，
 *  页面端自动虚化压暗叠在纸面底色上。找不到就返回 null（用程序化航线网）。 */
function findBgAsset() {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp', 'avif']) {
    const file = path.join(PACKAGE_ROOT, 'lib', 'assets', 'bg.' + ext)
    try {
      if (fs.statSync(file).isFile()) return ROUTE_BASE + '/asset/bg.' + ext
    } catch (err) { /* 不存在就试下一个 */ }
  }
  return null
}

/** 派发配置：叠加非持久化的派生字段（照片背景地址）。 */
function configForPage(cfg) {
  if (cfg.background) {
    const bg = findBgAsset()
    if (bg) return { ...cfg, bg }
  }
  return { ...cfg }
}

/** 首屏兜底：在应用挂载前先把窗口盖住，避免闪出界面本体。 */
function criticalCss(cfg) {
  const bg = cfg.theme === 'dark' ? '#101214' : '#f6f3ee'
  return [
    'html.jts-lock,html.jts-lock body{overflow:hidden!important}',
    '#jt-startup-root.jts-boot{position:fixed;inset:0;z-index:2147483000;background:' + bg + '}'
  ].join('')
}

const BOOTSTRAP_JS = `(function(){try{
var c=window.__JT_STARTUP__||{};
var root=document.getElementById('jt-startup-root');
var off=!c.enabled;
if(!off&&c.mode==='session'&&sessionStorage.getItem('jt-startup:shown')==='1')off=true;
if(!off&&c.mode==='daily'&&localStorage.getItem('jt-startup:day')===new Date().toISOString().slice(0,10))off=true;
if(off){window.__JT_STARTUP_SKIP__=true;if(root&&root.parentNode)root.parentNode.removeChild(root);}
else{document.documentElement.classList.add('jts-lock');/* 兜底：连 splash.js 都没跑起来（404/被拦/语法错）时，9 秒后无条件放行，绝不锁屏 */setTimeout(function(){try{var r=document.getElementById('jt-startup-root');if(r&&r.className&&r.className.indexOf('jts-boot')!==-1){if(r.parentNode)r.parentNode.removeChild(r);document.documentElement.classList.remove('jts-lock');if(document.body)document.body.style.overflow='';window.__JT_STARTUP_FAILED__=true;}}catch(e){}},9000);}
}catch(e){} })()`

const name = NS
const inject = ['webServer', 'connection']

/**
 * 取得 HTTP 载体服务。
 *
 * web profile 与桌面端（DeepSeek Harness Desktop）都会挂 `@deepseek-ai/dsh-web-app`，
 * 其中 `webserver` 这一行提供 `webServer`；但 Electron 也可能改成 `file://` + IPC
 * 直接下发前端。那种情况下没有 webServer，本插件不该把一颗 fiber 炸掉 ——
 * 交给客户端半侧自举（`lib/client.js` 的 selfBoot）。
 */
function resolveWebServer(ctx) {
  try {
    const viaGet = typeof ctx.get === 'function' ? ctx.get('webServer') : undefined
    if (viaGet) return viaGet
  } catch (err) { /* 取不到就当没有 */ }
  return ctx.webServer
}

function hasRoutes(server) {
  return !!server && typeof server.register === 'function' && typeof server.tapIndex === 'function'
}

function apply(ctx) {
  const disposers = []
  const webServer = resolveWebServer(ctx)

  /** 没有可注册路由的 HTTP 载体：桌面端若走 IPC 下发前端就是这种形态。
      什么都不注册（plugin 仍然 APPLIED，不报错），页面由客户端半侧自举启动界面。 */
  if (!hasRoutes(webServer)) {
    try {
      ctx.logger?.warn?.(
        '[' + NS + '] 当前 profile 没有可用的 webServer（桌面端可能用 file:// + IPC 下发前端）；' +
        'Host 半侧跳过路由与首屏注入，改由浏览器半侧自举启动界面。'
      )
    } catch (err) { /* 日志失败不影响加载 */ }
    return
  }

  /** 浏览器信任栅栏：自定义路由必须过一遍，否则可被任意网页读写。 */
  function rejected(req, res) {
    try {
      const conn = (typeof ctx.get === 'function' ? ctx.get('connection') : undefined) || ctx.connection
      if (!conn || typeof conn.requestRejection !== 'function') return false
      const code = conn.requestRejection(req)
      if (code === undefined || code === null || code === false) return false
      res.statusCode = typeof code === 'number' ? code : 403
      res.end()
      return true
    } catch (err) {
      return false
    }
  }

  function registerRoute(route) {
    const inner = route && route.handler
    const wrapped = Object.assign({}, route, {
      handler: async (req, res) => {
        if (rejected(req, res)) return
        return inner(req, res)
      }
    })
    return webServer.register(wrapped)
  }

  function sendJson(res, code, payload) {
    const body = Buffer.from(JSON.stringify(payload), 'utf8')
    res.writeHead(code, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Length': String(body.length)
    })
    res.end(body)
  }

  function readBody(req, limit = 64 * 1024) {
    return new Promise((resolve) => {
      let size = 0
      const chunks = []
      req.on('data', (c) => {
        size += c.length
        if (size > limit) {
          req.destroy()
          resolve('')
          return
        }
        chunks.push(c)
      })
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      req.on('error', () => resolve(''))
    })
  }

  function sendText(res, type, text) {
    const body = Buffer.from(text, 'utf8')
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
      'Content-Length': String(body.length)
    })
    res.end(body)
  }

  disposers.push(registerRoute({
    kind: 'exact',
    path: ROUTE_BASE + '/splash.css',
    handler: (req, res) => sendText(res, 'text/css; charset=utf-8', readSplashCss())
  }))

  disposers.push(registerRoute({
    kind: 'exact',
    path: ROUTE_BASE + '/splash.js',
    handler: (req, res) => sendText(res, 'application/javascript; charset=utf-8', readSplashJs())
  }))

  /* 真实能力清单：每次现读 ~/.dsh（目录都不大），读不到如实返回空。 */
  disposers.push(registerRoute({
    kind: 'exact',
    path: ROUTE_BASE + '/inventory.json',
    handler: (req, res) => sendJson(res, 200, buildInventory())
  }))

  /* 背景照片等只读素材：白名单文件名、不含子路径 —— 杜绝目录穿越。 */
  disposers.push(registerRoute({
    kind: 'prefix',
    path: ROUTE_BASE + '/asset',
    handler: (req, res) => {
      const name = path.basename(decodeURIComponent((req.url || '').split('?')[0]))
      const hit = /^([a-z0-9._-]+)\.(jpg|jpeg|png|webp|avif)$/i.exec(name)
      if (!hit || name.includes('..')) {
        res.writeHead(404); res.end(); return
      }
      const file = path.join(PACKAGE_ROOT, 'lib', 'assets', name)
      let bytes
      try { bytes = fs.readFileSync(file) } catch (err) {
        res.writeHead(404); res.end(); return
      }
      const type = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
        webp: 'image/webp', avif: 'image/avif'
      }[hit[2].toLowerCase()]
      res.writeHead(200, {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': String(bytes.length)
      })
      res.end(bytes)
    }
  }))

  disposers.push(registerRoute({
    kind: 'exact',
    path: ROUTE_BASE + '/config',
    handler: async (req, res) => {
      const method = (req.method || 'GET').toUpperCase()
      if (method === 'GET') {
        sendJson(res, 200, { ok: true, version: PLUGIN_VERSION, config: configForPage(readConfig()), defaults: DEFAULTS, file: CONFIG_FILE })
        return
      }
      if (method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'method not allowed' })
        return
      }
      const text = await readBody(req)
      let payload = {}
      try {
        payload = text ? JSON.parse(text) : {}
      } catch (err) {
        sendJson(res, 400, { ok: false, error: 'invalid json' })
        return
      }
      try {
        if (payload && payload.action === 'reset') {
          const cfgNow = writeConfig(DEFAULTS)
          sendJson(res, 200, { ok: true, version: PLUGIN_VERSION, config: cfgNow, defaults: DEFAULTS })
          return
        }
        const current = readConfig()
        const patch = payload && typeof payload.patch === 'object' && payload.patch ? payload.patch : payload
        const cfgNow = writeConfig({ ...current, ...patch })
        sendJson(res, 200, { ok: true, version: PLUGIN_VERSION, config: cfgNow, defaults: DEFAULTS })
      } catch (err) {
        sendJson(res, 500, { ok: false, error: String((err && err.message) || err) })
      }
    }
  }))

  disposers.push(webServer.tapIndex((html) => {
    if (!html || html.includes(ROUTE_BASE + '/splash.js')) return html
    const cfg = configForPage(readConfig())
    const head =
      '<link rel="stylesheet" href="' + ROUTE_BASE + '/splash.css">' +
      '<style id="jt-startup-critical">' + criticalCss(cfg) + '</style>'
    const body =
      '<div id="jt-startup-root" class="jts-root jts-boot"></div>' +
      '<script>window.__JT_STARTUP_BOOT__="index";window.__JT_STARTUP_VERSION__=' + safeJson(PLUGIN_VERSION) + ';window.__JT_STARTUP__=' + safeJson(cfg) + ';' + BOOTSTRAP_JS + '</script>' +
      '<script defer src="' + ROUTE_BASE + '/splash.js"></script>'

    let out = html
    if (out.includes('</head>')) out = out.replace('</head>', head + '</head>')
    else out = head + out
    if (out.includes('<body>')) out = out.replace('<body>', '<body>' + body)
    else if (out.includes('</body>')) out = out.replace('</body>', body + '</body>')
    else out = out + body
    return out
  }))

  ctx.effect(() => () => {
    for (const dispose of disposers) {
      try { dispose() } catch (err) { /* noop */ }
    }
  })
}

/* 导出形状对齐 DSH 内部插件（如 dsh-host-open-in-app）：
   只给具名 name / inject / apply。
   两点刻意不做：
   1) 不导出 default —— cordis-plugin-loader 的 unwrapExports 是
      `exports.default ?? exports`，一旦有 default 就只认 default；
   2) 不导出 Config —— Cordis 约定 Config 是 schemastery schema，
      我这份只是普通默认值对象，当 schema 用会炸。本插件也不吃 profile 配置。 */
export { apply, inject, name }
