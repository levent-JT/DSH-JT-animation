/* Qwen-TTS 声音复刻生产线：参考音拼接 → 建音色 → 逐句合成 → 归一化成 24k mono PCM16。
 * 纯 Node HTTP，不依赖 dashscope SDK（本机 Python 3.15 装不了 torch 系依赖）。
 *
 *   node tts.mjs probe      # 零消耗：逐主机验证鉴权与路由（action=list 不建音色）
 *   node tts.mjs ref        # 纯本地：产出 out/reference.wav 供试听
 *   node tts.mjs enroll     # 建音色（¥0.01，失败不计；结果存 out/voice-id.json）
 *   node tts.mjs say "文本"  # 单句试音，确认返回格式与音色
 *   node tts.mjs batch --dry# 只打印计划与字符数，不发请求
 *   node tts.mjs batch      # 全量合成到 out/voice/<style>/
 *   node tts.mjs batch --promote  # 审听通过后复制进插件 assets
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PLUGIN = path.join(HERE, '..', '..')
/* 复刻参考音属于生产输入而非随包资产：原始 Qwen3-TTS clip 已从插件目录移到这里。 */
const VOICE_SRC = path.join(HERE, 'legacy-voice')
const OUT = path.join(HERE, 'out')
const PLAN = JSON.parse(fs.readFileSync(path.join(HERE, 'narration.json'), 'utf8'))

/* 官方文档推荐工作空间域名；legacy dashscope 域名作回退。两个都试，谁通用谁。 */
const HOSTS = [
  process.env.DSH_WS_HOST || 'llm-1iol69g8qlxvr4xq.cn-beijing.maas.aliyuncs.com',
  'dashscope.aliyuncs.com'
]
const TARGET_MODEL = process.env.DSH_TARGET_MODEL || PLAN.voice.target_model

function apiKey () {
  if (process.env.DASHSCOPE_API_KEY) return process.env.DASHSCOPE_API_KEY.trim()
  const envFile = path.join(HERE, '.env')
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const m = /^\s*(?:export\s+)?DASHSCOPE_API_KEY\s*=\s*(.+?)\s*$/.exec(line)
      if (m) return m[1].replace(/^["']|["']$/g, '')
    }
  }
  throw new Error('未找到 DASHSCOPE_API_KEY（设环境变量或写进 tools/audio/.env，不要把 key 贴进对话）')
}

