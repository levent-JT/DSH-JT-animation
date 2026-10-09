// 本地预览服务器：静态文件 + 真实 ~/.dsh 清单（与 lib/index.js 同逻辑）
// 仅本机预览用；真实安装走插件自身的 /jt-startup/inventory.json 路由。
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)))
const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8'
}

function listSkillNames() {
  const dir = path.join(DSH_HOME, 'skills')
  let entries = []
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return [] }
  const out = []
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith('.')) continue
    let name = e.name
    try {
      const md = fs.readFileSync(path.join(dir, e.name, 'SKILL.md'), 'utf8')
      const hit = /^name:\s*(.+)$/m.exec(md.slice(0, 4000))
      if (hit && hit[1].trim()) name = hit[1].trim().slice(0, 64)
    } catch { /* 用目录名 */ }
    out.push({ name, source: '~/.dsh/skills/' + e.name })
  }
  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}

function looksLikeDshPlugin(pkgJson, depName) {
  if (pkgJson && pkgJson.dsh) return true
  const n = String(depName || '').toLowerCase()
  return n === 'dshmarket' || n.startsWith('dsh-') || n.includes('/dsh-')
}

function listPlugins() {
  const profilesDir = path.join(DSH_HOME, 'profiles')
  let profiles = []
  try { profiles = fs.readdirSync(profilesDir, { withFileTypes: true }) } catch { return [] }
  const seen = new Map()
  for (const p of profiles) {
    if (!p.isDirectory() || p.name.startsWith('.')) continue
    let deps = {}
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(profilesDir, p.name, 'package.json'), 'utf8'))
      deps = pkg && typeof pkg.dependencies === 'object' ? pkg.dependencies : {}
    } catch { continue }
    for (const dep of Object.keys(deps)) {
      if (dep.startsWith('@deepseek-ai/')) continue
      let pkgJson = null
      try {
        pkgJson = JSON.parse(fs.readFileSync(
          path.join(profilesDir, p.name, 'node_modules', dep, 'package.json'), 'utf8'))
      } catch { /* 未安装也按声明计 */ }
      if (!looksLikeDshPlugin(pkgJson, dep)) continue
      const prev = seen.get(dep)
      const version = String((pkgJson && pkgJson.version) || deps[dep] || '')
      if (prev && prev.version === version) { prev.source += ' · ' + p.name; continue }
      seen.set(dep, { name: dep, version, source: '~/.dsh/profiles/' + p.name })
    }
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
}

function buildInventory() {
  const startedAt = Date.now()
  const skills = listSkillNames()
  const plugins = listPlugins()
  return {
    ok: true, skills, plugins,
    counts: { skills: skills.length, plugins: plugins.length },
    elapsed_ms: Date.now() - startedAt,
    generated_at: new Date().toISOString()
  }
}

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0]
  if (url === '/jt-startup/inventory.json') {
    const body = JSON.stringify(buildInventory())
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end(body)
    return
  }
  let file = path.join(ROOT, url === '/' ? 'preview/index.html' : decodeURIComponent(url).replace(/^\/+/, ''))
  file = path.resolve(file)
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return }
  fs.readFile(file, (err, bytes) => {
    if (err) { res.writeHead(404); res.end('not found'); return }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    })
    res.end(bytes)
  })
})
server.listen(8137, '127.0.0.1', () => {
  const inv = buildInventory()
  console.log('[qa-server] http://127.0.0.1:8137/preview/index.html?motion=full · 真实清单:',
    inv.counts.skills, 'skills ·', inv.counts.plugins, 'plugins')
})
