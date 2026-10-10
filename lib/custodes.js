/* ============================================================================
 * dsh-jt-startup — 启动动画运行时「黄金誓约 AURAMITE VIGIL」v2
 *                                       战锤40K · 禁军 Adeptus Custodes（浏览器端，零依赖）
 * ----------------------------------------------------------------------------
 * v1 为什么被推倒：五张全屏卡片互相切换（幕与幕之间没有空间连续性）、
 * 所有位移都是线性插值（没有预备/发力/安定，也就没有重量）、
 * 界面框是通用模板（mast + 标题卡 + 侧栏，和画面互不相干）。
 *
 * v2 的设计：**一个空间，一条镜头**。整段就是皇宫殿堂里的一次推进，
 * 没有幕的概念，只有节拍 —— 节拍之间靠镜头运动衔接，画面永不跳切：
 *
 *   苏醒 AWAKEN   镜头从液面特写缓缓拉出：培育槽排水、甲士成形、睁眼、
 *                 名号铸入基座。特写 → 全景全由相机推拉完成。
 *   集结 MUSTER   镜头横摇向列阵一侧：真实 skills/plugins 一位位落位，
 *                 每个都有预备-发力-安定，落点按纵深错开（近大远小），
 *                 **队列长度 = 真实条目数**，这段多长由你的机器决定。
 *   受任 VIGIL    镜头压低停在首列面前：按住不放，塔盾带着重量升起 ——
 *                 压力是渐近曲线（越举越沉），盾身跟弹簧（松手会弹落），
 *                 三档点燃（翼缘 → 宝徽 → 满值砸落）。超时自动放行。
 *   誓约 SWORN    定影：鹰盾占满画面再拉开，身份铭刻与誓词浮现。
 *
 * 运动学的规矩：一切位移走缓动曲线，凡入场必「预备 → 动作 → 安定」，
 * 凡转场必有重叠（下一节的元素在上一节收束时已经进场）。
 * 界面只剩四根金线框 + 角落字幕 + 底部进度发丝 —— 文字铭刻在场景内的
 * 物体上（基座），不浮在画面上当 UI。
 *
 * 画面仍是「预渲染底片 + 实时叠加层」：殿堂与甲士是 lib/assets/frames/ 的
 * webp，液面/光/粒子/盾身充能/弹簧仍由 Canvas 现场画。底片读不到就整段
 * 退回极简程序化绘制并在角标写明 —— 和清单、旁白同一套纪律。
 * 音轨接口不变（lib/score.js：连续声床随 progress 变形 + 事件 + 按压 riser）。
 * 注入协议与另两套完全同构（root id / jts-boot / jts-lock / storage 键 /
 * __JT_STARTUP_API__ / 9 秒 failsafe）。
 * ========================================================================== */