/* ── WAV 读写与后期（与 manifest 记录的原始后期保持一致：24Hz 高通 / 去空白 / -2.16dBFS / 6ms 淡入淡出）── */
function readWav (buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF') throw new Error('不是 RIFF/WAV（可能是 mp3，见 stderr 提示）')
  let off = 12
  let fmt = null
  let data = null
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4)
    const size = buf.readUInt32LE(off + 4)
    const body = off + 8
    if (id === 'fmt ') {
      fmt = { codec: buf.readUInt16LE(body), channels: buf.readUInt16LE(body + 2), sampleRate: buf.readUInt32LE(body + 4), bits: buf.readUInt16LE(body + 14) }
    } else if (id === 'data') data = buf.subarray(body, body + size)
    off = body + size + (size & 1)
  }
  if (!fmt || !data) throw new Error('WAV 缺 fmt/data 块')
  if (fmt.codec !== 1) throw new Error('仅支持 PCM，实际 codec=' + fmt.codec)
  if (fmt.bits !== 16) throw new Error('仅支持 16bit，实际 ' + fmt.bits + 'bit')
  const per = Math.floor(data.length / 2)
  const ch = fmt.channels
  const mono = new Float64Array(Math.floor(per / ch))
  for (let i = 0; i < mono.length; i++) {
    let acc = 0
    for (let c = 0; c < ch; c++) acc += int16(data, (i * ch + c) * 2)
    mono[i] = acc / ch / 32768
  }
  return { sampleRate: fmt.sampleRate, samples: mono }
}
function int16 (b, o) { const v = b.readUInt16LE(o); return v >= 0x8000 ? v - 0x10000 : v }
function writeWav (samples, sampleRate) {
  const n = samples.length
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8)
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate * 2, 28)
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34)
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]))
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2)
  }
  return buf
}
function resample (src, from, to) {
  if (from === to) return src.slice()
  const ratio = from / to
  const out = new Float64Array(Math.floor(src.length / ratio))
  for (let i = 0; i < out.length; i++) {
    const p = i * ratio
    const i0 = Math.floor(p)
    const f = p - i0
    out[i] = src[i0] * (1 - f) + (src[Math.min(src.length - 1, i0 + 1)]) * f
  }
  return out
}
function highpass (s, sr, hz) {
  const w = 2 * Math.PI * hz / sr
  const cosw = Math.cos(w)
  const alpha = Math.sin(w) / (2 * 0.7071)
  const b0 = (1 + cosw) / 2, b1 = -(1 + cosw), b2 = (1 + cosw) / 2
  const a0 = 1 + alpha, a1 = -2 * cosw, a2 = 1 - alpha
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  const out = new Float64Array(s.length)
  for (let i = 0; i < s.length; i++) {
    const x = s[i]
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
    x2 = x1; x1 = x; y2 = y1; y1 = y
    out[i] = y
  }
  return out
}
function trimSilence (s, sr, padMs) {
  const thr = 0.004
  let a = 0, b = s.length - 1
  while (a < s.length && Math.abs(s[a]) < thr) a++
  while (b > a && Math.abs(s[b]) < thr) b--
  const pad = Math.round(sr * padMs / 1000)
  const from = Math.max(0, a - pad)
  const to = Math.min(s.length, b + pad)
  return s.slice(from, to)
}
function fade (s, sr, ms) {
  const n = Math.min(s.length, Math.round(sr * ms / 1000))
  for (let i = 0; i < n; i++) { s[i] *= i / n; s[s.length - 1 - i] *= i / n }
  return s
}
function normalize (samples, sr) {
  let s = resample(samples, sr, 24000)
  s = highpass(s, 24000, 24)
  s = trimSilence(s, 24000, 20)
  s = fade(s, 24000, 6)
  let peak = 0
  for (let i = 0; i < s.length; i++) peak = Math.max(peak, Math.abs(s[i]))
  const target = Math.pow(10, -2.16 / 20)
  if (peak > 0.0001) for (let i = 0; i < s.length; i++) s[i] = s[i] / peak * target
  return s
}
const durMs = (s) => Math.round(s.length / 24000 * 1000)

/* ── 参考音：把现有 wav 拼成 10~20s 连续清晰单人声 ── */
function buildReference () {
  const { sources, gap_ms } = PLAN.voice.reference
  const parts = []
  const transcripts = []
  const manifest = JSON.parse(fs.readFileSync(path.join(VOICE_SRC, 'manifest.json'), 'utf8'))
  for (const name of sources) {
    const { sampleRate, samples } = readWav(fs.readFileSync(path.join(VOICE_SRC, name)))
    parts.push(resample(samples, sampleRate, 24000))
    const clip = (manifest.clips || []).find((c) => (c.name || c.file) === name)
    if (clip && (clip.text || clip.transcript)) transcripts.push(clip.text || clip.transcript)
  }
  const gap = new Float64Array(Math.round(24000 * gap_ms / 1000))
  const total = parts.reduce((a, p) => a + p.length, 0) + gap.length * (parts.length - 1)
  const joined = new Float64Array(total)
  let o = 0
  parts.forEach((p, i) => { if (i) { joined.set(gap, o); o += gap.length } joined.set(p, o); o += p.length })
  const s = normalize(joined, 24000)
  return { wav: writeWav(s, 24000), ms: durMs(s), transcript: transcripts.join(' ') }
}

/* ── HTTP ── */
async function post (host, p, body) {
  const res = await fetch('https://' + host + p, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* 非 JSON 原样返回 */ }
  return { status: res.status, json, text }
}
function hostOk (r) { return r.status === 200 && !(r.json && r.json.code) }

/* 建音色用 customization，合成用 multimodal-generation。两者主机保持一致，
   否则会出现「音色在 A 机注册、B 机查不到」。 */
