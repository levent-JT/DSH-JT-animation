/* 假 DOM/Canvas 台架：在 Node 里真跑 lib/custodes.js 的绘制与时间线路径。
   存在理由：浏览器后台标签里 rAF 不跑、内嵌视口也拿不到，paint() 与 act 机没有别的
   手段能执行到。这 800 行 canvas 代码里的未定义变量、参数错误、以及「名录没到手就
   开始点名」这类时序 bug，只有在这里能被抓出来。
   用法：node tools/audio/runtime-harness.mjs [相对 tools/audio 的路径] */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))

const SRC = fs.readFileSync(path.resolve(HERE, process.argv[2] || '../../lib/custodes.js'), 'utf8')

const calls = { gradient: 0, arc: 0, text: 0, path: 0 }
function gradientStub () {
  return { addColorStop () { calls.gradient++ } }
}
const ctxStub = new Proxy({}, {
  get (_t, prop) {
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradientStub()
    if (prop === 'measureText') return () => ({ width: 42 })
    /* createImageData 必须返回真的 ImageData 形状：runtime 里的胶片颗粒会读 .data，
       返回 undefined 会让 harness 在 resize() 就崩（那是模块顶层调用，等于整段启动挂掉） */
    if (prop === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray((w || 128) * (h || 128) * 4), width: w || 128, height: h || 128 })
    if (prop === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, (w || 128) * (h || 128)) * 4), width: w || 128, height: h || 128 })
    if (prop === 'canvas') return { width: 900, height: 620 }
    if (typeof prop === 'symbol') return undefined
    return (...args) => {
      if (prop === 'arc' || prop === 'ellipse') calls.arc++
      else if (prop === 'fillText' || prop === 'strokeText') { calls.text++; if (args.some((a) => typeof a === 'undefined' || (typeof a === 'number' && !isFinite(a)))) throw new Error('fillText 参数异常: ' + JSON.stringify(args)) }
      else if (prop === 'beginPath' || prop === 'moveTo' || prop === 'lineTo' || prop === 'quadraticCurveTo') calls.path++
      return undefined
    }
  },
  set () { return true }
})

function makeEl (tag, sel) {
  const e = {
    tagName: String(tag || 'div').toUpperCase(),
    className: sel || '',
    id: '',
    children: [],
    style: { _vars: {}, setProperty (k, v) { this._vars[k] = v }, removeProperty (k) { delete this._vars[k] } },
    dataset: {},
    hidden: false,
    _text: '',
    _html: '',
    _h: {},
    _classes: new Set(),
    classList: {
      add (...c) { c.forEach((x) => e._classes.add(x)) },
      remove (...c) { c.forEach((x) => e._classes.delete(x)) },
      contains (c) { return e._classes.has(c) },
      toggle (c, on) { if (on) e._classes.add(c); else e._classes.delete(c) }
    },
    addEventListener (type, fn) { (e._h[type] = e._h[type] || []).push(fn) },
    removeEventListener () {},
    fire (type, ev) { (e._h[type] || []).forEach((fn) => fn(ev || { preventDefault () {}, stopPropagation () {}, target: e })) },
    appendChild (c) {
      if (c && c.tagName === 'FRAGMENT') { c.children.slice().forEach((g) => e.children.push(g)); c.children.length = 0; return c }
      e.children.push(c); return c
    },
    removeChild (c) { return c },
    insertBefore (c) { e.children.push(c); return c },
    setAttribute () {}, getAttribute () { return '' },
    focus () {}, blur () {},
    closest () { return null },
    getBoundingClientRect () { return { width: 900, height: 620, left: 0, top: 0, right: 900, bottom: 620 } },
    querySelector (s) { return doc.querySelector(s) },
    querySelectorAll (s) { return doc.querySelectorAll(s) },
    getContext () { return ctxStub }
  }
  Object.defineProperty(e, 'textContent', { get: () => e._text, set: (v) => { e._text = String(v) } })
  Object.defineProperty(e, 'innerHTML', { get: () => e._html, set: (v) => { e._html = String(v) } })
  Object.defineProperty(e, 'parentNode', { get: () => null, set: () => {} })
  return e
}

const bySel = new Map()
const doc = {
  readyState: 'complete',
  hidden: true,                       /* 故意模拟后台标签：只走 interval 逻辑路径 */
  documentElement: makeEl('html'),
  body: makeEl('body'),
  head: makeEl('head'),
  scripts: [],
  fonts: { ready: Promise.resolve() },
  createElement: (t) => makeEl(t),
  createDocumentFragment: () => makeEl('fragment'),
  getElementById (id) { return bySel.get('#' + id) || (bySel.set('#' + id, makeEl('div', id)), bySel.get('#' + id)) },
  querySelector (s) { if (!bySel.has(s)) bySel.set(s, makeEl('div', s)); return bySel.get(s) },
  querySelectorAll (s) { return s.includes('row') ? [] : [makeEl('div', s)] },
  addEventListener () {}, removeEventListener () {},
  dispatchEvent () { return true }
}
doc.documentElement.classList = { add () {}, remove () {}, contains () { return false } }
doc.documentElement.style = { setProperty () {}, overflow: '' }
doc.body.style = { overflow: '' }

