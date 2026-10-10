/* 百度图片检索：image.baidu.com/search/acjson 返回 JSON，比抓 HTML 稳。
 *
 * 为什么要它：Bing 中文图搜给的是淘宝仿品和广告片，形制全错 —— 照那个画只会
 * 越画越歪。禁军必须对着官方设定图的比例与纹样来。
 *
 *   node tools/refs/baidu.mjs "战锤40K 禁军 设定图" --n=20 --tag=custodes
 *
 * 产物只落在 tools/refs/raw/（已 gitignore）：参考图用于本地研究，不进插件包。
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const RAW = join(import.meta.dirname, 'raw')
mkdirSync(RAW, { recursive: true })

const argv = process.argv.slice(2)
const query = argv.filter((a) => !a.startsWith('--')).join(' ')
const opt = (k, d) => { const a = argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d }
const N = Number(opt('n', 20))
const TAG = opt('tag', 'ref')
if (!query) { console.log('用法: node tools/refs/baidu.mjs "搜索词" [--n=20] [--tag=名]'); process.exit(1) }

async function get (url, headers = {}) {
  const r = await fetch(url, { headers: { 'user-agent': UA, referer: 'https://image.baidu.com/', ...headers }, redirect: 'follow' })
  if (!r.ok) throw new Error(r.status + ' ' + url)
  return r
}

/* appimg 是缩放图，去掉 ?w=&h=&q=&s 之类参数能拿到原图 */
function original (u) {
  if (!u) return ''
  return u.replace(/\/[a-z]{2}\/(@[^?]+)\?.*$/, '/$1').replace(/\?.*$/, '')
}

const list = []
for (let pn = 0; pn < Math.ceil(N / 30) && list.length < N * 2; pn++) {
  const api = 'https://image.baidu.com/search/acjson?tn=resultjson_com&ipn=rjson&ct=201326592' +
    '&fp=result&queryWord=' + encodeURIComponent(query) + '&word=' + encodeURIComponent(query) +
    '&pn=' + (pn * 30) + '&rn=30&ie=utf-8&oe=utf-8'
  let j
  try { j = JSON.parse(await (await get(api)).text()) } catch { break }
  for (const it of (j.data || [])) {
    if (!it || !it.thumbURL) continue
    const u = original(it.middleURL || it.thumbURL)
    if (u && !list.some((x) => x.url === u)) list.push({ url: u, thumb: it.thumbURL, title: (it.fromPageTitle || '').replace(/<[^>]+>/g, ''), from: it.fromURLHost || '' })
  }
}
console.log('候选 ' + list.length + ' 条')

let saved = 0
for (const it of list) {
  if (saved >= N) break
  for (const u of [it.url, it.thumb]) {
    try {
      const r = await get(u)
      const buf = Buffer.from(await r.arrayBuffer())
      if (buf.length < 20000) continue
      let ext = null
      if (buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a') ext = 'png'
      else if (buf[0] === 0xff && buf[1] === 0xd8) ext = 'jpg'
      else if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') ext = 'webp'
      if (!ext) continue
      const name = TAG + '-' + String(saved).padStart(2, '0') + '.' + ext
      writeFileSync(join(RAW, name), buf)
      writeFileSync(join(RAW, name + '.json'), JSON.stringify(it, null, 2))
      saved++
      console.log('✓ ' + name + ' ' + Math.round(buf.length / 1024) + 'KB  ' + it.from + '  ' + it.title.slice(0, 40))
      break
    } catch { /* 换下一张 */ }
  }
}
console.log('共存 ' + saved + ' 张 → ' + RAW)
