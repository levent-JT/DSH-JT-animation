/* 音轨渲染台专用静态服务器：根 = 插件仓库（要跨 lib 与 tools/audio 取文件），
 * 外加 POST /render/save 把浏览器离线渲染出的 wav 落盘。仅监听 127.0.0.1。
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..', '..')
const OUT = path.join(HERE, 'out')
const PORT = Number(process.env.PORT || 8138)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wav': 'audio/wav',
  '.svg': 'image/svg+xml'
}

fs.mkdirSync(OUT, { recursive: true })

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1')

  if (req.method === 'POST' && url.pathname === '/render/save') {
    /* 只收干净的 <name>.wav / <name>.png，杜绝任何路径写法 */
    const name = path.basename(url.searchParams.get('name') || 'render.wav')
    if (!/^[A-Za-z0-9._-]+\.(wav|png|webp)$/.test(name)) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'bad name' }))
      return
    }
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > 200 * 1024 * 1024) { req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => {
      let bytes = Buffer.concat(chunks)
      /* 截图/烘焙来自 canvas.toDataURL。不管是带 data: 前缀还是只剩裸 base64，
         只要开头不是已知二进制签名就当文本解一次 —— 浏览器/代理怎么裁都不影响落盘。
         png / webp(RIFF) / wav(RIFF) 三种都要认，否则导出的是一整篇 base64 文本。 */
      const sig = bytes.length > 12
        ? (bytes[0] === 0x89 && bytes.subarray(1, 4).toString('latin1') === 'PNG') ||
          bytes.subarray(0, 4).toString('latin1') === 'RIFF' ||
          bytes.subarray(0, 4).toString('latin1') === 'FORM'
        : false
      if (!sig) {
        const text = bytes.toString('latin1').replace(/^data:image\/(png|webp|jpeg);base64,/, '').trim()
        if (/^[A-Za-z0-9+/=\s]+$/.test(text) && text.length > 100) {
          const decoded = Buffer.from(text, 'base64')
          if (decoded.length > 100) bytes = decoded
        }
      }
      const file = path.join(OUT, name)
      fs.writeFileSync(file, bytes)
      console.log('[saved] ' + name + ' ' + (bytes.length / 1024).toFixed(0) + 'KB')
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, path: file, bytes: bytes.length }))
    })
    return
  }

  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '')
  const file = path.resolve(ROOT, rel || 'tools/audio/render.html')
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end('forbidden'); return }
  fs.readFile(file, (err, bytes) => {
    if (err) { res.writeHead(404); res.end('not found: ' + rel); return }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    })
    res.end(bytes)
  })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log('[score-server] http://127.0.0.1:' + PORT + '/tools/audio/render.html')
})