let now = 0
const rafQueue = []
const timers = []
const win = {
  document: doc,
  performance: { now: () => now },
  Date,
  requestAnimationFrame (cb) { rafQueue.push(cb); return rafQueue.length },
  cancelAnimationFrame () {},
  devicePixelRatio: 1,
  innerWidth: 900, innerHeight: 620,
  matchMedia: (q) => ({ matches: false, media: q, addEventListener () {}, removeEventListener () {} }),
  addEventListener () {}, removeEventListener () {},
  sessionStorage: { getItem: () => null, setItem () {}, removeItem () {} },
  localStorage: { getItem: () => null, setItem () {}, removeItem () {} },
  dispatchEvent () { return true },
  CustomEvent: function (t) { this.type = t },
  fetch: () => Promise.reject(new Error('no network in harness')),
  /* 假 Image：一律走 onerror，正好演练「底片读不到 → 退回程序化」这条降级链。
     没有这个全局时 loadPlates 会 ReferenceError，而它跑在 wake() 里 —— 那正是
     会把人锁在启动屏前的那类错误，必须在 harness 里跑到。 */
  Image: function () {
    const self = this
    let src = ''
    Object.defineProperty(self, 'src', {
      get: () => src,
      set: (v) => { src = v; setTimeout(() => { if (self.onerror) self.onerror(new Error('harness: no image')) }, 0) }
    })
    self.naturalWidth = 0; self.naturalHeight = 0
  },
  console
}
const sandbox = Object.assign(Object.create(win), {
  window: win,
  document: doc,
  console,
  Math, JSON, Promise, Object, Array, String, Number, isFinite, parseInt, parseFloat, RegExp, Error, Set, Map,
  setTimeout: (fn, ms) => { timers.push({ fn, at: now + (ms || 0) }); return timers.length },
  clearInterval () {},
  setInterval: (fn) => { timers.push({ fn, every: true }); return timers.length },
  cancelAnimationFrame: () => {},
  requestAnimationFrame: win.requestAnimationFrame,
  performance: win.performance,
  navigator: { userAgent: 'harness' }
})
sandbox.globalThis = sandbox

/* 演示清单：4 skills + 5 plugins = 9 条，覆盖溢出归并路径要更多 */
win.__JT_STARTUP_DEMO__ = {
  ok: true, elapsed_ms: 88,
  skills: Array.from({ length: 6 }, (_, i) => ({ name: 'skill-' + i, source: '~/.dsh/skills/skill-' + i })),
  plugins: Array.from({ length: 9 }, (_, i) => ({ name: 'dsh-p' + i, version: '1.' + i + '.0', source: '~/.dsh/profiles/desktop', enabled: i === 3 ? false : undefined }))
}
win.__JT_STARTUP__ = { style: 'custodes', speed: 1, requireInteraction: true, inventory: true, sound: true, voice: true, background: true, holdSeconds: 2.6 }

vm.runInNewContext(SRC, sandbox, { filename: 'custodes.js' })

/* 手动泵时钟：每步 700ms 模拟后台节流后的大步长；步与步之间让出微任务队列，
   这样 fetchInventory 的 Promise 回调才能真正执行（否则清单永远没到手） */
const rootEl = bySel.get('#jt-startup-root') || doc.getElementById('jt-startup-root')
/* v2 的观测点换了形状：压力不再有 DOM 百分比元素，而是进度发丝的 scaleX；
   节拍不再读文案，读根元素上的 jtg-b-<beat> 类 —— 界面退成角落字幕后，
   文案会在节拍之间淡出，拿它当状态源会读到空。 */