async function pickHost () {
  for (const h of HOSTS) {
    const r = await post(h, '/api/v1/services/audio/tts/customization', {
      model: 'qwen-voice-enrollment', input: { action: 'list', page_size: 5, page_index: 0 }
    })
    if (hostOk(r)) { console.log('[host] ' + h + ' 可用，已有音色 ' + ((r.json.output && r.json.output.voice_list) || []).length + ' 个'); return h }
    console.log('[host] ' + h + ' 不可用：' + r.status + ' ' + (r.json && (r.json.code + ' ' + r.json.message) || r.text.slice(0, 160)))
  }
  throw new Error('两个主机都没通过。检查 key 是否有效、地域是否华北2、模型是否已在控制台开通。')
}

const ID_FILE = path.join(OUT, 'voice-id.json')
function savedVoice () {
  if (!fs.existsSync(ID_FILE)) throw new Error('还没有 voice id，先跑 node tts.mjs enroll')
  return JSON.parse(fs.readFileSync(ID_FILE, 'utf8'))
}

async function enroll () {
  const host = await pickHost()
  const ref = buildReference()
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'reference.wav'), ref.wav)
  console.log('[ref] out/reference.wav ' + ref.ms + 'ms · ' + (ref.wav.length / 1024).toFixed(0) + 'KB · 台词: ' + ref.transcript.slice(0, 80))
  if (ref.ms < 5000) throw new Error('参考音太短（' + ref.ms + 'ms），官方要求 ≥3s 连续清晰人声，建议 10~20s')
  const body = {
    model: 'qwen-voice-enrollment',
    input: {
      action: 'create',
      target_model: TARGET_MODEL,
      preferred_name: 'dshjt',
      language: 'en',
      text: ref.transcript,
      audio: { data: 'data:audio/wav;base64,' + ref.wav.toString('base64') }
    }
  }
  const r = await post(host, '/api/v1/services/audio/tts/customization', body)
  if (!hostOk(r)) throw new Error('建音色失败 ' + r.status + '：' + (r.json ? r.json.code + ' / ' + r.json.message : r.text.slice(0, 300)) + '（失败不计额度，可改参数重试）')
  const voice = r.json.output.voice
  fs.writeFileSync(ID_FILE, JSON.stringify({ voice, target_model: TARGET_MODEL, host, created_at: new Date().toISOString() }, null, 2))
  console.log('[enroll] voice =', voice)
  return voice
}

async function synth (text) {
  const { voice, target_model, host } = savedVoice()
  const r = await post(host, '/api/v1/services/aigc/multimodal-generation/generation', {
    model: target_model, input: { text, voice }
  })
  if (!hostOk(r)) throw new Error('合成失败 ' + r.status + '：' + (r.json ? r.json.code + ' / ' + r.json.message : r.text.slice(0, 300)))
  const audio = r.json.output && r.json.output.audio
  if (!audio) throw new Error('响应没有 output.audio：' + JSON.stringify(r.json).slice(0, 400))
  if (audio.data) return Buffer.from(audio.data, 'base64')
  if (!audio.url) throw new Error('响应没有 audio.url：' + JSON.stringify(audio).slice(0, 300))
  const dl = await fetch(audio.url)
  if (!dl.ok) throw new Error('下载失败 ' + dl.status + ' ' + audio.url.slice(0, 120))
  return Buffer.from(await dl.arrayBuffer())
}

/* 返回体多半是 wav（结果 URL 以 .wav 结尾），不是 RIFF 时原样留下并提示——
   WebAudio decodeAudioData 能嗅探容器，mp3 也能播，只是本地做不了裁切对齐。 */
async function render (text, dest) {
  const raw = await synth(text)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  try {
    const { sampleRate, samples } = readWav(raw)
    const s = normalize(samples, sampleRate)
    fs.writeFileSync(dest, writeWav(s, 24000))
    return { ms: durMs(s), bytes: (s.length * 2 + 44) / 1024, raw: false }
  } catch (err) {
    fs.writeFileSync(dest, raw)
    return { ms: NaN, bytes: raw.length / 1024, raw: true, why: err.message }
  }
}

