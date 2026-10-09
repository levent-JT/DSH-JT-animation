/* dsh-jt-startup 冒烟测试：node test/smoke.mjs
 *
 * 覆盖：
 *   1) Host 半侧导出形状（name/inject/apply，无 default）
 *   2) apply() 注册的路由：/config GET 与 /inventory.json 真实读取
 *   3) tapIndex 注入：根节点 + 引导脚本 + 关键 CSS（jt / w40k 双风格）
 *   4) schema v2：旧扁平配置迁移、分组深合并、configForPage 扁平化
 *   5) splash.js / w40k.js / client.js 静态检查（语法 + 关键标记 + 无 `</script>`）
 * 运行：node test/smoke.mjs（退出码 0 = 全部通过） */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'

const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let failures = 0

function ok(cond, label) {
  if (cond) {
    console.log('  ok  ' + label)
  } else {
    failures++
    console.error('FAIL  ' + label)
  }
}

/* ── 0) 语法检查（node --check 对浏览器脚本同样只验语法）────────────────── */
console.log('\n[语法]')
for (const rel of ['lib/index.js', 'lib/splash.js', 'lib/w40k.js', 'lib/client.js']) {
  try {
    execFileSync(process.execPath, ['--check', path.join(PKG_ROOT, rel)], { stdio: 'pipe' })
    ok(true, rel + ' 语法有效')
  } catch (err) {
    ok(false, rel + ' 语法有效 —— ' + String(err.stderr || err.message).split('\n')[0])
  }
}
for (const rel of ['lib/splash.css', 'lib/w40k.css']) {
  ok(fs.existsSync(path.join(PKG_ROOT, rel)), rel + ' 存在')
}

/* ── 1) 构造隔离的 DSH_HOME 夹具 ────────────────────────────────────────── */
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'jt-startup-smoke-'))
fs.mkdirSync(path.join(home, 'skills', 'java-dev'), { recursive: true })
fs.writeFileSync(path.join(home, 'skills', 'java-dev', 'SKILL.md'), '---\nname: java-dev\n---\n# Java 开发')
fs.mkdirSync(path.join(home, 'skills', 'idea-mcp-first'), { recursive: true })
// 无 SKILL.md 的目录：应回退用目录名
const desktopProfile = path.join(home, 'profiles', 'desktop')
fs.mkdirSync(path.join(desktopProfile, 'node_modules', 'dshmarket'), { recursive: true })
fs.writeFileSync(path.join(desktopProfile, 'node_modules', 'dshmarket', 'package.json'),
  JSON.stringify({ name: 'dshmarket', version: '1.66.11', dsh: { client: { inject: [] } } }))
fs.writeFileSync(path.join(desktopProfile, 'package.json'),
  JSON.stringify({ name: 'dsh-profile-desktop', dependencies: { dshmarket: '^1.66.11', 'dsh-jt-startup': 'file:./dsh-jt-startup-0.1.0.tgz' } }))
process.env.DSH_HOME = home

/* ── 2) 导入 Host 半侧并断言形状 ────────────────────────────────────────── */
console.log('\n[导出形状]')
const mod = await import(pathToFileURL(path.join(PKG_ROOT, 'lib', 'index.js')).href)
ok(mod.name === 'dsh-jt-startup', 'name = dsh-jt-startup')
ok(Array.isArray(mod.inject) && mod.inject.includes('webServer'), "inject 含 'webServer'")
ok(typeof mod.apply === 'function', 'apply 是函数')
ok(mod.default === undefined, '刻意不导出 default（cordis loader 约定）')

/* ── 3) 用假 webServer 捕获路由与 tapIndex ─────────────────────────────── */
console.log('\n[路由与注入]')
const routes = []
const taps = []
const resolvers = []
const fakeCtx = {
  webServer: {
    register(route) { routes.push(route); return () => {} },
    tapIndex(fn) { taps.push(fn); return () => {} }
  },
  effect(dispose) { resolvers.push(dispose) },
  get() { return undefined }
}
mod.apply(fakeCtx)
ok(routes.some(r => r.path === '/jt-startup/config'), '注册了 /jt-startup/config')
ok(routes.some(r => r.path === '/jt-startup/inventory.json'), '注册了 /jt-startup/inventory.json')
ok(routes.some(r => r.path === '/jt-startup/splash.js'), '注册了 /jt-startup/splash.js')
ok(routes.some(r => r.path === '/jt-startup/w40k.js'), '注册了 /jt-startup/w40k.js')
ok(routes.some(r => r.path === '/jt-startup/w40k.css'), '注册了 /jt-startup/w40k.css')
ok(taps.length === 1, '注册了 tapIndex')

const injected = taps[0]('<html><head></head><body></body></html>')
ok(injected.includes('id="jt-startup-root"'), 'index 注入含根节点')
ok(injected.includes('/jt-startup/splash.js'), 'index 注入含运行时脚本（默认 jt）')
ok(injected.includes('jts-lock'), 'index 注入含滚动锁样式')
ok(!taps[0](injected).includes('/jt-startup/splash.js"/splash.js'), '重复注入幂等')

