/* 参考图抓取：cn.bing.com 图片搜索 → 抽出真实图片地址 → 下载到本地参考目录。
 *
 * 为什么走这条路：禁军的美术不能靠想象。之前出的参考图跑成了罗马重甲，根因是我对
 * auramite 甲的形制记忆不准。抓口碑好的官方/维基图当底本，再用 retrace.mjs 把
 * 「轮廓 + 色板」量化出来喂给 canvas —— 抄形制，不抄像素。
 *
 * 下载目录 tools/refs/raw/ 已 gitignore：参考图只用于本地研究，绝不进插件包。
 *
 *   node tools/refs/fetch.mjs "Adeptus Custodes Custodian Guard" --n=12 --tag=custode
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { inflateSync } from 'node:zlib'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const RAW = join(import.meta.dirname, 'raw')
mkdirSync(RAW, { recursive: true })

const argv = process.argv.slice(2)
const query = argv.filter((a) => !a.startsWith('--')).join(' ')
const opt = (k, d) => { const a = argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d }
const N = Number(opt('n', 12))
const TAG = opt('tag', query.replace(/[^a-z0-9]+/gi, '-').toLowerCase())

if (!query) { console.log('用法: node tools/refs/fetch.mjs "搜索词" [--n=12] [--tag=名]'); process.exit(1) }

async function get (url, headers = {}) {
  const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9,zh-CN;q=0.9', ...headers }, redirect: 'follow' })
  if (!r.ok) throw new Error(r.status + ' ' + url)
  const buf = Buffer.from(await r.arrayBuffer())
  const enc = (r.headers.get('content-encoding') || '').toLowerCase()
  if (enc === 'gzip') return inflateSync(buf)
  return buf
}

/* Bing 把结果塞在 <a class="iusc" m="{...json...}"> 里，murl 才是原图地址 */
function parseMurls (html) {
  const out = []
  const re = /<a[^>]+class="[^"]*iusc[^"]*"[^>]+m="([^"]+)"/g
  let m
  while ((m = re.exec(html))) {
    const raw = m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    try {
      const j = JSON.parse(raw)
      if (j.murl) out.push({ url: j.murl, title: j.t || '', src: j.purl || '' })
    } catch { /* 半截 JSON 直接跳过 */ }
  }
  return out
}

const isImg = (u) => /\.(png|jpe?g|webp)(\?|$)/i.test(u) || /wikimedia|lexicanum|fandom|imgur|hdslb|zhimg/.test(u)

const seen = new Set()
let list = []
for (const q of [query, query + ' lexicanum', query + ' warhammer community']) {
  const url = 'https://cn.bing.com/images/search?q=' + encodeURIComponent(q) + '&count=35&form=HDRSC2'
  try {
    const html = (await get(url, { 'accept': 'text/html' })).toString('utf8')
    for (const it of parseMurls(html)) {
      if (isImg(it.url) && !seen.has(it.url)) { seen.add(it.url); list.push(it) }
    }
  } catch (e) { console.log('搜索失败：' + e.message) }
  if (list.length >= N) break
}

console.log('候选 ' + list.length + ' 张（query=' + query + '）')
let saved = 0
for (const it of list.slice(0, N)) {
  try {
    const buf = await get(it.url, { 'referer': it.src || 'https://cn.bing.com/' })
    if (buf.length < 8000) continue           /* 头像/图标级别的小图没意义 */
    let ext = (it.url.match(/\.(png|jpe?g|webp)/i) || [, 'jpg'])[1].toLowerCase()
    if (buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a') ext = 'png'
    else if (buf[0] === 0xff && buf[1] === 0xd8) ext = 'jpg'
    else if (buf.slice(0, 4).toString() === 'RIFF') ext = 'webp'
    else continue
    const name = TAG + '-' + String(saved).padStart(2, '0') + '.' + ext
    writeFileSync(join(RAW, name), buf)
    saved++
    console.log('✓ ' + name + '  ' + Math.round(buf.length / 1024) + 'KB  ← ' + it.url.slice(0, 90))
  } catch (e) { /* 单张失败不影响其它 */ }
}
writeFileSync(join(RAW, TAG + '.index.json'), JSON.stringify(list.slice(0, N), null, 2))
console.log('共存 ' + saved + ' 张 → ' + RAW)
