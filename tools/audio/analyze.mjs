/* 音轨体检：时长 / 峰值 / 整体响度 / 动态范围 / 最响时刻 / 削顶。
 * 用法 node tools/audio/analyze.mjs [file.wav ...]（默认扫 out/ 下所有 *-instrumental.wav）
 * 目的很具体：三套音轨都得有自己的起伏，不能渲染出来是一堵墙。 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(HERE, 'out')
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(OUT).filter((f) => f.endsWith('.wav')).sort()

function loadWav (file) {
  const b = fs.readFileSync(file)
  let off = 12, fmt = null, db = null
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4)
    const sz = b.readUInt32LE(off + 4)
    const bd = off + 8
    if (id === 'fmt ') fmt = { ch: b.readUInt16LE(bd + 2), sr: b.readUInt32LE(bd + 4), bits: b.readUInt16LE(bd + 14) }
    else if (id === 'data') db = { bd, sz }
    off = bd + sz + (sz & 1)
  }
  if (!fmt || !db) throw new Error('不是可解析的 WAV：' + file)
  return { b, fmt, db }
}
const db = (x) => 20 * Math.log10(Math.max(1e-9, x))

const rows = []
for (const f of files) {
  const file = path.isAbsolute(f) ? f : path.join(OUT, f)
  const { b, fmt, db: data } = loadWav(file)
  const per = Math.floor(data.sz / (fmt.bits / 8))
  const n = Math.floor(per / fmt.ch)
  const win = Math.floor(fmt.sr * 0.25)
  const peaks = []
  let globalPeak = 0, clipped = 0, sumSq = 0
  for (let i = 0; i < n; i++) {
    let acc = 0
    for (let c = 0; c < fmt.ch; c++) {
      const v = b.readInt16LE(data.bd + (i * fmt.ch + c) * 2) / 32768
      if (Math.abs(v) >= 0.999) clipped++
      acc += v * v
    }
    const m = Math.sqrt(acc / fmt.ch)
    sumSq += m * m
    if (m > globalPeak) globalPeak = m
    if (i % win === 0) peaks.push(m)
  }
  const sorted = peaks.slice().sort((a, x) => a - x)
  const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] || 0
  let loudAt = 0, loud = 0
  peaks.forEach((p, i) => { if (p > loud) { loud = p; loudAt = i * win / fmt.sr } })
  rows.push({
    文件: path.basename(file),
    时长: (n / fmt.sr).toFixed(1) + 's',
    峰值dBFS: db(globalPeak).toFixed(1),
    响度dBFS: db(Math.sqrt(sumSq / n)).toFixed(1),
    动态dB: (db(q(0.95)) - db(q(0.2))).toFixed(1),
    '最响@': loudAt.toFixed(1) + 's',
    削顶: clipped
  })
}
console.table(rows)
const flat = rows.filter((r) => parseFloat(r['动态dB']) < 6)
if (flat.length) console.log('⚠ 动态不足 6dB（听感会像一堵墙）：' + flat.map((r) => r.文件).join(', '))
const hot = rows.filter((r) => parseFloat(r['响度dBFS']) > -13)
if (hot.length) console.log('⚠ 整体过响（启动屏不该这么冲）：' + hot.map((r) => r.文件).join(', '))
if (!flat.length && !hot.length) console.log('✓ 三套都有起伏，且没有一个顶在限幅器上')
