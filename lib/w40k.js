/* ============================================================================
 * dsh-jt-startup — 启动动画运行时「机神祷文 RITES OF THE MACHINE GOD」
 *                                       战锤40K 风格 · 哥特暗色（浏览器端，零依赖）
 * ----------------------------------------------------------------------------
 * 与「极兔干线」共用同一套注入协议（root id / jts-boot / jts-lock / storage 键 /
 * __JT_STARTUP__ / __JT_STARTUP_API__ / 9 秒 failsafe），但美术语言完全独立：
 * 烛光、羊皮纸、黄铜金、暗腥红、琥珀磷光。中文走宋体（礼仪感），西文衬线大字距。
 *
 *   00  AWAKENING     唤醒机魂 —— CRT 上电，一枚齿轮开始转动，二进制圣歌敲出
 *   01  VIA SANCTA    朝圣航路 —— 烛光羊皮纸星图：泰拉余烬沿朝圣航线点亮万界，
 *                      背景虚化的黄金王座随镜头拉出渐显；终局定影「驻地」节点
 *   02  UPLINK        神经接驳 —— 典籍翻页收起星图，哥特尖拱描线 + 神经导管脉冲
 *   03  INSCRIPTIO    铭刻圣名 —— 名录密卷展开（名讳/圣秩/驻地/编序）+ 羽笔书写
 *   04  RELICS        唤醒圣物 —— 琥珀磷光思考机终端，真实清单逐件唤醒（ANIMATA）
 *   05  CONSECRATIO   机神祝圣 —— 巨大火漆印章自圣光中落下（尘迸 + 屏震 + 闷响）
 *   06  BENEDICTIO    机神庇佑 —— 尖拱下的羊皮纸会话卡，时辰礼仪问候收尾
 *
 * 叙事是「一场完整的机械教仪式」，不是企业授权流程：唤醒 → 朝圣 → 诵祷接驳 →
 * 铭刻圣名 → 唤醒圣物 → 祝圣 → 庇佑。过渡语言与极兔「连续变形」截然不同：
 * 烛光传递 / 翻页 / 卷轴上收 / 祝圣光晕。
 * 图形由 Canvas 现场绘制（程序化羊皮纸 / 王座虚化层 / 火漆 / 齿轮 / 骷髅纹章），
 * 音效由 WebAudio 现场合成；除真实 ~/.dsh 清单外不携带任何素材。
 * ========================================================================== */