function callRoute(url, method = 'GET', body = null) {
  const route = routes.find(r => r.path === (url.split('?')[0]))
  if (!route) throw new Error('route not found: ' + url)
  const res = {
    code: 0, headers: null, body: null,
    writeHead(code, headers) { this.code = code; this.headers = headers },
    end(body) { this.body = body == null ? '' : body }
  }
  const req = {
    url, method,
    on(event, cb) {
      if (event === 'data' && body) cb(Buffer.from(body, 'utf8'))
      if (event === 'end') cb()
      return req
    }
  }
  return route.handler(req, res).then(() => res)
}

const inv = await callRoute('/jt-startup/inventory.json')
const invJson = JSON.parse(inv.body.toString())
ok(inv.code === 200 && invJson.ok === true, 'inventory 返回 200 + ok')
ok(invJson.skills.length === 2 && invJson.skills[0].name === 'idea-mcp-first',
  'skills 读取（SKILL.md 的 name 优先，无 SKILL.md 回退目录名）')
ok(invJson.plugins.length === 2 &&
   invJson.plugins.some(p => p.name === 'dshmarket' && p.version === '1.66.11') &&
   invJson.plugins.some(p => p.name === 'dsh-jt-startup'),
  'plugins 收录 dsh 形状的依赖（含本插件自身；node_modules 版本号优先）')

const conf = await callRoute('/jt-startup/config')
const confJson = JSON.parse(conf.body.toString())
ok(conf.code === 200 && confJson.ok === true, 'config GET 返回 200 + ok')
ok(confJson.config.identity === 'JT-DEVELOPER', 'config 默认身份')

const posted = await callRoute('/jt-startup/config', 'POST', JSON.stringify({ patch: { speed: 99, identity: 'JT-Levent' } }))
const postedJson = JSON.parse(posted.body.toString())
ok(postedJson.ok === true && postedJson.config.speed === 3, 'config POST 落盘且 speed 夹取到 3')
ok(fs.existsSync(path.join(home, 'jt-startup.json')), '配置已写入 $DSH_HOME/jt-startup.json')

/* ── 3.5) schema v2：迁移 / 分组 / 扁平化 / 按 style 注入 ──────────────── */
console.log('\n[schema v2 · 双风格]')
/* 上一轮 POST 的是 v0.2 扁平 patch（identity 在顶层）→ 落盘时应迁移进 jt 组 */
const disk1 = JSON.parse(fs.readFileSync(path.join(home, 'jt-startup.json'), 'utf8'))
ok(disk1.jt && disk1.jt.identity === 'JT-Levent', '旧扁平字段自动迁移进 jt 组')
ok(disk1.style === 'jt', '默认 style=jt')
ok(disk1.w40k && disk1.w40k.identity === '' && disk1.w40k.cipher === '',
  'w40k 名讳/编序留空落盘（跟随 jt 播种的语义，未固化）')

const conf2 = await callRoute('/jt-startup/config')
const conf2Json = JSON.parse(conf2.body.toString())
ok(conf2Json.groups && conf2Json.groups.jt && conf2Json.groups.w40k, 'GET /config 返回 groups 双分组')
ok(conf2Json.groups.w40k.identity === 'JT-Levent', 'w40k 组暴露时从真实身份播种')
ok(conf2Json.groups.w40k.cipher === 'JTLEVENT', 'w40k 编序按名讳派生（JTLEVENT）')
ok(conf2Json.config.identity === 'JT-Levent' && conf2Json.config.scriptUrl === '/jt-startup/splash.js',
  'config 是当前风格扁平化视图（jt）+ scriptUrl')

/* 切到 w40k：分组深合并不丢 jt；扁平化视图换组（身份仍是播种值） */
const posted2 = await callRoute('/jt-startup/config', 'POST',
  JSON.stringify({ patch: { style: 'w40k', w40k: { rank: 'MAGOS', station: 'LUCIUS · FORGE WORLD' } } }))
const posted2Json = JSON.parse(posted2.body.toString())
ok(posted2Json.ok === true && posted2Json.config.style === 'w40k', 'POST style=w40k 生效')
ok(posted2Json.config.identity === 'JT-Levent', 'w40k 扁平化视图带播种后的名讳')
ok(posted2Json.config.rank === 'MAGOS' && posted2Json.config.station === 'LUCIUS · FORGE WORLD',
  'config 扁平化视图带 w40k 组字段（rank/station）')
