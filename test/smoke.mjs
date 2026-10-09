/* dsh-jt-startup 冒烟测试：node test/smoke.mjs
 *
 * 覆盖：
 *   1) Host 半侧导出形状（name/inject/apply，无 default）
 *   2) apply() 注册的路由：/config GET 与 /inventory.json 真实读取
 *   3) tapIndex 注入：根节点 + 引导脚本 + 关键 CSS
 *   4) splash.js / client.js 静态检查（语法 + 关键标记 + 无 `</script>`）
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
for (const rel of ['lib/index.js', 'lib/splash.js', 'lib/client.js']) {
  try {
    execFileSync(process.execPath, ['--check', path.join(PKG_ROOT, rel)], { stdio: 'pipe' })
    ok(true, rel + ' 语法有效')
  } catch (err) {
    ok(false, rel + ' 语法有效 —— ' + String(err.stderr || err.message).split('\n')[0])
  }
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
ok(taps.length === 1, '注册了 tapIndex')

const injected = taps[0]('<html><head></head><body></body></html>')
ok(injected.includes('id="jt-startup-root"'), 'index 注入含根节点')
ok(injected.includes('/jt-startup/splash.js'), 'index 注入含运行时脚本')
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

fs.rmSync(home, { recursive: true, force: true })

console.log('')
if (failures) {
  console.error(failures + ' 项未通过')
  process.exit(1)
} else {
  console.log('全部通过')
}
