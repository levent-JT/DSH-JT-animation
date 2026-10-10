/**
 * dsh-jt-startup — 浏览器半侧（设置页「启动动画 · 双风格」）
 * ----------------------------------------------------------------------------
 * 以 dsh.client bundle 格式加载（手写 ModuleLoader bundle，无需构建）：
 * 在 DSH 设置里注册一个 `settings.section`，用来选启动动画风格
 * （极兔干线 / 战锤40K 机神祷文 / 战锤禁军黄金誓约）并分别配置各自的身份、外观、速度、真实清单开关等。
 *
 * 数据不走 settings 命名空间，而是走 Host 半侧自带的 HTTP API
 * （GET/POST /jt-startup/config）。注册 id 必须等于 loader entry 名
 * （dsh-jt-startup），否则 ModuleLoader 会报
 * "loaded without registering dsh-jt-startup"。
 */
window.__ModuleLoader__.load({
  id: 'dsh-jt-startup',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    var react = require('react')
    var h = react.createElement

    var API = '/jt-startup/config'

    /* ── CSS ─────────────────────────────────────────────────────────────── */
    var CSS = [
      '.__jt_root{max-width:620px;display:flex;flex-direction:column;gap:14px;font-size:13px;color:var(--dsw-alias-label-primary)}',
      '.__jt_version{font-family:ui-monospace,Consolas,monospace;font-size:12px;letter-spacing:.04em;color:var(--dsw-alias-label-tertiary)}',
      '.__jt_group{border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:11px}',
      '.__jt_groupTitle{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary)}',
      '.__jt_field{display:flex;flex-direction:column;gap:5px}',
      '.__jt_label{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.__jt_hint{font-size:11px;line-height:1.55;color:var(--dsw-alias-label-tertiary)}',
      '.__jt_row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '.__jt_input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);font:inherit;color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px 10px;font-size:13px;box-sizing:border-box;width:100%;outline:none}',
      '.__jt_input:focus{border-color:var(--dsw-alias-state-business-primary)}',
      '.__jt_inputMono{font-family:ui-monospace,Consolas,monospace;font-size:12px;letter-spacing:.06em}',
      '.__jt_select{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px 8px;font:inherit;font-size:13px;min-width:180px}',
      '.__jt_check{display:flex;align-items:flex-start;gap:8px;cursor:pointer}',
      '.__jt_check input{margin-top:2px;accent-color:var(--dsw-alias-state-business-primary)}',
      '.__jt_checkText{display:flex;flex-direction:column;gap:2px}',
      '.__jt_two{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '.__jt_actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:2px}',
      '.__jt_btn{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px 14px;font:inherit;font-size:13px;cursor:pointer}',
      '.__jt_btn:hover:not(:disabled){border-color:var(--dsw-alias-state-business-primary)}',
      '.__jt_btn:disabled{opacity:.5;cursor:default}',
      '.__jt_btnPrimary{border-color:var(--dsw-alias-state-business-primary,#3964fe);background:var(--dsw-alias-state-business-primary,#3964fe);color:#fff}',
      '.__jt_status{font-size:12px;color:var(--dsw-alias-label-tertiary)}',
      '.__jt_ok{font-size:12px;color:var(--dsw-alias-state-business-primary)}',
      '.__jt_err{font-size:12px;color:var(--dsw-alias-state-error-primary,#f85149)}',
      '.__jt_swatch{width:38px;height:26px;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;cursor:pointer}',
      '.__jt_styleGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '.__jt_styleCard{display:flex;flex-direction:column;gap:9px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:10px;cursor:pointer;transition:border-color .15s ease,box-shadow .15s ease}',
      '.__jt_styleCard:hover{border-color:var(--dsw-alias-state-business-primary)}',
      '.__jt_styleActive{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary)}',
      '.__jt_styleArt{height:46px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;letter-spacing:1.5px;overflow:hidden;position:relative}',
      '.__jt_art_jt{background:linear-gradient(135deg,#f6f3ee 0%,#efe9dc 55%,#d8232a 160%);color:#d8232a;font-weight:700;font-size:13px}',
      '.__jt_art_jt::after{content:"";position:absolute;left:14%;right:18%;bottom:13px;border-top:2px solid rgba(216,35,42,.55);border-radius:50%}',
      '.__jt_art_w40k{background:radial-gradient(ellipse at 50% 62%,#2a1c08 0%,#0a0807 70%);color:#b98a2f;font-family:Georgia,"Times New Roman",serif;font-size:17px;text-shadow:0 0 8px rgba(185,138,47,.55)}',
      '.__jt_art_guard{background:linear-gradient(150deg,#0a0908 0%,#171009 52%,#3a1116 132%);color:#ffd98a;font-size:15px;letter-spacing:.12em;text-shadow:0 0 12px rgba(200,162,74,.6)}',
      '.__jt_styleText b{font-size:13px;display:block}',
      '.__jt_styleEn{display:block;font-size:8.5px;letter-spacing:.1em;color:var(--dsw-alias-label-tertiary);margin-top:3px;text-transform:uppercase}',
      '.__jt_styleDesc{display:block;font-size:10.5px;color:var(--dsw-alias-label-tertiary);margin-top:5px;line-height:1.5}'
    ].join('')
    var tagId = 'dsh-jt-startup/main.css'
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="' + tagId + '"]') === null) {
      var tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-jt-startup'
      tag.dataset.pluginCss = tagId
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    /* ── 表单原子 ────────────────────────────────────────────────────────── */
    function Field(props) {
      return h('div', { className: '__jt_field' },
        h('label', { className: '__jt_label' }, props.label),
        props.children,
        props.hint ? h('div', { className: '__jt_hint' }, props.hint) : null
      )
    }
    function TextInput(props) {
      return h('input', {
        className: '__jt_input' + (props.mono ? ' __jt_inputMono' : ''),
        type: 'text',
        value: props.value == null ? '' : String(props.value),
        placeholder: props.placeholder || '',
        maxLength: props.maxLength || 64,
        spellCheck: false,
        onChange: (e) => props.onChange(e.target.value)
      })
    }
    function Select(props) {
      return h('select', {
        className: '__jt_select',
        value: props.value,
        onChange: (e) => props.onChange(e.target.value)
      }, props.options.map((o) => h('option', { key: o[0], value: o[0] }, o[1])))
    }
    function Check(props) {
      return h('label', { className: '__jt_check' },
        h('input', {
          type: 'checkbox',
          checked: !!props.checked,
          onChange: (e) => props.onChange(e.target.checked)
        }),
        h('span', { className: '__jt_checkText' },
          h('span', null, props.label),
          props.hint ? h('span', { className: '__jt_hint' }, props.hint) : null
        )
      )
    }
    function ColorInput(props) {
      return h('input', {
        className: '__jt_swatch',
        type: 'color',
        value: props.value,
        onChange: (e) => props.onChange(e.target.value)
      })
    }
    function Range(props) {
      return h('div', { className: '__jt_row' },
        h('input', {
          type: 'range',
          min: props.min, max: props.max, step: props.step || 0.05,
          value: props.value,
          style: { flex: '1 1 200px' },
          onChange: (e) => props.onChange(Number(e.target.value))
        }),
        h('span', { className: '__jt_status' }, props.display)
      )
    }

    /* schema v2：顶层全局 + 两套风格分组（与 Host DEFAULTS 对应）。
       config API 的 config 字段是「当前风格扁平化视图」（运行时契约），
       groups 字段才是两套完整分组 —— 面板编辑用它。 */
    var FALLBACK = {
      enabled: true, mode: 'session', style: 'jt', speed: 1,
      requireInteraction: true, allowSkip: true, sound: true, soundVolume: 0.5,
      inventory: true, background: true, voice: true
    }
    var FALLBACK_GROUPS = {
      jt: { theme: 'light', accent: '#d8232a', identity: 'JT-DEVELOPER', identityId: 'JT0001', hub: 'SHANGHAI · GLOBAL HQ' },
      w40k: { accent: '#8f1f1f', identity: 'JT-DEVELOPER', rank: 'TECH-ADEPT', station: 'RYZA · FORGE WORLD', cipher: 'JT0001' },
      custodes: { accent: '#c8a24a', identity: 'JT-DEVELOPER', rank: 'KEEPSAKE', cohort: 'FIRST BROTHERHOOD', station: 'IMPERIAL PALACE · TERRA', cipher: 'JT0001', holdSeconds: 2.6 }
    }
    function num(v, d) { var n = Number(v); return isFinite(n) ? n : d }

    /** GET/POST 响应 → 面板 draft（top + jt + w40k 三块）。 */
    function ingestPayload(j) {
      var flat = (j && j.config) || {}
      var groups = (j && j.groups) || {}
      var top = {}
      for (var k in FALLBACK) top[k] = flat[k] === undefined || flat[k] === null ? FALLBACK[k] : flat[k]
      /* 旧版 Host（没有 groups）也能从扁平字段兜出 jt 组 */
      var jt = {}
      for (var k2 in FALLBACK_GROUPS.jt) {
        jt[k2] = (groups.jt && groups.jt[k2] !== undefined && groups.jt[k2] !== null)
          ? groups.jt[k2]
          : (flat[k2] !== undefined && flat[k2] !== null ? flat[k2] : FALLBACK_GROUPS.jt[k2])
      }
      var w40k = {}
      for (var k3 in FALLBACK_GROUPS.w40k) {
        w40k[k3] = (groups.w40k && groups.w40k[k3] !== undefined && groups.w40k[k3] !== null)
          ? groups.w40k[k3]
          : (flat[k3] !== undefined && flat[k3] !== null ? flat[k3] : FALLBACK_GROUPS.w40k[k3])
      }
      var custodes = {}
      for (var k4 in FALLBACK_GROUPS.custodes) {
        custodes[k4] = (groups.custodes && groups.custodes[k4] !== undefined && groups.custodes[k4] !== null)
          ? groups.custodes[k4]
          : (flat[k4] !== undefined && flat[k4] !== null ? flat[k4] : FALLBACK_GROUPS.custodes[k4])
      }
      return { top: top, jt: jt, w40k: w40k, custodes: custodes }
    }

    var FALLBACK_VERSION = '0.2.0'

    /* ── 面板 ────────────────────────────────────────────────────────────── */
    function Panel() {
      var draft = react.useState(null)
      var setDraft = draft[1]
      var status = react.useState('')
      var setStatus = status[1]
      var err = react.useState('')
      var setErr = err[1]
      var version = react.useState(FALLBACK_VERSION)
      var setVersion = version[1]

      draft = draft[0]; status = status[0]; err = err[0]; version = version[0]

      react.useEffect(function () {
        fetch(API, { headers: { Accept: 'application/json' } })
          .then(function (r) { return r.json() })
          .then(function (j) {
            if (j && j.ok === true) {
              setDraft(ingestPayload(j))
              if (j.version) setVersion(j.version)
            } else {
              setDraft(ingestPayload(null))
            }
          })
          .catch(function () { setDraft(ingestPayload(null)) })
      }, [])

      if (!draft) {
        return h('div', { className: '__jt_root' }, h('div', { className: '__jt_status' }, '正在读取配置…'))
      }

      function patch(group, key, value) {
        var next = {
          top: Object.assign({}, draft.top),
          jt: Object.assign({}, draft.jt),
          w40k: Object.assign({}, draft.w40k),
          custodes: Object.assign({}, draft.custodes)
        }
        next[group][key] = value
        setDraft(next)
        setStatus('')
      }
      /** 保存体：全局字段 + 三套分组一起发（Host 侧按组深合并，没动的组不会被抹掉）。 */
      function requestBody() {
        return { patch: Object.assign({}, draft.top, { jt: draft.jt, w40k: draft.w40k, custodes: draft.custodes }) }
      }
      function save() {
        setErr(''); setStatus('正在保存…')
        fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody())
        })
          .then(function (r) { return r.json() })
          .then(function (j) {
            if (j && j.ok === true) {
              setDraft(ingestPayload(j))
              setStatus('已保存到 ~/.dsh/jt-startup.json，下次启动生效')
            } else {
              setErr((j && j.error) || '保存失败')
              setStatus('')
            }
          })
          .catch(function (e) { setErr(String(e && e.message || e)); setStatus('') })
      }
      function reset() {
        setErr(''); setStatus('正在恢复默认…')
        fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset' })
        })
          .then(function (r) { return r.json() })
          .then(function (j) {
            if (j && j.ok === true) {
              setDraft(ingestPayload(j))
              setStatus('已恢复默认配置')
            } else { setErr((j && j.error) || '操作失败'); setStatus('') }
          })
          .catch(function (e) { setErr(String(e && e.message || e)); setStatus('') })
      }
      function preview() {
        setErr('')
        fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody())
        })
          .then(function (r) { return r.json() })
          .then(function (j) {
            if (j && j.ok === true) {
              setDraft(ingestPayload(j))
              var nextStyle = (j.config && j.config.style) || 'jt'
              var loadedStyle = (window.__JT_STARTUP__ && window.__JT_STARTUP__.style) || null
              var api = window.__JT_STARTUP_API__
              if (nextStyle === loadedStyle && api && typeof api.replay === 'function') {
                /* 同风格重播：先刷新页面级配置，再让 runtime 重挂自己 */
                window.__JT_STARTUP__ = j.config
                if (j.config.scriptUrl) window.__JT_STARTUP_SCRIPT_URL__ = j.config.scriptUrl
                api.replay()
              } else {
                /* 跨风格或当前页没有 runtime：收掉旧画面，按新风格自举挂载 */
                crossReplay(j.config)
              }
            } else { setErr((j && j.error) || '保存失败') }
          })
          .catch(function (e) { setErr(String(e && e.message || e)) })
      }

      var isW40k = draft.top.style === 'w40k'
      var isGuard = draft.top.style === 'custodes'

      function styleCard(styleKey, zh, en, desc, artCls, artText) {
        var active = draft.top.style === styleKey
        return h('div', {
          key: styleKey,
          className: '__jt_styleCard' + (active ? ' __jt_styleActive' : ''),
          role: 'button',
          tabIndex: 0,
          onClick: function () { patch('top', 'style', styleKey) }
        },
          h('div', { className: '__jt_styleArt ' + artCls }, artText),
          h('div', { className: '__jt_styleText' },
            h('b', null, zh),
            h('span', { className: '__jt_styleEn' }, en),
            h('span', { className: '__jt_styleDesc' }, desc)
          )
        )
      }

      return h('div', { className: '__jt_root' },
        h('div', { className: '__jt_version' }, 'dsh-jt-startup v' + version + ' · 三风格启动动画'),

        h('div', { className: '__jt_group' },
          h('div', { className: '__jt_groupTitle' }, '动画风格'),
          h('div', { className: '__jt_styleGrid' },
            styleCard('jt', '极兔干线', 'Express Trunk · 极速干线', '暖白图纸 / 深夜分拣场 · 极兔红 · 全球航线地球', '__jt_art_jt', 'J&T'),
            styleCard('w40k', '战锤40K', 'Rites of the Machine God · 机神祷文', '哥特暗色 · 羊皮纸星图 · 黄铜金 · 火漆密印', '__jt_art_w40k', '✦'),
            styleCard('custodes', '战锤禁军', 'Auramite Vigil · 黄金誓约', '黑曜石 × 禁军金 · 培育槽 → 点名 → 按住举盾', '__jt_art_guard', '❖')
          ),
          h('div', { className: '__jt_hint' },
            '三套风格各自独立的身份、外观与音轨；切换只影响下次启动注入哪套运行时。禁军那套连结构都不同：点名段时长由真实清单条数决定，尾段要按住不放。'
          )
        ),

        h('div', { className: '__jt_group' },
          h('div', { className: '__jt_groupTitle' }, '播放'),
          h(Check, { label: '启用启动动画', checked: draft.top.enabled, onChange: (v) => patch('top', 'enabled', v) }),
          h(Field, { label: '播放时机' },
            h(Select, {
              value: draft.top.mode,
              options: [['session', '每个会话一次（默认）'], ['always', '每次刷新都播'], ['daily', '每天一次']],
              onChange: (v) => patch('top', 'mode', v)
            })
          ),
          h(Field, { label: '速度', hint: '0.35× – 3×' },
            h(Range, { min: 0.35, max: 3, step: 0.05, value: num(draft.top.speed, 1), display: num(draft.top.speed, 1).toFixed(2) + '×', onChange: (v) => patch('top', 'speed', v) })
          ),
          h(Check, {
            label: '交互节点（极兔/40K：两个确认点 · 禁军：按住举盾）',
            hint: isGuard ? '关闭后塔盾自动升起，不再需要按住不放' : '关闭后全程自动播放',
            checked: draft.top.requireInteraction, onChange: (v) => patch('top', 'requireInteraction', v)
          }),
          h(Check, { label: '允许跳过（Esc / 右下角）', checked: draft.top.allowSkip, onChange: (v) => patch('top', 'allowSkip', v) })
        ),

        isGuard
          ? h('div', { className: '__jt_group' },
              h('div', { className: '__jt_groupTitle' }, '身份 · 禁军黄金誓约'),
              h('div', { className: '__jt_two' },
                h(Field, { label: '名号', hint: '终幕誓约卡与盾面铭刻用的名字' },
                  h(TextInput, { mono: true, value: draft.custodes.identity, onChange: (v) => patch('custodes', 'identity', v) })
                ),
                h(Field, { label: '职阶', hint: '如 KEEPSAKE / SENTINEL / WARDEN' },
                  h(TextInput, { mono: true, value: draft.custodes.rank, onChange: (v) => patch('custodes', 'rank', v) })
                )
              ),
              h('div', { className: '__jt_two' },
                h(Field, { label: '同袍队', hint: '如 FIRST BROTHERHOOD' },
                  h(TextInput, { mono: true, value: draft.custodes.cohort, onChange: (v) => patch('custodes', 'cohort', v) })
                ),
                h(Field, { label: '盾徽编号', hint: '金纹走向与金尘的种子；留空按名号派生' },
                  h(TextInput, { mono: true, value: draft.custodes.cipher, onChange: (v) => patch('custodes', 'cipher', v) })
                )
              ),
              h(Field, { label: '守地' },
                h(TextInput, { mono: true, value: draft.custodes.station, onChange: (v) => patch('custodes', 'station', v) })
              ),
              h('div', { className: '__jt_two' },
                h(Field, { label: '举盾力度', hint: '按住多久算举满（1.2–5 秒）。太短就退化成普通确认按钮' },
                  h(Range, {
                    min: 1.2, max: 5, step: 0.1, value: num(draft.custodes.holdSeconds, 2.6),
                    display: num(draft.custodes.holdSeconds, 2.6).toFixed(1) + 's',
                    onChange: (v) => patch('custodes', 'holdSeconds', v)
                  })
                ),
                h(Field, { label: 'auramite 金' },
                  h('div', { className: '__jt_row' },
                    h(ColorInput, { value: draft.custodes.accent, onChange: (v) => patch('custodes', 'accent', v) }),
                    h('span', { className: '__jt_hint' }, '#c8a24a（禁军金，与机械教黄铜分开）')
                  )
                )
              )
            )
          : isW40k
          ? h('div', { className: '__jt_group' },
              h('div', { className: '__jt_groupTitle' }, '身份 · 战锤40K'),
              h('div', { className: '__jt_two' },
                h(Field, { label: '名讳', hint: '终幕祝福念这个名字（自动取末段作称呼）' },
                  h(TextInput, { mono: true, value: draft.w40k.identity, onChange: (v) => patch('w40k', 'identity', v) })
                ),
                h(Field, { label: '圣秩', hint: '如 TECH-ADEPT（技术神甫）' },
                  h(TextInput, { mono: true, value: draft.w40k.rank, onChange: (v) => patch('w40k', 'rank', v) })
                )
              ),
              h('div', { className: '__jt_two' },
                h(Field, { label: '驻地', hint: '星图英雄镜头的终局定影节点' },
                  h(TextInput, { mono: true, value: draft.w40k.station, onChange: (v) => patch('w40k', 'station', v) })
                ),
                h(Field, { label: '编序', hint: '二进制圣歌与火漆密印的种子' },
                  h(TextInput, { mono: true, value: draft.w40k.cipher, onChange: (v) => patch('w40k', 'cipher', v) })
                )
              ),
              h('div', { className: '__jt_row' },
                h(ColorInput, { value: draft.w40k.accent, onChange: (v) => patch('w40k', 'accent', v) }),
                h('span', { className: '__jt_hint' }, '暗腥红（默认 #8f1f1f），火漆与朝圣航线；40K 固定暗色，无浅色主题')
              )
            )
          : h('div', { className: '__jt_group' },
              h('div', { className: '__jt_groupTitle' }, '身份 · 极兔干线'),
              h('div', { className: '__jt_two' },
                h(Field, { label: '访问身份', hint: '终幕问候念这个名字（自动取末段作称呼，如 JT-Levent → Levent）' },
                  h(TextInput, { mono: true, value: draft.jt.identity, onChange: (v) => patch('jt', 'identity', v) })
                ),
                h(Field, { label: '工牌编号', hint: '同时是十六进制指纹与位图的种子' },
                  h(TextInput, { mono: true, value: draft.jt.identityId, onChange: (v) => patch('jt', 'identityId', v) })
                )
              ),
              h(Field, { label: '接入节点' },
                h(TextInput, { mono: true, value: draft.jt.hub, onChange: (v) => patch('jt', 'hub', v) })
              ),
              h('div', { className: '__jt_two' },
                h(Field, { label: '主题' },
                  h(Select, {
                    value: draft.jt.theme,
                    options: [['light', '暖白图纸'], ['dark', '深夜分拣场']],
                    onChange: (v) => patch('jt', 'theme', v)
                  })
                ),
                h(Field, { label: '品牌红' },
                  h('div', { className: '__jt_row' },
                    h(ColorInput, { value: draft.jt.accent, onChange: (v) => patch('jt', 'accent', v) }),
                    h('span', { className: '__jt_hint' }, '#d8232a')
                  )
                )
              )
            ),

        h('div', { className: '__jt_group' },
          h('div', { className: '__jt_groupTitle' }, '权限认证与声音'),
          h(Check, {
            label: '认证阶段读取真实 skills / plugins',
            hint: '读取 ~/.dsh/skills 与各 profile 已装的 dsh 插件并逐条「授权/认可」上屏；关闭则该阶段显示离线占位',
            checked: draft.top.inventory, onChange: (v) => patch('top', 'inventory', v)
          }),
          h(Check, {
            label: '业务背景层',
            hint: '极兔：全球贸易航线地球（照片命名 bg.jpg 放入 lib/assets/ 自动叠加）· 40K：背景虚化的黄金王座与余烬 · 禁军：宫殿柱列与金尘',
            checked: draft.top.background, onChange: (v) => patch('top', 'background', v)
          }),
          h(Check, { label: '界面音效（WebAudio 合成，无音频文件）', checked: draft.top.sound, onChange: (v) => patch('top', 'sound', v) }),
          h(Check, {
            label: '女声英文旁白（三套各自台词，同一复刻音色）',
            hint: '每套风格各自一条英文旁白轨（lib/assets/voice/<风格>/，同一复刻音色），跟随音效开关与音量；清单读取失败时如实播报',
            checked: draft.top.voice, onChange: (v) => patch('top', 'voice', v)
          }),
          h(Field, { label: '音效音量' },
            h(Range, { min: 0, max: 1, step: 0.05, value: num(draft.top.soundVolume, 0.5), display: Math.round(num(draft.top.soundVolume, 0.5) * 100) + '%', onChange: (v) => patch('top', 'soundVolume', v) })
          )
        ),

        h('div', { className: '__jt_actions' },
          h('button', { className: '__jt_btn __jt_btnPrimary', type: 'button', onClick: save }, '保存'),
          h('button', { className: '__jt_btn', type: 'button', onClick: preview }, '保存并立即预览'),
          h('button', { className: '__jt_btn', type: 'button', onClick: reset }, '恢复默认'),
          status ? h('span', { className: '__jt_ok' }, status) : null,
          err ? h('span', { className: '__jt_err' }, err) : null
        ),
        h('div', { className: '__jt_hint' },
          isGuard
            ? '禁军三段：培育槽（液面下降、金纹爬甲、睁眼）→ 闸门开启 → 点名（真实 skills/plugins 逐位入列，条数决定这一段多长）→ 举盾（按住升起、松手回落、超时自动放行）→ 誓约已成。'
            : isW40k
              ? '40K 七阶段：机魂唤醒 → 圣土泰拉（烛光星图 + 黄金王座）→ 神经接驳 → 身份核验（火漆密卷）→ 授权仪式（真实清单逐项认可）→ 密印达成（巨印砸落）→ 机神庇佑。'
              : '极兔七阶段：启动引导 → 起于印尼（全球镜头）→ 连接工作区 → 身份核验 → 权限认证（真实清单逐条授权）→ 认证通过 → 欢迎回来。'
        ),
        h('div', { className: '__jt_hint' },
          isGuard
            ? '禁军画面是「预渲染底片 + 实时叠加层」：甲士与殿堂是 lib/assets/frames/ 里的底片，液面、光扫、金尘、盾身沿鹰形轮廓的充能叠光仍由 Canvas 实时绘制；底片缺失时整段自动退回纯程序化绘制并在角标上如实写明。中段清单读取真实本地数据，读不到就如实标注。'
            : '全程原创绘制，无外部素材（照片背景为可选项）；中段清单读取真实本地数据，读不到就如实标注。'
        )
      )
    }

    /* ── 桌面端自举（Host 的 index 注入不生效时的兜底）──────────────────── */
    var BOOT_ROUTE = '/jt-startup'

    /* 自举时按风格挑 runtime；rootClass 与 Host 的 RUNTIMES 表一致 */
    var RUNTIME_URLS = {
      jt: { key: 'jt', css: '/splash.css', js: '/splash.js', rootClass: '' },
      w40k: { key: 'w40k', css: '/w40k.css', js: '/w40k.js', rootClass: ' jtw-root' },
      custodes: { key: 'custodes', css: '/custodes.css', js: '/custodes.js', rootClass: ' jtg-root' }
    }

    function readFlag(store, key) {
      try { return window[store].getItem(key) } catch (e) { return null }
    }
    function writeFlag(store, key, value) {
      try { window[store].setItem(key, value) } catch (e) { /* 隐私模式不可写 */ }
    }

    function loadScript(src, fail) {
      var s = document.createElement('script')
      s.src = src
      s.async = false
      if (typeof fail === 'function') {
        s.addEventListener('load', function () { fail(null) })
        s.addEventListener('error', function () { fail(new Error('script load failed: ' + src)) })
      }
      ;(document.head || document.documentElement).appendChild(s)
    }
    function loadCss(href, fail) {
      var link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      if (typeof fail === 'function') {
        link.addEventListener('load', function () { fail(null) })
        link.addEventListener('error', function () { fail(new Error('css load failed: ' + href)) })
      }
      ;(document.head || document.documentElement).appendChild(link)
    }
    function release(ok) {
      if (ok) return
      try {
        var r = document.getElementById('jt-startup-root')
        if (r && r.parentNode) r.parentNode.removeChild(r)
        if (document.documentElement.classList) document.documentElement.classList.remove('jts-lock')
        if (document.body && document.body.style) document.body.style.overflow = ''
        window.__JT_STARTUP_FAILED__ = true
      } catch (e) { /* 兜底不再抛 */ }
    }

    /** 跨风格预览：收掉当前画面（若有），按新配置重新自举另一套 runtime。
     *  注意：旧 runtime 的 finish() 会在 900ms 后移除它捕获的根节点，
     *  而两套 runtime 复用同一个 root id —— 所以这里立即亲手摘根，
     *  让旧 finish 的「parentNode 已空」守卫自然跳过，不误杀新画面。 */
    function crossReplay(cfg) {
      try {
        var api = window.__JT_STARTUP_API__
        if (api && typeof api.finish === 'function') api.finish()
      } catch (e) { /* 旧画面自己退场，失败不拦新画面 */ }
      try {
        var old = document.getElementById('jt-startup-root')
        if (old && old.parentNode) old.parentNode.removeChild(old)
      } catch (e) { /* noop */ }
      try { window.sessionStorage.removeItem('jt-startup:shown') } catch (e) { /* noop */ }
      try { window.localStorage.removeItem('jt-startup:day') } catch (e) { /* noop */ }
      injectRoot(cfg)
    }

    function injectRoot(cfg) {
      var style = (cfg && cfg.style) === 'w40k' ? 'w40k' : (cfg && cfg.style) === 'custodes' ? 'custodes' : 'jt'
      var rt = RUNTIME_URLS[style]
      var cssUrl = (cfg && typeof cfg.scriptCss === 'string' && cfg.scriptCss.charAt(0) === '/')
        ? cfg.scriptCss
        : BOOT_ROUTE + rt.css
      var jsUrl = (cfg && typeof cfg.scriptUrl === 'string' && cfg.scriptUrl.charAt(0) === '/')
        ? cfg.scriptUrl
        : BOOT_ROUTE + rt.js
      var root = document.getElementById('jt-startup-root')
      if (!root) {
        root = document.createElement('div')
        root.id = 'jt-startup-root'
        document.body.appendChild(root)
      }
      root.className = 'jts-root jts-boot' + rt.rootClass
      if (document.documentElement.classList) document.documentElement.classList.add('jts-lock')
      if (document.body && document.body.style) document.body.style.overflow = 'hidden'

      /* 双风格互斥：两套 CSS 同时在 head 里会互相覆盖共享声明 —— 换风格前
         把另一套的 link 摘掉（打上标记，只动自己的）。 */
      try {
        var links = document.querySelectorAll('link[data-jt-startup-css]')
        for (var i = 0; i < links.length; i++) {
          if ((links[i].getAttribute('href') || '') !== cssUrl) links[i].parentNode.removeChild(links[i])
        }
      } catch (e) { /* 摘不掉就并存，影响有限 */ }

      var failed = false
      var cssReady = false
      var scriptReady = false
      function guard(err) {
        if (err) {
          if (!failed && typeof console !== 'undefined' && console.warn) {
            console.warn('[dsh-jt-startup] 启动界面自举失败，已放开页面：', err.message)
          }
          failed = true
          release(false)
          return
        }
        if (cssReady && scriptReady) release(true)
      }

      loadCss(cssUrl, function (err) {
        if (err) { guard(err); return }
        cssReady = true
        try {
          /* 给新插入的 link 打标记（loadCss 没有回传节点，按 href 找最新的） */
          var all = document.querySelectorAll('link[data-jt-startup-css]')
          var marked = false
          for (var i2 = 0; i2 < all.length; i2++) {
            if ((all[i2].getAttribute('href') || '') === cssUrl) marked = true
          }
          if (!marked) {
            var cand = document.querySelectorAll('head link[rel="stylesheet"]')
            for (var i3 = cand.length - 1; i3 >= 0; i3--) {
              if ((cand[i3].getAttribute('href') || '') === cssUrl) {
                cand[i3].setAttribute('data-jt-startup-css', '1')
                break
              }
            }
          }
        } catch (e) { /* 标记失败不影响加载 */ }
        guard(null)
      })

      window.__JT_STARTUP__ = cfg || {}
      window.__JT_STARTUP_SCRIPT_URL__ = jsUrl
      window.__JT_STARTUP_CSS_URL__ = cssUrl
      try { delete window.__JT_STARTUP_LOADED__ } catch (e) { window.__JT_STARTUP_LOADED__ = undefined }
      loadScript(jsUrl + '?t=' + Date.now(), function (err) {
        if (err) { guard(err); return }
        scriptReady = true
        guard(null)
      })

      setTimeout(function () {
        try {
          var r = document.getElementById('jt-startup-root')
          if (r && r.className && r.className.indexOf('jts-boot') !== -1) release(false)
        } catch (e) { /* 兜底不再抛 */ }
      }, 9000)
    }

    function selfBoot() {
      try {
        if (typeof window === 'undefined' || typeof document === 'undefined') return
        if (!document.body) return
        if (window.__JT_STARTUP_BOOT__) return          /* 已被 Host 或本侧接管 */
        if (window.__JT_STARTUP__) return               /* 配置已在页面上：Host 注入过 */
        if (document.getElementById('jt-startup-root')) return
        if (window.__JT_STARTUP_FAILED__ === true) return
        window.__JT_STARTUP_BOOT__ = 'client'
        fetch(API, { headers: { Accept: 'application/json' } })
          .then(function (r) { return r.json() })
          .then(function (j) { return j && j.ok === true ? j.config : null })
          .catch(function () { return null })
          .then(function (cfg) {
            cfg = cfg || { enabled: true, mode: 'session', speed: 1 }
            if (cfg.enabled === false) return
            var today = new Date().toISOString().slice(0, 10)
            if (cfg.mode === 'session' && readFlag('sessionStorage', 'jt-startup:shown') === '1') return
            if (cfg.mode === 'daily' && readFlag('localStorage', 'jt-startup:day') === today) return
            /* 回填判定标记，保证与 Host 侧同款语义（splash.js 会读这两个键） */
            if (cfg.mode === 'session') writeFlag('sessionStorage', 'jt-startup:shown', '1')
            if (cfg.mode === 'daily') writeFlag('localStorage', 'jt-startup:day', today)
            return injectRoot(cfg)
          })
          .catch(function () { /* 自举失败就算了，页面本来就是好的 */ })
      } catch (e) { /* 自举是兜底，绝不许把宿主带崩 */ }
    }

    /* ── 插件 ────────────────────────────────────────────────────────────── */
    var inject = ['slots']

    function apply(ctx) {
      /* 桌面端兜底：Host 的 index 注入不生效时，由这里自举启动界面。
         正常 web 流程下 __JT_STARTUP__/__JT_STARTUP_BOOT__ 已就位，本调用直接返回。 */
      selfBoot()
      /* 设置入口：深潜协议（dsh-startup-screen）已卸载，极兔是唯一的启动动画，
         所以恢复注册自己的设置面板（label 直接叫「启动动画」）。 */
      ctx.slots.inject('settings.section', function () {
        return ctx.slots.register(
          { name: 'settings.section', id: 'jt-startup', order: 26, label: '启动动画' },
          function () { return h(Panel, {}) }
        )
      })
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