const pctNum = () => {
  const e = bySel.get('.jtg-meter i')
  if (!e) return 0
  const m = /scaleX\(([\d.]+)\)/.exec(String(e.style && e.style.transform || ''))
  return m ? Math.round(parseFloat(m[1]) * 100) : 0
}
const pressure = () => {
  const raw = rootEl.style && rootEl.style._vars ? rootEl.style._vars['--jtg-v'] : undefined
  return raw === undefined ? -1 : Math.round(parseFloat(raw) * 100)
}
const beatName = () => {
  for (const b of ['sworn', 'vigil', 'muster', 'awaken']) if (rootEl._classes.has('jtg-b-' + b)) return b
  return ''
}
const BEAT_ZH = { awaken: '苏醒', muster: '集结', vigil: '受任', sworn: '誓约已成' }
let steps = 0
const seenActs = []
let phase = 0            /* 0 未到举盾 · 1 按住中 · 2 已松手 · 3 再次按住 */
let pressClassSeen = false
let releaseClassGone = false
let peakBeforeRelease = 0
let afterRelease = 0
let maxPct = 0
const trace = []
for (steps = 0; steps < 160; steps++) {
  now += 700
  const q = rafQueue.splice(0, rafQueue.length)
  q.forEach((cb) => cb(now))
  /* 一次性 setTimeout 也要按虚拟时钟放行。此前只跑 every 定时器，等于所有
     「靠 setTimeout 推进」的运行时逻辑都没被真正测到 —— 底片加载把启动挂在
     setTimeout(go, 900) 上之后，这里不放行就表现为「一帧都没画」。 */
  for (let guard = 0; guard < 200; guard++) {
    const due = timers.filter((t) => !t.every && t.at <= now)
    if (!due.length) break
    due.forEach((t) => { t.done = true; try { t.fn() } catch (e) { console.error('timer 抛错：', e.message) } })
    for (let i = timers.length - 1; i >= 0; i--) if (timers[i].done) timers.splice(i, 1)
  }
  timers.filter((t) => t.every).forEach((t) => t.fn())
  const txt = BEAT_ZH[beatName()] || ''
  /* 每步都读：举满那一刻 lock() 已把节拍切成誓约，只在举盾段采样会漏掉 100% */
  maxPct = Math.max(maxPct, pctNum())
  if (txt && seenActs[seenActs.length - 1] !== txt) seenActs.push(txt)

  if (txt === '受任') {
    trace.push(steps + ' v=' + pressure() + '% phase=' + phase + ' hold=' + (rootEl._classes.has('jtg-pressing') ? 'Y' : 'n'))
    if (phase === 0) { rootEl.fire('pointerdown'); phase = 1 }
    else if (phase === 1) {
      if (rootEl._classes.has('jtg-pressing')) pressClassSeen = true
      if (pressure() > 40) { rootEl.fire('pointerup'); peakBeforeRelease = pressure(); phase = 2 }
    } else if (phase === 2) {
      if (!rootEl._classes.has('jtg-pressing')) releaseClassGone = true
      afterRelease = pressure()
      rootEl.fire('pointerdown')
      phase = 3
    }
  }
  /* 让出微任务队列：fetch 的 then / fonts.ready 才有机会跑 */
  await new Promise((r) => setImmediate(r))
}

console.log('泵了 ' + steps + ' 步（每步 700ms，共 ' + Math.round(now / 100) / 10 + 's）')
console.log('走过的节拍：', seenActs.join(' → ') || '(无)')
console.log('canvas 调用：gradient', calls.gradient, '· 路径点', calls.path, '· 圆弧', calls.arc, '· 文字', calls.text)
const counter = bySel.get('.jtg-countNow')
const total = bySel.get('.jtg-countOf')
const rosterList = bySel.get('.jtg-list')
console.log('点名计数：', counter ? counter._text : '-', ' 名录总数：', total ? total._text : '-', '· 无障碍名录条数：', rosterList ? rosterList.children.length : '-')
const sworn = bySel.get('.jtg-end')
console.log('誓约铭文在场：', sworn ? sworn._classes.has('jtg-endIn') : false)
console.log('举盾交互：按住相位数', peakBeforeRelease + '%', '→ 松手后', afterRelease + '%', '· 按压光标样式', pressClassSeen, '· 松手复原', releaseClassGone, '· 峰值', maxPct + '%')
console.log('举盾段步进：', trace.slice(0, 14).join(' | '))
if (!calls.gradient || !calls.path || !calls.text) throw new Error('绘制路径未被真正执行')
if (seenActs.length < 4) throw new Error('节拍没走完（v2 是四拍连续镜头）：只见到 ' + seenActs.join(' / '))
const got = counter ? String(counter._text).trim() : ''
const tot = total ? String(total._text).trim() : ''
if (tot.indexOf('15') < 0) throw new Error('名录总数应为 15（6 skills + 9 plugins），实得 "' + tot + '"')
if (got !== '12') throw new Error('上镜数应封顶在 12（超出归并 +3），实得 "' + got + '"')
if (calls.text < 10) throw new Error('文字绘制过少（' + calls.text + '），名号/名单可能没画')
if (phase < 3) throw new Error('没测到松手回落（phase=' + phase + '）')
if (pressure() < 0) throw new Error('--jtg-v 读不到：交互状态没有可断言的观测面')
if (!(afterRelease < peakBeforeRelease)) throw new Error('松手后盾没有回落：' + peakBeforeRelease + '% → ' + afterRelease + '%')
if (!pressClassSeen || !releaseClassGone) throw new Error('按压态光标类没生效')
if (maxPct < 100) throw new Error('再次按住后没举满，lock 分支未触达（峰值 ' + maxPct + '%）')
console.log('✓ 绘制、时间线、名录驱动、按住/松手/再按住直至誓约，全程无异常')