(function () {
  'use strict'

  if (window.__JT_STARTUP_LOADED__) return
  window.__JT_STARTUP_LOADED__ = true

  var ROOT_ID = 'jt-startup-root'
  var TAU = Math.PI * 2

  /* ── 默认配置（Host 侧 configForPage 已把 w40k 组扁平化到顶层）────────── */
  var DEFAULTS = {
    enabled: true,
    mode: 'session',            // always | session | daily
    style: 'w40k',              // 本 runtime 只在 style=w40k 时被注入
    speed: 1,
    requireInteraction: true,   // 「诵念接驳祷文 / 落笔铭刻」两个节点等待用户
    allowSkip: true,
    sound: true,
    soundVolume: 0.5,
    inventory: true,            // 「唤醒圣物」读取真实 skills/plugins
    voice: true,                // 女声英文旁白（深潜计划同款音色）
    background: true,           // 背景层：黄金王座虚影 + 余烬
    accent: '#8f1f1f',          // 暗腥红（火漆 / 朝圣航线）
    identity: 'JT-DEVELOPER',   // 名讳
    rank: 'TECH-ADEPT',         // 圣秩
    station: 'RYZA · FORGE WORLD', // 驻地（星图终局定影）
    cipher: 'JT0001'            // 编序（二进制圣歌的种子）
  }

  /* ── 七阶段脚本（一场机械教仪式：唤醒 → 朝圣 → 接驳 → 铭刻 → 唤醒圣物 → 祝圣 → 庇佑）── */
  var PHASES = [
    { key: 'awaken', go: 'AWAKENING', zh: '唤醒机魂', en: 'LITANIA ACTIVATIONIS',
      note: '烛火将熄，祷文已诵 —— 唤醒沉眠的机魂。', hold: 2300 },
    { key: 'via', go: 'VIA SANCTA', zh: '朝圣航路', en: 'HOLY TERRA · LUX IN TENEBRIS',
      note: '星语者自泰拉余烬点亮通往驻地的朝圣航路。', hold: 7400 },
    { key: 'uplink', go: 'UPLINK', zh: '神经接驳', en: 'NEURAL UPLINK · CODEX APERTUS',
      note: '以接驳祷文把本机工作区接入机神的神经网络。', hold: 2400,
      action: { zh: '诵念接驳祷文', en: 'RECITE LITANY' } },
    { key: 'inscribe', go: 'INSCRIPTIO', zh: '铭刻圣名', en: 'INSCRIPTIO NOMINIS',
      note: '羽笔把名讳与圣秩铭入机神的名录密卷。', hold: 2500,
      action: { zh: '落笔铭刻', en: 'INSCRIBE' } },
    { key: 'relics', go: 'RELICS', zh: '唤醒圣物', en: 'RELICS EXCITANDI',
      note: '逐件唤醒本地圣仪与圣物（真实名录）。', hold: 2900, inventory: true },
    { key: 'consecrate', go: 'CONSECRATIO', zh: '机神祝圣', en: 'CONSECRATA · AVE OMNISSIAH',
      note: '', hold: 1400 },
    { key: 'benedictio', go: 'BENEDICTIO', zh: '机神庇佑', en: 'THE MACHINE GOD PROVIDES',
      note: '圣名俱铭，圣物俱醒 —— 愿机魂佑你所构建。', hold: 3600 }
  ]
  var LOG_LINES = ['LITANIA ACTIVATIONIS', 'VIA SANCTA', 'UPLINK NEURALIS', 'INSCRIPTIO NOMINIS', 'RELICS EXCITANDI', 'CONSECRATIO', 'BENEDICTIO']
  /* 圣言引文（终幕轮换，编序播种）：机械教经典祷文 */
  var LITANIES = [
    'BLESSED IS THE MIND TOO SMALL FOR DOUBT · 怀疑无处容身之心，实为有福',
    'FROM THE WEAKNESS OF THE FLESH, DELIVER US · 从肉体的软弱中拯救我们',
    'KNOWLEDGE IS POWER · GUARD IT WELL · 知识即力量，善自守护',
    'THE MACHINE SPIRIT KEEPS FAITH WITH THE FAITHFUL · 机魂与笃信者同在'
  ]

  function cfg() {
    var raw = (window.__JT_STARTUP__ && typeof window.__JT_STARTUP__ === 'object')
      ? window.__JT_STARTUP__
      : {}
    var out = {}
    for (var k in DEFAULTS) if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) out[k] = DEFAULTS[k]
    for (var k2 in raw) {
      if (Object.prototype.hasOwnProperty.call(raw, k2) && raw[k2] !== undefined && raw[k2] !== null) {
        out[k2] = raw[k2]
      }
    }
    out.speed = Math.min(3, Math.max(0.35, Number(out.speed) || 1))
    out.identity = String(out.identity || DEFAULTS.identity).slice(0, 48)
    out.rank = String(out.rank || DEFAULTS.rank).slice(0, 48)
    out.station = String(out.station || DEFAULTS.station).slice(0, 64)
    out.cipher = String(out.cipher || out.identity).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
    if (!out.cipher) out.cipher = 'JT0001'
    out.accent = /^#[0-9a-fA-F]{3,8}$/.test(String(out.accent)) ? out.accent : DEFAULTS.accent
    return out
  }

  var C = cfg()
  var REDUCED = false
  try {
    REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  } catch (e) { /* 无 matchMedia 就按常规动效 */ }

  /* ── 旁白判定状态：名录读取结果决定用哪条失败播报 ──────────────────────
     voiceOffline  = 什么都没读到（unavailable）
     voiceSkipped  > 0 件圣物未被唤醒（warn）
     cue 表与 wav 都由引擎/资产提供，这里只存运行时判定结果。 */
  var voiceOffline = false
  var voiceSkipped = 0

  /** 重播：把本 runtime 重新挂一次（设置页「立即预览」/ 跨风格切换用）。 */
  function injectSelf() {
    audio.halt()
    window.__JT_STARTUP_LOADED__ = false
    var old = document.getElementById(ROOT_ID)
    if (old && old.parentNode) old.parentNode.removeChild(old)
    window.__JT_STARTUP_SKIP__ = false
    var s = document.createElement('script')
    if (window.__JT_STARTUP_SCRIPT_URL__) {
      s.src = window.__JT_STARTUP_SCRIPT_URL__
    } else {
      s.src = '/jt-startup/w40k.js?t=' + Date.now()
    }
    document.head.appendChild(s)
  }

  /* Host 侧的首屏兜底脚本已经判定"这次不播"：只暴露 API，不建 DOM。 */
  if (window.__JT_STARTUP_SKIP__ === true) {
    window.__JT_STARTUP_API__ = {
      replay: injectSelf,
      skip: function () {},
      finish: function () {},
      config: C
    }
    return
  }

  /* 最后一道保险：无论前面哪一步抛异常，都不许把用户留在锁屏里 */
  setTimeout(function () {
    try {
      var r = document.getElementById(ROOT_ID)
      if (r && r.classList && r.classList.contains('jts-boot')) {
        if (r.parentNode) r.parentNode.removeChild(r)
        document.documentElement.classList.remove('jts-lock')
        if (document.body) document.body.style.overflow = ''
        window.__JT_STARTUP_FAILED__ = true
      }
    } catch (e) { /* 兜底本身不许再抛 */ }
  }, 9000)

  /* ── 小工具 ───────────────────────────────────────────────────────────── */
  function el(tag, cls, text) {
    var n = document.createElement(tag)
    if (cls) n.className = cls
    if (text != null) n.textContent = text
    return n
  }
  function clamp01(n, lo, hi) {
    if (lo === undefined) lo = 0
    if (hi === undefined) hi = 1
    var v = Number(n)
    return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo
  }
  var ease = function (n) { n = clamp01(n); return 1 - Math.pow(1 - n, 3) }
  var easeIn = function (n) { n = clamp01(n); return n * n * n }
  var smooth = function (n) { n = clamp01(n); return n * n * (3 - 2 * n) }
  var quintic = function (n) { n = clamp01(n); return n * n * n * (n * (n * 6 - 15) + 10) }
  var lerp = function (a, b, t) { return a + (b - a) * t }

  function hashStr(s) {
    var h = 2166136261
    s = String(s || '')
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)
      h = (h * 16777619) >>> 0
    }
    return h >>> 0
  }
  function prng(seed) {
    var a = seed >>> 0
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0
      var t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  /* ── DOM 搭建 ─────────────────────────────────────────────────────────── */
  var root = document.getElementById(ROOT_ID)
  if (!root) {
    root = el('div')
    root.id = ROOT_ID
    root.className = 'jts-root jtw-root'
    document.body.appendChild(root)
  } else {
    /* Host / 自举挂的根上带着 jtw-root；重播等场景兜底补一次。 */
    if (!root.classList.contains('jtw-root')) root.classList.add('jtw-root')
  }
  if (REDUCED) root.classList.add('jtw-reduced')
  root.style.setProperty('--jtw-speed', String(C.speed))
  root.style.setProperty('--jtw-blood', C.accent)

  var COG_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9.4 5.9-2.1-.4a7 7 0 0 1-.6 1.5l1.3 1.7-1.9 1.9-1.7-1.3a7 7 0 0 1-1.5.6l-.4 2.1h-2.8l-.4-2.1a7 7 0 0 1-1.5-.6l-1.7 1.3-1.9-1.9 1.3-1.7a7 7 0 0 1-.6-1.5l-2.1-.4v-2.8l2.1-.4a7 7 0 0 1 .6-1.5L6.3 7.5l1.9-1.9 1.7 1.3a7 7 0 0 1 1.5-.6l.4-2.1h2.8l.4 2.1a7 7 0 0 1 1.5.6l1.7-1.3 1.9 1.9-1.3 1.7a7 7 0 0 1 .6 1.5l2.1.4z"/></svg>'

  root.innerHTML =
    '<canvas class="jtw-canvas" aria-hidden="true"></canvas>' +
    '<div class="jtw-shade" aria-hidden="true"></div>' +
    '<header class="jtw-mast">' +
      '<div class="jtw-cog">' + COG_SVG + '</div>' +
      '<div class="jtw-mastText"><b>机神祷文</b><span>AVE OMNISSIAH · COGITATOR TERMINAL</span></div>' +
      '<div class="jtw-rev">DSH · RITES<br>0.3</div>' +
    '</header>' +
    '<div class="jtw-stepcount" role="status"></div>' +
    '<div class="jtw-stage">' +
      '<div class="jtw-kicker"></div>' +
      '<h1 class="jtw-title"></h1>' +
      '<p class="jtw-note"></p>' +
    '</div>' +
    '<div class="jtw-sealcard">' +
      '<div><span>名讳</span><b class="jtw-cardName"></b></div>' +
      '<div><span>圣秩</span><b class="jtw-cardRank"></b></div>' +
      '<div><span>驻地</span><b class="jtw-cardStation"></b></div>' +
      '<div><span>编序</span><b class="jtw-cardCipher"></b></div>' +
    '</div>' +
    '<section class="jtw-term" aria-live="polite">' +
      '<div class="jtw-termHead"><span class="jtw-termCmd">cogitator --rites ~/.dsh</span><span class="jtw-termCount"><b class="jtw-termNow">000</b>/<span class="jtw-termTotal">---</span></span></div>' +
      '<div class="jtw-termBody"></div>' +
      '<div class="jtw-termFoot"><span class="jtw-termSummary">invoking machine spirit …</span><span class="jtw-termGrant">ANIMATA</span></div>' +
    '</section>' +
    '<div class="jtw-log">' +
      '<div class="jtw-logBits"></div>' +
      '<div class="jtw-logLine">AVE OMNISSIAH · BINHARIC CANTICLE</div>' +
      '<div class="jtw-logState">AWAKENING</div>' +
    '</div>' +
    '<div class="jtw-subtitle"><span class="jtw-subZh"></span><span class="jtw-subEn"></span></div>' +
    '<div class="jtw-welcome">' +
      '<div class="jtw-w1">✦ AVE OMNISSIAH ✦</div>' +
      '<div class="jtw-w2"></div>' +
      '<div class="jtw-w5"></div>' +
      '<div class="jtw-w3"></div>' +
      '<div class="jtw-w4">MOTIVE FORCE BE WITH YOU · <span class="jtw-wDate"></span></div>' +
    '</div>' +
    '<div class="jtw-action">' +
      '<button class="jtw-btn" type="button"><span class="jtw-btnZh"></span><span class="jtw-btnEn"></span></button>' +
      '<div class="jtw-hint">按 <kbd>Enter</kbd> / <kbd>Space</kbd> 或点击任意位置</div>' +
    '</div>' +
    '<div class="jtw-skip">跳过 SKIP ▸</div>' +
    '<div class="jtw-progress"><i></i></div>'

  function q(sel) { return root.querySelector(sel) }
  var ui = {
    canvas: q('.jtw-canvas'),
    stepcount: q('.jtw-stepcount'),
    kicker: q('.jtw-kicker'),
    title: q('.jtw-title'),
    note: q('.jtw-note'),
    sealcard: q('.jtw-sealcard'),
    cardName: q('.jtw-cardName'),
    cardRank: q('.jtw-cardRank'),
    cardStation: q('.jtw-cardStation'),
    cardCipher: q('.jtw-cardCipher'),
    termNow: q('.jtw-termNow'),
    termTotal: q('.jtw-termTotal'),
    termBody: q('.jtw-termBody'),
    termSummary: q('.jtw-termSummary'),
    termGrant: q('.jtw-termGrant'),
    logBits: q('.jtw-logBits'),
    logState: q('.jtw-logState'),
    subZh: q('.jtw-subZh'),
    subEn: q('.jtw-subEn'),
    welcome: q('.jtw-welcome'),
    w2: q('.jtw-w2'),
    w3: q('.jtw-w3'),
    w5: q('.jtw-w5'),
    wDate: q('.jtw-wDate'),
    action: q('.jtw-action'),
    btn: q('.jtw-btn'),
    btnZh: q('.jtw-btnZh'),
    btnEn: q('.jtw-btnEn'),
    skip: q('.jtw-skip'),
    progress: q('.jtw-progress i')
  }

  ui.cardName.textContent = C.identity
  ui.cardRank.textContent = C.rank
  ui.cardStation.textContent = C.station
  ui.cardCipher.textContent = C.cipher
  ui.w2.innerHTML = '愿欧姆尼赛亚与你同在<br>' + shortName(C.identity)
  ui.w5.textContent = LITANIES[hashStr(C.cipher) % LITANIES.length]
  ui.wDate.textContent = dateStamp()

  /** 名讳取末段作称呼（JT-Levent → Levent），与极兔版同款习惯。 */
  function shortName(id) {
    var s = String(id || '').trim()
    var parts = s.split(/[-\u2013\u2014_\s]+/).filter(Boolean)
    return parts.length > 1 ? parts[parts.length - 1] : s
  }
  /** 时辰礼仪：晨祷 / 午课 / 晚祷 / 夜岗。 */
  function liturgyNow() {
    var h = new Date().getHours()
    if (h < 5) return { zh: '夜岗警醒，', en: 'VIGILIAE' }
    if (h < 11) return { zh: '愿晨祷之光照拂', en: 'LAUDES' }
    if (h < 14) return { zh: '午课安好，', en: 'MERIDIES' }
    if (h < 18) return { zh: '愿晚祷钟声伴你', en: 'VESPERAE' }
    return { zh: '夜祷已毕，机魂警醒', en: 'COMPLETORIUM' }
  }
  function dateStamp() {
    var d = new Date()
    var pad = function (n) { return (n < 10 ? '0' : '') + n }
    var lit = liturgyNow().en
    return 'ANNO ' + d.getFullYear() + ' · ' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + ' · ' + lit
  }

  /* 二进制圣歌寄存器：编序播种的 12 位（同一编序同一图形） */
  ;(function logBits() {
    var rand = prng(hashStr('CANT' + C.cipher))
    for (var i = 0; i < 12; i++) {
      var b = el('i')
      if (rand() < 0.5) b.className = 'jtw-on'
      ui.logBits.appendChild(b)
    }
  })()

  /* ── 时间线引擎（与极兔版同款）────────────────────────────────────────── */
  var timers = []
  var waiters = []
  var skipped = false
  var finished = false
  var phaseIndex = -1
  var kickerTimer = null

  function ms(base) { return REDUCED ? Math.min(base, 420) : Math.round(base / C.speed) }

  function wait(base) {
    return new Promise(function (resolve) {
      if (skipped) return resolve()
      var done = false
      function fin() {
        if (done) return
        done = true
        var i = waiters.indexOf(fin)
        if (i >= 0) waiters.splice(i, 1)
        resolve()
      }
      var t = setTimeout(fin, Math.max(0, ms(base)))
      timers.push(t)
      waiters.push(fin)
    })
  }

  function waitAction() {
    return new Promise(function (resolve) {
      if (skipped || !C.requireInteraction) return resolve()
      var done = false
      function fin() {
        if (done) return
        done = true
        cleanup()
        resolve()
      }
      function onKey(e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); fin() }
      }
      function onClick(e) { e.preventDefault(); fin() }
      var autoTimer = setTimeout(fin, ms(6000))
      function cleanup() {
        clearTimeout(autoTimer)
        ui.btn.removeEventListener('click', onClick)
        ui.action.removeEventListener('click', onClick)
        document.removeEventListener('keydown', onKey)
        var i = waiters.indexOf(fin)
        if (i >= 0) waiters.splice(i, 1)
      }
      ui.btn.addEventListener('click', onClick)
      ui.action.addEventListener('click', onClick)
      document.addEventListener('keydown', onKey)
      waiters.push(fin)
    })
  }

  function releaseAll() {
    for (var i = 0; i < timers.length; i++) clearTimeout(timers[i])
    timers.length = 0
    var list = waiters.slice()
    waiters.length = 0
    for (var j = 0; j < list.length; j++) { try { list[j]() } catch (err) { /* noop */ } }
    if (kickerTimer) { clearInterval(kickerTimer); kickerTimer = null }
  }

  /* ── 声音：配曲与旁白都走共用引擎 lib/score.js（window.JTSCORE）────────────
     引擎管 master 总线 / 限幅 / 程序混响 / 合成原语；这里只做「运行时事件 → 引擎调用」
     的适配，加上声卡手势解锁与引擎晚到时的续播。零音频素材，配曲全部现场合成。 */
  var audio = (function () {
    var STYLE = 'w40k'
    var ctx = null
    var eng = null
    var started = false
    var scoreUrl = C.scoreUrl || window.__JT_STARTUP_SCORE_URL__ || '/jt-startup/score.js'

    /* 桌面端自举与跨风格重放可能绕开 index 注入，score.js 不在了就补一发 */
    function ensureEngineSource() {
      if (window.JTSCORE) return
      for (var i = 0; i < document.scripts.length; i++) {
        if ((document.scripts[i].src || '').indexOf('score.js') >= 0) return
      }
      var s = document.createElement('script')
      s.src = scoreUrl
      /* 引擎到货就把挂起的乐句补播出去，别等下一次幕切换 */
      s.onload = function () { try { fire() } catch (e) { /* noop */ } }
      document.head.appendChild(s)
    }

    function level() {
      return Math.max(0.05, Math.min(1, 0.85 * clamp01(C.soundVolume, 0, 1) * 2))
    }

    function ac() {
      if (!C.sound) return null
      try {
        var AC = window.AudioContext || window.webkitAudioContext
        if (!AC) return null
        if (!ctx) {
          ctx = new AC()
          ensureEngineSource()
        }
        if (!eng && window.JTSCORE) eng = window.JTSCORE.createEngine(ctx, STYLE)
        if (ctx.state === 'suspended' && typeof ctx.resume === 'function') ctx.resume()
        if (ctx.state !== 'running' || !eng) return null
        return ctx
      } catch (e) { return null }
    }

    /* ── 旁白：cue 表在引擎里（分风格语义文件名 + 起播偏移）──────────────── */
    var voiceGen = 0
    var voiceBuf = {}
    var voiceSrcs = []
    function stopVoice() {
      voiceGen++
      for (var i = 0; i < voiceSrcs.length; i++) {
        try { voiceSrcs[i].stop() } catch (e) { /* noop */ }
      }
      voiceSrcs.length = 0
    }
    function loadClip(file, then) {
      if (voiceBuf[file]) { then(voiceBuf[file]); return }
      var c = ctx
      /* 离线预览（带演示清单）没有宿主路由，跳过它免得每句刷一条 404 */
      var urls = []
      if (!window.__JT_STARTUP_DEMO__) urls.push('/jt-startup/voice/' + STYLE + '/')
      urls.push('../lib/assets/voice/' + STYLE + '/', '/lib/assets/voice/' + STYLE + '/')
      function attempt(ix) {
        if (ix >= urls.length) { then(null); return }
        fetch(urls[ix] + file + '.wav', { cache: 'force-cache' })
          .then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer() })
          .then(function (ab) { return c.decodeAudioData(ab) })
          .then(function (buf) { voiceBuf[file] = buf; then(buf) })
          .catch(function () { attempt(ix + 1) })
      }
      attempt(0)
    }
    function say(file, delaySec) {
      var c = ac()
      if (!c || C.voice === false || C.sound === false) return
      var myGen = ++voiceGen
      try { (window.__JT_VOICE_PLAYS__ = window.__JT_VOICE_PLAYS__ || []).push(file) } catch (e) { /* noop */ }
      loadClip(file, function (buf) {
        if (!buf || myGen !== voiceGen || !ctx) return
        var at = ctx.currentTime + Math.max(0, delaySec || 0)
        var src = ctx.createBufferSource()
        src.buffer = buf
        var g = ctx.createGain()
        g.gain.value = 0.92
        src.connect(g)
        /* 旁白进 master（和配曲共用限幅），并按人声实际时长把音乐压 6dB */
        g.connect(eng.master)
        eng.duck(at, buf.duration)
        src.start(at)
        voiceSrcs.push(src)
      })
    }

    /* ── 一幕一次：按该幕真实时长排配曲，再排这一幕的旁白 ───────────────────
       挂起机制同时兜住两件事：声卡还没被手势解锁、score.js 还没加载完。
       解锁/到货后从当前进度续播，不补已过去的乐句，也不整幕哑掉。 */
    var pending = null
    var pendingT0 = 0
    function stage(ix, windowSec) {
      pendingT0 = performance.now()
      pending = { ix: ix, window: windowSec }
      fire()
    }
    function fire() {
      if (!pending) return
      var c = ac()
      if (!c) return
      var p = pending
      var elapsed = (performance.now() - pendingT0) / 1000
      if (!started) { eng.start(c.currentTime, level()); started = true }
      pending = null
      eng.playPhase(p.ix, c.currentTime, p.window, REDUCED, Math.max(0, elapsed))
      var S = window.JTSCORE
      if (!S || !S.NARRATION || REDUCED) return
      if (C.voice === false || C.sound === false) return
      if (C.speed > (S.VOICE_MAX_SPEED || 1.5)) return
      var cues = S.NARRATION[STYLE] || []
      for (var i = 0; i < cues.length; i++) {
        var q = cues[i]
        if (q.phase !== p.ix) continue
        if (q.variant === 'warn' && (voiceOffline || !voiceSkipped)) continue
        if (q.variant === 'unavailable' && !voiceOffline) continue
        say(q.file, (q.at || 0) / C.speed - elapsed)
      }
    }

    function uiGuard(fn) {
      return function () {
        var c = ac()
        if (c && eng) fn(eng.primitives, c.currentTime)
      }
    }

    return {
      resume: function () { ac(); fire() },
      stage: stage,
      sayCancel: stopVoice,
      /* 揭幕/跳过：淡出配曲并停掉全部已排节点 —— 配曲是几十秒的长进程，
         不主动收就会在动画已经消失之后继续响。 */
      halt: function () {
        stopVoice()
        pending = null
        if (!eng || !ctx) return
        try { eng.fadeOut(ctx.currentTime, 0.12) } catch (e) { /* noop */ }
        setTimeout(function () { try { eng.stopAll() } catch (e) { /* noop */ } }, 220)
      },
      tick: uiGuard(function (P, t) { P.tick(t) }),
      confirm: uiGuard(function (P, t) { P.confirm(t) }),
      /* 触控音：机械按键的「笃」—— 低频体 + 高频拍击瞬态，不再是电子 beep */
      click: uiGuard(function (P, t) { P.click(t) }),
      /* 巨印落 canvas 的同步闷响：低频体 + 拍击瞬态 + 一记钟 */
      stamp: uiGuard(function (P, t) {
        P.impact(t, { freq: 46, dur: 0.5, gain: 0.34, glide: 30, tap: 0.24, tapDur: 0.34, tapHz: 150 })
        P.bell(t + 0.03, { freq: 220, gain: 0.05, dur: 1.2 })
      })
    }
  })()

  /* 声卡要等用户手势：一次性解锁后把挂起的乐句从当前进度补播（不再静默丢弃） */
  ;(function wireSound() {
    var unlocked = false
    function unlock() {
      if (unlocked) return
      unlocked = true
      audio.resume()
      document.removeEventListener('pointerdown', unlock, true)
      document.removeEventListener('keydown', unlock, true)
    }
    document.addEventListener('pointerdown', unlock, true)
    document.addEventListener('keydown', unlock, true)
  })()

  /* ── 画布与场景状态 ───────────────────────────────────────────────────── */
  var ctx = ui.canvas.getContext('2d')
  var viewW = 0
  var viewH = 0
  var scene = {
    phase: 0,
    phaseStart: 0,
    duration: 1.6,
    ambient: 0,
    impulse: 0,
    shake: 0,
    flash: 0,         /* 祝圣撞击闪光强度（快衰减） */
    glow: 0,          /* 王座辉光现值（向目标值帧间插值，不跳变） */
    lumeX: 0.5,       /* 鼠标烛光的缓动位置（视差 + 光斑共用） */
    lumeY: 0.5,
    clickRing: null,  /* 点击涟漪 {x, y, t} */
    stamped: false,
    turned: false,
    candleX: 0.5,
    candleY: 0.42,
    pointer: { x: 0.5, y: 0.5 }
  }

  function resize() {
    var dpr = Math.min(2, window.devicePixelRatio || 1)
    viewW = Math.max(320, root.clientWidth || window.innerWidth || 1280)
    viewH = Math.max(240, root.clientHeight || window.innerHeight || 800)
    ui.canvas.width = Math.round(viewW * dpr)
    ui.canvas.height = Math.round(viewH * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    buildParchment()
    buildThrone()
    buildCircuit()
    buildGrain()
  }

  /* ── 胶片颗粒瓦（128×128 中灰噪声，overlay 5%）：压掉渐变 banding，
     让近黑底「呼吸」出物质感 —— 也是星炬光核环带的解药。 */
  var grain = null
  function buildGrain() {
    var s = 128
    var cv = document.createElement('canvas')
    cv.width = s; cv.height = s
    var c = cv.getContext('2d')
    var img = c.createImageData(s, s)
    var rand = prng(0x6A17)
    for (var i = 0; i < s * s; i++) {
      var v = 118 + ((rand() * 76) | 0)
      img.data[i * 4] = v
      img.data[i * 4 + 1] = v
      img.data[i * 4 + 2] = v
      img.data[i * 4 + 3] = 255
    }
    c.putImageData(img, 0, 0)
    grain = ctx.createPattern(cv, 'repeat')
  }

  /* ── 程序化羊皮纸（离屏预烘焙，resize 重建）───────────────────────────── */
  var parch = null
  var parchSide = 0
  function buildParchment() {
    var side = Math.max(220, Math.round(Math.min(viewW, viewH) * 0.86))
    var cv = document.createElement('canvas')
    cv.width = side; cv.height = side
    var c = cv.getContext('2d')
    var g = c.createLinearGradient(0, 0, side * 0.2, side)
    g.addColorStop(0, '#d3c29a')
    g.addColorStop(0.5, '#c9b586')
    g.addColorStop(1, '#c2ad7c')
    c.fillStyle = g
    c.fillRect(0, 0, side, side)
    var rand = prng(0x40F00D)
    /* 云状色斑：两轮不同尺度的椭圆叠印 */
    var tones = ['#8a6f3f', '#f0e2ba', '#a98f5c', '#7d6538']
    for (var pass = 0; pass < 2; pass++) {
      var n = pass === 0 ? 90 : 150
      var scale = pass === 0 ? 0.16 : 0.05
      for (var i = 0; i < n; i++) {
        var x = rand() * side
        var y = rand() * side
        var r = side * scale * (0.25 + rand() * 0.75)
        c.globalAlpha = 0.014 + rand() * 0.026
        c.fillStyle = tones[(rand() * tones.length) | 0]
        c.beginPath()
        c.ellipse(x, y, r, r * (0.45 + rand() * 0.55), rand() * TAU, 0, TAU)
        c.fill()
      }
    }
    c.globalAlpha = 1
    /* 边缘做旧：内描深色宽带 + 四角晕染 */
    var eg = c.createRadialGradient(side / 2, side / 2, side * 0.30, side / 2, side / 2, side * 0.74)
    eg.addColorStop(0, 'rgba(90,66,32,0)')
    eg.addColorStop(0.82, 'rgba(90,66,32,.08)')
    eg.addColorStop(1, 'rgba(74,52,24,.30)')
    c.fillStyle = eg
    c.fillRect(0, 0, side, side)
    /* 折痕：两道水平软线 */
    for (var f = 0; f < 2; f++) {
      var fy = side * (0.32 + f * 0.38)
      c.strokeStyle = 'rgba(70,50,24,.10)'
      c.lineWidth = side * 0.012
      c.beginPath()
      c.moveTo(side * 0.04, fy)
      c.bezierCurveTo(side * 0.3, fy - side * 0.012, side * 0.7, fy + side * 0.012, side * 0.96, fy - side * 0.004)
      c.stroke()
    }
    parch = cv
    parchSide = side
  }

  /* ── 黄金王座虚化层（离屏烘焙 + blur；心火在合成时动态画）───────────────
     全场贯穿的暗背景母题：巨型尖拱 + 王座阶梯 + 座上圣像光核 + 两侧导管束
     + 双尖塔。亮度刻意给足 —— 虚化叠上近黑底后会吃掉一大半对比。 */
  var throne = null
  function buildThrone() {
    if (C.background === false) { throne = null; return }
    var w = Math.max(320, viewW)
    var h = Math.max(240, viewH)
    var cv = document.createElement('canvas')
    cv.width = w; cv.height = h
    var c = cv.getContext('2d')
    var cx = w / 2
    var apexY = -h * 0.04            /* 拱尖越出画面：王座比可视空间更巨大 */
    var baseY = h * 0.78
    /* 圣光底：中心亮、四角熄 */
    var glow = c.createRadialGradient(cx, h * 0.36, 10, cx, h * 0.42, Math.max(w, h) * 0.66)
    glow.addColorStop(0, 'rgba(196,148,54,.32)')
    glow.addColorStop(0.45, 'rgba(150,110,40,.14)')
    glow.addColorStop(1, 'rgba(150,110,40,0)')
    c.fillStyle = glow
    c.fillRect(0, 0, w, h)
    /* 巨型尖拱（三线，内密外疏） */
    var arch = function (sx, sw, style) {
      c.strokeStyle = style
      c.lineWidth = Math.max(5, w * 0.007)
      c.beginPath()
      c.moveTo(cx - sw / 2, baseY)
      c.bezierCurveTo(cx - sw / 2, apexY + (baseY - apexY) * 0.40, cx - sx, apexY + (baseY - apexY) * 0.10, cx, apexY)
      c.bezierCurveTo(cx + sx, apexY + (baseY - apexY) * 0.10, cx + sw / 2, apexY + (baseY - apexY) * 0.40, cx + sw / 2, baseY)
      c.stroke()
    }
    arch(w * 0.115, w * 0.34, 'rgba(234,190,96,.8)')
    arch(w * 0.165, w * 0.48, 'rgba(206,160,68,.64)')
    arch(w * 0.215, w * 0.62, 'rgba(180,136,54,.46)')
    /* 拱内细肋条（哥特窗棂） */
    c.lineWidth = Math.max(1.5, w * 0.002)
    for (var rib = 0; rib < 5; rib++) {
      var rx = cx + (rib - 2) * w * 0.075
      c.strokeStyle = 'rgba(196,150,62,.30)'
      c.beginPath()
      c.moveTo(rx, baseY)
      c.bezierCurveTo(rx + (cx - rx) * 0.2, apexY + (baseY - apexY) * 0.38, rx + (cx - rx) * 0.7, apexY + (baseY - apexY) * 0.16, cx + (rx - cx) * 0.06, apexY + (baseY - apexY) * 0.12)
      c.stroke()
    }
    /* 王座阶梯（三级，逐级收窄抬高） */
    var steps = [[0.15, 0.46], [0.105, 0.36], [0.070, 0.27]]
    for (var s = 0; s < steps.length; s++) {
      var hw = w * steps[s][0]
      var top = h * steps[s][1]
      c.fillStyle = s === 0 ? 'rgba(104,76,30,.85)' : 'rgba(120,88,34,.8)'
      c.fillRect(cx - hw, top, hw * 2, baseY - top + h * 0.16)
      /* 阶梯棱线 */
      c.fillStyle = 'rgba(226,178,84,.4)'
      c.fillRect(cx - hw, top, hw * 2, Math.max(1.5, h * 0.004))
    }
    /* 座上圣像光核（骷髅 + 放射光轮） */
    var iy = h * 0.30
    c.save()
    c.strokeStyle = 'rgba(240,196,96,.5)'
    c.lineWidth = Math.max(1.2, w * 0.0016)
    for (var ray = 0; ray < 16; ray++) {
      var ra = (ray / 16) * Math.PI * 2
      var r0 = w * 0.048, r1 = w * (0.062 + (ray % 2 ? 0.012 : 0))
      c.beginPath()
      c.moveTo(cx + Math.cos(ra) * r0, iy + Math.sin(ra) * r0)
      c.lineTo(cx + Math.cos(ra) * r1, iy + Math.sin(ra) * r1)
      c.stroke()
    }
    c.restore()
    drawSkull(c, cx, iy, Math.max(12, w * 0.034), 'rgba(244,204,110,.8)')
    /* 两侧导管束：垂直微曲的线缆 + 接头亮珠 */
    var rand = prng(0x7A0E5)
    for (var p = 0; p < 18; p++) {
      var sideSign = p % 2 === 0 ? -1 : 1
      var px = cx + sideSign * (w * 0.185 + (p / 18) * w * 0.115 + rand() * w * 0.015)
      c.lineWidth = Math.max(2, w * 0.0026)
      c.strokeStyle = 'rgba(170,128,52,' + (0.46 + rand() * 0.24) + ')'
      c.beginPath()
      c.moveTo(px, h * 0.20 - rand() * h * 0.07)
      c.bezierCurveTo(px + sideSign * w * 0.014, h * 0.46, px - sideSign * w * 0.012, h * 0.68, px + sideSign * w * 0.007, h * 0.92)
      c.stroke()
      if (p % 3 === 0) {
        c.fillStyle = 'rgba(240,196,96,.6)'
        c.fillRect(px - 1.5, h * (0.3 + rand() * 0.4), 3, 3)
      }
    }
    /* 两座尖顶塔 + 塔灯 */
    for (var t2 = 0; t2 < 2; t2++) {
      var sign = t2 === 0 ? -1 : 1
      var tx = cx + sign * w * 0.33
      var tw = w * 0.05
      c.fillStyle = 'rgba(116,84,32,.78)'
      c.fillRect(tx - tw / 2, h * 0.30, tw, h * 0.62)
      c.beginPath()
      c.moveTo(tx - tw / 2, h * 0.30)
      c.lineTo(tx, h * 0.17)
      c.lineTo(tx + tw / 2, h * 0.30)
      c.closePath()
      c.fill()
      c.fillStyle = 'rgba(244,204,110,.8)'
      c.fillRect(tx - 1.5, h * 0.21, 3, 3)
    }
    /* 地面圣光反射 */
    var floor = c.createLinearGradient(0, baseY, 0, h)
    floor.addColorStop(0, 'rgba(180,134,52,.10)')
    floor.addColorStop(1, 'rgba(180,134,52,0)')
    c.fillStyle = floor
    c.fillRect(0, baseY, w, h - baseY)
    /* 虚化：Chromium 支持 ctx.filter；不支持就多次 shadowBlur 叠印近似 */
    var blurPx = Math.max(8, Math.round(Math.min(w, h) * 0.020))
    try {
      var cv2 = document.createElement('canvas')
      cv2.width = w; cv2.height = h
      var c2 = cv2.getContext('2d')
      c2.filter = 'blur(' + blurPx + 'px)'
      c2.drawImage(cv, 0, 0)
      c2.filter = 'none'
      throne = cv2
      return
    } catch (e) { /* 走下面的 shadow 近似 */ }
    var cv3 = document.createElement('canvas')
    cv3.width = w; cv3.height = h
    var c3 = cv3.getContext('2d')
    c3.shadowColor = 'rgba(170,126,50,.9)'
    c3.shadowBlur = blurPx
    c3.drawImage(cv, 0, 0)
    c3.drawImage(cv, 0, 0)
    throne = cv3
  }

  /* ── 粒子（预分配，零 per-frame 分配）─────────────────────────────────── */
  var EMBER_N = 40
  var ember = new Float32Array(EMBER_N * 5) // x, y, vx, vy, phase
    ;(function seedEmbers() {
    var rand = prng(0xEB0A1)
    for (var i = 0; i < EMBER_N; i++) {
      ember[i * 5] = rand()
      ember[i * 5 + 1] = 0.35 + rand() * 0.75
      ember[i * 5 + 2] = (rand() - 0.5) * 0.010
      ember[i * 5 + 3] = -(0.014 + rand() * 0.030)
      ember[i * 5 + 4] = rand() * TAU
    }
  })()
  var DUST_N = 30
  var dust = new Float32Array(DUST_N * 5)
    ;(function seedDust() {
    var rand = prng(0xD057)
    for (var i = 0; i < DUST_N; i++) {
      dust[i * 5] = rand()
      dust[i * 5 + 1] = rand()
      dust[i * 5 + 2] = (rand() - 0.5) * 0.008
      dust[i * 5 + 3] = (rand() - 0.5) * 0.006
      dust[i * 5 + 4] = 0.4 + rand() * 0.8
    }
  })()
  var BURST_N = 96
  var burst = new Float32Array(BURST_N * 5) // x, y, vx, vy, life
  var burstCol = new Uint8Array(BURST_N)    // 0 = 金火星, 1 = 暗红蜡渍
  var burstAlive = 0
  /** 迸溅尘粒（x/y 用屏幕比例 0..1，速度按比例/秒；col: 0金 1蜡）。 */
  function spawnBurst(x, y, n, speed, up, col) {
    var rand = prng((Date.now() & 0xffff) ^ 0xB057)
    for (var k = 0; k < n && burstAlive < BURST_N; k++) {
      var i = burstAlive++
      var a = rand() * TAU
      var sp = speed * (0.3 + rand() * 0.7)
      burst[i * 5] = x
      burst[i * 5 + 1] = y
      burst[i * 5 + 2] = Math.cos(a) * sp
      burst[i * 5 + 3] = Math.sin(a) * sp - (up || 0)
      burst[i * 5 + 4] = 0.7 + rand() * 0.5
      burstCol[i] = col ? 1 : 0
    }
  }
  function stepBurst(dt) {
    for (var i = 0; i < burstAlive; i++) {
      burst[i * 5] += burst[i * 5 + 2] * dt
      burst[i * 5 + 1] += burst[i * 5 + 3] * dt
      burst[i * 5 + 3] += dt * 0.35
      burst[i * 5 + 4] -= dt * 1.4
      if (burst[i * 5 + 4] <= 0) {
        var last = --burstAlive
        if (i < last) {
          for (var f = 0; f < 5; f++) burst[i * 5 + f] = burst[last * 5 + f]
          burstCol[i] = burstCol[last]
          i--
        }
      }
    }
  }

  /* ── 星图数据（占位世界：泰拉 + 40 星域；坐标为 0..1000 图面单位）─────── */
  var TERRA = { x: 500, y: 420 }
  var NODES = [
    null,
    { n: 'TERRA', x: 500, y: 420, t: 1 },
    { n: 'MARS', x: 500, y: 268, t: 1 },
    { n: 'LUNA', x: 640, y: 470, t: 2 },
    { n: 'GRAIA', x: 384, y: 516, t: 2 },
    { n: 'VOSPHORA', x: 402, y: 306, t: 3 },
    { n: 'CADIA', x: 500, y: 100, t: 1 },
    { n: 'RYZA', x: 812, y: 300, t: 1 },
    { n: 'STYGIES', x: 208, y: 262, t: 2 },
    { n: 'LUCIUS', x: 782, y: 528, t: 2 },
    { n: 'METALLICA', x: 258, y: 640, t: 2 },
    { n: 'ACCATRAN', x: 676, y: 168, t: 3 },
    { n: 'KRIEG', x: 340, y: 396, t: 3 },
    { n: 'VOSTROYA', x: 596, y: 596, t: 2 },
    { n: 'CATACHAN', x: 336, y: 748, t: 3 },
    { n: 'PRAETORIA', x: 736, y: 700, t: 3 },
    { n: 'SOCHAN', x: 148, y: 472, t: 3 },
    { n: 'IAX', x: 452, y: 646, t: 3 },
    { n: 'MACRAGGE', x: 856, y: 132, t: 1 },
    { n: 'ARMAGEDDON', x: 156, y: 120, t: 1 },
    { n: 'NOCTURNE', x: 900, y: 640, t: 1 },
    { n: 'FENRIS', x: 124, y: 636, t: 1 },
    { n: 'BAAL', x: 708, y: 418, t: 3 },
    { n: 'MEDUSA', x: 264, y: 172, t: 3 },
    { n: 'TANITH', x: 528, y: 232, t: 3 },
    { n: 'PROSPERO', x: 628, y: 336, t: 3 },
    { n: 'CHOGORIS', x: 460, y: 528, t: 3 },
    { n: 'MORDIAN', x: 560, y: 724, t: 3 },
    { n: 'VALHALLA', x: 232, y: 556, t: 3 },
    { n: 'EREBUS', x: 760, y: 232, t: 3 },
    { n: 'THRAX', x: 420, y: 148, t: 3 },
    { n: 'IGNIX', x: 848, y: 452, t: 3 },
    { n: 'SANCTORUM', x: 196, y: 340, t: 3 },
    { n: 'ARX TYR', x: 664, y: 646, t: 3 },
    { n: 'VIGILUS', x: 884, y: 348, t: 3 },
    { n: 'NEMENUS', x: 330, y: 268, t: 3 },
    { n: 'CORDATIA', x: 556, y: 476, t: 3 },
    { n: 'HELIOCLATE', x: 380, y: 620, t: 3 },
    { n: 'MIRANDUS', x: 676, y: 764, t: 3 },
    { n: 'OSSUAR', x: 92, y: 216, t: 3 },
    { n: 'PALLIDORUM', x: 872, y: 548, t: 3 },
    { n: 'ARS CUSTODIA', x: 500, y: 812, t: 2 }
  ]
  /* 朝圣航线 [from, to, kind, startUnit]；kind2 = 粗（黄金主脉）。
     单位制：TERRA 全程 7 单位（≈ 940ms/单位），su 越小越早点火 —— 主脉与
     「驻地」终局弧都刻意提前，绝不挤进最后 15% 的镜头里（极兔版太平洋弧的教训）。 */
  var ROUTES = [
    [1, 2, 2, 1.0], [1, 7, 2, 2.0], [1, 3, 1, 1.3], [1, 4, 1, 1.6],
    [1, 5, 1, 1.9], [1, 24, 1, 2.1], [1, 26, 1, 2.3], [1, 41, 2, 4.2],
    [2, 6, 2, 2.6], [2, 30, 1, 2.9], [2, 23, 1, 3.1],
    [3, 9, 1, 2.8], [3, 25, 1, 3.3],
    [4, 10, 2, 2.7], [4, 17, 1, 3.2], [4, 28, 1, 3.5],
    [5, 8, 1, 3.0], [5, 32, 1, 3.4],
    [24, 19, 2, 3.0], [24, 35, 1, 3.6],
    [26, 13, 1, 3.1], [26, 36, 1, 3.7], [26, 27, 1, 3.9],
    [10, 14, 1, 3.8], [10, 37, 1, 4.1],
    [13, 15, 1, 4.0], [13, 33, 1, 4.2], [13, 38, 1, 4.4],
    [9, 22, 1, 3.9], [9, 40, 1, 4.3],
    [8, 16, 1, 3.8], [8, 39, 1, 4.0], [8, 21, 2, 3.6],
    [6, 18, 2, 3.4], [6, 29, 1, 3.7], [6, 11, 1, 3.9],
    [7, 34, 1, 3.5], [7, 31, 1, 3.8], [7, 20, 2, 4.0],
    [36, 12, 1, 4.1]
  ]
  var TOTAL_UNITS = 7
  var STATION = NODES[41]
  /* 每条航线一份弧度与点火抖动（同表拍脑袋定值会让航线"成批瞬现"，观感突兀） */
  var RT_CURVE = []
  var RT_DELAY = []
  ;(function seedRoutes() {
    var rand = prng(0x5CA41)
    for (var i = 0; i < ROUTES.length; i++) {
      RT_CURVE.push((i % 2 ? 1 : -1) * (0.11 + rand() * 0.15))
      RT_DELAY.push(rand() * 0.34)
    }
    /* 泰拉—火星同经度垂直走向，弱弧看起来像一根直线戳到顶：给足弧度 */
    RT_CURVE[0] = -0.30
  })()

  /** TERRA 拉镜头的配速：快起（500ms 内到 18%）→ 长缓拉 → 收束。 */
  function warpTerra(p) {
    p = clamp01(p)
    if (p < 0.075) return (p / 0.075) * 0.18
    if (p < 0.72) return 0.18 + ((p - 0.075) / 0.645) * 0.72
    return 0.9 + ((p - 0.72) / 0.28) * 0.1
  }

  /* ── 通用纹章绘制：齿轮 / 骷髅 / 火漆密印 / 尖拱 ──────────────────────── */
  function drawCog(c, x, y, r, teeth, rot, stroke, lw, alpha) {
    c.save()
    if (alpha != null) c.globalAlpha *= alpha
    c.translate(x, y)
    c.rotate(rot || 0)
    c.strokeStyle = stroke
    c.lineWidth = lw || 2
    c.beginPath()
    c.arc(0, 0, r * 0.78, 0, TAU)
    c.stroke()
    c.beginPath()
    c.arc(0, 0, r * 0.22, 0, TAU)
    c.stroke()
    for (var i = 0; i < 4; i++) {
      var a = (i / 4) * TAU
      c.beginPath()
      c.moveTo(Math.cos(a) * r * 0.22, Math.sin(a) * r * 0.22)
      c.lineTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72)
      c.stroke()
    }
    for (var t = 0; t < teeth; t++) {
      var a2 = (t / teeth) * TAU
      var w2 = TAU / teeth * 0.28
      c.beginPath()
      c.moveTo(Math.cos(a2 - w2) * r * 0.80, Math.sin(a2 - w2) * r * 0.80)
      c.lineTo(Math.cos(a2 - w2 * 0.7) * r * 1.12, Math.sin(a2 - w2 * 0.7) * r * 1.12)
      c.lineTo(Math.cos(a2 + w2 * 0.7) * r * 1.12, Math.sin(a2 + w2 * 0.7) * r * 1.12)
      c.lineTo(Math.cos(a2 + w2) * r * 0.80, Math.sin(a2 + w2) * r * 0.80)
      c.stroke()
    }
    c.restore()
  }

  function drawSkull(c, x, y, s, stroke) {
    c.save()
    c.strokeStyle = stroke
    c.lineWidth = Math.max(1.2, s * 0.10)
    c.beginPath()
    c.arc(x, y, s * 0.46, Math.PI * 0.98, Math.PI * 2.02)   // 颅顶
    c.lineTo(x + s * 0.30, y + s * 0.18)
    c.lineTo(x + s * 0.30, y + s * 0.40)                     // 颧骨
    c.lineTo(x - s * 0.30, y + s * 0.40)
    c.lineTo(x - s * 0.30, y + s * 0.18)
    c.closePath()
    c.stroke()
    c.beginPath()                                            // 眼窝
    c.arc(x - s * 0.17, y + s * 0.02, s * 0.115, 0, TAU)
    c.moveTo(x + s * 0.17 + s * 0.115, y + s * 0.02)
    c.arc(x + s * 0.17, y + s * 0.02, s * 0.115, 0, TAU)
    c.stroke()
    c.beginPath()                                            // 鼻翳 + 齿缝
    c.moveTo(x, y + s * 0.10)
    c.lineTo(x - s * 0.05, y + s * 0.22)
    c.lineTo(x + s * 0.05, y + s * 0.22)
    c.closePath()
    c.stroke()
    c.beginPath()
    c.moveTo(x - s * 0.16, y + s * 0.40)
    c.lineTo(x - s * 0.16, y + s * 0.30)
    c.moveTo(x, y + s * 0.40)
    c.lineTo(x, y + s * 0.30)
    c.moveTo(x + s * 0.16, y + s * 0.40)
    c.lineTo(x + s * 0.16, y + s * 0.30)
    c.stroke()
    c.restore()
  }

  /** 火漆密印：连续次表面蜡体 + 投影抬起 + 压印浮雕（暗/亮双遍错位）+
     边缘铭文环。材质级细节，拒绝平涂。 */
  function drawSeal(c, x, y, r, prog, t, blood) {
    if (prog <= 0) return
    c.save()
    c.globalAlpha *= clamp01(prog * 1.6)
    c.translate(x, y)
    /* 投影：把印章从纸面上「抬起来」 */
    c.save()
    c.shadowColor = 'rgba(0,0,0,.7)'
    c.shadowBlur = r * 0.7
    c.shadowOffsetY = r * 0.22
    c.beginPath()
    var lobes = 11
    for (var i = 0; i <= lobes; i++) {
      var a = (i / lobes) * TAU
      var rr = r * (1 + 0.035 * Math.sin(a * 5 + 1.3) + 0.022 * Math.sin(a * 9 + 4.1))
      var px = Math.cos(a) * rr
      var py = Math.sin(a) * rr
      if (i === 0) c.moveTo(px, py)
      else c.lineTo(px, py)
    }
    c.closePath()
    /* 蜡体：连续次表面衰减（高光→深蜡），不平涂 */
    var g = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.08, 0, 0, r * 1.12)
    g.addColorStop(0, '#d05a44')
    g.addColorStop(0.26, '#9c2c23')
    g.addColorStop(0.6, '#5e1512')
    g.addColorStop(1, '#2e0908')
    c.fillStyle = g
    c.fill()
    c.restore()
    /* 暗缘：去掉纯黑硬边 */
    c.strokeStyle = 'rgba(58,10,8,.55)'
    c.lineWidth = Math.max(1.2, r * 0.035)
    c.stroke()
    /* 压印内环 */
    c.strokeStyle = 'rgba(30,4,4,.66)'
    c.lineWidth = Math.max(1.5, r * 0.045)
    c.beginPath()
    c.arc(0, 0, r * 0.74, 0, TAU)
    c.stroke()
    /* 纹章浮雕：暗遍 + 亮遍 2px 错位（经典压印） */
    var embLW = Math.max(1.4, r * 0.045)
    c.save()
    c.translate(0, 1.6)
    drawCog(c, 0, -r * 0.06, r * 0.42, 8, 0.2, 'rgba(40,6,6,.85)', embLW)
    drawSkull(c, 0, -r * 0.06, r * 0.34, 'rgba(40,6,6,.85)')
    c.restore()
    c.save()
    c.translate(0, -2.2)
    drawCog(c, 0, -r * 0.06, r * 0.42, 8, 0.2, 'rgba(240,180,140,.42)', Math.max(1, embLW * 0.7))
    drawSkull(c, 0, -r * 0.06, r * 0.34, 'rgba(240,180,140,.42)')
    c.restore()
    /* 上缘常驻亮线：蜡面受光的一条细高光 */
    c.save()
    c.globalAlpha *= 0.5
    c.strokeStyle = 'rgba(240,180,140,.6)'
    c.lineWidth = Math.max(1, r * 0.022)
    c.beginPath()
    c.arc(0, 0, r * 0.9, Math.PI * 1.08, Math.PI * 1.92)
    c.stroke()
    c.restore()
    /* 打磨高光：随时间缓慢扫过的弧 */
    var sweep = (t * 0.35) % 1
    c.save()
    c.globalAlpha *= 0.55
    c.strokeStyle = 'rgba(255,205,165,.6)'
    c.lineWidth = Math.max(1.4, r * 0.055)
    c.lineCap = 'round'
    c.beginPath()
    c.arc(0, 0, r * 0.86, sweep * TAU, sweep * TAU + 0.7)
    c.stroke()
    c.restore()
    /* 内环刻度：24 枚压印刻痕（浮雕暗/亮对），像表圈不像噪点 */
    c.save()
    for (var gi = 0; gi < 24; gi++) {
      var ga = (gi / 24) * TAU
      var gl2 = gi % 2 === 0 ? r * 0.052 : r * 0.03
      c.strokeStyle = 'rgba(40,6,6,.6)'
      c.lineWidth = Math.max(1, r * 0.02)
      c.beginPath()
      c.moveTo(Math.cos(ga) * (r * 0.74 - gl2), Math.sin(ga) * (r * 0.74 - gl2))
      c.lineTo(Math.cos(ga) * r * 0.74, Math.sin(ga) * r * 0.74)
      c.stroke()
      c.strokeStyle = 'rgba(232,168,132,.16)'
      c.beginPath()
      c.moveTo(Math.cos(ga) * (r * 0.74 - gl2), Math.sin(ga) * (r * 0.74 - gl2) + 1)
      c.lineTo(Math.cos(ga) * r * 0.74, Math.sin(ga) * r * 0.74 + 1)
      c.stroke()
    }
    c.restore()
    c.restore()
  }

  /** 哥特尖拱：底部两墩 → 二次曲线收至尖顶。prog 控制描线进度。 */
  function drawArch(c, x, y, w, h, prog, stroke, lw, alpha) {
    if (prog <= 0) return
    var p = clamp01(prog)
    c.save()
    if (alpha != null) c.globalAlpha *= alpha
    c.strokeStyle = stroke
    c.lineWidth = lw || 2
    c.lineCap = 'round'
    var apex = y - h
    var halfW = w / 2
    var side = function (dir, frac) {
      var steps = 14
      var take = Math.ceil(steps * frac)
      c.beginPath()
      for (var i = 0; i <= take; i++) {
        var u = (i / steps)
        /* 二次贝塞尔：墩(±halfW, y) → 控制(±halfW, y-h*0.52) → 顶(x, apex) */
        var qx = (1 - u) * (1 - u) * (x + dir * halfW) + 2 * (1 - u) * u * (x + dir * halfW) + u * u * x
        var qy = (1 - u) * (1 - u) * y + 2 * (1 - u) * u * (y - h * 0.52) + u * u * apex
        if (i === 0) c.moveTo(qx, qy)
        else c.lineTo(qx, qy)
      }
      c.stroke()
    }
    /* 两侧同步向上合拢 */
    var frac = clamp01(p * 2)
    side(-1, frac)
    side(1, frac)
    if (p > 0.5) {
      /* 尖顶菱饰与基座十字饰 */
      var tipA = clamp01((p - 0.5) / 0.3)
      c.globalAlpha *= tipA
      c.beginPath()
      c.arc(x, apex - h * 0.030, Math.max(2, w * 0.014), 0, TAU)
      c.stroke()
      c.beginPath()
      c.moveTo(x - halfW, y)
      c.lineTo(x - halfW, y + h * 0.06)
      c.moveTo(x + halfW, y)
      c.lineTo(x + halfW, y + h * 0.06)
      c.stroke()
      /* 拱身上的符文刻度 */
      var runes = 9
      for (var r2 = 0; r2 < runes; r2++) {
        var u2 = 0.12 + (r2 / runes) * 0.72
        for (var dir2 = -1; dir2 <= 1; dir2 += 2) {
          var rx = (1 - u2) * (1 - u2) * (x + dir2 * halfW) + 2 * (1 - u2) * u2 * (x + dir2 * halfW) + u2 * u2 * x
          var ry = (1 - u2) * (1 - u2) * y + 2 * (1 - u2) * u2 * (y - h * 0.52) + u2 * u2 * apex
          var len = Math.max(2, w * 0.012)
          c.beginPath()
          c.moveTo(rx - dir2 * len, ry)
          c.lineTo(rx + dir2 * len * 0.2, ry)
          c.stroke()
        }
      }
    }
    c.restore()
  }

  /** 逐字符大字距文本（西文小号大写的礼仪排版）。 */
  function drawSpaced(c, txt, x, y, ls, font, color, alpha, halo) {
    c.save()
    if (alpha != null) c.globalAlpha *= alpha
    c.font = font
    c.fillStyle = color
    c.textBaseline = 'middle'
    var widths = 0
    var up = String(txt).toUpperCase()
    for (var i = 0; i < up.length; i++) widths += c.measureText(up.charAt(i)).width + ls
    widths -= ls
    var cx = x - widths / 2
    for (var j = 0; j < up.length; j++) {
      if (halo) {
        c.save()
        c.lineWidth = halo
        c.strokeStyle = 'rgba(24,15,7,.6)'
        c.strokeText(up.charAt(j), cx, y)
        c.restore()
      }
      c.fillText(up.charAt(j), cx, y)
      cx += c.measureText(up.charAt(j)).width + ls
    }
    c.restore()
  }

  /* ── 逐场景绘制 ───────────────────────────────────────────────────────── */
  function flick(t) {
    return clamp01(0.90 + 0.065 * Math.sin(t * 11.3) + 0.05 * Math.sin(t * 5.1 + 2.1) + 0.02 * Math.sin(t * 23.7), 0.6, 1.05)
  }

  function drawThrone(t, glow, push) {
    if (!throne || glow <= 0.01) return
    var fl = flick(t)
    ctx.save()
    /* 近黑底上虚化会吃掉大半对比，王座层补 1.15 倍辉度（多一分就压过主角）；
       push（0..1）让王座在仪式阶段缓缓逼近，像镜头贴近圣所；
       指针视差让圣所随烛光轻微游移（反向，幅度克制） */
    ctx.globalAlpha = clamp01(glow * 1.15 * (0.72 + 0.28 * fl))
    var sc = 1 + 0.10 * (push || 0)
    var dw = viewW * sc
    var dh = viewH * sc
    var pdx = REDUCED ? 0 : (scene.lumeX - 0.5) * -14
    var pdy = REDUCED ? 0 : (scene.lumeY - 0.5) * -10
    ctx.drawImage(throne, (viewW - dw) / 2 + pdx, (viewH - dh) / 2 + (dh - viewH) * 0.15 + pdy, dw, dh)
    ctx.restore()
    /* 心火：王座核心的搏动光 */
    var beat = 0.7 + 0.3 * Math.sin(t * 2.1) * Math.sin(t * 0.83 + 1)
    var hx = viewW / 2
    var hy = viewH * 0.32
    var hr = Math.min(viewW, viewH) * 0.20 * (0.9 + 0.1 * beat)
    var g = ctx.createRadialGradient(hx, hy, 2, hx, hy, hr)
    g.addColorStop(0, 'rgba(244,190,76,' + (0.44 * glow * fl) + ')')
    g.addColorStop(0.5, 'rgba(180,120,40,' + (0.16 * glow * fl) + ')')
    g.addColorStop(1, 'rgba(180,120,40,0)')
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = g
    ctx.fillRect(hx - hr, hy - hr, hr * 2, hr * 2)
    ctx.restore()
  }

  /** 罗盘四芒星：外尖内凹（替代潦草的小叉星，礼仪感 + 清晰度）。 */
  function star4(c, x, y, R, rot, color, lw) {
    var r = R * 0.34
    c.strokeStyle = color
    c.lineWidth = lw || 1.2
    c.beginPath()
    for (var k = 0; k < 4; k++) {
      var a = rot + k * Math.PI / 2
      var b = a + Math.PI / 4
      var px = x + Math.cos(a) * R
      var py = y + Math.sin(a) * R
      if (k === 0) c.moveTo(px, py)
      else c.lineTo(px, py)
      c.lineTo(x + Math.cos(b) * r, y + Math.sin(b) * r)
    }
    c.closePath()
    c.stroke()
  }

  /* ── 星图布景（屏幕空间，resize 重建）：虚空星野 / 星云 / 电路神经面 ───── */
  var STAR_N = 84
  var starF = new Float32Array(STAR_N * 5) /* x, y, twinkle, size, layer(0远/1中/2近) */
  ;(function seedStars() {
    var rand = prng(0xA57A1)
    for (var i = 0; i < STAR_N; i++) {
      starF[i * 5] = rand()
      starF[i * 5 + 1] = rand()
      starF[i * 5 + 2] = rand() * TAU
      starF[i * 5 + 3] = 0.8 + Math.pow(rand(), 3) * 3.4 /* 幂分布：绝大多数细小 */
      starF[i * 5 + 4] = i % 3
    }
  })()
  var NEBULAE = [
    { x: 0.24, y: 0.30, r: 0.42, c: 'rgba(150,96,38,', a: 0.05 },
    { x: 0.78, y: 0.72, r: 0.38, c: 'rgba(120,44,34,', a: 0.04 },
    { x: 0.55, y: 0.10, r: 0.30, c: 'rgba(160,130,60,', a: 0.03 }
  ]
  var circuit = null
  function buildCircuit() {
    if (C.background === false) { circuit = null; return }
    var w = Math.max(320, viewW)
    var h = Math.max(240, viewH)
    var cv = document.createElement('canvas')
    cv.width = w; cv.height = h
    var c = cv.getContext('2d')
    var rand = prng(0xC12C17)
    c.lineWidth = 1.2
    c.lineJoin = 'round'
    for (var tr = 0; tr < 30; tr++) {
      var x = Math.floor(rand() * w / 90) * 90 + 10
      var y = Math.floor(rand() * h / 90) * 90 + 10
      c.strokeStyle = 'rgba(158,118,48,' + (0.26 + rand() * 0.26) + ')'
      c.beginPath()
      c.moveTo(x, y)
      var segs = 2 + Math.floor(rand() * 3)
      for (var s = 0; s < segs; s++) {
        var len = 40 + rand() * 110
        if (rand() < 0.5) x += (rand() < 0.5 ? -1 : 1) * len
        else y += (rand() < 0.5 ? -1 : 1) * len
        c.lineTo(x, y)
      }
      c.stroke()
      c.fillStyle = 'rgba(200,158,70,.5)'
      c.fillRect(x - 1.5, y - 1.5, 3, 3)
    }
    circuit = cv
  }
  /* 强调色 RGB（航线在 morph 时向琥珀渐变） */
  var ACC_RGB = [143, 31, 31]
  ;(function parseAccent() {
    var h = String(C.accent).replace('#', '')
    if (h.length >= 6) {
      ACC_RGB[0] = parseInt(h.slice(0, 2), 16) || 143
      ACC_RGB[1] = parseInt(h.slice(2, 4), 16) || 31
      ACC_RGB[2] = parseInt(h.slice(4, 6), 16) || 31
    }
  })()

  /* 01 VIA SANCTA：星语者导航星图 —— 暗虚空 + 星炬（泰拉即 Astronomican，
     燃烧的引导之光）+ 沿航线涌动的星流 + 极坐标刻度网 + 罗盘星芒节点。
     morph(0..1)：同一张图渐变为神经接驳形态 —— 虚空褪成电路面、航线由暗红
     转琥珀神经束、汇聚脉冲潜入星炬接口、镜头推向泰拉。星图与接驳共用一套
     图形语言，过渡是背景与语义的渐变，不是换场。 */
  function drawVia(prog, t, opts) {
    opts = opts || {}
    var enter = opts.enter != null ? opts.enter : 1
    var mA = smooth(opts.morph || 0)
    var u = prog * TOTAL_UNITS
    var wp = warpTerra(prog)
    var zoom = 2.55 - 1.55 * quintic(wp)
    if (mA > 0) zoom = lerp(zoom, 1.42, mA)
    var su0 = Math.min(viewW, viewH) * 0.00095
    var su = su0 * zoom
    var rotA = lerp(-0.05, 0, smooth(wp))
    /* 终场：镜头焦点部分交给驻地节点；morph 时拉回泰拉（接口所在） */
    var fin = smooth(clamp01((u - 5.2) / 1.8))
    var fx = lerp(lerp(TERRA.x, 500, smooth(wp)), STATION.x, fin * 0.42)
    var fy = lerp(lerp(TERRA.y, 455, smooth(wp)), STATION.y, fin * 0.42)
    if (mA > 0) { fx = lerp(fx, TERRA.x, mA); fy = lerp(fy, TERRA.y, mA) }
    var cosR = Math.cos(rotA)
    var sinR = Math.sin(rotA)
    /* 指针视差：图面随烛光轻微游移 */
    var parX = REDUCED ? 0 : (scene.lumeX - 0.5) * -10
    var parY = REDUCED ? 0 : (scene.lumeY - 0.5) * -8
    var _pt = [0, 0]
    function M(x, y) {
      var dx = x - fx
      var dy = y - fy
      _pt[0] = viewW / 2 + parX + (dx * cosR - dy * sinR) * su
      _pt[1] = viewH / 2 + parY + (dx * sinR + dy * cosR) * su
      return _pt
    }
    function pathRoute(pr2, ax, ay, bx, by, mx2, my2) {
      var segs = 20
      var upto = Math.ceil(segs * pr2)
      ctx.beginPath()
      for (var s2 = 0; s2 <= upto; s2++) {
        var v = Math.min(1, pr2) * (s2 / segs)
        var qx2 = (1 - v) * (1 - v) * ax + 2 * (1 - v) * v * mx2 + v * v * bx
        var qy2 = (1 - v) * (1 - v) * ay + 2 * (1 - v) * v * my2 + v * v * by
        if (s2 === 0) ctx.moveTo(qx2, qy2)
        else ctx.lineTo(qx2, qy2)
      }
    }
    function qp(v, ax, ay, bx, by, mx2, my2, out) {
      out[0] = (1 - v) * (1 - v) * ax + 2 * (1 - v) * v * mx2 + v * v * bx
      out[1] = (1 - v) * (1 - v) * ay + 2 * (1 - v) * v * my2 + v * v * by
      return out
    }
    var light = flick(t) * (0.86 + 0.14 * smooth(wp))

    /* 布景：暗虚空（星云 + 星野）→ morph 时渐入电路神经面 */
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    for (var nb = 0; nb < NEBULAE.length; nb++) {
      var N2 = NEBULAE[nb]
      var ngr = ctx.createRadialGradient(N2.x * viewW, N2.y * viewH, 6, N2.x * viewW, N2.y * viewH, N2.r * Math.max(viewW, viewH))
      ngr.addColorStop(0, N2.c + (N2.a * enter * (1 - mA)) + ')')
      ngr.addColorStop(1, N2.c + '0)')
      ctx.fillStyle = ngr
      ctx.fillRect(0, 0, viewW, viewH)
    }
    ctx.restore()
    if (!REDUCED) {
      ctx.save()
      ctx.fillStyle = '#d8c9a3'
      for (var s3 = 0; s3 < STAR_N; s3++) {
        var sz3 = starF[s3 * 5 + 3]
        var depth = [0.4, 0.65, 1][starF[s3 * 5 + 4]]
        var tw3 = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.9 + starF[s3 * 5 + 2]))
        var px3 = starF[s3 * 5] * viewW + (scene.lumeX - 0.5) * -8 * (1 - depth)
        var py3 = starF[s3 * 5 + 1] * viewH + (scene.lumeY - 0.5) * -6 * (1 - depth)
        ctx.globalAlpha = 0.38 * depth * (0.5 + 0.5 * tw3) * enter * (1 - mA * 0.75)
        ctx.fillRect(px3 - sz3 / 2, py3 - sz3 / 2, sz3, sz3)
      }
      ctx.restore()
    }
    if (mA > 0 && circuit) {
      /* 电路层：去饱和冷铜低调铺底，最亮的琥珀只留给行进中的脉冲头 */
      ctx.save()
      ctx.globalAlpha = 0.30 * mA
      ctx.drawImage(circuit, parX * 0.6, parY * 0.6, viewW, viewH)
      ctx.restore()
    }

    /* 极坐标刻度网：五环 + 十二辐条 + 缓转游标（导航仪）。
       环是刻度不是主角 —— 降权到不与航线/节点抢明度。 */
    var ringSpec = [[150, 0.13], [270, 0.09], [390, 0.055], [520, 0.036], [650, 0.025]]
    var tc = M(TERRA.x, TERRA.y)
    var txc = tc[0]
    var tyc = tc[1]
    for (var r = 0; r < ringSpec.length; r++) {
      var rr = ringSpec[r][0]
      ctx.save()
      ctx.globalAlpha = ringSpec[r][1] * light * enter * (1 - mA * 0.55)
      ctx.strokeStyle = '#8a6a28'
      ctx.lineWidth = Math.max(0.6, su * 2.2)
      ctx.beginPath()
      ctx.arc(txc, tyc, rr * su, 0, TAU)
      ctx.stroke()
      if (r === 1) {
        var rot = (t * 0.05) % TAU
        for (var k = 0; k < 36; k++) {
          var a = rot + (k / 36) * TAU
          var p1 = M(TERRA.x + Math.cos(a) * rr, TERRA.y + Math.sin(a) * rr)
          var big = k % 9 === 0
          ctx.beginPath()
          ctx.moveTo(p1[0], p1[1] - (big ? 7 : 3.5))
          ctx.lineTo(p1[0], p1[1] + (big ? 7 : 3.5))
          ctx.stroke()
        }
      }
      ctx.restore()
    }
    ctx.save()
    ctx.globalAlpha = 0.045 * light * enter * (1 - mA * 0.5)
    ctx.strokeStyle = '#8a6a28'
    ctx.lineWidth = 1
    for (var sp = 0; sp < 12; sp++) {
      var sa = sp * Math.PI / 6 + t * 0.01
      var p0 = M(TERRA.x + Math.cos(sa) * 120, TERRA.y + Math.sin(sa) * 120)
      var p9 = M(TERRA.x + Math.cos(sa) * 650, TERRA.y + Math.sin(sa) * 650)
      ctx.beginPath()
      ctx.moveTo(p0[0], p0[1])
      ctx.lineTo(p9[0], p9[1])
      ctx.stroke()
    }
    ctx.restore()

    /* 朝圣航线：暗红→琥珀（morph），独立弧度错峰生长；完成后星流沿路径涌动
       （主脉彗星 + 支线流光虚线）—— 航线是活的水流，不是画死的线。 */
    var cometPt = [0, 0]
    var trailPt = [0, 0]
    for (var e = 0; e < ROUTES.length; e++) {
      var rt = ROUTES[e]
      var A2 = NODES[rt[0]]
      var B2 = NODES[rt[1]]
      var suR = rt[3] + RT_DELAY[e]
      var pr = clamp01((u - suR) / 1.7)
      if (pr <= 0) continue
      var pa = M(A2.x, A2.y)
      var ax = pa[0]
      var ay = pa[1]
      var pb = M(B2.x, B2.y)
      var bx = pb[0]
      var by = pb[1]
      var mx2 = (ax + bx) / 2
      var my2 = (ay + by) / 2 - Math.hypot(bx - ax, by - ay) * RT_CURVE[e]
      var thick = rt[2] === 2
      var shim = pr >= 1 ? (0.9 + 0.1 * Math.sin(t * 1.3 + e * 0.7)) : 1
      /* 暗腥红 ramp（主脉 #e07a3a / 支线 #b23c28）；morph（神经相位）整体退为
         低亮暖铜 —— 全帧最亮的琥珀只许出现在脉冲头与中心接口，航线网不当主角 */
      var rC = Math.round(lerp(thick ? 224 : 178, thick ? 150 : 120, mA))
      var gC = Math.round(lerp(thick ? 122 : 60, thick ? 104 : 70, mA))
      var bC = Math.round(lerp(thick ? 58 : 40, 58, mA))
      var aC = lerp(thick ? 0.92 : 0.8, thick ? 0.52 : 0.42, mA)
      ctx.save()
      ctx.globalAlpha = aC * light * enter * shim
      ctx.strokeStyle = 'rgba(' + rC + ',' + gC + ',' + bC + ',' + aC + ')'
      ctx.lineWidth = thick ? Math.max(1.3, su * lerp(2.8, 1.7, mA)) : Math.max(0.9, su * lerp(1.8, 1.2, mA))
      if (thick) {
        /* 主脉：宽暖晕 + 细芯双描（晕是深红不是黑，不发脏） */
        ctx.save()
        ctx.strokeStyle = 'rgba(200,60,30,' + (0.10 * (1 - mA * 0.5)) + ')'
        ctx.lineWidth *= 3.4
        pathRoute(pr, ax, ay, bx, by, mx2, my2)
        ctx.stroke()
        ctx.strokeStyle = 'rgba(' + rC + ',' + gC + ',' + bC + ',' + aC + ')'
        ctx.lineWidth /= 3.4
        ctx.restore()
      }
      pathRoute(pr, ax, ay, bx, by, mx2, my2)
      ctx.stroke()
      /* 生长头：光晕 + 小十字火头 */
      if (pr < 1 && !REDUCED) {
        var vv = pr
        var sx2 = (1 - vv) * (1 - vv) * ax + 2 * (1 - vv) * vv * mx2 + vv * vv * bx
        var sy2 = (1 - vv) * (1 - vv) * ay + 2 * (1 - vv) * vv * my2 + vv * vv * by
        var gr = ctx.createRadialGradient(sx2, sy2, 0, sx2, sy2, 11)
        gr.addColorStop(0, 'rgba(246,198,98,.95)')
        gr.addColorStop(1, 'rgba(246,198,98,0)')
        ctx.fillStyle = gr
        ctx.fillRect(sx2 - 11, sy2 - 11, 22, 22)
        ctx.strokeStyle = 'rgba(250,214,120,.9)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(sx2 - 4, sy2); ctx.lineTo(sx2 + 4, sy2)
        ctx.moveTo(sx2, sy2 - 4); ctx.lineTo(sx2, sy2 + 4)
        ctx.stroke()
      }
      /* 星流：完成后航线上光沿路径流动 */
      if (pr >= 1 && !REDUCED) {
        if (thick) {
          /* 主脉：两颗彗星带拖尾巡航 */
          for (var c2 = 0; c2 < 2; c2++) {
            var cvv = (t * 0.13 + c2 * 0.5 + e * 0.07) % 1
            qp(cvv, ax, ay, bx, by, mx2, my2, cometPt)
            var cAlpha = mA > 0 ? 0.95 : 0.55
            var cgr = ctx.createRadialGradient(cometPt[0], cometPt[1], 0, cometPt[0], cometPt[1], 7)
            cgr.addColorStop(0, 'rgba(250,222,140,' + cAlpha + ')')
            cgr.addColorStop(1, 'rgba(250,222,140,0)')
            ctx.save()
            ctx.globalCompositeOperation = 'screen'
            ctx.fillStyle = cgr
            ctx.fillRect(cometPt[0] - 7, cometPt[1] - 7, 14, 14)
            ctx.restore()
            for (var t3 = 1; t3 <= 2; t3++) {
              var tv = cvv - t3 * 0.045
              if (tv < 0) continue
              qp(tv, ax, ay, bx, by, mx2, my2, trailPt)
              ctx.fillStyle = 'rgba(240,208,120,' + (0.4 - t3 * 0.15) + ')'
              ctx.fillRect(trailPt[0] - 1, trailPt[1] - 1, 2, 2)
            }
          }
        } else {
          /* 支线：流光虚线 */
          ctx.save()
          ctx.globalAlpha = 0.30 * light * enter
          ctx.strokeStyle = '#e6c35c'
          ctx.lineWidth = 1
          ctx.setLineDash([3, 11])
          ctx.lineDashOffset = -((t * 30 + e * 13) % 1000)
          pathRoute(1, ax, ay, bx, by, mx2, my2)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.restore()
        }
      }
      ctx.restore()
    }

    /* 星域节点：主星罗盘四芒星 + 光晕，次星小四芒，三级世界光点；点燃脉冲 */
    var labelFont = '700 12px "Palatino Linotype", Palatino, Georgia, serif'
    var zA = smooth(clamp01((2.35 - zoom) / 0.5)) /* 标签随拉镜淡入，不瞬现 */
    for (var n = 1; n < NODES.length; n++) {
      var nd = NODES[n]
      var litU = 0
      for (var e2 = 0; e2 < ROUTES.length; e2++) {
        if (ROUTES[e2][1] === n) litU = Math.max(litU, ROUTES[e2][3] + RT_DELAY[e2] + 1.7)
      }
      if (u < litU) continue
      var pn = M(nd.x, nd.y)
      var nx = pn[0]
      var ny = pn[1]
      var isTerra = n === 1
      var bloom = clamp01((u - litU) / 0.9)
      var la = zA * clamp01(bloom) * light * enter
      ctx.save()
      ctx.globalAlpha = light * enter * (0.55 + 0.45 * bloom)
      /* 点燃脉冲 */
      var ign = clamp01((u - litU) / 1.1)
      if (ign < 1 && !REDUCED) {
        ctx.globalAlpha = (1 - ign) * 0.5 * light * enter
        ctx.strokeStyle = '#e6c35c'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(nx, ny, 3 + ign * 13, 0, TAU)
        ctx.stroke()
        ctx.globalAlpha = light * enter * (0.55 + 0.45 * bloom)
      }
      if (isTerra) {
        /* 星炬（Astronomican）：泰拉不是一颗星，是虚空中燃烧的引导之光。
           三层光（远晕/金晕/白金焰核）+ 灯塔扫掠环 + 缓转圣光芒。 */
        var fl2 = flick(t)
        var beat = 0.82 + 0.18 * Math.sin(t * 2.6) * Math.sin(t * 0.9 + 1)
        ctx.save()
        ctx.globalCompositeOperation = 'screen'
        var halo = Math.min(viewW, viewH) * 0.24 * beat * (1 - mA * 0.4)
        var hg3 = ctx.createRadialGradient(nx, ny, 4, nx, ny, halo)
        hg3.addColorStop(0, 'rgba(214,140,52,' + (0.16 * fl2 * (1 - mA * 0.55)) + ')')
        hg3.addColorStop(1, 'rgba(214,140,52,0)')
        ctx.fillStyle = hg3
        ctx.fillRect(nx - halo, ny - halo, halo * 2, halo * 2)
        var aura = 44 * beat * (1 - mA * 0.3)
        var ag3 = ctx.createRadialGradient(nx, ny, 2, nx, ny, aura)
        ag3.addColorStop(0, 'rgba(244,196,92,' + 0.55 * (1 - mA * 0.3) + ')')
        ag3.addColorStop(1, 'rgba(244,196,92,0)')
        ctx.fillStyle = ag3
        ctx.fillRect(nx - aura, ny - aura, aura * 2, aura * 2)
        ctx.translate(nx, ny)
        ctx.scale(1, 1.18) /* 焰核微纵向拉伸：火炬感 */
        var coreR = 11 * (0.9 + 0.2 * fl2)
        var cg3 = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR)
        cg3.addColorStop(0, 'rgba(255,248,222,.98)')
        cg3.addColorStop(0.45, 'rgba(250,214,120,.75)')
        cg3.addColorStop(1, 'rgba(250,214,120,0)')
        ctx.fillStyle = cg3
        ctx.fillRect(-coreR, -coreR, coreR * 2, coreR * 2)
        ctx.restore()
        star4(ctx, nx, ny, 8 + 2 * fl2, t * 0.15, '#f8e6a8', 1.5)
        /* 灯塔扫掠：每 ~2.6s 一圈光环自星炬荡开 */
        var sweep = (t % 2.6) / 2.6
        ctx.save()
        ctx.globalAlpha = (1 - sweep) * 0.35 * light * enter
        ctx.strokeStyle = '#e8c868'
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.arc(nx, ny, 14 + sweep * 90, 0, TAU)
        ctx.stroke()
        ctx.restore()
        /* 缓转圣光芒 */
        ctx.save()
        ctx.globalAlpha = 0.30 * light * enter * fl2
        ctx.strokeStyle = '#e6c35c'
        ctx.lineWidth = 1
        for (var ry = 0; ry < 12; ry++) {
          var ra3 = t * 0.05 + ry * Math.PI / 6
          ctx.beginPath()
          ctx.moveTo(nx + Math.cos(ra3) * 18, ny + Math.sin(ra3) * 18)
          ctx.lineTo(nx + Math.cos(ra3) * (24 + (ry % 3) * 3), ny + Math.sin(ra3) * (24 + (ry % 3) * 3))
          ctx.stroke()
        }
        ctx.restore()
        ctx.globalAlpha = 0.28 * light * enter
        ctx.strokeStyle = '#e6c35c'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(nx, ny, 13 + 2 * Math.sin(t * 1.7), 0, TAU)
        ctx.stroke()
      } else if (nd.t === 1) {
        /* 逐星差异：尺寸与光晕带节点号抖动，读出景深而不是点阵 */
        var t1r = 4.1 + ((n * 2.399) % 1) * 1.7
        var t1h = 9 + ((n * 1.731) % 1) * 6
        var hg2 = ctx.createRadialGradient(nx, ny, 0, nx, ny, t1h)
        hg2.addColorStop(0, 'rgba(230,195,92,.38)')
        hg2.addColorStop(1, 'rgba(230,195,92,0)')
        ctx.fillStyle = hg2
        ctx.fillRect(nx - t1h, ny - t1h, t1h * 2, t1h * 2)
        star4(ctx, nx, ny, t1r, 0, '#e6c35c', 1.2)
      } else if (nd.t === 2) {
        star4(ctx, nx, ny, 3.6, Math.PI / 4, '#d4b25a', 1)
      } else {
        ctx.fillStyle = '#c8a860'
        ctx.fillRect(nx - 1.2, ny - 1.2, 2.4, 2.4)
      }
      /* 星域名（主星 + 驻地；随拉镜淡入；避开中央铭牌带 y88..252） */
      if ((nd.t === 1 || n === 41) && zA > 0.02 && (ny > 252 || ny < 88)) {
        if (n === 41) {
          /* 驻地定影：齿轮环 + 双重脉冲环 + 光焰 + 站名 */
          var ringPulse = 1 + 0.08 * Math.sin(t * 2.4)
          drawCog(ctx, nx, ny, 15 * ringPulse, 12, t * 0.22, '#e6c35c', 1.6, la)
          for (var rp = 0; rp < 2; rp++) {
            var ph2 = (t * 0.42 + rp * 0.5) % 1
            ctx.globalAlpha = (1 - ph2) * 0.4 * la
            ctx.strokeStyle = '#e6c35c'
            ctx.lineWidth = 1.2
            ctx.beginPath()
            ctx.arc(nx, ny, 16 + ph2 * 26, 0, TAU)
            ctx.stroke()
          }
          ctx.globalAlpha = la
          var fg2 = ctx.createRadialGradient(nx, ny, 1, nx, ny, 30)
          fg2.addColorStop(0, 'rgba(240,196,96,.5)')
          fg2.addColorStop(1, 'rgba(240,196,96,0)')
          ctx.save()
          ctx.globalCompositeOperation = 'screen'
          ctx.fillStyle = fg2
          ctx.fillRect(nx - 30, ny - 30, 60, 60)
          ctx.restore()
          drawSpaced(ctx, C.station, nx, ny + 32 * ringPulse, 2.8, labelFont.replace('12px', '13px'), '#e8c868', la, 3)
        } else {
          drawSpaced(ctx, nd.n, nx, ny - 13 - (1 - clamp01(bloom)) * 3, 1.8, labelFont, '#e2c26e', 0.9 * la, 2.5)
        }
      }
      ctx.restore()
    }

    /* 神经接驳形态（morph）：汇聚脉冲沿航线潜向星炬接口，接口张合待接 */
    if (mA > 0.15 && !REDUCED) {
      var convPt = [0, 0]
      for (var k3 = 0; k3 < 6; k3++) {
        var cy3 = (t * 0.55 + k3 / 6) % 1
        var rIx = (k3 * 7 + 3) % ROUTES.length
        var rE = ROUTES[rIx]
        var AA = NODES[rE[0]]
        var BB = NODES[rE[1]]
        var pA = M(AA.x, AA.y)
        var pB = M(BB.x, BB.y)
        var mxa = (pA[0] + pB[0]) / 2
        var mya = (pA[1] + pB[1]) / 2 - Math.hypot(pB[0] - pA[0], pB[1] - pA[1]) * RT_CURVE[rIx]
        /* 向离泰拉更近的一端行进（汇聚感） */
        var dA = Math.hypot(AA.x - TERRA.x, AA.y - TERRA.y)
        var dB = Math.hypot(BB.x - TERRA.x, BB.y - TERRA.y)
        var v4 = dA < dB ? 1 - cy3 : cy3
        qp(v4, pA[0], pA[1], pB[0], pB[1], mxa, mya, convPt)
        var fade = Math.min(1, cy3 * 5) * (v4 > 0.96 ? (1 - v4) / 0.04 : 1)
        var pg4 = ctx.createRadialGradient(convPt[0], convPt[1], 0, convPt[0], convPt[1], 9)
        pg4.addColorStop(0, 'rgba(250,214,130,' + (0.9 * mA * fade) + ')')
        pg4.addColorStop(1, 'rgba(250,214,130,0)')
        ctx.save()
        ctx.globalCompositeOperation = 'screen'
        ctx.fillStyle = pg4
        ctx.fillRect(convPt[0] - 9, convPt[1] - 9, 18, 18)
        ctx.restore()
      }
      /* 星炬即接口：齿轮环 + 双脉冲张合 */
      var tc2 = M(TERRA.x, TERRA.y)
      drawCog(ctx, tc2[0], tc2[1], 30, 14, t * 0.3, '#e6c35c', 1.8, mA)
      for (var ip = 0; ip < 2; ip++) {
        var iph = (t * 0.7 + ip * 0.5) % 1
        ctx.save()
        ctx.globalAlpha = (1 - iph) * 0.5 * mA
        ctx.strokeStyle = '#e8c868'
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.arc(tc2[0], tc2[1], 20 + iph * 30, 0, TAU)
        ctx.stroke()
        ctx.restore()
      }
    }

    /* 开场手势：上一幕的 CRT 亮线在泰拉位置收拢为星炬之火（阶段衔接） */
    if (prog < 0.10) {
      var lw2 = 1 - prog / 0.10
      var tp2 = M(TERRA.x, TERRA.y)
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.strokeStyle = 'rgba(238,196,110,' + (0.5 * lw2 * enter) + ')'
      ctx.lineWidth = 2
      var half2 = viewW * 0.5 * lw2
      ctx.beginPath()
      ctx.moveTo(tp2[0] - half2, tp2[1])
      ctx.lineTo(tp2[0] + half2, tp2[1])
      ctx.stroke()
      ctx.restore()
    }
  }

  /* 00 AWAKENING：CRT 上电 + 唤醒齿轮；末段把烛光递给星图（阶段衔接） */
  function drawAwaken(prog, t) {
    var cx = viewW / 2
    var cy = viewH / 2
    var R = Math.min(viewW, viewH) * 0.085
    if (prog < 0.2) {
      /* CRT 亮线展开 */
      var lw = smooth(prog / 0.2)
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.strokeStyle = 'rgba(238,196,110,' + (0.9 - prog) + ')'
      ctx.lineWidth = 2 + lw * 3
      var half = (viewW * 0.5) * lw
      ctx.beginPath()
      ctx.moveTo(cx - half, cy); ctx.lineTo(cx + half, cy)
      ctx.stroke()
      ctx.fillStyle = 'rgba(238,196,110,' + (0.16 * lw) + ')'
      ctx.fillRect(0, cy - viewH * 0.5 * lw * 0.2, viewW, viewH * lw * 0.2)
      ctx.restore()
      return
    }
    var power = smooth((prog - 0.2) / 0.5)
    /* 齿轮背后的琥珀辉光 */
    var glowR = R * (3.4 + 0.5 * Math.sin(t * 2.2))
    var g = ctx.createRadialGradient(cx, cy, 4, cx, cy, glowR)
    g.addColorStop(0, 'rgba(212,160,23,' + (0.20 * power) + ')')
    g.addColorStop(1, 'rgba(212,160,23,0)')
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = g
    ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2)
    ctx.restore()
    /* 齿轮：从静止缓转起来 */
    var rot = t * 0.22 * smooth((prog - 0.22) / 0.6)
    ctx.save()
    ctx.shadowColor = 'rgba(212,160,23,.55)'
    ctx.shadowBlur = 14 * flick(t)
    drawCog(ctx, cx, cy, R, 12, rot, '#d4a017', 2, power)
    drawSkull(ctx, cx, cy, R * 0.62, 'rgba(212,160,23,' + (0.75 * power) + ')')
    ctx.restore()
    /* 环绕的二进制圣歌（随齿轮反向缓转） */
    var bits = 22
    ctx.save()
    ctx.globalAlpha = 0.4 * power
    ctx.font = '10px "Cascadia Code", Consolas, monospace'
    ctx.fillStyle = '#9a7a1f'
    var rand = prng(hashStr('ACT' + C.cipher))
    for (var i = 0; i < bits; i++) {
      var a = -t * 0.12 + (i / bits) * TAU
      var bx = cx + Math.cos(a) * R * 2.15
      var by = cy + Math.sin(a) * R * 2.15
      ctx.fillText(rand() < 0.5 ? '0' : '1', bx - 3, by + 3)
    }
    ctx.restore()
    /* 末段：中央暖光涨起 —— 下一幕泰拉余烬从这里接火 */
    var outro = clamp01((prog - 0.76) / 0.24)
    if (outro > 0) {
      var br = Math.min(viewW, viewH) * (0.10 + 0.16 * outro)
      var bg2 = ctx.createRadialGradient(cx, cy, 2, cx, cy, br)
      bg2.addColorStop(0, 'rgba(246,198,98,' + (0.30 * outro) + ')')
      bg2.addColorStop(1, 'rgba(246,198,98,0)')
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = bg2
      ctx.fillRect(cx - br, cy - br, br * 2, br * 2)
      ctx.restore()
    }
  }

  /* 02 UPLINK：星图渐变为神经网 —— 同一张图：虚空布景褪成电路面，航线由暗红
     转琥珀并涌起汇聚脉冲，镜头推向泰拉（星炬即接口）；尖拱自虚空中描出作画框。
     与星图之间没有任何「换场」，只有形态与语义的渐变。 */
  function drawUplink(prog, t) {
    var cx = viewW / 2
    drawVia(1, t, { enter: 1, morph: smooth(clamp01(prog / 0.55)) })
    /* 尖拱（仪式画框，随形态渐变浮现） */
    var archW = Math.min(viewW * 0.46, viewH * 0.66)
    var archH = Math.min(viewH * 0.40, archW * 1.06)
    var baseY = viewH * 0.615
    var archP = clamp01((prog - 0.22) / 0.5)
    if (archP > 0) {
      ctx.save()
      ctx.shadowColor = 'rgba(150,110,44,.35)'
      ctx.shadowBlur = 6
      drawArch(ctx, cx, baseY, archW, archH, archP, '#9a7430', 2, 0.6 * flick(t))
      ctx.restore()
      var cogP = clamp01((prog - 0.45) / 0.3)
      if (cogP > 0) {
        /* 拱内悬香炉（齿轮）：挂在拱心偏下，避开标题带 */
        var censerY = baseY - archH * 0.52
        ctx.save()
        ctx.globalAlpha = 0.85 * cogP
        ctx.strokeStyle = '#9a7430'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(cx, baseY - archH * 0.92)
        ctx.lineTo(cx, censerY - Math.min(viewW, viewH) * 0.03)
        ctx.stroke()
        ctx.restore()
        drawCog(ctx, cx, censerY, Math.min(viewW, viewH) * 0.02, 10, t * 0.3, '#b98a2f', 1.4, cogP * 0.85)
      }
    }
  }

  /* 03 INSCRIPTIO：名录密卷 + 火漆 + 羽笔 + 二进制圣歌条。
     尖拱自上一幕延续而来，亮度随本幕推进缓缓让位给密卷（不再硬切）。 */
  function drawInscribe(prog, t) {
    var cx = viewW / 2
    var cy = viewH * 0.5
    var m = Math.min(viewW, viewH)
    drawArch(ctx, cx, viewH * 0.615, Math.min(viewW * 0.46, viewH * 0.66), Math.min(viewH * 0.40, viewW * 0.46), 1, '#b98a2f', 1.6, lerp(0.72, 0.2, smooth(prog)) * flick(t))
    /* 密卷羊皮纸底（DOM 卡片盖在上面）：纸面要罩住整张卡片并四周留边；
       卡片高约 200px 与视口无关，矮视口时 0.30m 兜不住，用 px 下限托底。 */
    var scrollP = smooth(clamp01((prog - 0.04) / 0.4))
    var sw = Math.min(viewW * 0.46, 396)
    var pb = cy + Math.max(m * 0.30, 210)
    if (parch && scrollP > 0) {
      var ph = (m * 0.44) * scrollP
      ctx.save()
      ctx.globalAlpha = 0.9
      ctx.drawImage(parch, cx - sw / 2 - 8, pb - ph, sw + 16, ph + 16)
      ctx.strokeStyle = 'rgba(90,66,32,.5)'
      ctx.lineWidth = 1
      ctx.strokeRect(cx - sw / 2 - 8, pb - ph, sw + 16, ph + 16)
      ctx.restore()
    }
    /* 火漆小印（卷尾）：压在羊皮纸底边右侧，避开 DOM 卡片 */
    var sealP = clamp01((prog - 0.42) / 0.3)
    drawSeal(ctx, cx + sw / 2 - 6, pb - 6, m * 0.030, sealP, t, C.accent)
    /* 羽笔：随书写行微动 */
    var quillP = clamp01((prog - 0.1) / 0.3)
    if (quillP > 0) {
      var qx = cx + sw / 2 - 22
      var qy = cy - m * 0.10 + Math.sin(t * 2.6) * 3
      ctx.save()
      ctx.globalAlpha = quillP
      ctx.translate(qx, qy)
      ctx.rotate(-0.5)
      /* 羽轴 + 羽片 */
      ctx.strokeStyle = '#cbbfa4'
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(0, 14)
      ctx.lineTo(0, -20)
      ctx.stroke()
      ctx.fillStyle = 'rgba(203,191,164,.75)'
      ctx.beginPath()
      ctx.moveTo(0, -20)
      ctx.bezierCurveTo(9, -14, 10, 2, 0, 10)
      ctx.bezierCurveTo(-6, 2, -5, -13, 0, -20)
      ctx.fill()
      ctx.restore()
    }
    /* 二进制圣歌条：纸上、卡片正下方的一条「签名行」（避开底部操作按钮区） */
    var stripY = pb - m * 0.018
    var stripW = Math.min(viewW * 0.5, 420)
    var cells = 24
    var idx = Math.min(cells, Math.floor(prog / 0.05))
    var rand = prng(hashStr('STRIP' + C.cipher))
    ctx.save()
    ctx.font = '10px "Cascadia Code", Consolas, monospace'
    ctx.textBaseline = 'middle'
    var cellW = stripW / cells
    for (var i = 0; i < cells; i++) {
      var x0 = cx - stripW / 2 + i * cellW
      var on = i < idx
      ctx.globalAlpha = on ? 0.9 : 0.22
      ctx.fillStyle = (on && rand() < 0.5) ? '#e6c35c' : '#8a6a28'
      ctx.fillText(((i * 7 + hashStr(C.cipher)) % 2 === 0) ? '1' : '0', x0 + cellW / 2 - 3, stripY)
      if (i % 4 === 3) {
        ctx.globalAlpha = 0.3
        ctx.fillRect(x0 + cellW - 1, stripY - 6, 1, 12)
      }
    }
    ctx.restore()
  }

  /* 05 CONSECRATIO：机锻压印 —— 巨型机械齿轮压头沿导杆砸下，把 Cog
     Mechanicum 圣徽「等离子蚀刻」进场面：撞击闪光 + 能量冲击环 + 白金火星 +
     边缘电弧，压头回缩后圣徽由炽金冷却成暗金浮雕。不是羊皮纸上的火漆，
     是铸造世界的锻压祝圣。 */
  function drawPressHead(x, y, r) {
    ctx.save()
    ctx.translate(x, y)
    /* 顶部连接柱（锻压机的冲头杆） */
    ctx.fillStyle = '#221d16'
    ctx.fillRect(-r * 0.14, -r * 2.0, r * 0.28, r * 1.05)
    ctx.strokeStyle = '#5c4a24'
    ctx.lineWidth = 1.5
    ctx.strokeRect(-r * 0.14, -r * 2.0, r * 0.28, r * 1.05)
    /* 压头体：暗铁圆盘 */
    var body = ctx.createLinearGradient(0, -r, 0, r)
    body.addColorStop(0, '#3b342a')
    body.addColorStop(0.55, '#231e17')
    body.addColorStop(1, '#120f0b')
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, TAU)
    ctx.fill()
    /* 外齿圈（工业齿，不转） */
    drawCog(ctx, 0, 0, r, 12, 0, '#7a5c2a', Math.max(2, r * 0.045))
    /* 上缘受光 */
    ctx.strokeStyle = 'rgba(212,160,23,.45)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.9, Math.PI * 1.06, Math.PI * 1.94)
    ctx.stroke()
    /* 底面蚀刻模具：圣徽（反向浮雕） */
    drawCog(ctx, 0, 0, r * 0.56, 8, 0, 'rgba(205,165,84,.75)', Math.max(1.6, r * 0.028))
    drawSkull(ctx, 0, 0, r * 0.42, 'rgba(205,165,84,.55)')
    ctx.restore()
  }

  /** 蚀刻圣徽：clip 圆扩张披露 + 炽金→暗金冷却 + 边缘电弧。 */
  function drawEtchedSigil(x, y, r, etchP, post, t) {
    if (etchP <= 0) return
    var cool = smooth(clamp01((post - 0.40) / 0.5))
    var heat = 1 - cool
    ctx.save()
    ctx.translate(x, y)
    ctx.beginPath()
    ctx.arc(0, 0, r * 1.02 * ease(etchP), 0, TAU)
    ctx.clip()
    ctx.shadowColor = 'rgba(255,196,90,.8)'
    ctx.shadowBlur = 6 + 16 * heat
    var col = 'rgba(' + Math.round(255 - 62 * cool) + ',' + Math.round(222 - 78 * cool) + ',' +
      Math.round(132 - 74 * cool) + ',' + (0.92 - 0.16 * cool) + ')'
    drawCog(ctx, 0, 0, r * 0.8, 12, 0, col, Math.max(2, r * 0.03))
    ctx.shadowBlur *= 0.5
    drawSkull(ctx, 0, 0, r * 0.6, col)
    ctx.shadowBlur = 0
    ctx.strokeStyle = col
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.5, 0, TAU)
    ctx.stroke()
    ctx.restore()
    /* 边缘电弧：蚀刻后 0.5 内沿圣徽外缘抖动放电 */
    if (post < 0.5 && !REDUCED) {
      var rand = prng(((t * 97) | 0) & 0xffff)
      for (var aI = 0; aI < 2; aI++) {
        var a0 = rand() * TAU
        var flick2 = Math.sin(t * 60 + aI * 7) > 0.15 ? 1 : 0.2
        ctx.save()
        ctx.globalAlpha = flick2 * (1 - post / 0.5) * 0.8
        ctx.strokeStyle = '#ffe9a8'
        ctx.lineWidth = 1.2
        ctx.beginPath()
        var px2 = x + Math.cos(a0) * r * 0.84
        var py2 = y + Math.sin(a0) * r * 0.84
        ctx.moveTo(px2, py2)
        for (var sA = 0; sA < 4; sA++) {
          var aa = a0 + (rand() - 0.5) * 0.55
          var rr2 = r * (0.84 + 0.14 * (sA + 1) / 4 + rand() * 0.06)
          px2 = x + Math.cos(aa) * rr2
          py2 = y + Math.sin(aa) * rr2
          ctx.lineTo(px2, py2)
        }
        ctx.stroke()
        ctx.restore()
      }
    }
  }

  function drawConsecrate(prog, t) {
    var cx = viewW / 2
    var m = Math.min(viewW, viewH)
    var landP = 0.34
    var r = m * 0.125
    var yImpact = viewH * 0.40
    if (prog < landP) {
      var fall = easeIn(prog / landP)
      var sy = lerp(viewH * -0.18, yImpact, fall)
      /* 导杆：三根细杆自天顶引导压头（机械感） */
      ctx.save()
      ctx.globalAlpha = 0.5 * (0.6 + 0.4 * fall)
      ctx.strokeStyle = '#6a5426'
      ctx.lineWidth = 2
      for (var gI = -1; gI <= 1; gI++) {
        var gx = cx + gI * r * 1.12
        ctx.beginPath()
        ctx.moveTo(gx, 0)
        ctx.lineTo(gx, sy)
        ctx.stroke()
      }
      ctx.restore()
      /* 落点预期微光（蚀刻预热） */
      var pg2 = ctx.createRadialGradient(cx, yImpact, 2, cx, yImpact, r * 1.5)
      pg2.addColorStop(0, 'rgba(214,150,50,' + (0.12 * fall) + ')')
      pg2.addColorStop(1, 'rgba(214,150,50,0)')
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = pg2
      ctx.fillRect(cx - r * 1.5, yImpact - r * 1.5, r * 3, r * 3)
      ctx.restore()
      drawPressHead(cx, sy, r)
    } else {
      var post = clamp01((prog - landP) / (1 - landP))
      if (!scene.stamped) {
        scene.stamped = true
        scene.shake = 1.2
        scene.flash = 1
        audio.stamp()
        audio.tick() /* 电弧脆响叠在闷响上 */
        /* 白金火星：近处密集 + 上方扬起 */
        spawnBurst(cx / viewW, (yImpact + r * 0.4) / viewH, 34, 0.20, 0.12, 0)
        spawnBurst(cx / viewW, (yImpact - r * 0.4) / viewH, 30, 0.12, 0.10, 0)
      }
      /* 压头：压住一拍 → 回缩抬升 */
      var retract = clamp01((post - 0.16) / 0.5)
      if (retract < 1) {
        var hy = yImpact - ease(retract) * m * 0.6
        ctx.save()
        ctx.globalAlpha = 1 - retract * 0.75
        ctx.strokeStyle = '#6a5426'
        ctx.lineWidth = 2
        ctx.globalAlpha *= 0.5
        for (var g2 = -1; g2 <= 1; g2++) {
          ctx.beginPath()
          ctx.moveTo(cx + g2 * r * 1.12, 0)
          ctx.lineTo(cx + g2 * r * 1.12, hy)
          ctx.stroke()
        }
        ctx.restore()
        drawPressHead(cx, hy, r)
      }
      /* 蚀刻圣徽：披露 + 冷却 + 电弧 */
      drawEtchedSigil(cx, yImpact, r, clamp01((post - 0.08) / 0.2), post, t)
      /* 撞击闪光（快衰减，scene.flash 在 drawScene 里递减） */
      if (scene.flash > 0.01) {
        ctx.save()
        ctx.globalCompositeOperation = 'screen'
        var fr = r * 2.4
        var fgr = ctx.createRadialGradient(cx, yImpact, 2, cx, yImpact, fr)
        fgr.addColorStop(0, 'rgba(255,244,210,' + (0.6 * scene.flash) + ')')
        fgr.addColorStop(0.4, 'rgba(240,190,90,' + (0.25 * scene.flash) + ')')
        fgr.addColorStop(1, 'rgba(240,190,90,0)')
        ctx.fillStyle = fgr
        ctx.fillRect(cx - fr, yImpact - fr, fr * 2, fr * 2)
        ctx.restore()
      }
      /* 能量冲击环：(1-t)² 衰减，外环带电抖动 */
      for (var wv = 0; wv < 2; wv++) {
        var wp2 = clamp01(post * 1.15 - wv * 0.15)
        if (wp2 <= 0 || wp2 >= 1) continue
        ctx.save()
        ctx.globalAlpha = (1 - wp2) * (1 - wp2) * 0.55
        ctx.strokeStyle = '#e8c868'
        ctx.lineWidth = 1 + 10 * (1 - wp2)
        ctx.beginPath()
        ctx.ellipse(cx, yImpact, r * (1 + wp2 * 2.6), r * (0.8 + wp2 * 2.2), 0, 0, TAU)
        ctx.stroke()
        ctx.restore()
      }
      /* 铭文 + 上下金线自中心展开放 */
      var txtP = clamp01((prog - 0.42) / 0.4)
      if (txtP > 0) {
        var ty = yImpact + r + m * 0.075
        drawSpaced(ctx, 'CONSECRATA', cx, ty, m * 0.016,
          '500 ' + Math.round(m * 0.030) + 'px "Palatino Linotype", Palatino, Georgia, serif',
          '#e6c35c', txtP * flick(t))
        drawSpaced(ctx, '祝 圣 · 机 神 嘉 许', cx, yImpact + r + m * 0.115, m * 0.010,
          Math.round(m * 0.016) + 'px "SimSun", "宋体", serif',
          '#c8a860', txtP * 0.9 * flick(t))
        ctx.save()
        ctx.globalAlpha = txtP * 0.55
        ctx.strokeStyle = '#b98a2f'
        ctx.lineWidth = 1
        var lineHalf = m * 0.14 * txtP
        ctx.beginPath()
        ctx.moveTo(cx - lineHalf, ty - m * 0.032); ctx.lineTo(cx + lineHalf, ty - m * 0.032)
        ctx.moveTo(cx - lineHalf, yImpact + r + m * 0.145); ctx.lineTo(cx + lineHalf, yImpact + r + m * 0.145)
        ctx.stroke()
        ctx.restore()
      }
    }
  }

  /* 03→04 手势：名录卷轴上收离场，终端自卷后升起（DOM 侧同步淡入） */
  function drawScrollAway(prog, t) {
    if (!parch) return
    var p = clamp01(prog / 0.3)
    var rise = ease(p)
    var m = Math.min(viewW, viewH)
    var sw = Math.min(viewW * 0.40, 340) + 16
    var ph = m * 0.44 + 16
    var topFull = viewH * 0.5 + Math.max(m * 0.30, 210) - ph
    var y = lerp(topFull, -m * 0.55, rise)
    ctx.save()
    ctx.globalAlpha = 1 - p * 0.92
    ctx.translate(viewW / 2, y)
    ctx.rotate(-0.012 * (1 - p))
    ctx.drawImage(parch, -sw / 2, 0, sw, ph)
    ctx.strokeStyle = 'rgba(90,66,32,.5)'
    ctx.lineWidth = 1
    ctx.strokeRect(-sw / 2, 0, sw, ph)
    /* 卷轴杆：黄铜杆带着纸面卷离 */
    ctx.fillStyle = 'rgba(185,138,47,' + (0.85 * (1 - p * 0.5)) + ')'
    ctx.fillRect(-sw / 2 - 10, -3, sw + 20, 5)
    ctx.fillStyle = 'rgba(244,204,110,.5)'
    ctx.fillRect(-sw / 2 - 10, -3, sw + 20, 1.5)
    ctx.restore()
  }

  /* 05→06 手势：蚀刻圣徽余温淡出 + 光环自蚀刻处扩散，托出会话卡 */
  function drawConsecBloom(prog, t) {
    var p = clamp01(prog / 0.3)
    var cx = viewW / 2
    var cy = viewH * 0.40
    var m = Math.min(viewW, viewH)
    ctx.save()
    ctx.globalAlpha = (1 - p) * 0.4
    drawCog(ctx, cx, cy, m * 0.1, 12, 0, 'rgba(226,182,92,.9)', 2.2)
    drawSkull(ctx, cx, cy, m * 0.075, 'rgba(226,182,92,.75)')
    ctx.restore()
    var R = m * (0.12 + 0.55 * ease(p))
    ctx.save()
    ctx.globalAlpha = (1 - p) * 0.35
    ctx.strokeStyle = '#e6c35c'
    ctx.lineWidth = Math.max(1, 3 * (1 - p))
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, TAU)
    ctx.stroke()
    ctx.restore()
  }

  /* ── 主绘制 ───────────────────────────────────────────────────────────── */
  function drawScene(now) {
    var t = now / 1000
    var prog = clamp01((now - scene.phaseStart) / 1000 / Math.max(0.001, scene.duration))
    ctx.fillStyle = '#0a0807'
    ctx.fillRect(0, 0, viewW, viewH)
    ctx.save()
    if (scene.shake > 0.01 && !REDUCED) {
      var sh = scene.shake * 3.2
      ctx.translate((Math.sin(now * 91.7) + Math.sin(now * 47.3)) * 0.5 * sh,
        (Math.sin(now * 83.1) + Math.sin(now * 59.9)) * 0.5 * sh)
    }
    /* 黄金王座：全场贯穿的暗背景母题。目标亮度按阶段调度，帧间插值渐变 ——
       绝不跳变（阶段切换的突兀感大多来自背景光一瞬切换）。 */
    var THRONE_GLOW = [0.32, 0.28, 0.36, 0.32, 0.13, 0.28, 0.34]
    var gTarget = THRONE_GLOW[scene.phase] != null ? THRONE_GLOW[scene.phase] : 0.3
    if (scene.phase === 1) gTarget = 0.16 + 0.28 * smooth(warpTerra(prog))
    if (scene.glow == null) scene.glow = 0
    var gdt = Math.min(0.05, Math.max(0, (now - (drawScene.lastNow || now)) / 1000))
    drawScene.lastNow = now
    scene.glow += (gTarget - scene.glow) * Math.min(1, gdt * 2.6)
    var thronePush = scene.phase === 2 ? smooth(prog) : (scene.phase === 3 ? 0.6 : (scene.phase === 6 ? 0.35 : 0))
    drawThrone(t, scene.glow, thronePush)

    /* 相邻阶段的手势衔接：每一幕的开头都在"接住"上一幕的余韵 */
    switch (scene.phase) {
      case 0: drawAwaken(prog, t); break
      case 1: drawVia(prog, t, { enter: smooth(clamp01(prog / 0.14)) }); break
      case 2: drawUplink(prog, t); break
      case 3: drawInscribe(prog, t); break
      case 4: {
        /* 卷轴上收：名录卷离画面，终端（DOM）从卷后升起 */
        if (prog < 0.3) drawScrollAway(prog, t)
        break
      }
      case 5: drawConsecrate(prog, t); break
      case 6: {
        /* 祝圣余晖：印章残影 + 光环扩散，从中托出会话卡（DOM） */
        if (prog < 0.3) drawConsecBloom(prog, t)
        drawArch(ctx, viewW / 2, viewH * 0.64, Math.min(viewW * 0.5, viewH * 0.72), Math.min(viewH * 0.44, viewW * 0.5), 1, '#b98a2f', 1.4, 0.22 * flick(t))
        /* 欧姆尼赛亚圣徽：拱顶下的齿轮骷髅（Cog Mechanicum） */
        var em = Math.min(viewW, viewH)
        var emY = viewH * 0.145
        var emA = 0.55 * smooth(clamp01(prog / 0.4)) * flick(t)
        drawCog(ctx, viewW / 2, emY, em * 0.048, 14, t * 0.08, '#c8a052', 1.6, emA)
        drawSkull(ctx, viewW / 2, emY, em * 0.027, 'rgba(230,190,100,' + emA + ')')
        break
      }
    }

    /* 余烬与尘埃（全场氛围；阶段 4-5 更密） */
    var emberA = scene.phase === 0 ? 0.5 : (scene.phase >= 4 ? 0.8 : 0.55)
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    var dt = 1 / 60
    for (var i = 0; i < EMBER_N; i++) {
      ember[i * 5] += ember[i * 5 + 2] * dt + Math.sin(t * 0.8 + ember[i * 5 + 4]) * 0.0004
      ember[i * 5 + 1] += ember[i * 5 + 3] * dt
      if (ember[i * 5 + 1] < -0.05) { ember[i * 5 + 1] = 1.05; ember[i * 5] = (i * 0.618) % 1 }
      var ex = ember[i * 5] * viewW
      var ey = ember[i * 5 + 1] * viewH
      var tw = 0.5 + 0.5 * Math.sin(t * 2 + ember[i * 5 + 4] * 3)
      ctx.globalAlpha = 0.16 * emberA * tw * flick(t)
      ctx.fillStyle = '#e8a83c'
      var sz = 1.2 + tw * 1.4
      ctx.fillRect(ex, ey, sz, sz)
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    for (var d = 0; d < DUST_N; d++) {
      dust[d * 5] += dust[d * 5 + 2] * dt
      dust[d * 5 + 1] += dust[d * 5 + 3] * dt
      if (dust[d * 5] > 1.02) dust[d * 5] = -0.02
      if (dust[d * 5] < -0.02) dust[d * 5] = 1.02
      if (dust[d * 5 + 1] > 1.02) dust[d * 5 + 1] = -0.02
      if (dust[d * 5 + 1] < -0.02) dust[d * 5 + 1] = 1.02
      ctx.globalAlpha = 0.05 * dust[d * 5 + 4] * flick(t)
      ctx.fillStyle = '#cbbfa4'
      ctx.fillRect(dust[d * 5] * viewW, dust[d * 5 + 1] * viewH, 1.4, 1.4)
    }
    /* 迸溅尘粒（双色：金火星 / 暗红蜡渍） */
    stepBurst(dt)
    for (var b = 0; b < burstAlive; b++) {
      var bl = clamp01(burst[b * 5 + 4])
      ctx.globalAlpha = bl * 0.6
      ctx.fillStyle = burstCol[b] ? 'rgb(' + ACC_RGB[0] + ',' + ACC_RGB[1] + ',' + ACC_RGB[2] + ')' : '#e8c868'
      var bsz = burstCol[b] ? 2.6 : 2
      ctx.fillRect(burst[b * 5] * viewW - bsz / 2, burst[b * 5 + 1] * viewH - bsz / 2, bsz, bsz)
    }
    ctx.restore()

    /* 鼠标烛光：一团暖光始终缓动跟随指针（叠加在内容上方） */
    scene.lumeX += (scene.pointer.x - scene.lumeX) * 0.12
    scene.lumeY += (scene.pointer.y - scene.lumeY) * 0.12
    if (!REDUCED) {
      var lx = scene.lumeX * viewW
      var ly = scene.lumeY * viewH
      var lr = Math.min(viewW, viewH) * 0.17
      var lgr = ctx.createRadialGradient(lx, ly, 2, lx, ly, lr)
      lgr.addColorStop(0, 'rgba(240,196,100,.10)')
      lgr.addColorStop(0.5, 'rgba(240,196,100,.04)')
      lgr.addColorStop(1, 'rgba(240,196,100,0)')
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = lgr
      ctx.fillRect(lx - lr, ly - lr, lr * 2, lr * 2)
      ctx.restore()
    }
    /* 点击涟漪：金环自点击处荡开 */
    if (scene.clickRing) {
      scene.clickRing.t += 1 / 60
      var cr2 = scene.clickRing
      if (cr2.t > 0.55) {
        scene.clickRing = null
      } else {
        ctx.save()
        ctx.globalAlpha = (1 - cr2.t / 0.55) * 0.4
        ctx.strokeStyle = '#e8c868'
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.arc(cr2.x * viewW, cr2.y * viewH, 4 + cr2.t * 90, 0, TAU)
        ctx.stroke()
        ctx.restore()
      }
    }

    /* 烛焰脉冲（pointer 点击的 flare 衰减）+ 祝圣撞击闪光衰减 */
    scene.impulse = Math.max(0, scene.impulse - 1 / 60 * 1.4)
    scene.shake = Math.max(0, scene.shake - 1 / 60 * 2.6)
    scene.flash = Math.max(0, scene.flash - 1 / 60 * 3.2)

    ctx.restore()

    /* 暗角 + 胶片颗粒：收掉大面积低 alpha 叠出来的「脏棕中间调」，压出真黑。
       每帧只留一个发光主角，其余一律向 #1a1512 以下沉。 */
    ctx.save()
    var vgr = ctx.createRadialGradient(viewW / 2, viewH * 0.46, Math.min(viewW, viewH) * 0.42, viewW / 2, viewH * 0.5, Math.max(viewW, viewH) * 0.78)
    vgr.addColorStop(0, 'rgba(4,3,2,0)')
    vgr.addColorStop(1, 'rgba(4,3,2,.6)')
    ctx.fillStyle = vgr
    ctx.fillRect(0, 0, viewW, viewH)
    if (grain && !REDUCED) {
      ctx.globalCompositeOperation = 'overlay'
      ctx.globalAlpha = 0.08
      ctx.fillStyle = grain
      ctx.fillRect(0, 0, viewW, viewH)
    }
    ctx.restore()

    /* 进度条 */
    var overall = clamp01((scene.phase + prog) / PHASES.length)
    ui.progress.style.transform = 'scaleX(' + overall.toFixed(4) + ')'
  }

  /* ── rAF 主循环 ───────────────────────────────────────────────────────── */
  var raf = 0
  var lastFrame = 0
  function frame(now) {
    raf = 0
    var delta = lastFrame ? Math.max(0, (now - lastFrame) / 1000) : 0
    lastFrame = now
    if (!REDUCED) scene.ambient += delta
    else scene.ambient += Math.min(delta, 0.001)
    try {
      drawScene(now)
    } catch (err) {
      if (window.console && console.warn) console.warn('[dsh-jt-startup/w40k] draw error:', err)
      raf = 0
      return
    }
    if (!finished) raf = requestAnimationFrame(frame)
  }
  function wake() {
    if (!raf && !finished && !document.hidden) {
      lastFrame = performance.now()
      raf = requestAnimationFrame(frame)
    }
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0 }
    else wake()
  })
  window.addEventListener('resize', resize)

  /* 指针：移动 = 烛光跟随 + 图面/王座视差；点击 = 星火迸溅 + 金环涟漪 */
  root.addEventListener('pointermove', function (e) {
    var r = root.getBoundingClientRect()
    scene.pointer.x = clamp01((e.clientX - r.left) / Math.max(1, r.width), 0, 1)
    scene.pointer.y = clamp01((e.clientY - r.top) / Math.max(1, r.height), 0, 1)
  })
  root.addEventListener('pointerup', function () {
    scene.impulse = 1
    scene.clickRing = { x: scene.pointer.x, y: scene.pointer.y, t: 0 }
    if (!REDUCED) spawnBurst(scene.pointer.x, scene.pointer.y, 10, 0.10, 0.06, 0)
    audio.click()
  })

  /* ── 阶段推进 ─────────────────────────────────────────────────────────── */
  function typeKicker(text) {
    if (kickerTimer) { clearInterval(kickerTimer); kickerTimer = null }
    if (REDUCED) { ui.kicker.textContent = text; return }
    ui.kicker.textContent = ''
    var i = 0
    kickerTimer = setInterval(function () {
      if (finished) { clearInterval(kickerTimer); kickerTimer = null; return }
      i++
      ui.kicker.textContent = text.slice(0, i)
      if (i >= text.length) { clearInterval(kickerTimer); kickerTimer = null }
    }, Math.max(14, Math.round(30 / C.speed)))
  }

  function setPhase(i) {
    phaseIndex = i
    var p = PHASES[i]
    root.classList.remove('jtw-p0', 'jtw-p1', 'jtw-p2', 'jtw-p3', 'jtw-p4', 'jtw-p5', 'jtw-p6')
    root.classList.add('jtw-p' + i)
    ui.stepcount.textContent = '[ ' + String(i + 1).padStart(2, '0') + ' / ' + String(PHASES.length).padStart(2, '0') + ' ] ' + p.go
    ui.logState.textContent = LOG_LINES[i]
    scene.phase = i
    scene.phaseStart = performance.now()
    scene.duration = ms(p.hold) / 1000
    ui.title.classList.remove('jtw-in')
    ui.note.classList.remove('jtw-in')
    void ui.title.offsetWidth
    ui.title.textContent = p.zh
    ui.note.textContent = p.note
    typeKicker(p.en)
    requestAnimationFrame(function () {
      ui.title.classList.add('jtw-in')
      ui.note.classList.add('jtw-in')
    })
    audio.stage(i, scene.duration)
    if (i === 2) {
      root.classList.add('jtw-live')
      ui.subZh.textContent = '正在接驳神经回路…'
      ui.subEn.textContent = 'NEURAL UPLINK IN PROGRESS'
    } else if (i === 3) {
      ui.subZh.textContent = '羽笔铭刻中'
      ui.subEn.textContent = 'INSCRIBING THE NAME'
      ui.logState.textContent = 'INSCRIPTIO · ' + C.cipher
    } else if (i === 5) {
      ui.subZh.textContent = '祝圣已落 · 机神嘉许'
      ui.subEn.textContent = 'CONSECRATED · AVE OMNISSIAH'
    } else if (i === 6) {
      var lit = liturgyNow()
      /* 欧姆尼赛亚祝词：主句是机神指引，圣言引文按编序轮换 */
      ui.w2.innerHTML = '愿欧姆尼赛亚与你同在<br>' + shortName(C.identity)
      ui.w5.textContent = LITANIES[hashStr(C.cipher) % LITANIES.length]
      ui.wDate.textContent = dateStamp()
      ui.subZh.textContent = '会话已获祝圣'
      ui.subEn.textContent = lit.en + ' · SESSION CONSECRATA'
      ui.logState.textContent = 'BENEDICTIO · ' + C.cipher
      ui.w3.textContent = lastScopes
        ? lastScopes.rites + ' RITES · ' + lastScopes.artefacts + ' ARTEFACTS · ANIMATA'
        : 'UPLINK SEALED · READY'
    }
  }

  function showAction(p) {
    ui.btnZh.textContent = p.action.zh
    ui.btnEn.textContent = p.action.en
    ui.action.classList.add('jtw-in')
    ui.btn.classList.add('jtw-pulse')
  }
  function hideAction() {
    ui.action.classList.remove('jtw-in')
    ui.btn.classList.remove('jtw-pulse')
  }

  /* ── 唤醒圣物 · 琥珀磷光终端（真实名录逐件唤醒）────────────────────────── */
  var lastScopes = null
  function runInventory() {
    ui.termBody.textContent = ''
    ui.termNow.textContent = '000'
    ui.termTotal.textContent = '---'
    ui.termSummary.textContent = 'invoking machine spirit …'
    ui.termGrant.classList.remove('jtw-on')
    ui.subZh.textContent = '正在唤醒本地圣仪与圣物…'
    ui.subEn.textContent = 'RELICS EXCITANDI'
    ui.logState.textContent = 'RELICS …'

    var demo = window.__JT_STARTUP_DEMO__
    var fetcher = (C.inventory && !demo)
      ? fetch('/jt-startup/inventory.json', { cache: 'no-store' })
          .then(function (r) { return r.ok ? r.json() : null })
          .catch(function () { return null })
      : Promise.resolve(demo || null)
    var bounded = Promise.race([fetcher, wait(6500).then(function () { return null })])

    return bounded.then(function (data) {
      if (finished) return
      var skills = (data && data.ok && Array.isArray(data.skills)) ? data.skills : null
      var plugins = (data && data.ok && Array.isArray(data.plugins)) ? data.plugins : null
      var offline = !skills && !plugins

      var lines = []
      if (offline) {
        lines.push({
          text: '>> cogitator offline · ' + (demo ? 'demo · 安装后读取真实名录' : '未读取真实名录'),
          kind: 'warn'
        })
        lastScopes = null
        voiceOffline = true
        ui.termSummary.textContent = 'offline · 离线预览'
        ui.subZh.textContent = '离线预览 · 圣物名录未读取'
        ui.subEn.textContent = 'OFFLINE PREVIEW'
        PHASES[5].note = '离线预览 · 未读取真实名录'
        ui.logState.textContent = 'OFFLINE'
      } else {
        var sN = (skills || []).length, pN = (plugins || []).length
        voiceOffline = false
        voiceSkipped = 0
        lastScopes = { rites: sN, artefacts: pN, ms: data && data.elapsed_ms }
        var shown = 0
        /* ★ 先 artefacts 后 rites（可视行数有限，滚到底部时两类同屏）。 */
        ;(plugins || []).slice(0, 512).forEach(function (it, ix) {
          var off = it.enabled === false
          if (off) voiceSkipped++
          lines.push({
            text: (off ? 'dormant  artefact · ' : 'awakened  artefact · ')
              + it.name + (it.version ? ' @' + it.version : ''),
            kind: off ? 'dim' : 'ok'
          }); shown++
          /* 圣歌间奏：每第 9 条插一句，不做数据、只做气氛 */
          if (ix > 0 && ix % 9 === 0) {
            lines.push({ text: '>> binharic canticle :: ' + binaricOf(C.cipher, ix), kind: 'dim' })
          }
        })
        ;(skills || []).slice(0, 128).forEach(function (it, ix) {
          lines.push({ text: 'awakened  rite · ' + it.name, kind: 'ok' }); shown++
          if (ix > 0 && ix % 11 === 0) {
            lines.push({ text: '>> litania ignis :: cognition threshold rising', kind: 'dim' })
          }
        })
        if (sN + pN - shown > 0) lines.push({ text: '+ ' + (sN + pN - shown) + ' more relics', kind: 'dim' })
        ui.termTotal.textContent = String(Math.min(sN + pN, 999)).padStart(3, '0')
        ui.termSummary.textContent = 'awakened in ' + ((data && data.elapsed_ms) != null ? data.elapsed_ms + ' ms' : '—')
        ui.subZh.textContent = '唤醒完成 · ' + sN + ' 圣仪 · ' + pN + ' 圣物 已苏醒'
        ui.subEn.textContent = 'RELICS AWAKENED'
        PHASES[5].note = sN + ' rites · ' + pN + ' artefacts · 机魂俱醒'
        if ((data && data.elapsed_ms) != null) PHASES[5].note += ' · ' + data.elapsed_ms + ' ms'
        ui.logState.textContent = 'ANIMATA · ' + sN + ' RITES · ' + pN + ' ARTEFACTS'
      }

      /* 大清单自适应：总时长收敛 ~2.4s（与极兔版同款滚屏节奏） */
      var step = Math.max(10, Math.min(150, Math.round(3200 / Math.max(1, lines.length))))
      lines.forEach(function (ln, idx) {
        var row = el('div', 'jtw-termLine' + (ln.kind === 'dim' ? ' jtw-dim' : ''))
        row.appendChild(el('span', 'jtw-termMark', ln.kind === 'ok' ? '✓' : (ln.kind === 'warn' ? '!' : '+')))
        row.appendChild(el('span', 'jtw-termText', ln.text))
        setTimeout(function () {
          if (finished) return
          ui.termBody.appendChild(row)
          requestAnimationFrame(function () { row.classList.add('jtw-in') })
          ui.termBody.scrollTop = ui.termBody.scrollHeight
          if (ln.kind === 'ok' || ln.kind === 'dim') {
            var now2 = parseInt(ui.termNow.textContent, 10) || 0
            ui.termNow.textContent = String(Math.min(now2 + 1, 999)).padStart(3, '0')
            if (idx % 4 === 0) audio.tick()
          }
        }, Math.round(idx * step))
      })
      setTimeout(function () {
        if (finished) return
        ui.termGrant.classList.add('jtw-on')
      }, Math.round(Math.min(lines.length * step, 3200) + 150))
      return wait(Math.min(lines.length * step, 3200) + 650)
    })
  }

  /** 二进制圣歌短语（编序播种，确定性）。 */
  function binaricOf(seedText, salt) {
    var rand = prng(hashStr(seedText + ':' + salt))
    var out = ''
    for (var i = 0; i < 3; i++) {
      var v = (rand() * 65536) | 0
      var b = v.toString(2)
      while (b.length < 16) b = '0' + b
      out += (out ? ' ' : '') + b
    }
    return out
  }

  /* ── 时间线 ───────────────────────────────────────────────────────────── */
  function run() {
    return Promise.resolve()
      .then(function () { return wait(300) })
      .then(function () { if (finished) return; setPhase(0); return wait(PHASES[0].hold + 400) })
      .then(function () { if (finished) return; setPhase(1); return phaseGate(1) })
      .then(function () { if (finished) return; setPhase(2); return phaseGate(2) })
      .then(function () { if (finished) return; setPhase(3); return phaseGate(3) })
      .then(function () { if (finished) return; setPhase(4); return phaseGate(4) })
      .then(function () { if (finished) return; setPhase(5); return phaseGate(5) })
      .then(function () { if (finished) return; setPhase(6); return phaseGate(6) })
      .then(function () { if (finished) return; return wait(260) })
      .then(function () { return finish() })
      .catch(function (err) {
        try { console.warn('[dsh-jt-startup/w40k] 动画异常，直接揭幕：', err) } catch (e2) {}
        return finish()
      })
  }

  function phaseGate(i) {
    var p = PHASES[i]
    var extra = p.inventory ? runInventory() : Promise.resolve()
    if (p.action && C.requireInteraction) {
      showAction(p)
      return wait(520)
        .then(waitAction)
        .then(function () { hideAction(); audio.confirm(); return extra })
        .then(function () { return wait(320) })
    }
    return extra.then(function () { return wait(p.hold) })
  }

  function finish() {
    if (finished) return
    finished = true
    releaseAll()
    audio.halt()
    try {
      if (C.mode === 'session') window.sessionStorage.setItem('jt-startup:shown', '1')
      if (C.mode === 'daily') {
        window.localStorage.setItem('jt-startup:day', new Date().toISOString().slice(0, 10))
      }
    } catch (err) { /* 隐私模式下不可写，忽略 */ }
    document.documentElement.classList.remove('jts-lock')
    document.documentElement.style.overflow = ''
    if (document.body) document.body.style.overflow = ''
    root.classList.remove('jts-boot')
    root.classList.add('jts-gone')
    if (raf) cancelAnimationFrame(raf)
    setTimeout(function () {
      if (root && root.parentNode) root.parentNode.removeChild(root)
      try { window.dispatchEvent(new CustomEvent('jt-startup:done')) } catch (err) { /* noop */ }
    }, ms(900))
  }

  function requestSkip() {
    if (skipped || finished) return
    skipped = true
    releaseAll()
    audio.halt()
    finish()
  }

  if (C.allowSkip && ui.skip) {
    ui.skip.hidden = false
    ui.skip.addEventListener('click', function (e) { e.stopPropagation(); requestSkip() })
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') requestSkip()
    })
  } else if (ui.skip) {
    ui.skip.hidden = true
  }

  /* 对外 API：settings 面板里的「立即预览」和重播都走它 */
  window.__JT_STARTUP_API__ = {
    replay: injectSelf,
    skip: requestSkip,
    finish: finish,
    config: C
  }

  document.documentElement.classList.add('jts-lock')
  document.documentElement.style.overflow = 'hidden'
  if (document.body) document.body.style.overflow = 'hidden'
  resize()
  wake()
  /* ★ 运行时已接管：摘掉首屏兜底类 jts-boot（与极兔版同款协议 ——
     Host BOOTSTRAP_JS 和本文件开头的两道 9 秒兜底都以「根节点还带
     jts-boot」为「没跑起来」判据，不摘会在第 9 秒被强拆）。 */
  root.classList.remove('jts-boot')

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { resize(); run() })
  } else {
    run()
  }
})()
