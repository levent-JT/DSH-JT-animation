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
for (const rel of ['lib/index.js', 'lib/splash.js', 'lib/w40k.js', 'lib/client.js', 'lib/score.js']) {
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
ok(routes.some(r => r.path === '/jt-startup/score.js'), '注册了 /jt-startup/score.js（两套共用的音轨引擎）')
ok(routes.some(r => r.path === '/jt-startup/voice'), '注册了 /jt-startup/voice 前缀路由')
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
ok(conf2Json.config.scoreUrl === '/jt-startup/score.js', 'config 扁平化视图带 scoreUrl')

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
ok(injectedW.includes('__JT_STARTUP_SCORE_URL__'), '内联注入 scoreUrl（自举时引擎能补挂）')

/* 引擎必须先于 runtime 落地 —— defer 脚本按文档顺序执行，顺序错了首幕没声音 */
const iScore = injectedW.indexOf('src="/jt-startup/score.js"')
const iRun = injectedW.indexOf('src="/jt-startup/w40k.js"')
ok(iScore > 0 && iScore < iRun, 'score.js 的 script 标签排在 runtime 之前')

/* ── 旁白路由：白名单来自 manifest，风格互相隔离 ───────────────────────── */
function callVoice (url) {
  const route = routes.find(r => r.path === '/jt-startup/voice')
  const res = { code: 0, len: 0, writeHead(c, h) { this.code = c; this.len = Number(h && h['Content-Length']) || 0 }, end() {} }
  route.handler({ url, method: 'GET' }, res)
  return res
}
ok(callVoice('/jt/origin.wav').code === 200, 'voice 放行 jt/origin.wav')
ok(callVoice('/w40k/awaken.wav').code === 200, 'voice 放行 w40k/awaken.wav')
ok(callVoice('/jt/origin.wav?x=1').code === 200, 'voice 忽略 query')
ok(callVoice('/w40k/origin.wav').code === 404, '风格隔离：40K 取不到极兔台词')
ok(callVoice('/jt/phase-0.wav').code === 404, '旧共用 clip 不在白名单')
ok(callVoice('/jt/%2e%2e%2f%2e%2e%2fpackage.json').code === 404, '目录穿越（编码点号）被拒')
ok(callVoice('/jt/..%2f..%2flib%2findex.js').code === 404, '目录穿越（编码斜杠）被拒')
ok(callVoice('/bogus/origin.wav').code === 404, '未知风格 404')
ok(callVoice('/jt').code === 404, '缺文件名 404')
const vRes = callVoice('/jt/origin.wav')
ok(vRes.len === fs.statSync(path.join(PKG_ROOT, 'lib', 'assets', 'voice', 'jt', 'origin.wav')).size,
  'Content-Length 与真实字节一致')

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

/* ── 音轨引擎与分风格旁白：lib/score.js 是唯一一份 ─────────────────────────
   引擎是浏览器脚本，但尾部有 globalThis 兜底，所以在 Node 里能直接加载真实谱表来断言，
   不用拿正则猜数据。 */
new Function(fs.readFileSync(path.join(PKG_ROOT, 'lib', 'score.js'), 'utf8'))()
const SCORE = globalThis.JTSCORE
ok(!!SCORE && !!SCORE.ARRANGEMENTS && !!SCORE.NARRATION, 'score.js 暴露 JTSCORE（引擎 + 谱表 + cue 表）')
ok(SCORE.ARRANGEMENTS.jt.length === SCORE.PHASE_HOLDS.jt.length &&
   SCORE.ARRANGEMENTS.w40k.length === SCORE.PHASE_HOLDS.w40k.length, '两套谱表幕数与幕表一致')
ok(SCORE.ARRANGEMENTS.jt.every(p => p.cues.length > 0) && SCORE.ARRANGEMENTS.w40k.every(p => p.cues.length > 0),
   '每一幕都有音乐内容')
ok(SCORE.IDENTITIES.jt.scale.join() !== SCORE.IDENTITIES.w40k.scale.join() &&
   SCORE.IDENTITIES.jt.reverb.seconds !== SCORE.IDENTITIES.w40k.reverb.seconds,
   '两套调性与混响空间互不通用（不是同一首曲子换音色）')

/* cue 只能用「幕内比例」描述。出现绝对秒数就意味着 speed / 减弱动效下音乐再次落后画面 ——
   这正是本次改造的根因，锁成断言。 */
const outOfRange = []
for (const st of ['jt', 'w40k']) {
  SCORE.ARRANGEMENTS[st].forEach((ph, i) => ph.cues.forEach(c => {
    if (c.at < 0 || c.at > 1 || (c.to != null && (c.to > 1 || c.to < c.at))) outOfRange.push(st + '#' + i + '.' + c.k)
  }))
}
ok(outOfRange.length === 0, '全部 cue 的 at/to 落在 0..1 幕内比例' + (outOfRange.length ? ' —— 越界：' + outOfRange.join(',') : ''))

/* 幕时长是跨文件契约：runtime 的 PHASES[].hold 改了而 PHASE_HOLDS 没跟上，旁白窗口就按
   错误时长算（本次 w40k 唤醒幕 1900→2300 就得两边同步）。 */
const holds = (src) => [...src.matchAll(/hold:\s*(\d+)/g)].map(m => Number(m[1]))
const jtHolds = holds(splash)
const wHolds = holds(w40k)
ok(jtHolds.length === 7 && JSON.stringify(jtHolds) === JSON.stringify(SCORE.PHASE_HOLDS.jt.map(s => Math.round(s * 1000))),
  'splash.js 幕时长与 score.js PHASE_HOLDS.jt 逐项一致')
ok(wHolds.length === 7 && JSON.stringify(wHolds) === JSON.stringify(SCORE.PHASE_HOLDS.w40k.map(s => Math.round(s * 1000))),
  'w40k.js 幕时长与 score.js PHASE_HOLDS.w40k 逐项一致')

/* 旁白：每套各自一条轨，cue 表 ↔ 资产 ↔ manifest 三方同源，台词不得越出当幕窗口 */
const voiceDir = path.join(PKG_ROOT, 'lib', 'assets', 'voice')
const vman = JSON.parse(fs.readFileSync(path.join(voiceDir, 'manifest.json'), 'utf8'))
for (const st of ['jt', 'w40k']) {
  const cues = SCORE.NARRATION[st] || []
  const missWav = cues.filter(c => !fs.existsSync(path.join(voiceDir, st, c.file + '.wav'))).map(c => c.file)
  ok(cues.length > 0 && missWav.length === 0,
    st + ' 每条旁白 cue 都有对应 wav（' + cues.length + ' 条）' + (missWav.length ? ' —— 缺：' + missWav.join(',') : ''))
  const rec = new Set(vman.clips.filter(c => c.style === st).map(c => c.file.replace(/\.wav$/, '')))
  ok(cues.every(c => rec.has(c.file)), st + ' cue 表与 manifest 渲染记录同源')
  ok(cues.every(c => c.phase >= 0 && c.phase < SCORE.PHASE_HOLDS[st].length), st + ' cue 幕号有效')
  ok(!cues.some(c => c.phase === 5 && !c.variant), st + ' 第 5 幕（一闪而过）不放常规旁白')
  const spill = cues.filter(c => {
    if (c.variant) return false          /* 失败播报设计上跨进终幕窗口 */
    const d = (vman.clips.find(x => x.style === st && x.file === c.file + '.wav') || {}).duration_ms || 0
    return c.at * 1000 + d > SCORE.PHASE_HOLDS[st][c.phase] * 1000
  }).map(c => c.file)
  ok(spill.length === 0, st + ' 旁白不越出当幕时长' + (spill.length ? ' —— 越窗：' + spill.join(',') : ''))
}
ok(!fs.existsSync(path.join(voiceDir, 'phase-0.wav')), '旧共用 clip 已退役，不再随包分发')

const hostJs = fs.readFileSync(path.join(PKG_ROOT, 'lib', 'index.js'), 'utf8')
ok(hostJs.includes("'/voice'") && hostJs.includes('VOICE_FILES'), 'Host 的 /voice 白名单来自 manifest')
ok(hostJs.includes("'voice'"), 'voice 仍是顶层配置键')
ok(client.includes('女声英文旁白'), '设置面板仍有旁白开关')
for (const [name, src] of [['splash.js', splash], ['w40k.js', w40k]]) {
  ok(!src.includes('VOICE_BY_PHASE') && src.includes('audio.stage(i, scene.duration)'),
    name + ' 按幕真实时长排曲（不再硬编码秒数）')
  ok(src.includes('JTSCORE.createEngine') && src.includes('audio.halt()'),
    name + ' 用 JTSCORE 建引擎并在收尾停音')
  ok(src.includes('scoreUrl') && src.includes('onload'),
    name + ' 有引擎缺失时的补挂 + 到货续播兜底')
}

fs.rmSync(home, { recursive: true, force: true })

console.log('')
if (failures) {
  console.error(failures + ' 项未通过')
  process.exit(1)
} else {
  console.log('全部通过')
}
