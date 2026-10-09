/* ============================================================================
 * dsh-jt-startup — Host 半侧（启动动画 · 双风格：极兔干线 / 战锤40K）
 * ----------------------------------------------------------------------------
 * 做四件事：
 *   1) 在 index.html 里注入「启动界面」：首屏兜底 + 关键 CSS + 配置 + 运行时。
 *      v0.3 起配置里的 style 决定注入哪套 runtime：
 *        jt   → splash.css / splash.js（极兔速递 · 极速干线）
 *        w40k → w40k.css   / w40k.js  （战锤40K · 机神祷文）
 *   2) 提供 /jt-startup/{splash,w40k}.css · js · config 路由
 *   3) 提供 /jt-startup/inventory.json —— 读取 ~/.dsh 下真实的 skills 与已装插件，
 *      两套动画的「权限认证」阶段播的都是真数据，不做模拟清单
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

/** 默认配置（v0.3 起 schema v2：全局字段两套动画共用，
 *  身份与外观按「风格」分组 —— jt 极兔干线 / w40k 战锤40K 各配各的，
 *  切换 style 互不干扰；40K 组首次落盘前会从极兔组播种真实身份）。
 *  品牌色取极兔速递标准红；40K 取暗腥红。 */
const DEFAULTS = {
  enabled: true,
  mode: 'session',            // always | session | daily
  style: 'jt',                // jt | w40k —— 选哪套启动动画
  speed: 1,
  requireInteraction: true,   // 「确认接驳 / 加盖密印」两个节点等待用户
  allowSkip: true,
  sound: true,                // 界面音效（WebAudio 现场合成，无音频文件）
  soundVolume: 0.5,
  inventory: true,            // 「授权仪式」阶段读取真实 skills/plugins
  background: true,           // 背景层（极兔：航线地球 + 可选照片；40K：黄金王座）
  voice: true,                // 女声英文旁白（深潜计划同款音色，预生成 wav 见 lib/assets/voice/）
  jt: {
    theme: 'light',           // light | dark（40K 固定暗色，无此选项）
    accent: '#d8232a',        // 极兔红
    identity: 'JT-DEVELOPER', // ← 设置页里可改的「访问身份」
    identityId: 'JT0001',     // 工牌号（十六进制指纹的种子）
    hub: 'SHANGHAI · GLOBAL HQ'
  },
  w40k: {
    accent: '#8f1f1f',        // 暗腥红
    identity: '',             // 名讳：留空 = 未配置 → 归一化时从 jt.identity 播种
    rank: 'TECH-ADEPT',       // 圣秩
    station: 'RYZA · FORGE WORLD', // 驻地（星图英雄镜头的落点）
    cipher: ''                // 编序：留空 = 按名讳派生
  }
}

/** 顶层全局字段（分组之外的）。 */
const TOP_KEYS = ['enabled', 'mode', 'style', 'speed', 'requireInteraction', 'allowSkip', 'sound', 'soundVolume', 'inventory', 'background', 'voice']
const ENUMS = {
  mode: ['always', 'session', 'daily'],
  style: ['jt', 'w40k']
}
const BOOL_KEYS = ['enabled', 'requireInteraction', 'allowSkip', 'sound', 'inventory', 'background', 'voice']
/** 数值字段的合法区间（越界即夹取）。 */
const RANGES = {
  speed: [0.35, 3],
  soundVolume: [0, 1]
}
/** v0.2 及更早的扁平配置里、如今住进 jt 组的键（迁移用）。 */
const LEGACY_JT_KEYS = ['theme', 'accent', 'identity', 'identityId', 'hub']

function normText(value, fallback, max) {
  const s = String(value == null ? '' : value).trim().slice(0, max || 64)
  return s || fallback
}
function normColor(value, fallback) {
  const s = String(value == null ? '' : value).trim()
  return /^#[0-9a-fA-F]{3,8}$/.test(s) ? s : fallback
}
/** 与 v0.2 同款：身份派生短码（大写字母数字取前 12 位）。 */
function deriveCode(identity, fallback) {
  const code = String(identity == null ? '' : identity).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
  return code || fallback
}

