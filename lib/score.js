/* JTSCORE —— 两套启动动画共用的音轨引擎（极兔干线 / 战锤40K）。
 *
 * 为什么单独一个文件而不是内联进 splash.js / w40k.js：引擎 + 谱表 + 旁白 cue 只该有一份，
 * 运行时播放、离线预览、audio-lab/render.html 的 OfflineAudioContext 渲染都读这里 ——
 * 审听到的 wav 就是运行时播的那份代码，不存在两份实现漂移。
 *
 * 语法纪律：与 runtime 一致，严格 ES5（无箭头、无 ?? / ?.、无模板串）。
 *
 * 编排纪律：cue 的 at / dur 都是「该幕时长的比例」，绝对秒数由调用方传入的 window 推导。
 * 所以 speed、prefers-reduced-motion、确认节点的实际等待时长都会带着音乐一起变速，
 * 音高不变、节拍不跑偏 —— 这是此前「音效硬编码绝对秒数、2× 速度下音慢画面 3 秒」的根因修复。
 */
;(function (global) {
  'use strict'

  function dv (v, d) { return v == null ? d : v }

  /* ── 音源：噪声缓存与混响 IR 全部程序生成，不随包带音频素材 ───────────── */
  function makeNoise (ctx, seconds) {
    var len = Math.floor(ctx.sampleRate * seconds)
    var buf = ctx.createBuffer(1, len, ctx.sampleRate)
    var d = buf.getChannelData(0)
    var seed = 20261010
    for (var i = 0; i < len; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      d[i] = seed / 0x3fffffff - 1
    }
    return buf
  }

  function makeImpulse (ctx, seconds, decay) {
    var sr = ctx.sampleRate
    var len = Math.max(2, Math.floor(sr * seconds))
    var buf = ctx.createBuffer(2, len, sr)
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch)
      var seed = 90210 + ch * 7919
      for (var i = 0; i < len; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        var n = seed / 0x3fffffff - 1
        var t = i / len
        /* 前 8ms 挖空，直达声不被混响糊掉 */
        d[i] = n * Math.pow(1 - t, decay) * Math.min(1, i / (sr * 0.008))
      }
      for (var k = 0; k < 2; k++) {
        for (var j = len - 1; j > 0; j--) d[j] = (d[j] + d[j - 1]) * 0.5
      }
    }
    return buf
  }

  /* ── 身份：调性、混响空间 ─────────────────────────────────────────────── */
  var IDENTITIES = {
    jt: {
      name: '极兔干线 · EXPRESS TRUNK',
      bpm: 96,
      root: 110,                                  /* A2 */
      scale: [0, 3, 5, 7, 10],                    /* 五声小调 —— 干线 / 东方 / 工业 */
      chords: [[0, 3, 7], [-2, 2, 5], [3, 7, 10], [-4, 0, 3]],
      reverb: { seconds: 0.9, decay: 2.2, wet: 0.13 }
    },
    w40k: {
      name: '战锤40K · 机神祷文',
      bpm: 60,
      root: 73.42,                                /* D2 */
      scale: [0, 1, 5, 7, 8, 12],                 /* 弗里吉亚 —— 哥特礼拜感 */
      chords: [[0, 5, 8], [-4, 0, 5], [3, 7, 8], [0, 7, 12]],
      reverb: { seconds: 3.2, decay: 2.6, wet: 0.3 }
    }
  }

  /* ── 幕表：与 runtime 的 PHASES[].hold 对齐（秒，1× 速度）───────────────── */
  var PHASE_HOLDS = {
    jt: [1.3, 6.75, 2.4, 2.4, 2.6, 1.3, 3.6],
    w40k: [2.3, 7.4, 2.4, 2.5, 2.9, 1.4, 3.6]
  }
  var ACTION_PHASES = { jt: [2, 3], w40k: [2, 3] }

  /* ── 谱表：两套各讲各的叙事，母题与动态 arch 互不通用 ─────────────────── */
  var ARRANGEMENTS = {
    jt: [
      { cues: [
        { k: 'drone', at: 0, dur: 1, deg: -1, gain: 0.17, attack: 0.05, glideRatio: 0.72 },
        { k: 'impact', at: 0.03, freq: 130, dur: 0.28, gain: 0.22, tap: 0.07, tapHz: 2600 },
        { k: 'groove', at: 0.35, dur: 0.5, steps: 4, gain: 0.012, hz: 4200, len: 0.03 },
        { k: 'pluck', at: 0.55, deg: 0, oct: 2, gain: 0.05 },
        { k: 'pluck', at: 0.8, deg: 2, oct: 2, gain: 0.05 },
        { k: 'swell', at: 0.82, dur: 0.18, gain: 0.02, hz1: 4000 }
      ] },
      /* ORIGIN 长镜头：干线脉搏 + 十音级联（声像随网络铺满六洲）+ 定影上海一记 */
      { cues: [
        { k: 'drone', at: 0, dur: 1, deg: -1, gain: 0.15, attack: 0.8, detune: 1.006 },
        { k: 'groove', at: 0.04, dur: 0.78, steps: 16, gain: 0.022, hz: 3400, beat: 4, sub: 110, subGain: 0.09 },
        { k: 'cascade', at: 0.1, to: 0.72, degs: [0, 2, 4, 1, 3, 5, 2, 4, 6, 3], oct: 1, gain: 0.045, dur: 0.45, panFrom: -0.7, panTo: 0.7 },
        { k: 'shimmer', at: 0.68, dur: 0.18, gain: 0.02, hz: 7000, pan: 0.3 },
        { k: 'swell', at: 0.74, dur: 0.12, gain: 0.05, hz0: 300, hz1: 5000, tone: 220 },
        { k: 'impact', at: 0.86, freq: 96, dur: 0.8, gain: 0.3, tap: 0.12, tapHz: 1500 },
        { k: 'pad', at: 0.86, dur: 0.14, chord: 0, gain: 0.05, cutoff: 700, attack: 0.1, open: 2.2 },
        { k: 'pluck', at: 0.9, deg: 7, oct: 2, gain: 0.05 },
        { k: 'pluck', at: 0.95, deg: 4, oct: 3, gain: 0.03 }
      ] },
      /* LINK：动态抽空，只留三次握手 */
      { cues: [
        { k: 'pad', at: 0, dur: 0.5, chord: 1, gain: 0.035, cutoff: 420, attack: 0.2 },
        { k: 'pluck', at: 0.12, deg: 4, oct: 2, gain: 0.04 },
        { k: 'pluck', at: 0.3, deg: 5, oct: 2, gain: 0.04 },
        { k: 'pluck', at: 0.48, deg: 7, oct: 2, gain: 0.04 },
        { k: 'impact', at: 0.58, freq: 220, dur: 0.18, gain: 0.07, tap: 0.03, tapHz: 3000 },
        { k: 'groove', at: 0.6, dur: 0.35, steps: 6, gain: 0.008, hz: 5000 }
      ] },
      /* PROFILE：指纹逐位滚动 */
      { cues: [
        { k: 'drone', at: 0, dur: 1, deg: -1, gain: 0.08, attack: 0.3 },
        { k: 'groove', at: 0.05, dur: 0.6, steps: 14, gain: 0.014, hz: 4600, pattern: [1, 0, 1, 1, 0, 1] },
        { k: 'pluck', at: 0.5, deg: 0, oct: 3, gain: 0.03 },
        { k: 'pluck', at: 0.62, deg: 3, oct: 3, gain: 0.03 },
        { k: 'pluck', at: 0.74, deg: 7, oct: 3, gain: 0.03 },
        { k: 'impact', at: 0.84, freq: 150, dur: 0.22, gain: 0.1, tap: 0.04 },
        { k: 'swell', at: 0.9, dur: 0.1, gain: 0.018 }
      ] },
      /* AUTH：终端逐条 granted */
      { cues: [
        { k: 'pad', at: 0, dur: 1, chord: 2, gain: 0.04, cutoff: 520, attack: 0.4, open: 1.9, breath: 0.2 },
        { k: 'groove', at: 0.04, dur: 0.8, steps: 20, gain: 0.016, hz: 3800, beat: 5, sub: 220, subGain: 0.05 },
        { k: 'cascade', at: 0.15, to: 0.72, degs: [2, 4, 7, 4, 2], oct: 2, gain: 0.035, panFrom: -0.4, panTo: 0.4 },
        { k: 'swell', at: 0.78, dur: 0.2, gain: 0.06, hz0: 250, hz1: 6000, tone: 246.94, toneGain: 0.03 }
      ] },
      /* GRANTED：一闪而过的爆点 —— 旁白已让位给这一记 */
      { cues: [
        { k: 'impact', at: 0, freq: 82, dur: 0.9, gain: 0.34, tap: 0.16, tapDur: 0.5, tapHz: 1200 },
        { k: 'pad', at: 0, dur: 0.95, chord: 3, gain: 0.07, cutoff: 900, attack: 0.02, open: 2.6 },
        { k: 'bell', at: 0.04, deg: 7, oct: 2, gain: 0.05, dur: 1.1 },
        { k: 'cascade', at: 0.1, to: 0.26, degs: [0, 4, 7], oct: 3, gain: 0.05 }
      ] },
      /* ONLINE：母题完整回收 + 八度重叠 + 收尾 */
      { cues: [
        { k: 'drone', at: 0, dur: 1, deg: -1, gain: 0.12, attack: 0.5, detune: 1.004 },
        { k: 'pad', at: 0, dur: 1, chord: 0, gain: 0.05, cutoff: 760, attack: 0.5, open: 1.5 },
        { k: 'cascade', at: 0.06, to: 0.42, degs: [0, 2, 4, 7, 4, 2, 0], oct: 2, gain: 0.05, dur: 0.7, panFrom: -0.5, panTo: 0.5 },
        { k: 'cascade', at: 0.08, to: 0.44, degs: [0, 2, 4, 7, 4, 2, 0], oct: 3, gain: 0.028, dur: 0.6 },
        { k: 'bell', at: 0.8, deg: 7, oct: 1, gain: 0.04, dur: 1.6 },
        { k: 'groove', at: 0, dur: 0.5, steps: 8, gain: 0.01, hz: 3000, beat: 4 },
        { k: 'shimmer', at: 0.7, dur: 0.3, gain: 0.018, hz: 9000, pan: 0.4 }
      ] }
    ],
    w40k: [
      /* AWAKENING：上电、齿轮咬合、远处一记钟拖进长镜头 */
      { cues: [
        { k: 'drone', at: 0, dur: 1, freq: 36.7, gain: 0.2, attack: 0.12, glideRatio: 1.34 },
        { k: 'swell', at: 0.05, dur: 0.5, gain: 0.03, hz0: 60, hz1: 900, send: 0.2 },
        { k: 'groove', at: 0.4, dur: 0.45, steps: 6, gain: 0.01, hz: 2200 },
        { k: 'bell', at: 0.78, deg: 0, oct: 2, gain: 0.045, dur: 2.4, send: 0.8 }
      ] },
      /* VIA SANCTA 长镜头：管风涌出 + 八记钟点亮星域 + 抵达驻地 */
      { cues: [
        { k: 'drone', at: 0, dur: 1, deg: -1, gain: 0.16, attack: 1.2, detune: 1.008, send: 0.35 },
        { k: 'pad', at: 0.04, dur: 0.9, chord: 0, gain: 0.05, cutoff: 380, attack: 1.4, open: 2.1, breath: 0.07, send: 0.45 },
        { k: 'cascade', at: 0.08, to: 0.58, degs: [0, 2, 4, 5, 7, 4, 2, 0], oct: 1, gain: 0.045, dur: 2.2, panFrom: -0.6, panTo: 0.6, bell: true, send: 0.6 },
        { k: 'groove', at: 0.1, dur: 0.7, steps: 4, gain: 0.014, hz: 180, beat: 2, sub: 49, subGain: 0.07 },
        { k: 'shimmer', at: 0.62, dur: 0.2, gain: 0.02, hz: 5200 },
        { k: 'swell', at: 0.8, dur: 0.1, gain: 0.05, hz0: 200, hz1: 4200, tone: 73.4, toneGain: 0.04 },
        { k: 'impact', at: 0.9, freq: 62, dur: 1, gain: 0.26, tap: 0.1, tapHz: 900 },
        { k: 'pad', at: 0.88, dur: 0.12, chord: 2, gain: 0.055, cutoff: 700, attack: 0.15, open: 2.4, send: 0.5 }
      ] },
      /* UPLINK：下坠式过渡后归于静默，把空间让给接驳祷文 */
      { cues: [
        { k: 'swell', at: 0, dur: 0.28, gain: 0.05, hz0: 3000, hz1: 300, send: 0.5 },
        { k: 'drone', at: 0.18, dur: 0.8, deg: -1, gain: 0.12, attack: 0.2, glideRatio: 0.72 },
        { k: 'impact', at: 0.46, freq: 110, dur: 0.3, gain: 0.12, tap: 0.05, tapHz: 700 },
        { k: 'pad', at: 0.5, dur: 0.5, chord: 1, gain: 0.035, cutoff: 300, attack: 0.5, send: 0.6 }
      ] },
      /* INSCRIPTIO：羽笔沙沙 + 稀疏钟点 + 火漆一印 */
      { cues: [
        { k: 'drone', at: 0, dur: 1, deg: -1, gain: 0.07, attack: 0.4 },
        { k: 'groove', at: 0.06, dur: 0.6, steps: 16, gain: 0.011, hz: 5600, type: 'highpass', len: 0.03 },
        { k: 'bell', at: 0.3, deg: 4, oct: 1, gain: 0.03, dur: 1.6 },
        { k: 'bell', at: 0.62, deg: 5, oct: 1, gain: 0.03, dur: 1.6 },
        { k: 'impact', at: 0.84, freq: 140, dur: 0.2, gain: 0.09, tap: 0.04, tapHz: 600 }
      ] },
      /* RELICS：铁砧四击的锻打节奏 + 唱垫渐强 */
      { cues: [
        { k: 'pad', at: 0, dur: 1, chord: 3, gain: 0.045, cutoff: 460, attack: 0.8, open: 2.3, breath: 0.1, send: 0.5 },
        { k: 'groove', at: 0.05, dur: 0.8, steps: 10, gain: 0.014, hz: 3000, beat: 3 },
        { k: 'cascade', at: 0.1, to: 0.64, degs: [0, 1, 2, 3], oct: 0, gain: 0.1, impactOnly: true, tap: 0.05, tapHz: 2400, dur: 0.12, freqs: [180, 186, 174, 192] },
        { k: 'bell', at: 0.74, deg: 7, oct: 2, gain: 0.04, dur: 1.8, send: 0.7 },
        { k: 'swell', at: 0.82, dur: 0.18, gain: 0.05, hz0: 240, hz1: 4600, tone: 98, toneGain: 0.035 }
      ] },
      /* CONSECRATIO：巨印砸落，大钟尾巴拖满全场 */
      { cues: [
        { k: 'impact', at: 0, freq: 46, dur: 0.95, gain: 0.42, tap: 0.2, tapDur: 0.6, tapHz: 900 },
        { k: 'bell', at: 0.02, deg: 0, oct: 1, gain: 0.07, dur: 3.4, send: 0.9 },
        { k: 'swell', at: 0, dur: 0.35, gain: 0.07, hz0: 120, hz1: 3600, send: 0.6 },
        { k: 'drone', at: 0, dur: 0.6, freq: 36.7, gain: 0.2, attack: 0.02, glideRatio: 0.8 }
      ] },
      /* BENEDICTIO：朝圣动机在放慢一倍中回收，余烬与长淡出 */
      { cues: [
        { k: 'drone', at: 0, dur: 1, deg: -1, gain: 0.13, attack: 0.8, detune: 1.005 },
        { k: 'pad', at: 0, dur: 1, chord: 0, gain: 0.055, cutoff: 620, attack: 0.9, open: 1.6, send: 0.55 },
        { k: 'cascade', at: 0.06, to: 0.6, degs: [0, 2, 4, 7], oct: 2, gain: 0.045, dur: 2, bell: true },
        { k: 'shimmer', at: 0.5, dur: 0.45, gain: 0.018, hz: 4800, pan: -0.3 },
        { k: 'bell', at: 0.78, deg: 0, oct: 3, gain: 0.028, dur: 2.6, send: 0.9 }
      ] }
    ]
  }

  /* 减弱动效下每幕只剩 420ms —— 塞 30s 编曲没有意义，各给一记短 sting。 */
  var REDUCED_STINGS = {
    jt: [
      [{ k: 'impact', at: 0, freq: 130, dur: 0.3, gain: 0.2, tap: 0.06 }],
      [{ k: 'drone', at: 0, dur: 1, deg: -1, gain: 0.14 }, { k: 'pluck', at: 0.3, deg: 4, oct: 2, gain: 0.04 }],
      [{ k: 'pluck', at: 0.2, deg: 4, oct: 2, gain: 0.035 }],
      [{ k: 'pluck', at: 0.2, deg: 7, oct: 2, gain: 0.035 }],
      [{ k: 'groove', at: 0, dur: 0.8, steps: 4, gain: 0.014, hz: 3800 }],
      [{ k: 'impact', at: 0, freq: 82, dur: 0.4, gain: 0.3, tap: 0.12 }],
      [{ k: 'pad', at: 0, dur: 1, chord: 0, gain: 0.05, cutoff: 760, attack: 0.05 }]
    ],
    w40k: [
      [{ k: 'drone', at: 0, dur: 1, freq: 36.7, gain: 0.18, attack: 0.02, glideRatio: 1.3 }],
      [{ k: 'bell', at: 0.1, deg: 0, oct: 2, gain: 0.04, dur: 0.4 }],
      [{ k: 'impact', at: 0.1, freq: 110, dur: 0.2, gain: 0.1, tap: 0.04 }],
      [{ k: 'groove', at: 0, dur: 0.7, steps: 4, gain: 0.01, hz: 5600, type: 'highpass' }],
      [{ k: 'impact', at: 0.15, freq: 180, dur: 0.12, gain: 0.09, tap: 0.04 }],
      [{ k: 'impact', at: 0, freq: 46, dur: 0.4, gain: 0.4, tap: 0.18, tapHz: 900 }],
      [{ k: 'pad', at: 0, dur: 1, chord: 0, gain: 0.05, cutoff: 500, attack: 0.05 }]
    ]
  }

  /* ── 旁白 cue：分风格的英文台词与起播偏移（时长实测见 assets manifest）──────
     warn / unavailable 是互斥变体，运行时按清单读取结果二选一，不会同播。 */
  var NARRATION = {
    jt: [
      { phase: 1, at: 0.7, file: 'origin' },
      { phase: 2, at: 0.2, file: 'link' },
      { phase: 3, at: 0.2, file: 'profile' },
      { phase: 4, at: 0.05, file: 'auth' },
      { phase: 6, at: 0.3, file: 'online' },
      { phase: 5, at: 0.12, file: 'warn', variant: 'warn' },
      { phase: 5, at: 0.12, file: 'unavailable', variant: 'unavailable' }
    ],
    w40k: [
      { phase: 0, at: 0.06, file: 'awaken' },
      { phase: 1, at: 1.2, file: 'via' },
      { phase: 2, at: 0.2, file: 'uplink' },
      { phase: 3, at: 0.2, file: 'inscribe' },
      { phase: 4, at: 0.2, file: 'relics' },
      { phase: 6, at: 0.35, file: 'benedictio' },
      { phase: 5, at: 0.15, file: 'warn', variant: 'warn' },
      { phase: 5, at: 0.15, file: 'unavailable', variant: 'unavailable' }
    ]
  }
  /* speed 超过这个倍数就不播旁白：幕时长除以 speed 后台词必然跨幕。 */
  var VOICE_MAX_SPEED = 1.5

  /* ── 排程 ─────────────────────────────────────────────────────────────── */
  function degreeFreq (idn, deg, oct) {
    var n = idn.scale.length
    var octave = Math.floor(deg / n) + (oct || 0)
    var semi = idn.scale[((deg % n) + n) % n] + 12 * octave
    return idn.root * Math.pow(2, semi / 12)
  }

  function chordFreqs (idn, index, oct) {
    var out = []
    var c = idn.chords[index % idn.chords.length]
    for (var i = 0; i < c.length; i++) out.push(degreeFreq(idn, c[i], oct || 0))
    return out
  }

  function playCue (eng, style, c, startAt, window) {
    var idn = eng.identity
    var P = eng.primitives
    var at = startAt + dv(c.at, 0) * window
    var dur = dv(c.dur, 0) * window
    var base
    if (c.k === 'drone') {
      base = dv(c.freq, degreeFreq(idn, dv(c.deg, 0), -1))
      P.drone(at, dur, {
        freq: base, gain: c.gain, attack: c.attack, detune: c.detune, send: c.send, type: c.type,
        glide: c.glideRatio ? base * c.glideRatio : undefined
      })
    } else if (c.k === 'pad') {
      P.pad(at, dur, {
        freqs: chordFreqs(idn, dv(c.chord, 0), c.oct), gain: c.gain, cutoff: c.cutoff,
        attack: c.attack, open: c.open, breath: c.breath, send: c.send, wave: c.wave, spread: c.spread
      })
    } else if (c.k === 'pluck') {
      P.pluck(at, {
        freq: degreeFreq(idn, dv(c.deg, 0), c.oct), gain: c.gain,
        dur: Math.max(0.08, dv(c.dur, 0.5) * window), pan: c.pan, wave: c.wave, send: c.send
      })
    } else if (c.k === 'bell') {
      P.bell(at, { freq: degreeFreq(idn, dv(c.deg, 0), c.oct), gain: c.gain, dur: Math.max(0.25, dur), pan: c.pan, send: c.send })
    } else if (c.k === 'impact') {
      P.impact(at, {
        freq: dv(c.freq, 90), dur: Math.max(0.1, dv(c.dur, 0.3) * window), gain: c.gain,
        tap: c.tap, tapDur: c.tapDur ? c.tapDur * window : undefined, tapHz: c.tapHz, pan: c.pan
      })
    } else if (c.k === 'swell') {
      P.swell(at, Math.max(0.08, dur), { gain: c.gain, hz0: c.hz0, hz1: c.hz1, tone: c.tone, toneGain: c.toneGain, pan: c.pan, send: c.send })
    } else if (c.k === 'shimmer') {
      P.shimmer(at, Math.max(0.1, dur), { gain: c.gain, hz: c.hz, pan: c.pan })
    } else if (c.k === 'groove') {
      P.groove(at, Math.max(0.1, dur), {
        steps: c.steps, gain: c.gain, hz: c.hz, type: c.type, len: c.len ? c.len * window : undefined,
        pattern: c.pattern, beat: c.beat, sub: c.sub, subGain: c.subGain, pan: c.pan, send: c.send
      })
    } else if (c.k === 'cascade') {
      /* 一条旋律线按进度均匀铺开，声像从 panFrom 扫到 panTo —— 长镜头的
         「网络级联 / 星域点亮」就是它，幕时长怎么变都跟着走。 */
      var from = startAt + dv(c.at, 0) * window
      var span = (dv(c.to, 1) - dv(c.at, 0)) * window
      var degs = c.degs || []
      var n = degs.length
      for (var i = 0; i < n; i++) {
        var t = from + span * (n === 1 ? 0 : i / (n - 1))
        var pan
        if (c.panFrom != null) pan = c.panFrom + (c.panTo - c.panFrom) * (n === 1 ? 0 : i / (n - 1))
        else pan = c.pan
        var stepDur = Math.max(0.06, dv(c.dur, 0.4) * window)
        if (c.impactOnly) {
          P.impact(t, { freq: (c.freqs && c.freqs[i % c.freqs.length]) || 180, dur: stepDur, gain: c.gain, tap: c.tap, tapHz: c.tapHz })
        } else if (c.bell) {
          P.bell(t, { freq: degreeFreq(idn, degs[i], c.oct), gain: c.gain, dur: Math.max(0.3, stepDur * 2.2), pan: pan, send: c.send })
        } else {
          P.pluck(t, { freq: degreeFreq(idn, degs[i], c.oct), gain: c.gain, dur: stepDur, pan: pan, wave: c.wave, send: c.send })
        }
      }
    }
  }

  /* ── 引擎 ─────────────────────────────────────────────────────────────── */
  function createEngine (ctx, style) {
    var identity = IDENTITIES[style] || IDENTITIES.jt
    var master = ctx.createGain()
    master.gain.value = 0.0001
    var limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -10
    limiter.knee.value = 8
    limiter.ratio.value = 12
    limiter.attack.value = 0.004
    limiter.release.value = 0.18
    master.connect(limiter)
    limiter.connect(ctx.destination)

    var music = ctx.createGain()
    music.connect(master)

    var verb = ctx.createConvolver()
    verb.buffer = makeImpulse(ctx, identity.reverb.seconds, identity.reverb.decay)
    var wet = ctx.createGain()
    wet.gain.value = identity.reverb.wet
    verb.connect(wet)
    wet.connect(master)

    /* 一份噪声反复用；旧实现每次音效现生成、且固定 seed 导致每段噪声一模一样 */
    var noiseBuf = makeNoise(ctx, 2.5)
    var live = []

    function track (node) { live.push(node); return node }
    function routeTo (node, send) {
      node.connect(music)
      if (send) node.connect(verb)
    }
    function panner (pan) {
      if (pan == null || !ctx.createStereoPanner) return null
      var p = ctx.createStereoPanner()
      p.pan.value = Math.max(-1, Math.min(1, pan))
      return p
    }
    function playNoise (at, dur, gain, hz, type, send, pan, sweepTo) {
      var src = ctx.createBufferSource()
      src.buffer = noiseBuf
      src.loop = true
      var f = ctx.createBiquadFilter()
      f.type = type || 'bandpass'
      f.frequency.setValueAtTime(hz, at)
      f.Q.value = type === 'highpass' ? 0.9 : 1.1
      if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, at + dur)
      var g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, at)
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + Math.min(0.05, dur * 0.25))
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
      var p = panner(pan)
      src.connect(f)
      if (p) { f.connect(p); p.connect(g) } else f.connect(g)
      routeTo(g, send)
      var span = Math.max(0.001, noiseBuf.duration - 0.2)
      src.start(at, ((at * 7919) % span + span) % span)
      src.stop(at + dur + 0.05)
      track(src)
    }

    var P = {
      drone: function (at, dur, o) {
        var mk = function (freq, gain) {
          var osc = ctx.createOscillator()
          osc.type = dv(o.type, 'sine')
          osc.frequency.setValueAtTime(freq, at)
          if (o.glide) osc.frequency.exponentialRampToValueAtTime(o.glide, at + dur)
          var g = ctx.createGain()
          g.gain.setValueAtTime(0.0001, at)
          g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + dv(o.attack, dur * 0.3))
          g.gain.setValueAtTime(Math.max(0.0002, gain), at + dur * 0.72)
          g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
          osc.connect(g)
          routeTo(g, dv(o.send, 0.1))
          osc.start(at)
          osc.stop(at + dur + 0.05)
          track(osc)
        }
        mk(o.freq, o.gain)
        if (o.detune) mk(o.freq * o.detune, o.gain * 0.6)
      },
      pad: function (at, dur, o) {
        var cutoff = dv(o.cutoff, 520)
        var lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.setValueAtTime(cutoff, at)
        lp.frequency.linearRampToValueAtTime(cutoff * dv(o.open, 1.6), at + dur * 0.6)
        lp.frequency.linearRampToValueAtTime(cutoff, at + dur)
        lp.Q.value = 0.8
        var g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, at)
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.gain), at + dv(o.attack, 0.35))
        g.gain.setValueAtTime(Math.max(0.0002, o.gain), at + dur * 0.7)
        g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
        lp.connect(g)
        routeTo(g, dv(o.send, 0.3))
        for (var i = 0; i < o.freqs.length; i++) {
          var osc = ctx.createOscillator()
          osc.type = dv(o.wave, 'sawtooth')
          osc.frequency.value = o.freqs[i]
          osc.detune.value = (i % 2 ? 1 : -1) * dv(o.spread, 7)
          var vg = ctx.createGain()
          vg.gain.value = 1 / Math.sqrt(o.freqs.length)
          osc.connect(vg)
          vg.connect(lp)
          osc.start(at)
          osc.stop(at + dur + 0.05)
          track(osc)
        }
        /* 呼吸 LFO：让垫子不死板 */
        var lfo = ctx.createOscillator()
        lfo.frequency.value = dv(o.breath, 0.14)
        var lg = ctx.createGain()
        lg.gain.value = cutoff * 0.22
        lfo.connect(lg)
        lg.connect(lp.frequency)
        lfo.start(at)
        lfo.stop(at + dur + 0.05)
        track(lfo)
      },
      pluck: function (at, o) {
        var d = dv(o.dur, 0.5)
        var osc = ctx.createOscillator()
        osc.type = dv(o.wave, 'triangle')
        osc.frequency.value = o.freq
        var osc2 = ctx.createOscillator()
        osc2.type = 'sine'
        osc2.frequency.value = o.freq * 2
        var g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, at)
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.gain), at + 0.008)
        g.gain.exponentialRampToValueAtTime(0.0001, at + d)
        var g2 = ctx.createGain()
        g2.gain.setValueAtTime(0.0001, at)
        g2.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.gain * 0.28), at + 0.006)
        g2.gain.exponentialRampToValueAtTime(0.0001, at + d * 0.55)
        var p = panner(o.pan)
        osc.connect(g)
        osc2.connect(g2)
        if (p) { g.connect(p); g2.connect(p); routeTo(p, dv(o.send, 0.25)) }
        else { routeTo(g, dv(o.send, 0.25)); routeTo(g2, 0.2) }
        osc.start(at); osc.stop(at + d + 0.05)
        osc2.start(at); osc2.stop(at + d * 0.6)
        track(osc); track(osc2)
      },
      bell: function (at, o) {
        /* 基频 + 不谐泛音：40K 的钟味全靠这组比例失真的泛音 */
        var parts = [[1, 1], [2.056, 0.5], [3.424, 0.26], [5.13, 0.11]]
        for (var i = 0; i < parts.length; i++) {
          var osc = ctx.createOscillator()
          osc.type = 'sine'
          osc.frequency.value = o.freq * parts[i][0]
          var g = ctx.createGain()
          g.gain.setValueAtTime(0.0001, at)
          g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.gain * parts[i][1]), at + 0.012)
          g.gain.exponentialRampToValueAtTime(0.0001, at + o.dur * (1 - 0.22 * parts[i][0] / 5))
          var p = panner(o.pan)
          osc.connect(g)
          if (p) { g.connect(p); routeTo(p, dv(o.send, 0.55)) } else routeTo(g, dv(o.send, 0.55))
          osc.start(at)
          osc.stop(at + o.dur + 0.1)
          track(osc)
        }
      },
      impact: function (at, o) {
        var d = dv(o.dur, 0.5)
        var osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(o.freq, at)
        osc.frequency.exponentialRampToValueAtTime(dv(o.glide, Math.max(18, o.freq * 0.35)), at + d)
        var g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, at)
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.gain), at + 0.01)
        g.gain.exponentialRampToValueAtTime(0.0001, at + d)
        osc.connect(g)
        routeTo(g, 0.12)
        osc.start(at)
        osc.stop(at + d + 0.05)
        track(osc)
        playNoise(at, dv(o.tapDur, d * 0.5), dv(o.tap, o.gain * 0.4), dv(o.tapHz, 1800), 'bandpass', 0.4, o.pan)
      },
      swell: function (at, dur, o) {
        playNoise(at, dur, o.gain, dv(o.hz0, 260), 'highpass', dv(o.send, 0.35), o.pan, dv(o.hz1, 5200))
        /* 叠一层音高上行的悬置感，纯噪声 riser 太像白噪开关 */
        if (o.tone == null) return
        var osc = ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(o.tone, at)
        osc.frequency.exponentialRampToValueAtTime(o.tone * 2, at + dur)
        var lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.setValueAtTime(400, at)
        lp.frequency.exponentialRampToValueAtTime(3600, at + dur)
        var og = ctx.createGain()
        og.gain.setValueAtTime(0.0001, at)
        og.gain.exponentialRampToValueAtTime(Math.max(0.0002, dv(o.toneGain, o.gain * 0.5)), at + dur * 0.8)
        og.gain.exponentialRampToValueAtTime(0.0001, at + dur)
        osc.connect(lp)
        lp.connect(og)
        og.connect(music)
        og.connect(verb)
        osc.start(at)
        osc.stop(at + dur + 0.05)
        track(osc)
      },
      groove: function (at, dur, o) {
        var step = dur / o.steps
        for (var i = 0; i < o.steps; i++) {
          var t = at + i * step
          if (o.pattern && !o.pattern[i % o.pattern.length]) continue
          var accent = o.beat && i % o.beat === 0
          playNoise(t, dv(o.len, step * 0.5), (dv(o.gain, 0.03)) * (accent ? 1.9 : 1),
            dv(o.hz, 3200), o.type, dv(o.send, 0.16), o.pan == null ? 0 : o.pan)
          if (accent && o.sub) {
            var osc = ctx.createOscillator()
            osc.type = 'sine'
            osc.frequency.setValueAtTime(o.sub, t)
            osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.sub * 0.6), t + 0.16)
            var g = ctx.createGain()
            g.gain.setValueAtTime(0.0001, t)
            g.gain.exponentialRampToValueAtTime(Math.max(0.0002, dv(o.subGain, 0.12)), t + 0.008)
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
            osc.connect(g)
            routeTo(g, 0.06)
            osc.start(t)
            osc.stop(t + 0.26)
            track(osc)
          }
        }
      },
      shimmer: function (at, dur, o) {
        playNoise(at, dur, o.gain, dv(o.hz, 6800), 'highpass', 0.5, dv(o.pan, 0.2), dv(o.hz, 6800) * 1.4)
      },
      /* UI 音（不属于配曲）：机械按键「笃」= 低频体 + 高频拍击瞬态 */
      click: function (at) {
        P.impact(at, { freq: 170, dur: 0.07, gain: 0.1, glide: 128 })
        playNoise(at, 0.028, 0.055, 2400, 'bandpass', 0.1)
      },
      tick: function (at, freq) {
        P.pluck(at, { freq: dv(freq, 1568), gain: 0.02, dur: 0.03, wave: 'square', send: 0 })
      },
      confirm: function (at) {
        P.bell(at, { freq: 660, gain: 0.05, dur: 0.35, send: 0.3 })
        P.bell(at + 0.1, { freq: 990, gain: 0.035, dur: 0.4, send: 0.3 })
      }
    }

    return {
      ctx: ctx,
      style: style,
      identity: identity,
      master: master,
      music: music,
      primitives: P,
      live: live,
      /* 旁白 duck：知道人声实际时长，就把音乐压 6dB 正好那么久 */
      duck: function (at, seconds) {
        var back = Math.max(at + seconds + 0.05, at + 0.25)
        var now = Math.max(0.0002, music.gain.value)
        music.gain.cancelScheduledValues(at)
        music.gain.setValueAtTime(now, at)
        music.gain.exponentialRampToValueAtTime(0.5, at + 0.08)
        music.gain.setValueAtTime(0.5, back - 0.28)
        music.gain.exponentialRampToValueAtTime(1, back)
      },
      fadeOut: function (at, seconds) {
        var now = Math.max(0.0002, master.gain.value)
        master.gain.cancelScheduledValues(at)
        master.gain.setValueAtTime(now, at)
        master.gain.exponentialRampToValueAtTime(0.0001, at + seconds)
      },
      /* skipBefore：从幕内第 N 秒起排 —— 声卡要等用户手势、引擎也可能晚到，
         这时只补播「还没过去」的那些 cue，而不是整幕乐句直接丢掉。 */
      playPhase: function (ix, startAt, windowSec, reduced, skipBefore) {
        var table = reduced ? REDUCED_STINGS[style] : ARRANGEMENTS[style]
        var phase = table && table[ix]
        if (!phase) return
        for (var i = 0; i < phase.cues.length; i++) {
          var c = phase.cues[i]
          if (skipBefore != null && dv(c.at, 0) * windowSec < skipBefore - 0.02) continue
          playCue({ identity: identity, primitives: P }, style, c, startAt, windowSec)
        }
      },
      start: function (at, level) {
        master.gain.cancelScheduledValues(at)
        master.gain.setValueAtTime(0.0001, at)
        master.gain.exponentialRampToValueAtTime(dv(level, 0.85), at + 0.25)
      },
      stopAll: function () {
        for (var i = 0; i < live.length; i++) {
          try { if (live[i].stop) live[i].stop() } catch (e) { /* 已停 */ }
        }
        live.length = 0
      }
    }
  }

  global.JTSCORE = {
    IDENTITIES: IDENTITIES,
    PHASE_HOLDS: PHASE_HOLDS,
    ACTION_PHASES: ACTION_PHASES,
    ARRANGEMENTS: ARRANGEMENTS,
    REDUCED_STINGS: REDUCED_STINGS,
    NARRATION: NARRATION,
    VOICE_MAX_SPEED: VOICE_MAX_SPEED,
    createEngine: createEngine
  }
})(typeof window !== 'undefined' ? window : globalThis)