ok(posted2Json.config.scriptUrl === '/jt-startup/w40k.js', 'w40k 的 scriptUrl 指向 w40k.js')
ok(posted2Json.groups.jt.identity === 'JT-Levent', '深合并：只 patch w40k 组不会抹掉 jt 组')
const disk2 = JSON.parse(fs.readFileSync(path.join(home, 'jt-startup.json'), 'utf8'))
ok(disk2.style === 'w40k' && disk2.jt.identity === 'JT-Levent' && disk2.w40k.rank === 'MAGOS',
  '落盘为 schema v2 嵌套结构')

/* tapIndex 跟随 style：注入 w40k.js / jtw-root / 近黑启动底色 */
const injectedW = taps[0]('<html><head></head><body></body></html>')
ok(injectedW.includes('src="/jt-startup/w40k.js"'), 'style=w40k 时注入 w40k.js')
ok(!injectedW.includes('src="/jt-startup/splash.js"'), 'style=w40k 时不注入 splash.js')
ok(injectedW.includes('jtw-root'), 'w40k 根节点带 jtw-root')
ok(injectedW.includes('#0a0807'), 'w40k 启动底色为近黑')
ok(injectedW.includes('__JT_STARTUP_SCRIPT_URL__'), '内联注入 scriptUrl（replay/自举用）')

/* 释放 apply 的 effect（不动真实文件系统） */
for (const dispose of resolvers) dispose()

/* ── 4) 浏览器半侧静态检查 ─────────────────────────────────────────────── */
console.log('\n[运行时脚本]')
const splash = fs.readFileSync(path.join(PKG_ROOT, 'lib', 'splash.js'), 'utf8')
ok(splash.includes("window.__JT_STARTUP_LOADED__"), 'splash.js 有重入护栏')
ok(splash.includes("'jt-startup:shown'"), 'splash.js 会话判定键与 Host 一致')
ok(!splash.includes('</script'), 'splash.js 不含 </script（可安全内联语境）')
const client = fs.readFileSync(path.join(PKG_ROOT, 'lib', 'client.js'), 'utf8')
ok(client.includes("id: 'dsh-jt-startup'"), 'client.js 注册 id 等于包名')
ok(client.includes('settings.section'), 'client.js 注册 settings.section')
ok(client.includes("patch('top', 'style'"), 'client.js 有风格选择器')
ok(client.includes('crossReplay'), 'client.js 有跨风格预览')

/* w40k 运行时：与 splash.js 同协议的静态标记 */
const w40k = fs.readFileSync(path.join(PKG_ROOT, 'lib', 'w40k.js'), 'utf8')
ok(w40k.includes('window.__JT_STARTUP_LOADED__'), 'w40k.js 有重入护栏（同协议）')
ok(w40k.includes("'jt-startup:shown'"), 'w40k.js 会话判定键与 Host 一致')
ok(w40k.includes("root.classList.remove('jts-boot')"), 'w40k.js 接管后摘 jts-boot（9 秒兜底协议）')
ok(!w40k.includes('</script'), 'w40k.js 不含 </script')
ok(w40k.includes('/jt-startup/inventory.json'), 'w40k.js 唤醒圣物读真实名录')
const w40kCss = fs.readFileSync(path.join(PKG_ROOT, 'lib', 'w40k.css'), 'utf8')
ok(w40kCss.includes('.jtw-root') && w40kCss.includes('.jtw-root.jts-gone'), 'w40k.css 有 jtw-root 基础样式与揭幕退场')

/* ── 女声英文旁白（深潜计划同款音色，预生成 wav）────────────────────────── */
const voiceDir = path.join(PKG_ROOT, 'lib', 'assets', 'voice')
const needWavs = ['phase-0.wav','phase-1.wav','phase-2.wav','phase-3.wav','phase-3-mounted.wav','phase-4.wav','phase-5.wav','load-warning.wav','load-unavailable.wav']
for (const w of needWavs) {
  ok(fs.existsSync(path.join(voiceDir, w)), `语音资产存在：${w}`)
}
ok(fs.existsSync(path.join(voiceDir, 'manifest.json')), '语音资产带 manifest（音色来源与校验记录）')
const hostJs = fs.readFileSync(path.join(PKG_ROOT, 'lib', 'index.js'), 'utf8')
ok(hostJs.includes("'/voice'") && hostJs.includes('VOICE_FILES'), 'Host 注册 /voice 路由（白名单文件名）')
ok(hostJs.includes("'voice'"), 'voice 进顶层配置键')
ok(splash.includes('VOICE_BY_PHASE') && splash.includes("voice.cancel()"), 'splash.js 有旁白映射与静音清理')
ok(w40k.includes('VOICE_BY_PHASE') && w40k.includes("voice.cancel()"), 'w40k.js 有旁白映射与静音清理')
ok(fs.readFileSync(path.join(PKG_ROOT, 'lib', 'client.js'), 'utf8').includes('女声英文旁白'), '设置面板有旁白开关')

fs.rmSync(home, { recursive: true, force: true })

console.log('')
if (failures) {
  console.error(failures + ' 项未通过')
  process.exit(1)
} else {
  console.log('全部通过')
}