function normalizeJtGroup(src, legacy) {
  const s = Object.assign(
    {},
    src && typeof src === 'object' ? src : {},
    legacy && typeof legacy === 'object' ? legacy : {}
  )
  const out = { ...DEFAULTS.jt }
  if (s.theme === 'light' || s.theme === 'dark') out.theme = s.theme
  out.accent = normColor(s.accent, out.accent)
  out.identity = normText(s.identity, out.identity)
  out.identityId = normText(s.identityId, deriveCode(out.identity, out.identityId))
  out.hub = normText(s.hub, out.hub)
  return out
}

/** w40k 组的「留空跟随」语义在暴露时解析：
 *  identity 留空 → 跟随 jt.identity；cipher 留空 → 按名讳派生。
 *  磁盘上保留空值，这样 jt 侧改身份后 40K 的播种会跟着走，
 *  直到用户在设置页里明确填过一次（保存后即固化为显式值）。 */
function resolveW40k(cfg) {
  const identity = String(cfg.w40k.identity || '').trim() || cfg.jt.identity
  const cipher = String(cfg.w40k.cipher || '').trim() || deriveCode(identity, cfg.jt.identityId)
  return { ...cfg.w40k, identity, cipher }
}

function normalizeW40kGroup(src, jt) {
  const s = src && typeof src === 'object' ? src : {}
  const out = { ...DEFAULTS.w40k }
  out.accent = normColor(s.accent, out.accent)
  out.identity = normText(s.identity, '')       // 留空 = 跟随 jt（暴露时解析）
  out.rank = normText(s.rank, out.rank)
  out.station = normText(s.station, out.station)
  out.cipher = normText(s.cipher, '')           // 留空 = 按名讳派生
  return out
}

function normalize(input) {
  const src = input && typeof input === 'object' ? input : {}
  const out = { ...DEFAULTS }
  delete out.jt
  delete out.w40k
  for (const key of TOP_KEYS) {
    if (!(key in src) || src[key] === undefined || src[key] === null) continue
    const value = src[key]
    if (BOOL_KEYS.includes(key)) {
      out[key] = value === true || value === 'true' || value === 1 || value === '1'
    } else if (ENUMS[key]) {
      out[key] = ENUMS[key].includes(value) ? value : DEFAULTS[key]
    } else if (RANGES[key]) {
      const [lo, hi] = RANGES[key]
      const n = Number(value)
      out[key] = Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : DEFAULTS[key]
    }
  }
  /* 旧版扁平配置（identity 等在顶层）自动迁移进 jt 组；w40k 组从 jt 播种。
     注意：只有输入里确实带 w40k 组时才尊重它的值 —— 否则 DEFAULTS 里的
     占位身份会挡住「从真实身份播种」的语义。 */
  const legacy = {}
  for (const k of LEGACY_JT_KEYS) {
    if (k in src && src[k] !== undefined && src[k] !== null) legacy[k] = src[k]
  }
  out.jt = normalizeJtGroup(src.jt, legacy)
  const hasW40k = src.w40k && typeof src.w40k === 'object'
  out.w40k = normalizeW40kGroup(hasW40k ? src.w40k : null, out.jt)
  return out
}

/** POST /config 的 patch 与现有配置合并：子对象按组深合并，
 *  避免设置页只发一组字段时把另一组抹掉。 */