function collectLines (onlyStyle) {
  const out = []
  for (const style of Object.keys(PLAN.styles)) {
    if (style.startsWith('_')) continue
    if (onlyStyle && style !== onlyStyle) continue
    for (const line of PLAN.styles[style].lines) {
      if (!line.text) { console.log('  跳过 ' + style + '/' + line.id + '：' + (line.why || '无台词')); continue }
      out.push({ style, line })
    }
  }
  return out
}

/* 真正能放话的窗口 = 该幕时长 - 起播偏移；标了 spill 的失败播报设计上会延续到
 * 下一幕（GRANTED/CONSECRATIO 只有一闪而过），所以再计入 spill_into_ms。
 * budget_ms 那种手工猜测值不可靠，一律推导，避免把乐观估值当硬约束报警。 */
function windowOf (line) {
  /* continuous 型（禁军）没有幕表，窗口就是台词表里写明的段预算 */
  if (line.hold_ms == null) return line.budget_ms || 0
  return (line.hold_ms || 0) - (line.play_at_ms || 0) + (line.spill ? (line.spill_into_ms || 0) : 0)
}

/* 只做本地复制 + 生成 manifest。重跑 batch 会二次合成，白烧额度。 */
function promoteAll (only) {
  const voiceDir = path.join(PLUGIN, 'lib', 'assets', 'voice')
  const rows = []
  const clips = []
  for (const { style, line } of collectLines(only)) {
    const src = path.join(OUT, 'voice', style, line.id + '.wav')
    if (!fs.existsSync(src)) { rows.push([style + '/' + line.id, 'out/ 下缺文件，先跑 batch']); continue }
    const file = (line.file || line.id) + '.wav'
    const dir = path.join(voiceDir, style)
    fs.mkdirSync(dir, { recursive: true })
    fs.copyFileSync(src, path.join(dir, file))
    const ms = durMs(normalize(readWav(fs.readFileSync(src)).samples, readWav(fs.readFileSync(src)).sampleRate))
    clips.push({ style, file, phase: line.phase, text: line.text, duration_ms: ms, play_at_ms: line.play_at_ms })
    rows.push([style + '/' + file, ms + 'ms'])
  }
  /* 只替换本次处理的那些风格；其余记录原样保留 ——
     否则 promote 一套会把另两套的溯源从 manifest 里抹掉。 */
  const touched = new Set(collectLines(only).map((x) => x.style))
  try {
    const prev = JSON.parse(fs.readFileSync(path.join(voiceDir, 'manifest.json'), 'utf8'))
    for (const c of prev.clips || []) if (!touched.has(c.style)) clips.push(c)
  } catch (e) { /* 首次落盘或已损坏，就只写本次 */ }
  clips.sort((a, b) => (a.style + a.file).localeCompare(b.style + b.file))

  const ref = buildReference()
  const vid = fs.existsSync(ID_FILE) ? JSON.parse(fs.readFileSync(ID_FILE, 'utf8')) : {}
  const manifest = {
    method: 'reference-conditioned voice cloning, hosted inference (阿里云百炼 · 华北2)',
    voice_model: vid.target_model || TARGET_MODEL,
    voice_id: vid.voice || null,
    voice_id_note: 'voice_id 属生成者账号，仅作溯源；安装者无需也无法复用',
    model_license: 'Qwen-TTS 系列 Apache-2.0；推理在云端完成，本地不分发模型',
    reference_assets: '12.1s 参考音由本仓库 v0.3.0 的 lib/assets/voice/phase-*.wav 拼接（纯人声、无 BGM）；参考音本身不随包分发',
    reference_seconds: Math.round(ref.ms / 100) / 10,
    reference_transcript: ref.transcript,
    postprocess: '24 kHz mono PCM16, 24 Hz high-pass, silence trim, -2.16 dBFS peak, 6 ms fades',
    cue_table: '生效的台词 cue 与起播偏移在 lib/score.js 的 JTSCORE.NARRATION；下方 clips 只是本次渲染记录，改这里不改变播放行为',
    generated_at: new Date().toISOString().slice(0, 10),
    clips
  }
  fs.writeFileSync(path.join(voiceDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.table(rows)
  console.log('已复制进 ' + voiceDir + '/<style>/ 并写 manifest.json（' + clips.length + ' 句）')
}

function checkRendered (only) {
  const rows = []
  for (const { style, line } of collectLines(only)) {
    const f = path.join(OUT, 'voice', style, line.id + '.wav')
    if (!fs.existsSync(f)) { rows.push([style + '/' + line.id, '未渲染', '', '']); continue }
    let ms = NaN
    try { const w = readWav(fs.readFileSync(f)); ms = durMs(w.samples) } catch (err) { rows.push([style + '/' + line.id, '非 WAV', '', err.message]); continue }
    const win = windowOf(line)
    const end = (line.play_at_ms || 0) + ms
    rows.push([style + '/' + line.id, ms + 'ms', win + 'ms 窗口', end <= win ? 'ok' : '溢出 ' + (end - win) + 'ms → 需改幕时长或缩句'])
  }
  console.table(rows)
  const bad = rows.filter((r) => String(r[3]).startsWith('溢出')).length
  console.log(bad ? bad + ' 句跨幕。' : '全部落在各自窗口内。')
}

const cmd = process.argv[2] || 'probe'
const flags = process.argv.slice(3)
/* --style=custodes / --style custodes：只处理一套（合成与提审都能单独跑） */
function flagVal (name) {
  const eq = flags.filter((f) => f.startsWith('--' + name + '='))[0]
  if (eq) return eq.split('=')[1]
  const i = flags.indexOf('--' + name)
  return i >= 0 ? flags[i + 1] : null
}
const onlyStyle = flagVal('style')
fs.mkdirSync(OUT, { recursive: true })

if (cmd === 'probe') {
  await pickHost()
  console.log('鉴权与路由 OK。下一步：node tts.mjs enroll')
} else if (cmd === 'ref') {
  const ref = buildReference()
  fs.writeFileSync(path.join(OUT, 'reference.wav'), ref.wav)
  console.log('[ref] out/reference.wav ' + ref.ms + 'ms · ' + (ref.wav.length / 1024).toFixed(0) + 'KB')
  console.log('      台词: ' + ref.transcript)
} else if (cmd === 'enroll') {
  await enroll()
  console.log('下一步先用一句最便宜的试音：node tts.mjs say "Access granted."')
} else if (cmd === 'say') {
  const text = flags.filter((f) => !f.startsWith('--')).join(' ') || 'Access granted.'
  const r = await render(text, path.join(OUT, 'say-test.wav'))
  console.log('[say] out/say-test.wav ' + (r.raw ? '非 WAV(' + r.why + ')' : r.ms + 'ms') + ' · ' + r.bytes.toFixed(0) + 'KB')
} else if (cmd === 'batch') {
  const dry = flags.includes('--dry')
  const lines = collectLines(onlyStyle)
  if (dry) {
    const rows = lines.map(({ style, line }) => [style + '/' + line.id, line.text, windowOf(line) + 'ms 窗口'])
    console.table(rows)
    console.log('共 ' + rows.length + ' 句，' + lines.reduce((a, x) => a + x.line.text.length, 0) + ' 字符；未发送任何请求。')
  } else {
    if (!fs.existsSync(ID_FILE)) await enroll()
    for (const { style, line } of lines) {
      const dest = path.join(OUT, 'voice', style, line.id + '.wav')
      const r = await render(line.text, dest)
      const over = !Number.isNaN(r.ms) && r.ms > windowOf(line)
      console.log((over ? '⚠ ' : '  ') + style + '/' + line.id + ' ' + (r.raw ? '非WAV' : r.ms + 'ms') + ' / 窗口 ' + windowOf(line) + 'ms' + (over ? '  ← 跨幕' : '') + (r.raw ? ' ← ' + r.why : ''))
    }
    console.log('结果在 out/voice/<style>/，审听后跑 node tts.mjs promote')
  }
} else if (cmd === 'promote') {
  promoteAll(onlyStyle)
} else if (cmd === 'check') {
  checkRendered(onlyStyle)
} else {
  console.log('未知命令：' + cmd + '（probe | ref | enroll | say | batch [--dry] | promote | check）')
}
