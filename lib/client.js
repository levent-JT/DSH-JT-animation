/**
 * dsh-jt-startup — 浏览器半侧（设置页「启动动画 · 极兔」）
 * ----------------------------------------------------------------------------
 * 以 dsh.client bundle 格式加载（手写 ModuleLoader bundle，无需构建）：
 * 在 DSH 设置里注册一个 `settings.section`，用来改极速干线启动动画的
 * 身份、工号、站场、主题、速度、真实清单开关、品牌色等。
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
      '.__jt_swatch{width:38px;height:26px;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;cursor:pointer}'
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

    var FALLBACK = {
      enabled: true, mode: 'session', theme: 'light', speed: 1,
      requireInteraction: true, allowSkip: true, sound: true, soundVolume: 0.5,
      identity: 'JT-DEVELOPER', identityId: 'JT0001', hub: 'SHANGHAI · GLOBAL HQ',
      inventory: true, background: true, accent: '#d8232a'
    }
    function num(v, d) { var n = Number(v); return isFinite(n) ? n : d }

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
              setDraft(Object.assign({}, FALLBACK, j.config))
              if (j.version) setVersion(j.version)
            } else {
              setDraft(Object.assign({}, FALLBACK))
            }
          })
          .catch(function () { setDraft(Object.assign({}, FALLBACK)) })
      }, [])

      if (!draft) {
        return h('div', { className: '__jt_root' }, h('div', { className: '__jt_status' }, '正在读取配置…'))
      }

      function patch(key, value) {
        var next = Object.assign({}, draft)
        next[key] = value
        setDraft(next)
        setStatus('')
      }
      function save() {
        setErr(''); setStatus('正在保存…')
        fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patch: draft })
        })
          .then(function (r) { return r.json() })
          .then(function (j) {
            if (j && j.ok === true) {
              setDraft(Object.assign({}, FALLBACK, j.config))
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
              setDraft(Object.assign({}, FALLBACK, j.config))
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
          body: JSON.stringify({ patch: draft })
        })
          .then(function (r) { return r.json() })
          .then(function (j) {
            if (j && j.ok === true) {
              setDraft(Object.assign({}, FALLBACK, j.config))
              if (window.__JT_STARTUP_API__ && typeof window.__JT_STARTUP_API__.replay === 'function') {
                window.__JT_STARTUP_API__.replay()
              } else {
                setStatus('已保存。刷新页面即可预览（当前页未加载启动运行时）')
              }
            } else { setErr((j && j.error) || '保存失败') }
          })
          .catch(function (e) { setErr(String(e && e.message || e)) })
      }

      return h('div', { className: '__jt_root' },
        h('div', { className: '__jt_version' }, 'dsh-jt-startup v' + version + ' · 极速干线 EXPRESS TRUNK'),

        h('div', { className: '__jt_group' },
          h('div', { className: '__jt_groupTitle' }, '播放'),
          h(Check, { label: '启用启动动画', checked: draft.enabled, onChange: (v) => patch('enabled', v) }),
          h(Field, { label: '播放时机' },
            h(Select, {
              value: draft.mode,
              options: [['session', '每个会话一次（默认）'], ['always', '每次刷新都播'], ['daily', '每天一次']],
              onChange: (v) => patch('mode', v)
            })
          ),
          h('div', { className: '__jt_two' },
            h(Field, { label: '主题' },
              h(Select, {
                value: draft.theme,
                options: [['light', '暖白图纸'], ['dark', '深夜分拣场']],
                onChange: (v) => patch('theme', v)
              })
            ),
            h(Field, { label: '速度', hint: '0.35× – 3×' },
              h(Range, { min: 0.35, max: 3, step: 0.05, value: num(draft.speed, 1), display: num(draft.speed, 1).toFixed(2) + '×', onChange: (v) => patch('speed', v) })
            )
          ),
          h(Check, { label: '两个确认节点（确认接入 / 确认身份）', hint: '关闭后全程自动播放', checked: draft.requireInteraction, onChange: (v) => patch('requireInteraction', v) }),
          h(Check, { label: '允许跳过（Esc / 右下角）', checked: draft.allowSkip, onChange: (v) => patch('allowSkip', v) })
        ),

        h('div', { className: '__jt_group' },
          h('div', { className: '__jt_groupTitle' }, '身份'),
          h('div', { className: '__jt_two' },
            h(Field, { label: '访问身份', hint: '终幕问候念这个名字（自动取末段作称呼，如 JT-Levent → Levent）' },
              h(TextInput, { mono: true, value: draft.identity, onChange: (v) => patch('identity', v) })
            ),
            h(Field, { label: '工牌编号', hint: '同时是十六进制指纹与位图的种子' },
              h(TextInput, { mono: true, value: draft.identityId, onChange: (v) => patch('identityId', v) })
            )
          ),
          h(Field, { label: '接入节点' },
            h(TextInput, { mono: true, value: draft.hub, onChange: (v) => patch('hub', v) })
          )
        ),

        h('div', { className: '__jt_group' },
          h('div', { className: '__jt_groupTitle' }, '权限认证与声音'),
          h(Check, {
            label: '权限认证阶段读取真实 skills / plugins',
            hint: '读取 ~/.dsh/skills 与各 profile 已装的 dsh 插件并逐条「授权」上屏；关闭则该阶段显示离线占位',
            checked: draft.inventory, onChange: (v) => patch('inventory', v)
          }),
          h(Check, {
            label: '业务背景层',
            hint: '全球贸易航线地球；把照片命名为 bg.jpg 放入插件 lib/assets/ 会自动虚化叠加',
            checked: draft.background, onChange: (v) => patch('background', v)
          }),
          h(Check, { label: '界面音效（WebAudio 合成，无音频文件）', checked: draft.sound, onChange: (v) => patch('sound', v) }),
          h(Field, { label: '音效音量' },
            h(Range, { min: 0, max: 1, step: 0.05, value: num(draft.soundVolume, 0.5), display: Math.round(num(draft.soundVolume, 0.5) * 100) + '%', onChange: (v) => patch('soundVolume', v) })
          )
        ),

        h('div', { className: '__jt_group' },
          h('div', { className: '__jt_groupTitle' }, '外观'),
          h('div', { className: '__jt_row' },
            h(ColorInput, { value: draft.accent, onChange: (v) => patch('accent', v) }),
            h('span', { className: '__jt_hint' }, '品牌红（默认 #d8232a 极兔红），序章满屏与点缀色')
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
          '动画七阶段：启动引导 → 起于印尼（全球镜头）→ 连接工作区 → 身份核验 → 权限认证（真实清单逐条授权）→ 认证通过 → 欢迎回来。全程原创绘制，无外部素材（照片背景为可选项）。'
        )
      )
    }

    /* ── 桌面端自举（Host 的 index 注入不生效时的兜底）──────────────────── */
    var BOOT_ROUTE = '/jt-startup'

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

    function injectRoot(cfg) {
      var root = document.getElementById('jt-startup-root')
      if (!root) {
        root = document.createElement('div')
        root.id = 'jt-startup-root'
        document.body.appendChild(root)
      }
      root.className = 'jts-root jts-boot'
      if (document.documentElement.classList) document.documentElement.classList.add('jts-lock')
      if (document.body && document.body.style) document.body.style.overflow = 'hidden'

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

      loadCss(BOOT_ROUTE + '/splash.css', function (err) {
        if (err) { guard(err); return }
        cssReady = true
        guard(null)
      })

      window.__JT_STARTUP__ = cfg || {}
      try { delete window.__JT_STARTUP_LOADED__ } catch (e) { window.__JT_STARTUP_LOADED__ = undefined }
      loadScript(BOOT_ROUTE + '/splash.js?t=' + Date.now(), function (err) {
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
      ctx.slots.inject('settings.section', function () {
        return ctx.slots.register(
          { name: 'settings.section', id: 'jt-startup', order: 27, label: '启动动画 · 极兔' },
          function () { return h(Panel, {}) }
        )
      })
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