(function () {
  'use strict'

  if (window.__JT_STARTUP_LOADED__) return
  window.__JT_STARTUP_LOADED__ = true

  var ROOT_ID = 'jt-startup-root'
  var TAU = Math.PI * 2
  var STYLE_ID = 'custodes'

  /* ── 默认配置（Host 侧 configForPage 已把 custodes 组扁平化到顶层）─────── */
  var DEFAULTS = {
    enabled: true,
    mode: 'session',
    style: 'custodes',
    speed: 1,
    requireInteraction: true,
    allowSkip: true,
    sound: true,
    soundVolume: 0.5,
    inventory: true,
    voice: true,
    background: true,
    accent: '#c8a24a',
    identity: 'JT-DEVELOPER',
    rank: 'KEEPSAKE',
    cohort: 'FIRST BROTHERHOOD',
    station: 'IMPERIAL PALACE · TERRA',
    cipher: 'JT0001',
    holdSeconds: 2.6
  }

  /* 与 score.js CONTINUOUS_TIMING.custodes 同源（test/smoke.mjs 断言锁死） */
  var TIMING = { vat: 5.2, gate: 1.4, perItem: 0.62, maxOnStage: 12, vigilMin: 2.2, vigilMax: 6.0, outro: 3.4 }

  var OATHS = [
    'THOUGHT THE FIRST WEAPON · 念想是最先的兵刃',
    'VIGILANCE IS THE PRICE OF THE GOLDEN HOUR · 黄金时刻以警醒为价',
    'I STAND SO THAT THE WORK ENDURES · 我站立，所筑才得以长久',
    'FLESH FAILS; THE OATH DOES NOT · 血肉会败，誓约不会'
  ]

  function cfg() {
    var raw = (window.__JT_STARTUP__ && typeof window.__JT_STARTUP__ === 'object') ? window.__JT_STARTUP__ : {}
    var out = {}
    for (var k in DEFAULTS) if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) out[k] = DEFAULTS[k]
    for (var k2 in raw) {
      if (Object.prototype.hasOwnProperty.call(raw, k2) && raw[k2] !== undefined && raw[k2] !== null) out[k2] = raw[k2]
    }
    out.speed = Math.min(3, Math.max(0.35, Number(out.speed) || 1))
    out.identity = String(out.identity || DEFAULTS.identity).slice(0, 48)
    out.rank = String(out.rank || DEFAULTS.rank).slice(0, 48)
    out.cohort = String(out.cohort || DEFAULTS.cohort).slice(0, 48)
    out.station = String(out.station || DEFAULTS.station).slice(0, 64)
    out.cipher = String(out.cipher || out.identity).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
    if (!out.cipher) out.cipher = 'JT0001'
    out.accent = /^#[0-9a-fA-F]{3,8}$/.test(String(out.accent)) ? out.accent : DEFAULTS.accent
    out.holdSeconds = Math.min(5, Math.max(1.2, Number(out.holdSeconds) || DEFAULTS.holdSeconds))
    return out
  }

  var C = cfg()
  var REDUCED = false
  try {
    REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  } catch (e) { /* 无 matchMedia 按常规动效 */ }

  /* 旁白分支状态 */
  var musterThin = false
  var vigilResult = ''        // 'lock' | 'timeout'

  function clamp01(n, lo, hi) {
    if (lo === undefined) lo = 0
    if (hi === undefined) hi = 1
    var v = Number(n)
    return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo
  }
  var lerp = function (a, b, t) { return a + (b - a) * t }
  var smooth = function (n) { n = clamp01(n); return n * n * (3 - 2 * n) }
  var easeOut = function (n) { n = clamp01(n); return 1 - Math.pow(1 - n, 3) }
  var easeInOut = function (n) { n = clamp01(n); return n < 0.5 ? 4 * n * n * n : 1 - Math.pow(-2 * n + 2, 3) / 2 }
  /* 安定：过冲再回落 —— 「落下来」和「滑过来」的区别全在这一下 */
  var easeOutBack = function (n) { n = clamp01(n); var c = 1.70158; return 1 + (c + 1) * Math.pow(n - 1, 3) + c * Math.pow(n - 1, 2) }
  function hashStr(s) {
    var h = 2166136261
    s = String(s || '')
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0 }
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

  /* ── DOM：只有四根金线 + 角落字幕 + 底部发丝 + 跳过 + 无障碍名录 ────────── */
  function el(tag, cls, parent) {
    var n = document.createElement(tag)
    if (cls) n.className = cls
    if (parent) parent.appendChild(n)
    return n
  }
  var root = document.getElementById(ROOT_ID)
  if (!root) {
    root = el('div')
    root.id = ROOT_ID
    root.className = 'jts-root jtg-root'
    document.body.appendChild(root)
  } else if (!root.classList.contains('jtg-root')) {
    root.classList.add('jtg-root')
  }
  if (REDUCED) root.classList.add('jtg-reduced')
  root.style.setProperty('--jtg-speed', String(C.speed))
  root.style.setProperty('--jtg-gold', C.accent)

  root.innerHTML =
    '<canvas class="jtg-canvas" aria-hidden="true"></canvas>' +
    '<div class="jtg-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' +
    '<div class="jtg-letterbox" aria-hidden="true"><i class="jtg-lb-t"></i><i class="jtg-lb-b"></i></div>' +
    '<div class="jtg-cap" role="status"><b class="jtg-capZh"></b><span class="jtg-capEn"></span></div>' +
    '<div class="jtg-count" aria-hidden="true"><b class="jtg-countNow">00</b><span class="jtg-countOf">/ --</span></div>' +
    '<div class="jtg-hold" aria-hidden="true"><b>按住不放 —— 举盾</b><span>HOLD TO RAISE · 松手会落</span></div>' +
    '<div class="jtg-end">' +
      '<div class="jtg-endSeal">✦ 誓约已成 · THE OATH IS SWORN ✦</div>' +
      '<dl class="jtg-endGrid">' +
        '<div><dt>名号</dt><dd class="jtg-fName"></dd></div>' +
        '<div><dt>职阶</dt><dd class="jtg-fRank"></dd></div>' +
        '<div><dt>同袍</dt><dd class="jtg-fCohort"></dd></div>' +
        '<div><dt>守地</dt><dd class="jtg-fStation"></dd></div>' +
        '<div><dt>盾徽</dt><dd class="jtg-fCipher"></dd></div>' +
        '<div><dt>武备</dt><dd class="jtg-fArms"></dd></div>' +
      '</dl>' +
      '<div class="jtg-endOath"></div>' +
    '</div>' +
    '<div class="jtg-list" aria-live="polite"></div>' +
    '<div class="jtg-skip">跳过 SKIP ▸</div>' +
    '<div class="jtg-meter"><i></i></div>'

  var ui = {
    canvas: root.querySelector('.jtg-canvas'),
    cap: root.querySelector('.jtg-cap'),
    capZh: root.querySelector('.jtg-capZh'),
    capEn: root.querySelector('.jtg-capEn'),
    count: root.querySelector('.jtg-count'),
    countNow: root.querySelector('.jtg-countNow'),
    countOf: root.querySelector('.jtg-countOf'),
    hold: root.querySelector('.jtg-hold'),
    end: root.querySelector('.jtg-end'),
    endOath: root.querySelector('.jtg-endOath'),
    list: root.querySelector('.jtg-list'),
    skip: root.querySelector('.jtg-skip'),
    meter: root.querySelector('.jtg-meter i'),
    fName: root.querySelector('.jtg-fName'),
    fRank: root.querySelector('.jtg-fRank'),
    fCohort: root.querySelector('.jtg-fCohort'),
    fStation: root.querySelector('.jtg-fStation'),
    fCipher: root.querySelector('.jtg-fCipher'),
    fArms: root.querySelector('.jtg-fArms')
  }

  /* ── 声音：连续声床 + 事件 + 举盾状态，全部由 lib/score.js 供给 ────────── */
  var audio = (function () {
    var STYLE = 'custodes'
    var ctx = null
    var eng = null
    var begun = false
    var scoreUrl = C.scoreUrl || window.__JT_STARTUP_SCORE_URL__ || '/jt-startup/score.js'

    function ensureEngineSource() {
      if (window.JTSCORE) return
      for (var i = 0; i < document.scripts.length; i++) {
        if ((document.scripts[i].src || '').indexOf('score.js') >= 0) return
      }
      var s = document.createElement('script')
      s.src = scoreUrl
      s.onload = function () { try { fireReady() } catch (e) { /* noop */ } }
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
        if (!ctx) { ctx = new AC(); ensureEngineSource() }
        if (!eng && window.JTSCORE) eng = window.JTSCORE.createEngine(ctx, STYLE)
        if (ctx.state === 'suspended' && typeof ctx.resume === 'function') ctx.resume()
        if (ctx.state !== 'running' || !eng) return null
        return ctx
      } catch (e) { return null }
    }

    var readyCb = function () {}
    function fireReady() { readyCb() }

    /* 旁白：按 progress 阈值或事件触发 */
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
      if (C.speed > (window.JTSCORE && window.JTSCORE.VOICE_MAX_SPEED || 1.5)) return
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
        g.connect(eng.master)
        eng.duck(at, buf.duration)
        src.start(at)
        voiceSrcs.push(src)
      })
    }

    return {
      resume: function () { ac(); readyCb() },
      onReady: function (cb) { readyCb = cb; if (eng) cb() },
      begin: function () {
        var c = ac()
        if (!c || begun) return
        begun = true
        eng.start(c.currentTime, level())
        eng.bedStart(c.currentTime)
      },
      progress: function (p) {
        var c = ac()
        if (c && eng) eng.setProgress(clamp01(p), c.currentTime)
      },
      event: function (name, opts) {
        var c = ac()
        if (c && eng) eng.event(name, opts)
      },
      vigil: function (v) {
        var c = ac()
        if (c && eng) eng.vigil(clamp01(v))
      },
      say: say,
      sayCancel: stopVoice,
      halt: function () {
        stopVoice()
        begun = false
        if (!eng || !ctx) return
        try { eng.fadeOut(ctx.currentTime, 0.12) } catch (e) { /* noop */ }
        setTimeout(function () { try { eng.stopAll() } catch (e) { /* noop */ } }, 220)
      },
      tick: function () {
        var c = ac()
        if (c && eng) eng.primitives.tick(c.currentTime)
      }
    }
  })()

  /* 声卡要等手势：解锁后通知场景补排挂起事件 */
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

  /* ── 画布 ─────────────────────────────────────────────────────────────── */
  var ctx2d = ui.canvas.getContext('2d')
  var W = 0, H = 0, DPR = 1
  function resize() {
    var r = root.getBoundingClientRect()
    DPR = Math.min(2, window.devicePixelRatio || 1)
    W = Math.max(320, Math.round(r.width || window.innerWidth || 960))
    H = Math.max(320, Math.round(r.height || window.innerHeight || 600))
    ui.canvas.width = Math.round(W * DPR)
    ui.canvas.height = Math.round(H * DPR)
    ctx2d.setTransform(DPR, 0, 0, DPR, 0, 0)
    grainTile()
  }

  /* ── 底片：静帧承载画质，程序化层承载运动 ─────────────────────────────── */
  var PLATE_NAMES = ['hall-bg', 'vat-figure', 'storm-shield']
  var plat = {}, platLoaded = false, platMissing = []
  function plateUrls(name) {
    /* 相对深度在宿主注入 / 预览台 / 抓帧台三处都不一样，唯一可靠的锚点是
       runtime 自己的脚本地址 */
    var bases = []
    if (!window.__JT_STARTUP_DEMO__) bases.push('/jt-startup/frames/' + STYLE_ID + '/')
    var s = window.__JT_STARTUP_SCRIPT_URL__
    if (s && String(s).lastIndexOf('/') >= 0) {
      bases.push(String(s).slice(0, String(s).lastIndexOf('/') + 1) + 'assets/frames/' + STYLE_ID + '/')
    }
    bases.push('../lib/assets/frames/' + STYLE_ID + '/', '/lib/assets/frames/' + STYLE_ID + '/')
    var out = []
    for (var i = 0; i < bases.length; i++) out.push(bases[i] + name + '.webp')
    return out
  }
  function loadPlates(then) {
    var left = PLATE_NAMES.length
    if (!left || typeof Image !== 'function') { platLoaded = true; then(); return }
    function done() { if (platLoaded) return; platLoaded = true; then() }
    for (var i = 0; i < PLATE_NAMES.length; i++) {
      (function (name) {
        var urls = plateUrls(name)
        function attempt(ix) {
          if (ix >= urls.length) {
            platMissing.push(name)
            if (!--left) done()
            return
          }
          var im = new Image()
          im.onload = function () {
            plat[name] = { img: im, w: im.naturalWidth || im.width, h: im.naturalHeight || im.height, ok: true }
            if (!--left) done()
          }
          im.onerror = function () { attempt(ix + 1) }
          im.src = urls[ix]
        }
        attempt(0)
      })(PLATE_NAMES[i])
    }
  }
  function hasPlate(name) { return !!(plat[name] && plat[name].ok) }
  var artOk = function () { return hasPlate('hall-bg') && hasPlate('vat-figure') }

  /* ── 相机与图层 ──────────────────────────────────────────────────────────
   * 相机是世界坐标 (0..1) 上的一个点 + zoom；每层一个 depth，
   * 有效缩放 = z^depth，有效平移 ∝ depth —— 远景几乎不动，前景大幅滑动，
   * 这就是 2.5D 视差，抄的是 AE/PS 那套「主体抠层 + 分层速率」。 */
  var cam = { x: 0.5, y: 0.5, z: 1 }
  var camTw = null          // 相机补间
  var shake = 0             // 冲击余震
  function camMove(x, y, z, dur, easeName) {
    camTw = { fx: cam.x, fy: cam.y, fz: cam.z, tx: x, ty: y, tz: z, t: 0, dur: Math.max(0.01, dur), ease: easeName || 'easeInOut' }
  }
  function camTick(dt) {
    if (camTw) {
      camTw.t += dt
      var k = clamp01(camTw.t / camTw.dur)
      var e = camTw.ease === 'easeOut' ? easeOut(k) : camTw.ease === 'smooth' ? smooth(k) : easeInOut(k)
      cam.x = lerp(camTw.fx, camTw.tx, e)
      cam.y = lerp(camTw.fy, camTw.ty, e)
      cam.z = lerp(camTw.fz, camTw.tz, e)
      if (k >= 1) camTw = null
    }
    if (shake > 0.0005) shake *= Math.exp(-5.5 * dt); else shake = 0
  }
  function camZ(depth) { return Math.pow(cam.z, depth) }
  function camXY(wx, wy, depth, t) {
    var sx = shake ? Math.sin(t * 47) * shake * W * 0.012 : 0
    var sy = shake ? Math.cos(t * 39) * shake * H * 0.009 : 0
    return [
      W / 2 + (wx - cam.x) * W * camZ(depth) + sx,
      H / 2 + (wy - cam.y) * H * camZ(depth) + sy
    ]
  }
  /* 满幅背景层 */
  function cover(g, p, depth, t, o) {
    o = o || {}
    var sc = Math.max(W / p.w, H / p.h) * camZ(depth * 0.62)
    var dw = p.w * sc, dh = p.h * sc
    var c = camXY(0.5, 0.5, depth, t)
    g.save()
    if (o.a !== undefined) g.globalAlpha = o.a
    g.drawImage(p.img, c[0] - dw / 2, c[1] - dh / 2, dw, dh)
    g.restore()
  }
  /* 定高主体层：hw = 相机 z=1/depth=1 时的高度（H 的比例），wy 是脚底基线 */
  function blit(g, p, wx, wy, hw, depth, t, o) {
    o = o || {}
    var dh = H * hw * camZ(depth)
    var dw = dh * (p.w / p.h)
    var c = camXY(wx, wy, depth, t)
    var x = c[0] - dw / 2 + (o.dx || 0)
    var y = c[1] - dh * (o.anchorY === undefined ? 1 : o.anchorY) + (o.dy || 0)
    g.save(); g.globalAlpha = o.a === undefined ? 1 : o.a
    if (o.flip) { g.translate(x + dw / 2, 0); g.scale(-1, 1); g.translate(-(x + dw / 2), 0) }
    g.drawImage(p.img, x, y, dw, dh)
    g.restore()
    return { x: x, y: y, w: dw, h: dh, cx: x + dw * 0.55 }
  }
  /* 离屏叠光：只往静帧自己不透明的像素上叠 —— 盾身沿鹰形轮廓亮起只能这么做 */
  var scratch = document.createElement('canvas')
  var sctx = scratch.getContext('2d')
  function layerOp(g, x, y, w, h, drawBase, drawOver) {
    var pw = Math.max(1, Math.ceil(w * DPR)), ph = Math.max(1, Math.ceil(h * DPR))
    if (scratch.width !== pw || scratch.height !== ph) { scratch.width = pw; scratch.height = ph }
    sctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    sctx.clearRect(0, 0, w, h)
    sctx.save(); sctx.translate(-x, -y); drawBase(sctx); sctx.restore()
    sctx.save(); sctx.globalCompositeOperation = 'source-atop'; sctx.translate(-x, -y); drawOver(sctx); sctx.restore()
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0)
    g.drawImage(scratch, x * DPR, y * DPR)
    g.restore()
  }
  function halo(g, x, y, r, col, a) {
    if (r <= 0) return
    var gr = g.createRadialGradient(x, y, 0, x, y, r)
    gr.addColorStop(0, col.replace('%', a)); gr.addColorStop(1, col.replace('%', 0))
    g.fillStyle = gr
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill()
  }
  function wash(g, col) { g.fillStyle = col; g.fillRect(0, 0, W, H) }
  function vignette(g, amt, t) {
    var cx = W * 0.5 + Math.sin(t * 0.11) * W * 0.008
    var vg = g.createRadialGradient(cx, H * 0.46, Math.min(W, H) * 0.24, W * 0.5, H * 0.5, Math.max(W, H) * 0.78)
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,' + amt + ')')
    g.fillStyle = vg; g.fillRect(0, 0, W, H)
  }
  /* 胶片颗粒：预生成一块噪声瓦片，每帧随机错开贴一层 —— 静帧太「干净」会假。
     颗粒纯属装饰，而且 resize() 在模块顶层就调用：这里抛出去就是整段启动失败，
     所以宿主 canvas 少个 API 也只能降级成「没有颗粒」。 */
  var grain = null
  function grainTile() {
    try {
      var c = document.createElement('canvas')
      c.width = c.height = 128
      var cx = c.getContext('2d')
      var im = cx.createImageData(128, 128)
      if (!im || !im.data) { grain = null; return }
      var rnd = prng(0x6A1F)
      for (var i = 0; i < im.data.length; i += 4) {
        var v = 96 + rnd() * 96
        im.data[i] = im.data[i + 1] = im.data[i + 2] = v
        im.data[i + 3] = 255
      }
      cx.putImageData(im, 0, 0)
      grain = c
    } catch (e) { grain = null }
  }
  function grainPass(g, t, a) {
    if (!grain || REDUCED) return
    var ox = (t * 61) % 128, oy = (t * 83) % 128
    g.save()
    g.globalAlpha = a
    g.globalCompositeOperation = 'overlay'
    for (var x = -ox; x < W; x += 128) for (var y = -oy; y < H; y += 128) g.drawImage(grain, x, y)
    g.restore()
  }

  /* ── 粒子：金尘 + 火盆余烬 ─────────────────────────────────────────────── */
  var dust = []
  function seedDust() {
    var rnd = prng(hashStr(C.cipher) ^ 0xA17A)
    var n = REDUCED ? 30 : 80
    dust = []
    for (var i = 0; i < n; i++) {
      dust.push({ x: rnd(), y: rnd(), r: 0.4 + rnd() * 1.5, s: 0.02 + rnd() * 0.1, p: rnd() * TAU, w: 0.25 + rnd() * 0.9 })
    }
  }
  function drawDust(g, t, alpha) {
    g.save()
    for (var i = 0; i < dust.length; i++) {
      var d = dust[i]
      var x = ((d.x + Math.sin(t * d.w + d.p) * 0.02) % 1 + 1) % 1
      var y = (d.y - t * d.s * 0.06) % 1
      if (y < 0) y += 1
      var a = alpha * (0.2 + 0.6 * Math.abs(Math.sin(t * 0.7 + d.p)))
      g.fillStyle = 'rgba(255,214,120,' + a * 0.16 + ')'
      g.beginPath(); g.arc(x * W, y * H, d.r * 1.5, 0, TAU); g.fill()
      g.fillStyle = 'rgba(255,244,214,' + a + ')'
      g.beginPath(); g.arc(x * W, y * H, d.r * 0.62, 0, TAU); g.fill()
    }
    g.restore()
  }
  var embers = []
  function seedEmbers() {
    var rnd = prng(0xE7BE2)
    embers = []
    for (var i = 0; i < (REDUCED ? 8 : 22); i++) {
      embers.push({ x: 0.18 + rnd() * 0.64, y: 0.55 + rnd() * 0.4, s: 0.03 + rnd() * 0.06, p: rnd() * TAU, r: 0.6 + rnd() * 1.4 })
    }
  }
  function drawEmbers(g, t, alpha) {
    g.save()
    for (var i = 0; i < embers.length; i++) {
      var e = embers[i]
      var yy = (e.y - t * e.s * 0.05) % 1
      if (yy < 0) yy += 1
      var xx = e.x + Math.sin(t * 1.3 + e.p) * 0.012
      var a = alpha * (0.35 + 0.5 * Math.abs(Math.sin(t * 1.7 + e.p)))
      g.fillStyle = 'rgba(255,166,60,' + a + ')'
      g.beginPath(); g.arc(xx * W, yy * H, e.r, 0, TAU); g.fill()
    }
    g.restore()
  }
  /* 体积光柱：随时间呼吸 */
  function drawShafts(g, t, amt) {
    g.save()
    for (var j = 0; j < 2; j++) {
      var ox = W * (0.5 + (j ? 0.17 : -0.17) + Math.sin(t * 0.12 + j * 2.1) * 0.02)
      var sg = g.createLinearGradient(ox, H * 0.02, ox + W * 0.1, H * 0.9)
      sg.addColorStop(0, 'rgba(255,214,140,' + 0.085 * amt * (0.7 + 0.3 * Math.sin(t * 0.4 + j)) + ')')
      sg.addColorStop(1, 'rgba(255,190,90,0)')
      g.fillStyle = sg
      g.beginPath()
      g.moveTo(ox - W * 0.02, H * 0.02); g.lineTo(ox + W * 0.03, H * 0.02)
      g.lineTo(ox + W * 0.2, H * 0.94); g.lineTo(ox + W * 0.05, H * 0.94)
      g.closePath(); g.fill()
    }
    g.restore()
  }

  /* ── 弹簧：盾的位置不直接等于压力，它追压力 —— 松手那一弹全靠这个 ────── */
  var spring = { x: 0, v: 0 }
  function springTo(target, dt, stiff, damp) {
    spring.v += (target - spring.x) * stiff * dt
    spring.v *= Math.exp(-damp * dt)
    spring.x += spring.v * dt
    return spring.x
  }

  /* ── 真实清单 ─────────────────────────────────────────────────────────── */
  function fetchInventory() {
    var urls = ['/jt-startup/inventory.json']
    var demo = window.__JT_STARTUP_DEMO__
    if (demo) return Promise.resolve(demo)
    if (!C.inventory) return Promise.resolve(null)
    function attempt(ix) {
      if (ix >= urls.length) return Promise.resolve(null)
      return fetch(urls[ix], { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw 0; return r.json() })
        .then(function (j) { return (j && j.ok) ? j : null })
        .catch(function () { return attempt(ix + 1) })
    }
    return attempt(0)
  }
  function buildRoster(data) {
    var items = []
    if (data && data.skills) {
      for (var i = 0; i < data.skills.length; i++) items.push({ name: data.skills[i].name, kind: 'skill' })
    }
    if (data && data.plugins) {
      for (var j = 0; j < data.plugins.length; j++) {
        var p = data.plugins[j]
        items.push({ name: p.name + (p.version ? ' @' + p.version : ''), kind: p.enabled === false ? 'skipped' : 'plugin' })
      }
    }
    var total = items.length
    var onStage = Math.min(total, TIMING.maxOnStage)
    musterThin = total === 0
    var frag = document.createDocumentFragment()
    for (var k = 0; k < total; k++) {
      var row = el('span', 'jtg-li', frag)
      row.textContent = items[k].name
    }
    ui.list.textContent = ''
    ui.list.appendChild(frag)
    ui.countOf.textContent = total ? '/ ' + String(total).padStart(2, '0') : '/ --'
    return { items: items, total: total, onStage: onStage, overflow: Math.max(0, total - onStage) }
  }

  /* ── 时间线：不是幕，是节拍 —— 边界靠镜头运动跨过去 ────────────────────── */
  var T_AWAKEN = TIMING.vat + TIMING.gate          /* 6.6s 培育 + 开场合并成一节 */
  var roster = { items: [], total: 0, onStage: 0, overflow: 0 }
  var rosterReady = false
  var fetchStarted = 0
  var DATA_WAIT = 2.6
  function musterDur() { return Math.max(0.9, roster.onStage * 0.55) }
  function totalPlanned() {
    if (window.JTSCORE && window.JTSCORE.planContinuous) {
      return window.JTSCORE.planContinuous('custodes', { items: roster.total, vigil: C.holdSeconds, speed: C.speed }).raw
    }
    return (T_AWAKEN + musterDur() + C.holdSeconds + TIMING.outro) * C.speed
  }

  var beat = 'awaken'        // awaken | muster | vigil | sworn | done
  var beatT = 0              // 当前节拍内累计秒（已乘 speed）
  var clockT = 0             // 全片累计秒（已乘 speed）
  var planned = T_AWAKEN + TIMING.vigilMin + TIMING.outro
  var finished = false
  var skipped = false

  function setBeat(name) {
    beat = name
    beatT = 0
    root.className = root.className.replace(/\bjtg-b-\w+/g, '').trim()
    root.classList.add('jtg-b-' + name)
    var zh = { awaken: '苏醒', muster: '集结', vigil: '受任', sworn: '誓约已成' }
    var en = { awaken: 'THE AWAKENING', muster: 'THE MUSTER', vigil: 'THE VIGIL', sworn: 'SWORN' }
    if (zh[name]) {
      ui.capZh.textContent = zh[name]
      ui.capEn.textContent = en[name]
      ui.cap.classList.remove('jtg-capIn')
      void ui.cap.offsetWidth
      ui.cap.classList.add('jtg-capIn')
    }
  }

  /* ── 受任交互状态 ─────────────────────────────────────────────────────── */
  var v = 0                  // 压力 0..1
  var holding = false
  var holdTimer = 0          // 无进展计时（超时判定的唯一依据）
  var slamT = -1             // 砸落时刻（>=0 表示已锁）
  var ignited = 0            // 圣窗点燃度 0..1

  /* ── 节拍绘制 ─────────────────────────────────────────────────────────── */
  function drawAwaken(g, k, t) {
    var fig = plat['vat-figure']
    if (artOk()) {
      cover(g, plat['hall-bg'], 0.3, t)
      wash(g, 'rgba(6,5,5,0.42)')
      drawShafts(g, t, 0.5 + 0.5 * k)
      var sub = blit(g, fig, 0.5, 0.86, 0.6, 0.8, t)
      vatFx(g, sub, k, t)
    } else {
      fallbackAwaken(g, k, t)
    }
    drawDust(g, t, 0.2 + 0.3 * k)
    vignette(g, 0.6, t)
    grainPass(g, t, 0.05)
  }

  /* 培育槽的程序化部分：玻璃缸套住主体层，液面、光扫、名号 */
  function vatFx(g, r, k, t) {
    var vw = Math.max(r.h * 0.62, r.w * 0.9)
    var cx = r.x + r.w * 0.55
    var vy = r.y - r.h * 0.07
    var vh = r.h * 1.14
    var hw = vw / 2
    var body = function (c) {
      c.beginPath()
      c.moveTo(cx - hw, vy + hw * 0.5)
      c.quadraticCurveTo(cx - hw, vy, cx, vy)
      c.quadraticCurveTo(cx + hw, vy, cx + hw, vy + hw * 0.5)
      c.lineTo(cx + hw, vy + vh); c.lineTo(cx - hw, vy + vh)
      c.closePath()
    }
    g.save(); body(g); g.clip()
    var inr = g.createLinearGradient(0, vy, 0, vy + vh)
    inr.addColorStop(0, 'rgba(58,38,12,0.5)'); inr.addColorStop(0.6, 'rgba(14,11,8,0.24)'); inr.addColorStop(1, 'rgba(52,32,10,0.55)')
    g.fillStyle = inr; g.fillRect(cx - hw, vy, vw, vh)
    halo(g, cx, vy + vh * 0.42, vw * 0.9, 'rgba(255,190,90,%)', 0.08 + 0.1 * k)
    /* 液面下降 */
    var level = vy + vh * (0.12 + 0.8 * clamp01(1 - k * 1.05))
    g.beginPath()
    g.moveTo(cx - hw, vy + vh); g.lineTo(cx - hw, level)
    for (var x = -hw; x <= hw; x += 5) g.lineTo(cx + x, level + Math.sin(x * 0.05 + t * 1.9) * 2.2)
    g.lineTo(cx + hw, vy + vh); g.closePath()
    var lg = g.createLinearGradient(0, level, 0, vy + vh)
    lg.addColorStop(0, 'rgba(255,226,152,0.17)'); lg.addColorStop(0.4, 'rgba(186,132,44,0.09)'); lg.addColorStop(1, 'rgba(70,44,12,0.05)')
    g.fillStyle = lg; g.fill()
    g.strokeStyle = 'rgba(255,240,196,0.62)'; g.lineWidth = 1.6
    g.beginPath()
    for (x = -hw; x <= hw; x += 5) {
      var yy = level + Math.sin(x * 0.05 + t * 1.9) * 2.2
      if (x === -hw) g.moveTo(cx + x, yy); else g.lineTo(cx + x, yy)
    }
    g.stroke()
    /* 气泡 */
    var rnd = prng(0xB0B)
    for (var b = 0; b < 14; b++) {
      var bx = cx + (rnd() - 0.5) * vw * 0.76
      var bp = (rnd() + t * (0.06 + rnd() * 0.1)) % 1
      var by = vy + vh - bp * (vy + vh - level)
      if (by < level) continue
      g.strokeStyle = 'rgba(255,240,200,' + (0.1 + 0.22 * bp) + ')'; g.lineWidth = 1
      g.beginPath(); g.arc(bx, by, 1 + rnd() * 2.6, 0, TAU); g.stroke()
    }
    /* 光扫：斜向高光带随 k 上爬（渐变必须在旋转后的局部坐标建） */
    var swy = vy + vh * (1.05 - k * 1.1)
    var band = vh * 0.13
    g.save()
    g.translate(cx, swy); g.rotate(-0.3)
    var sg = g.createLinearGradient(0, -band, 0, band)
    sg.addColorStop(0, 'rgba(255,236,180,0)'); sg.addColorStop(0.5, 'rgba(255,236,180,0.15)'); sg.addColorStop(1, 'rgba(255,236,180,0)')
    g.fillStyle = sg
    g.fillRect(-hw * 1.4, -band, hw * 2.8, band * 2)
    g.restore()
    g.restore()
    /* 玻璃：极淡竖向色偏 + 两道长高光 + 描边 */
    g.save(); body(g)
    var tg2 = g.createLinearGradient(cx - hw, 0, cx + hw, 0)
    tg2.addColorStop(0, 'rgba(255,250,240,0.14)'); tg2.addColorStop(0.16, 'rgba(210,228,240,0.03)')
    tg2.addColorStop(0.55, 'rgba(255,255,255,0)'); tg2.addColorStop(0.88, 'rgba(210,228,240,0.05)')
    tg2.addColorStop(1, 'rgba(255,250,240,0.17)')
    g.fillStyle = tg2; g.fill()
    g.strokeStyle = 'rgba(228,190,110,' + (0.4 + 0.3 * k) + ')'; g.lineWidth = 2.4; g.stroke()
    g.save(); body(g); g.clip()
    g.fillStyle = 'rgba(255,252,244,0.1)'
    g.fillRect(cx - hw * 0.78, vy, hw * 0.1, vh)
    g.fillStyle = 'rgba(255,252,244,0.06)'
    g.fillRect(cx + hw * 0.62, vy, hw * 0.055, vh)
    g.restore()
    g.restore()
    /* 金属箍：圆柱正视，前缘一律向下弯 */
    var th = Math.max(7, vh * 0.022)
    for (var hd = 0; hd < 2; hd++) {
      var hy = vy + vh * (hd ? 0.985 : 0.055)
      var rr = hw + 6, drop = rr * 0.17
      g.beginPath()
      g.moveTo(cx - rr, hy)
      g.quadraticCurveTo(cx, hy + drop, cx + rr, hy)
      g.lineTo(cx + rr, hy - th)
      g.quadraticCurveTo(cx, hy - th + drop, cx - rr, hy - th)
      g.closePath()
      var rg = g.createLinearGradient(0, hy - th, 0, hy + drop)
      rg.addColorStop(0, '#3a2a16'); rg.addColorStop(0.5, '#6d5330'); rg.addColorStop(1, '#241a0f')
      g.fillStyle = rg; g.fill()
      g.strokeStyle = 'rgba(214,178,96,0.5)'; g.lineWidth = 1.4; g.stroke()
    }
    /* 石台 + 阴刻名号：文字刻在场景里的物体上，不浮在画面上当 UI */
    var py2 = vy + vh, ph = H * 0.058, pw = vw * 1.1
    g.beginPath()
    g.moveTo(cx - pw / 2, py2); g.lineTo(cx + pw / 2, py2)
    g.lineTo(cx + pw * 0.44, py2 + ph); g.lineTo(cx - pw * 0.44, py2 + ph); g.closePath()
    var pg = g.createLinearGradient(0, py2, 0, py2 + ph)
    pg.addColorStop(0, '#2c2a28'); pg.addColorStop(1, '#0e0d0c')
    g.fillStyle = pg; g.fill()
    g.strokeStyle = 'rgba(0,0,0,0.8)'; g.lineWidth = 1.5; g.stroke()
    g.strokeStyle = 'rgba(214,176,86,0.3)'; g.lineWidth = 1
    g.beginPath(); g.moveTo(cx - pw * 0.46, py2 + ph * 0.24); g.lineTo(cx + pw * 0.46, py2 + ph * 0.24); g.stroke()
    var shown = String(C.identity).slice(0, Math.ceil(String(C.identity).length * clamp01((k - 0.5) / 0.4)))
    if (shown) {
      g.font = '600 ' + Math.round(H * 0.022) + 'px ui-monospace, Menlo, Consolas, monospace'
      g.textAlign = 'center'; g.textBaseline = 'middle'
      var sp = shown.split('').join('   ')
      g.fillStyle = 'rgba(0,0,0,0.95)'; g.fillText(sp, cx, py2 + ph * 0.64)
      g.fillStyle = 'rgba(126,106,68,0.95)'; g.fillText(sp, cx, py2 + ph * 0.6)
      g.fillStyle = 'rgba(244,236,218,0.5)'; g.fillText(sp, cx, py2 + ph * 0.585)
    }
    /* 睁眼闪光（事件只发一次） */
    var eyes = clamp01((k - 0.78) / 0.16)
    if (eyes > 0 && !firedEyes) {
      firedEyes = true
      audio.event('eyes')
    }
    if (eyes > 0) {
      var ey = r.y + r.h * (1 - 0.855)
      g.save()
      g.fillStyle = 'rgba(255,120,70,' + (0.4 + 0.6 * eyes) + ')'
      g.shadowColor = 'rgba(255,120,60,0.95)'; g.shadowBlur = 26 * eyes
      g.beginPath(); g.ellipse(cx - 0.043 * r.h, ey, 0.015 * r.h, 0.01 * r.h, 0, 0, TAU); g.fill()
      g.beginPath(); g.ellipse(cx + 0.043 * r.h, ey, 0.015 * r.h, 0.01 * r.h, 0, 0, TAU); g.fill()
      g.restore()
      halo(g, cx, ey, r.h * 0.3, 'rgba(255,110,50,%)', 0.22 * eyes)
    }
  }
  var firedEyes = false

  function drawMuster(g, k, t) {
    var fig = plat['vat-figure']
    if (artOk()) {
      cover(g, plat['hall-bg'], 0.3, t)
      wash(g, 'rgba(6,5,5,0.38)')
      drawShafts(g, t, 0.9)
      /* 转场连续：镜头离开时培育槽在原地淡出，不是凭空消失 */
      if (k < 0.14) {
        var out = 1 - k / 0.14
        blit(g, fig, 0.5, 0.86, 0.6, 0.8, t, { a: out })
      }
      /* 队列：按纵深错开，近大远小；每个落位有预备-发力-安定（easeOutBack） */
      var slots = roster.onStage
      var line = 0.92
      for (var i = 0; i < slots; i++) {
        var sched = (i + 0.6) / Math.max(1, slots)
        var kk = clamp01((k - sched * 0.86) / 0.1)
        if (kk <= 0) continue
        var land = easeOutBack(kk)
        var dep = 0.56 + (i % 3) * 0.075
        var wx = 0.26 + (i / Math.max(1, slots - 1)) * 0.5
        var hgt = 0.24 + dep * 0.22
        var dy = (1 - Math.min(1, kk * 1.4)) * H * 0.05
        var flash = clamp01((kk - 0.75) / 0.2)
        var r = blit(g, fig, wx, line + (i % 3) * 0.02, hgt, dep, t, {
          a: 0.45 + 0.55 * clamp01(kk * 1.6),
          flip: i % 2 === 1,
          dy: -dy * land * 0.4
        })
        halo(g, r.x + r.w * 0.55, line * H, r.h * 0.32, 'rgba(0,0,0,%)', 0.5 * Math.min(1, kk * 2))
        if (flash < 1) {
          halo(g, r.x + r.w * 0.55, r.y + r.h * 0.42, r.h * (0.3 + 0.5 * (1 - flash)), 'rgba(255,210,130,%)', 0.4 * (1 - flash))
        }
      }
      if (roster.overflow > 0 && k > 0.9) {
        g.save()
        g.globalAlpha = clamp01((k - 0.9) / 0.1)
        g.fillStyle = 'rgba(214,176,86,0.9)'
        g.font = '600 ' + Math.round(H * 0.024) + 'px ui-monospace, Menlo, Consolas, monospace'
        g.textAlign = 'center'
        g.fillText('+' + roster.overflow, W * 0.86, line * H + H * 0.03)
        g.restore()
      }
    } else {
      fallbackMuster(g, k, t)
    }
    drawEmbers(g, t, 0.5)
    drawDust(g, t, 0.26)
    vignette(g, 0.55, t)
    grainPass(g, t, 0.045)
  }

  /* 受任：盾的位置 = 弹簧追压力；点燃分三档；满值砸落 */
  function drawVigil(g, t) {
    var fig = plat['vat-figure']
    var sp = plat['storm-shield']
    var sy = springTo(v, lastDt, 26, 6.5)
    if (artOk() && sp && sp.ok) {
      cover(g, plat['hall-bg'], 0.3, t)
      wash(g, 'rgba(' + Math.round(6 + ignited * 20) + ',' + Math.round(5 + ignited * 8) + ',' + Math.round(4 + ignited * 2) + ',' + (0.4 - ignited * 0.1) + ')')
      drawShafts(g, t, 0.6 + ignited * 1.6)
      var sub = blit(g, fig, 0.5, 0.98, 0.78, 0.8, t)
      /* 盾：基线在脚下，升起由弹簧驱动，举的时候有战栗 */
      var shH = H * (0.42 + 0.1 * ignited)
      var shW = shH * (sp.w / sp.h)
      var wob = holding && slamT < 0 ? Math.sin(t * 13) * v * 2.2 : 0
      var shieldBottom = H * (1.18 - 0.62 * sy)
      var rx = sub.cx - shW / 2 + wob
      var ry = shieldBottom - shH
      halo(g, sub.cx, ry + shH * 0.5, shW * (0.9 + 0.6 * v), 'rgba(255,206,120,%)', 0.05 + 0.34 * v + Math.max(0, slamT) * 0.2)
      layerOp(g, rx, ry, shW, shH,
        function (c) { c.drawImage(sp.img, rx, ry, shW, shH) },
        function (c) {
          /* 一档：翼缘自下而上亮 */
          var gy = ry + shH * (1 - clamp01(v))
          var gr = c.createLinearGradient(0, gy, 0, ry + shH)
          gr.addColorStop(0, 'rgba(255,224,150,0)')
          gr.addColorStop(1, 'rgba(255,224,150,' + (0.18 + 0.4 * v) + ')')
          c.fillStyle = gr; c.fillRect(rx, gy, shW, shH + 2)
          c.fillStyle = 'rgba(255,246,214,' + 0.5 * v + ')'
          c.fillRect(rx, gy, shW, Math.max(1.5, shH * 0.008))
        })
      /* 二档：宝徽 */
      var gyy = ry + shH * 0.36
      halo(g, sub.cx, gyy, shW * 0.16 * (0.6 + v), 'rgba(150,205,255,%)', v > 0.66 ? 0.12 + 0.6 * (v - 0.66) / 0.34 : 0.08 * v)
      /* 三档：满值偏导场 */
      if (v > 0.72) {
        var fa = (v - 0.72) / 0.28
        g.save(); g.globalAlpha = fa * 0.42
        g.strokeStyle = 'rgba(255,226,160,0.55)'; g.lineWidth = 1.1
        var cell = shW * 0.11
        for (var rr2 = -4; rr2 <= 4; rr2++) for (var c2 = -4; c2 <= 4; c2++) {
          var hx = sub.cx + rr2 * cell * 1.5 + (c2 % 2) * cell * 0.75
          var hy2 = ry + shH * 0.5 + c2 * cell * 1.3
          if (Math.abs(hx - sub.cx) > shW * 0.5 || hy2 > ry + shH || hy2 < ry) continue
          g.beginPath()
          for (var s2 = 0; s2 < 6; s2++) {
            var an = s2 * TAU / 6
            var px2 = hx + Math.cos(an) * cell * 0.5, py2 = hy + Math.sin(an) * cell * 0.5
            if (s2 === 0) g.moveTo(px2, py2); else g.lineTo(px2, py2)
          }
          g.closePath(); g.stroke()
        }
        g.restore()
      }
      /* 砸落冲击环 + 白闪 */
      if (slamT >= 0) {
        var st2 = clamp01((t - slamT) / 0.7)
        if (st2 < 1) {
          g.save(); g.globalAlpha = 1 - st2
          g.strokeStyle = 'rgba(236,230,214,0.9)'; g.lineWidth = 2 + 10 * st2
          g.beginPath(); g.arc(sub.cx, ry + shH * 0.45, shW * (0.6 + 2.2 * st2), 0, TAU); g.stroke()
          g.restore()
          wash(g, 'rgba(255,244,214,' + (1 - st2) * 0.4 + ')')
        }
      }
    } else {
      fallbackVigil(g, t, sy)
    }
    drawEmbers(g, t, 0.5 + v * 0.5)
    drawDust(g, t, 0.2 + 0.35 * v)
    vignette(g, 0.62, t)
    grainPass(g, t, 0.05)
  }

  function drawSworn(g, k, t) {
    var sp = plat['storm-shield']
    if (artOk() && sp && sp.ok) {
      cover(g, plat['hall-bg'], 0.3, t)
      wash(g, 'rgba(5,4,4,0.55)')
      drawShafts(g, t, 1.4)
      var a = easeOut(clamp01(k * 1.5))
      halo(g, W * 0.5, H * 0.44, Math.min(W, H) * (0.3 + 0.3 * a), 'rgba(255,200,110,%)', 0.1 + 0.16 * a)
      var shH = H * (0.34 + 0.3 * a)
      var shW = shH * (sp.w / sp.h)
      var rx = W * 0.5 - shW / 2
      var ry = H * 0.62 - shH
      g.save(); g.globalAlpha = a
      layerOp(g, rx, ry, shW, shH,
        function (c) { c.drawImage(sp.img, rx, ry, shW, shH) },
        function (c) {
          var gr = c.createLinearGradient(0, ry + shH, 0, ry)
          gr.addColorStop(0, 'rgba(255,226,150,0)'); gr.addColorStop(1, 'rgba(255,226,150,' + 0.14 * a + ')')
          c.fillStyle = gr; c.fillRect(rx, ry, shW, shH)
        })
      g.restore()
      halo(g, W * 0.5, ry + shH * 0.36, shW * 0.14, 'rgba(150,205,255,%)', 0.24 * a)
    } else {
      fallbackSworn(g, k, t)
    }
    drawDust(g, t, 0.3)
    vignette(g, 0.66, t)
    grainPass(g, t, 0.05)
  }

  /* ── 极简程序化兜底：底片缺失时仍是同一条时间线与交互，
        只是画面退成剪影 + 渐变，并在角标写明（和清单/旁白同一套纪律）── */
  function fallbackBase(g, t) {
    var bg = g.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#070606'); bg.addColorStop(0.5, '#0b0a09'); bg.addColorStop(1, '#16110a')
    g.fillStyle = bg; g.fillRect(0, 0, W, H)
    g.strokeStyle = 'rgba(150,116,54,0.16)'
    for (var i = 1; i <= 4; i++) {
      var w = W * (0.2 + i * 0.11), h = H * (0.44 + i * 0.12)
      g.lineWidth = Math.max(1, W * 0.003)
      g.beginPath()
      g.moveTo(W / 2 - w / 2, H * 0.96)
      g.lineTo(W / 2 - w / 2, H * 0.96 - h * 0.55)
      g.quadraticCurveTo(W / 2 - w / 2, H * 0.96 - h * 0.92, W / 2, H * 0.96 - h)
      g.quadraticCurveTo(W / 2 + w / 2, H * 0.96 - h * 0.92, W / 2 + w / 2, H * 0.96 - h * 0.55)
      g.lineTo(W / 2 + w / 2, H * 0.96)
      g.stroke()
    }
    halo(g, W / 2, H * 0.3, W * 0.3, 'rgba(150,22,34,%)', 0.12)
  }
  function fallbackFigure(g, wx, wy, hw, depth, t, o) {
    o = o || {}
    var c = camXY(wx, wy, depth, t)
    var dh = H * hw * camZ(depth)
    var dw = dh * 0.5
    var x = c[0], y = c[1]
    g.save(); g.globalAlpha = o.a === undefined ? 1 : o.a
    var grd = g.createLinearGradient(x, y - dh, x, y)
    grd.addColorStop(0, '#e6bf66'); grd.addColorStop(0.5, '#a8792a'); grd.addColorStop(1, '#24170a')
    g.fillStyle = grd
    /* 剪影：盔 + 肩 + 躯干 + 裙 */
    g.beginPath()
    g.arc(x, y - dh * 0.9, dw * 0.1, 0, TAU); g.fill()
    g.beginPath(); g.ellipse(x - dw * 0.26, y - dh * 0.74, dw * 0.18, dw * 0.15, 0, 0, TAU); g.fill()
    g.beginPath(); g.ellipse(x + dw * 0.26, y - dh * 0.74, dw * 0.18, dw * 0.15, 0, 0, TAU); g.fill()
    g.beginPath()
    g.moveTo(x - dw * 0.3, y - dh * 0.78); g.lineTo(x + dw * 0.3, y - dh * 0.78)
    g.lineTo(x + dw * 0.2, y - dh * 0.3); g.lineTo(x - dw * 0.2, y - dh * 0.3)
    g.closePath(); g.fill()
    g.beginPath()
    g.moveTo(x - dw * 0.2, y - dh * 0.3); g.lineTo(x + dw * 0.2, y - dh * 0.3)
    g.lineTo(x + dw * 0.16, y); g.lineTo(x - dw * 0.16, y)
    g.closePath(); g.fill()
    g.fillStyle = 'rgba(255,70,50,0.8)'
    g.fillRect(x - dw * 0.055, y - dh * 0.92, dw * 0.035, dh * 0.012)
    g.fillRect(x + dw * 0.02, y - dh * 0.92, dw * 0.035, dh * 0.012)
    g.restore()
    return { x: x - dw / 2, y: y - dh, w: dw, h: dh, cx: x }
  }
  function fallbackAwaken(g, k, t) {
    fallbackBase(g, t)
    var r = fallbackFigure(g, 0.5, 0.86, 0.6, 0.8, t, { a: 0.5 + 0.5 * k })
    vatFx(g, { x: r.x, y: r.y, w: r.w, h: r.h }, k, t)
  }
  function fallbackMuster(g, k, t) {
    fallbackBase(g, t)
    var slots = roster.onStage
    for (var i = 0; i < slots; i++) {
      var sched = (i + 0.6) / Math.max(1, slots)
      var kk = clamp01((k - sched * 0.86) / 0.1)
      if (kk <= 0) continue
      var dep = 0.56 + (i % 3) * 0.075
      var wx = 0.2 + (i / Math.max(1, slots - 1)) * 0.6
      fallbackFigure(g, wx, 0.92 + (i % 3) * 0.02, 0.24 + dep * 0.22, dep, t, { a: 0.3 + 0.6 * kk })
    }
  }
  function fallbackVigil(g, t, sy) {
    fallbackBase(g, t)
    fallbackFigure(g, 0.5, 0.98, 0.78, 0.8, t, { a: 0.9 })
    var shH = H * 0.44
    var shW = shH * 0.66
    var bottom = H * (1.18 - 0.62 * sy)
    g.save()
    var sg = g.createLinearGradient(0, bottom - shH, 0, bottom)
    sg.addColorStop(0, 'rgba(230,191,102,0.95)'); sg.addColorStop(1, 'rgba(36,23,10,0.98)')
    g.fillStyle = sg
    g.beginPath()
    g.moveTo(W / 2 - shW / 2, bottom - shH)
    g.lineTo(W / 2 + shW / 2, bottom - shH)
    g.lineTo(W / 2 + shW / 2, bottom - shH * 0.4)
    g.quadraticCurveTo(W / 2, bottom, W / 2 - shW / 2, bottom - shH * 0.4)
    g.closePath(); g.fill()
    g.strokeStyle = 'rgba(255,226,150,' + (0.4 + 0.5 * v) + ')'; g.lineWidth = 2; g.stroke()
    g.restore()
    halo(g, W / 2, bottom - shH * 0.5, shW, 'rgba(255,206,120,%)', 0.1 + 0.4 * v)
  }
  function fallbackSworn(g, k, t) {
    fallbackBase(g, t)
    var a = easeOut(clamp01(k * 1.5))
    g.save(); g.globalAlpha = a
    g.fillStyle = 'rgba(214,176,86,0.9)'
    g.font = '600 ' + Math.round(H * 0.05) + 'px Georgia, "Times New Roman", serif'
    g.textAlign = 'center'
    g.fillText('✦', W / 2, H * 0.34)
    g.restore()
    halo(g, W / 2, H * 0.4, Math.min(W, H) * 0.5, 'rgba(255,200,110,%)', 0.12 * a)
  }

  /* ── 节拍推进 ─────────────────────────────────────────────────────────── */
  var musterLanded = -1
  function advanceTick(dt) {
    if (beat === 'awaken') {
      /* 名录没到手且还在等：镜头停在末尾漂移，不超 DATA_WAIT 不放行 */
      if (beatT >= T_AWAKEN && (rosterReady || clockT - fetchStarted >= DATA_WAIT)) {
        if (!rosterReady) musterThin = true
        planned = totalPlanned()
        setBeat('muster')
        camMove(0.36, 0.52, 1.22, Math.max(0.9, musterDur() * 0.8), 'easeInOut')
        audio.event('gate')
      }
      return
    }
    if (beat === 'muster') {
      var k = clamp01(beatT / Math.max(0.001, musterDur()))
      var idx = Math.min(roster.onStage, Math.floor(k * roster.onStage))
      if (idx > musterLanded) {
        for (var i = musterLanded + 1; i <= idx; i++) {
          if (i > 0) {
            audio.event('step', { pan: roster.onStage <= 1 ? 0 : -0.55 + 1.1 * (i - 1) / (roster.onStage - 1) })
            ui.countNow.textContent = String(i).padStart(2, '0')
          }
        }
        musterLanded = idx
      }
      if (k >= 1) {
        setBeat('vigil')
        camMove(0.5, 0.58, 1.32, 1.4, 'easeOut')
        audio.event('musterDone')
        if (C.requireInteraction && !REDUCED) {
          ui.hold.classList.add('jtg-holdIn')
        } else {
          holding = true   /* 关闭交互/减弱动效 = 自动举盾 */
        }
      }
      return
    }
    if (beat === 'sworn') {
      if (beatT >= TIMING.outro) finish()
    }
  }

  function vigilTick(dt) {
    var before = v
    if (holding && slamT < 0) {
      /* 渐近阻力：越接近满值越举不动 —— 「沉」是手感，不是动画时长 */
      v = Math.min(1, v + (dt / Math.max(0.4, C.holdSeconds)) * (1 - v * 0.55) * 1.6)
    } else if (slamT < 0) {
      v = Math.max(0, v - dt * 0.9)
    }
    if (v > before) holdTimer = 0
    else if (slamT < 0) holdTimer += dt
    if (slamT < 0 && v >= 1) {
      slamT = clockT
      vigilResult = 'lock'
      shake = 1
      ignited = 1
      audio.event('lock')
      audio.say('oath')
      ui.hold.classList.remove('jtg-holdIn')
      setBeat('sworn')
      camMove(0.5, 0.46, 1.0, 0.5, 'easeOut')
      swornIn()
    } else if (slamT < 0 && holdTimer >= TIMING.vigilMax) {
      vigilResult = 'timeout'
      audio.event('reject')
      audio.say('unwatched')
      ui.hold.classList.remove('jtg-holdIn')
      setBeat('sworn')
      camMove(0.5, 0.46, 1.0, 0.5, 'easeOut')
      swornIn()
    }
    audio.vigil(v)
  }
  function swornIn() {
    ui.fName.textContent = C.identity
    ui.fRank.textContent = C.rank
    ui.fCohort.textContent = C.cohort
    ui.fStation.textContent = C.station
    ui.fCipher.textContent = C.cipher
    ui.fArms.textContent = (roster.total ? String(roster.total) : '--') + ' 件'
    ui.endOath.textContent = OATHS[hashStr(C.cipher) % OATHS.length]
    setTimeout(function () { ui.end.classList.add('jtg-endIn') }, Math.round(700 / C.speed))
  }

  /* ── 交互：按住 ───────────────────────────────────────────────────────── */
  function pressOn(e) {
    if (beat !== 'vigil' || finished || slamT >= 0) return
    if (e && e.target && e.target.closest && e.target.closest('.jtg-skip')) return
    holding = true
    root.classList.add('jtg-pressing')
    if (REDUCED) { v = 1 }   /* 减弱动效：点一下即可 */
  }
  function pressOff() {
    if (!holding) return
    holding = false
    root.classList.remove('jtg-pressing')
  }
  root.addEventListener('pointerdown', function (e) { pressOn(e); if (beat === 'vigil' && e.preventDefault) e.preventDefault() })
  root.addEventListener('pointerup', pressOff)
  root.addEventListener('pointercancel', pressOff)
  root.addEventListener('pointerleave', pressOff)
  window.addEventListener('blur', pressOff)
  document.addEventListener('keydown', function (e) {
    if (beat !== 'vigil') return
    if (e.key === ' ' || e.key === 'Spacebar') {
      if (e.repeat) return
      e.preventDefault()
      pressOn()
    }
  })
  document.addEventListener('keyup', function (e) {
    if (e.key === ' ' || e.key === 'Spacebar') pressOff()
  })

  /* ── 旁白 ─────────────────────────────────────────────────────────────── */
  var narrFired = {}
  function sayNarr(file) {
    if (narrFired[file]) return
    narrFired[file] = 1
    audio.say(file)
  }
  function narrationTick(p) {
    var list = (window.JTSCORE && window.JTSCORE.NARRATION.custodes) || []
    for (var i = 0; i < list.length; i++) {
      var q = list[i]
      if (q.on) continue
      if (p < q.p) continue
      if (q.variant === 'unavailable' && !musterThin) continue
      if (q.variant === 'lock' || q.variant === 'timeout') continue
      if (q.file === 'muster' && musterThin) continue
      if (q.file === 'muster-thin' && !musterThin) continue
      sayNarr(q.file)
    }
  }

  /* ── 主循环：状态推进与绘制分离（后台标签不锁死，与契约同纪律）────────── */
  var clockLast = 0
  var logicTimer = 0
  function consume() {
    var now = (window.performance && window.performance.now) ? window.performance.now() : Date.now()
    if (!clockLast) { clockLast = now; return 0 }
    var d = Math.min(1, (now - clockLast) / 1000)
    clockLast = now
    return d
  }
  function progressNow() {
    var p = clamp01(clockT / Math.max(0.001, planned))
    if (beat === 'vigil' || beat === 'sworn') p = Math.max(p, 0.55 + 0.42 * v)
    return p
  }
  var lastDt = 0
  function tick(realDt) {
    if (finished || realDt <= 0) return
    var dt = REDUCED ? realDt : realDt * C.speed
    lastDt = dt
    beatT += dt
    clockT += dt
    planned = totalPlanned()
    camTick(dt)
    if (beat === 'vigil') vigilTick(dt)
    advanceTick(dt)
    var p = progressNow()
    audio.progress(p)
    narrationTick(p)
    ui.meter.style.transform = 'scaleX(' + p.toFixed(4) + ')'
    /* 压力挂成 CSS 变量：界面上不显示任何百分比（v1 那块读数被删了），
       但交互的核心状态必须有地方能读到 —— 否则「松手回落」这种关键行为
       在测试台里根本无从断言，等于没有回归保护。 */
    root.style.setProperty('--jtg-v', v.toFixed(3))
  }

  function paint() {
    var t = clockT
    ctx2d.clearRect(0, 0, W, H)
    if (beat === 'awaken') drawAwaken(ctx2d, clamp01(beatT / T_AWAKEN), t)
    else if (beat === 'muster') drawMuster(ctx2d, clamp01(beatT / Math.max(0.001, musterDur())), t)
    else if (beat === 'vigil') drawVigil(ctx2d, t)
    else drawSworn(ctx2d, clamp01(beatT / TIMING.outro), t)
  }

  var raf = 0
  function frame() {
    raf = requestAnimationFrame(frame)
    tick(consume())
    if (!finished) paint()
  }
  function startLoops() {
    clockLast = 0
    raf = requestAnimationFrame(frame)
    logicTimer = setInterval(function () {
      if (!document.hidden) return
      tick(consume())
    }, 250)
  }
  function releaseTimers() {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    if (logicTimer) clearInterval(logicTimer)
    logicTimer = 0
  }

  function finish() {
    if (finished) return
    finished = true
    releaseTimers()
    audio.halt()
    try {
      if (C.mode === 'session') window.sessionStorage.setItem('jt-startup:shown', '1')
      if (C.mode === 'daily') window.localStorage.setItem('jt-startup:day', new Date().toISOString().slice(0, 10))
    } catch (e) { /* 隐私模式忽略 */ }
    document.documentElement.classList.remove('jts-lock')
    document.documentElement.style.overflow = ''
    if (document.body) document.body.style.overflow = ''
    root.classList.remove('jts-boot')
    root.classList.add('jts-gone')
    setTimeout(function () {
      if (root && root.parentNode) root.parentNode.removeChild(root)
      try { window.dispatchEvent(new CustomEvent('jt-startup:done')) } catch (e) { /* noop */ }
    }, Math.round(900 / C.speed))
  }

  function requestSkip() {
    if (skipped || finished) return
    skipped = true
    finish()
  }

  if (C.allowSkip && ui.skip) {
    ui.skip.hidden = false
    ui.skip.addEventListener('click', function (e) { e.stopPropagation(); requestSkip() })
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') requestSkip() })
  } else if (ui.skip) {
    ui.skip.hidden = true
  }

  window.__JT_STARTUP_API__ = {
    replay: injectSelf,
    skip: requestSkip,
    finish: finish,
    config: C
  }

  function injectSelf() {
    audio.halt()
    window.__JT_STARTUP_LOADED__ = false
    var old = document.getElementById(ROOT_ID)
    if (old && old.parentNode) old.parentNode.removeChild(old)
    window.__JT_STARTUP_SKIP__ = false
    var s = document.createElement('script')
    s.src = window.__JT_STARTUP_SCRIPT_URL__ || '/jt-startup/custodes.js'
    document.head.appendChild(s)
  }

  /* ── 起 ───────────────────────────────────────────────────────────────── */
  function wake() {
    resize()
    seedDust()
    seedEmbers()
    /* 底片异步读，第一节就是培育槽：不等会闪一帧剪影再跳成静帧，死等会卡屏。
       最多等 900ms 就开演（退回剪影兜底）。定时器必须先于加载挂。 */
    var booted = false
    function go() {
      if (booted) return
      booted = true
      cam.z = 2.4          /* 开场：液面特写 */
      cam.y = 0.46
      camMove(0.5, 0.5, 1.02, T_AWAKEN * 0.96, 'easeOut')
      setBeat('awaken')
      audio.onReady(function () { audio.begin() })
      fetchStarted = clockT
      fetchInventory().then(function (data) {
        roster = buildRoster(data)
        rosterReady = true
        planned = totalPlanned()
      }).catch(function () {
        musterThin = true
        rosterReady = true
      })
      if (!artOk()) {
        root.classList.add('jtg-noart')
        if (ui.capEn) ui.capEn.textContent = 'PROCEDURAL FALLBACK · 底片缺失'
      }
      startLoops()
    }
    setTimeout(go, 900)
    try { loadPlates(go) } catch (e) { go() }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { resize() }).catch(function () { /* noop */ })
    }
  }

  document.documentElement.classList.add('jts-lock')
  document.documentElement.style.overflow = 'hidden'
  if (document.body) document.body.style.overflow = 'hidden'
  resize()
  wake()
  /* 运行时已接管：摘掉兜底类（与另两套同协议，不摘会在第 9 秒被强拆） */
  root.classList.remove('jts-boot')
})()