function mergePatch(current, patch) {
  const out = { ...current, ...patch }
  if (patch && typeof patch.jt === 'object' && patch.jt) out.jt = { ...current.jt, ...patch.jt }
  if (patch && typeof patch.w40k === 'object' && patch.w40k) out.w40k = { ...current.w40k, ...patch.w40k }
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

/** 与 dsh-startup-screen 共享的「选哪套动画」决策。
 *  唯一事实来源是 dsh-startup.json 的 startupVariant（在深潜协议的设置面板里选）：
 *    - 'jt'        → 本插件（极兔版）激活
 *    - 'deepdive'  → dsh-startup-screen（深潜协议）激活
 *  默认 jt：dsh-startup.json 缺失 / 损坏 / 未写该字段时，极兔版照常播放。 */
function resolveVariant() {
  try {
    const raw = JSON.parse(fs.readFileSync(LEGACY_CONFIG_FILE, 'utf8'))
    if (raw && raw.startupVariant === 'deepdive') return 'deepdive'
    if (raw && raw.startupVariant === 'jt') return 'jt'
  } catch (err) { /* 旧配置文件缺失 / 损坏 → 走默认 */ }
  return 'jt'
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

/** 双风格 runtime 清单：文件位置 / 对外路由 / 根节点附加 class / 启动底色。
 *  jt 的 bootBg 跟随其 theme（light/dark），所以在 criticalCss 里现算。 */
const RUNTIMES = {
  jt: {
    cssFile: 'lib/splash.css',
    jsFile: 'lib/splash.js',
    cssUrl: ROUTE_BASE + '/splash.css',
    jsUrl: ROUTE_BASE + '/splash.js',
    rootClass: ''
  },
  w40k: {
    cssFile: 'lib/w40k.css',
    jsFile: 'lib/w40k.js',
    cssUrl: ROUTE_BASE + '/w40k.css',
    jsUrl: ROUTE_BASE + '/w40k.js',
    rootClass: ' jtw-root',
    bootBg: '#0a0807'
  }
}
const runtimeReaders = {}
for (const [key, rt] of Object.entries(RUNTIMES)) {
  runtimeReaders[key] = { css: makeReader(rt.cssFile), js: makeReader(rt.jsFile) }
}
function runtimeOf(style) {
  return RUNTIMES[style] || RUNTIMES.jt
}

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

/** 从 Cordis Loader 读取当前**装配的全部**插件条目（含 @deepseek-ai/* 内置插件）。
 *  与 DSH 自带的 dsh-host-plugin-inventory 同源：都遍历 ctx.loader.entries()。
 *  ctx.get('loader') 是可选获取 —— 宿主给不出时返回 undefined，不会把本插件 fiber
 *  卡成 pending（那会导致整个 GUI 打不开）。返回 null 表示 Loader 不可用。 */
function listLoaderPlugins(loader) {
  if (!loader || typeof loader.entries !== 'function') return null
  const out = []
  try {
    for (const entry of loader.entries()) {
      const options = (entry && entry.options) || {}
      if (options.group) continue                       // 结构性分组条目不算插件
      const name = String(options.name == null ? '' : options.name).trim()
      if (!name) continue
      out.push({
        name,
        version: '',
        tools: null,
        enabled: entry.disabled !== true,               // 被 patch 禁用的条目如实标注
        source: 'loader'
      })
    }
  } catch (err) {
    return null
  }
  return out.length ? out : null
}

function buildInventory(ctx) {
  const startedAt = Date.now()
  const skills = listSkillNames()
  const loader = ctx && typeof ctx.get === 'function' ? ctx.get('loader') : undefined
  /* 优先用 Loader 的真实装配清单（含内置插件，本机约 160+ 条）；
     Loader 不可用时回落到「各 profile 显式声明的第三方插件」。 */
  const plugins = listLoaderPlugins(loader) || listPlugins()
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

/** 派发配置：叠加非持久化的派生字段。
 *  1) 把「当前风格组」的字段扁平化到顶层 —— 运行时读到的仍是 v0.2 的字段名
 *     （theme/accent/identity/identityId/hub，w40k 另有 rank/station/cipher），
 *     因此 lib/splash.js 完全不需要感知 schema v2；
 *  2) scriptCss / scriptUrl：本风格的 runtime 路由（client.js 自举与跨风格重放用）；
 *  3) activeVariant：dsh-startup.json 里 startupVariant 的浏览器侧镜像。 */
function configForPage(cfg) {
  const group = cfg.style === 'w40k' ? resolveW40k(cfg) : cfg.jt
  const rt = runtimeOf(cfg.style)
  const out = { ...cfg, ...group, scriptCss: rt.cssUrl, scriptUrl: rt.jsUrl, activeVariant: resolveVariant() }
  delete out.jt
  delete out.w40k
  /* 可选照片背景是极兔风格的功能；40K 的世界是羊皮纸 + 黄金王座，不叠照片。 */
  if (cfg.style !== 'w40k' && cfg.background) {
    const bg = findBgAsset()
    if (bg) out.bg = bg
  }
  return out
}

/** 首屏兜底：在应用挂载前先把窗口盖住，避免闪出界面本体。 */
function criticalCss(cfg) {
  const bg = cfg.style === 'w40k'
    ? runtimeOf('w40k').bootBg
    : (cfg.theme === 'dark' ? '#101214' : '#f6f3ee')
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

  /* 双风格 runtime 的静态路由（css/js 各一条，按 RUNTIMES 表注册）。 */
  for (const [style, rt] of Object.entries(RUNTIMES)) {
    const readers = runtimeReaders[style]
    disposers.push(registerRoute({
      kind: 'exact',
      path: rt.cssUrl,
      handler: (req, res) => sendText(res, 'text/css; charset=utf-8', readers.css())
    }))
    disposers.push(registerRoute({
      kind: 'exact',
      path: rt.jsUrl,
      handler: (req, res) => sendText(res, 'application/javascript; charset=utf-8', readers.js())
    }))
  }

  /* 真实能力清单：每次现读 ~/.dsh（目录都不大），读不到如实返回空。 */
  disposers.push(registerRoute({
    kind: 'exact',
    path: ROUTE_BASE + '/inventory.json',
    handler: (req, res) => sendJson(res, 200, buildInventory(ctx))
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

  /* 女声英文旁白（深潜计划同款音色的预生成 wav）。文件名走固定白名单。 */
  const VOICE_FILES = new Set([
    'phase-0.wav', 'phase-1.wav', 'phase-2.wav', 'phase-3.wav', 'phase-3-mounted.wav',
    'phase-4.wav', 'phase-5.wav', 'load-warning.wav', 'load-unavailable.wav'
  ])
  disposers.push(registerRoute({
    kind: 'prefix',
    path: ROUTE_BASE + '/voice',
    handler: (req, res) => {
      const name = path.basename(decodeURIComponent((req.url || '').split('?')[0]))
      if (!VOICE_FILES.has(name)) {
        res.writeHead(404); res.end(); return
      }
      let bytes
      try { bytes = fs.readFileSync(path.join(PACKAGE_ROOT, 'lib', 'assets', 'voice', name)) } catch (err) {
        res.writeHead(404); res.end(); return
      }
      res.writeHead(200, {
        'Content-Type': 'audio/wav',
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
        const cfgNow = readConfig()
        sendJson(res, 200, {
          ok: true, version: PLUGIN_VERSION,
          config: configForPage(cfgNow),
          /* groups：两套风格的完整分组 —— 设置页同时编辑两套身份用。
             config 仍是扁平化视图（运行时契约不变）。 */
          groups: { jt: cfgNow.jt, w40k: resolveW40k(cfgNow) },
          defaults: DEFAULTS, file: CONFIG_FILE
        })
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
          sendJson(res, 200, {
            ok: true, version: PLUGIN_VERSION,
            config: configForPage(cfgNow), groups: { jt: cfgNow.jt, w40k: resolveW40k(cfgNow) },
            defaults: DEFAULTS
          })
          return
        }
        const current = readConfig()
        const patch = payload && typeof payload.patch === 'object' && payload.patch ? payload.patch : payload
        const cfgNow = writeConfig(mergePatch(current, patch))
        sendJson(res, 200, {
          ok: true, version: PLUGIN_VERSION,
          config: configForPage(cfgNow), groups: { jt: cfgNow.jt, w40k: resolveW40k(cfgNow) },
          defaults: DEFAULTS
        })
      } catch (err) {
        sendJson(res, 500, { ok: false, error: String((err && err.message) || err) })
      }
    }
  }))

  disposers.push(webServer.tapIndex((html) => {
    /* 幂等判据用根节点标记，不再绑死某套 runtime 的脚本 URL（v0.3 双风格）。 */
    if (!html || html.includes('id="jt-startup-root"')) return html
    const cfg = configForPage(readConfig())
    const rt = runtimeOf(cfg.style)
    const head =
      '<link rel="stylesheet" href="' + rt.cssUrl + '">' +
      '<style id="jt-startup-critical">' + criticalCss(cfg) + '</style>'
    const body =
      '<div id="jt-startup-root" class="jts-root jts-boot' + rt.rootClass + '"></div>' +
      '<script>window.__JT_STARTUP_BOOT__="index";window.__JT_STARTUP_VERSION__=' + safeJson(PLUGIN_VERSION) + ';window.__JT_STARTUP__=' + safeJson(cfg) + ';window.__JT_STARTUP_SCRIPT_URL__=' + safeJson(rt.jsUrl) + ';window.__JT_STARTUP_CSS_URL__=' + safeJson(rt.cssUrl) + ';' + BOOTSTRAP_JS + '</script>' +
      '<script defer src="' + rt.jsUrl + '"></script>'

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
