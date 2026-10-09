# dsh-jt-startup · 双风格启动动画「极兔干线 / 战锤40K」

给 DSH（DeepSeek Harness / DeepSeek Harness Desktop）加启动动画，**v0.3 起一个插件两套完全独立的美术风格**，设置页里随时切换、各配各的身份：

- **极兔干线 EXPRESS TRUNK** —— 原版：开发者叙事为主轴，公司业务以一条电影感开场长镜头呈现：**起于印尼（2015 · 雅加达）→ 航线沿扩张史点亮全球 → 镜头拉远 → 定影上海总部**。
- **战锤40K · 机神祷文 RITES OF THE MACHINE GOD** —— 哥特暗色致敬风格：暗虚空星语者导航星图（泰拉即燃烧的星炬 Astronomican）、贯穿全场的虚化黄金王座、电影级机锻压印祝圣、琥珀磷光思考机终端；星图与神经接驳**共用一套图形语言**（背景形态渐变，不是换场）；全程**鼠标烛光/视差/点击星火**反馈 + 胶片颗粒暗角；**女声英文旁白**（深潜计划同款音色）两套风格共用。

## 演出结构（两套各七阶段，约 30s，可跳过）

### 极兔干线

| # | 阶段 | 画面 |
|---|------|------|
| 00 | BOOT 启动引导 | 品牌红满屏，制图风方标（选框式徽记）矢量描线成型 |
| 01 | ORIGIN 起于印尼 | **开场长镜头**：雅加达多线齐发，全网级联开花 —— 六洲 **69 站 ~328 线**（64 粗 / 264 细，含两条跨太平洋大弧与中国国内子网）；31 国首次触达淡入极简极兔红兔标 → 镜头定影「SHA · 全球总部」 |
| 02 | LINK 连接工作区 | 总部节点握手波纹接通本机 DSH 工作区（确认节点 ①） |
| 03 | PROFILE 身份核验 | 工牌指纹逐位滚动校验 + 身份卡（确认节点 ②） |
| 04 | AUTH 权限认证 | 终端式授权台 `jt-auth`：**真实读取** `~/.dsh/skills` 与各 profile 已装插件，逐条 granted + 作用域计数 |
| 05 | GRANTED 认证通过 | ACCESS GRANTED 汇总（N skills · N plugins · 耗时），背景大陆航线网 |
| 06 | ONLINE 欢迎回来 | 方标徽记定妆 + 上线光带 + 时段问候与作用域回执收尾 |

### 战锤40K · 机神祷文

叙事是一场完整的机械教仪式（唤醒 → 朝圣 → 接驳 → 铭刻 → 唤醒圣物 → 祝圣 → 庇佑），不是企业授权流程；**黄金王座作为暗背景母题贯穿全部七幕**，辉光随仪式推进呼吸涨落。美术纪律：每帧只留一个发光主角，全场暗角 + 胶片颗粒收掉中间调；**鼠标交互**（烛光跟随 / 图面与王座视差 / 点击星火涟漪 / 按钮悬停）贯穿全程。

### 女声英文旁白（voice，两套风格共用）

深潜计划同款音色：Qwen3-TTS 参考音克隆预生成的英文 wav（24 kHz 单声道，随包分发在 `lib/assets/voice/`，来源与校验记录见其 `manifest.json`，模型 Apache-2.0）。阶段映射两套一致 —— 长镜头阶段（起于印尼 / 朝圣航路）不配旁白，把声音留给配乐：

| 阶段 | 台词 |
|---|---|
| 00 启动 / 唤醒 | D. S. H. Startup sequence initiated. |
| 02 连接 / 接驳 | Preparing the local workspace. |
| 03 身份 / 铭刻 | Operator profile confirmed. |
| 04 认证 / 圣物 | Loading local skills and plugins. |
| 05 通过 / 祝圣 | Local resources loaded.（清单读取失败则播 Local resources could not be loaded.）|
| 06 欢迎 / 庇佑 | Welcome, Operator. |

行为：跟随「界面音效」开关与音量；被浏览器自动播放策略拦截时在首个手势补播；Esc / 跳过 / 重播 / 揭幕瞬间整体静音。设置页可单独关闭。

| # | 阶段 | 画面 |
|---|------|------|
| 00 | AWAKENING 唤醒机魂 | CRT 上电横线展开 → 一枚齿轮开始转动，二进制圣歌逐字敲出；末段中央暖光涨起，把烛光递给下一幕 |
| 01 | VIA SANCTA 朝圣航路 | **开场长镜头**：暗虚空导航星图（星云 + 三景深星野 + 极坐标刻度网），**泰拉即星炬**——白金焰核 + 灯塔扫掠环 + 圣光芒；暗腥红 ramp 航线（每条独立弧度、错峰生长，主脉彗星巡航 / 支线流光虚线）点亮 41 星域；**背景虚化的黄金王座**随镜头拉出渐显；终场镜头焦点交给「驻地」节点 |
| 02 | UPLINK 神经接驳 | **星图自身渐变为神经网络**：虚空褪成电路面、航线退为低亮暖铜神经束、汇聚脉冲潜向星炬接口、镜头推向泰拉；尖拱浮现作画框、拱内悬香炉齿轮（确认节点 ①「诵念接驳祷文」） |
| 03 | INSCRIPTIO 铭刻圣名 | 名录密卷展开：名讳 / 圣秩 / 驻地 / 编序 + 羽笔书写 + 火漆小印 + 二进制圣歌条（确认节点 ②「落笔铭刻」）；尖拱自上一幕延续、缓缓让位 |
| 04 | RELICS 唤醒圣物 | 密卷卷轴上收离场 → 琥珀磷光思考机终端 `cogitator --rites`：**真实读取** `~/.dsh` 名录，圣仪（skills）/ 圣物（plugins）逐件唤醒（awakened）+ 圣歌间奏 |
| 05 | CONSECRATIO 机神祝圣 | **机锻压印**：巨型机械齿轮压头（冲头杆 + 三导杆）砸下，把 Cog Mechanicum 圣徽**等离子蚀刻**进场面 —— 撞击闪光 + 能量冲击环 + 白金火星 + 边缘电弧，压头回缩后圣徽由炽金冷却成暗金浮雕；「CONSECRATA · 祝圣」金线铭文 |
| 06 | BENEDICTIO 机神庇佑 | **欧姆尼赛亚祝词**：拱顶齿轮骷髅圣徽下「愿欧姆尼赛亚与你同在 / 名讳」（两行）+ 圣言引文轮换（Blessed is the mind too small for doubt 等，编序播种）+ 圣仪/圣物回执；蚀刻圣徽余温光环扩散托出会话卡 |

设计原则：**零依赖、无网络请求**；画面全部程序化绘制（极兔版内嵌公有领域 Natural
Earth 简化大陆轮廓；40K 版星图 / 王座 / 压印 / 齿轮只用通用哥特符号，不使用任何
GW 商标图形）；音效 WebAudio 现场合成；**唯一的随包音频资产是女声旁白 wav**（来源
与校验见 manifest）；清单读取真实本地数据，读不到就如实标注「离线预览」，绝不模拟进度。

## 安装

```bash
# 桌面端：先完全退出 DeepSeek Harness Desktop，然后
dsh plugin --profile desktop add ./dsh-jt-startup-0.3.0.tgz
# web 端
dsh plugin --profile web add ./dsh-jt-startup-0.3.0.tgz
```

Windows 双击 `安装.cmd` 会自动打包并安装到检测到的 profile。

装完**重启 DSH**（桌面端完全退出再打开；web 重启进程 + 浏览器 Ctrl+Shift+R 硬刷新）。
设置入口：DSH 设置页 →「启动动画」（「动画风格」组里选极兔 / 40K，「保存并立即
预览」支持跨风格热切换）。

> ⚠️ 若装有 `dsh-startup-screen`：两套启动动画会叠屏，请先
> `dsh plugin --profile desktop remove dsh-startup-screen`
> （或把 `~/.dsh/dsh-startup.json` 的 `enabled` 改为 `false`）。
> `安装.cmd` 会自动检测并提示。

## 离线预览

双击 `打开预览.cmd`（或浏览器打开 `preview/index.html`）——与正式运行时同一份
`lib/splash.js` / `lib/w40k.js`。预览台顶部可即时切换风格（跨风格热切换走的就是
设置页「立即预览」的同款逻辑）；file:// 下无法访问宿主接口，勾选「演示清单」可看
认证阶段效果；URL 加 `?motion=full` 可在系统"减弱动态效果"下仍预览完整节奏，
`?style=w40k` 直接进 40K。

## 配置（`~/.dsh/jt-startup.json`，设置页可改）

v0.3 起 schema 分层：**全局字段**两套动画共用，**身份与外观按风格分组**（`jt` / `w40k`）。

### 全局

| 字段 | 默认 | 说明 |
|---|---|---|
| enabled | true | 总开关（session/daily 模式由存储标记判定） |
| mode | session | 每会话一次 / always / 每天一次 |
| style | jt | **选哪套动画**：jt 极兔干线 / w40k 战锤40K |
| speed | 1 | 0.35×–3× |
| requireInteraction | true | 两个确认节点等待用户（Enter/Space/点击） |
| allowSkip | true | Esc / 右下角跳过 |
| sound / soundVolume | true / 0.5 | WebAudio 合成音效 |
| inventory | true | 中段读取真实清单 |
| background | true | 背景层（极兔：航线地球 + 可选照片；40K：黄金王座虚影与余烬） |

### jt 组（极兔干线）

| 字段 | 默认 | 说明 |
|---|---|---|
| theme | light | 暖白图纸 / 深夜分拣场 |
| accent | #d8232a | 品牌红 |
| identity / identityId | JT-DEVELOPER / JT0001 | 访问身份 / 工牌号（指纹与位图种子） |
| hub | SHANGHAI · GLOBAL HQ | 身份卡「接入节点」 |

### w40k 组（战锤40K）

| 字段 | 默认 | 说明 |
|---|---|---|
| accent | #8f1f1f | 暗腥红（火漆与朝圣航线） |
| identity | *跟随 jt* | 名讳（留空则播种极兔组的真实身份，终幕祝福念它） |
| rank | TECH-ADEPT | 圣秩 |
| station | RYZA · FORGE WORLD | 驻地（星图长镜头的终局定影节点） |
| cipher | *按名讳派生* | 编序（二进制圣歌与密印的种子） |

旧版扁平配置（identity 等在顶层）首次读取时**自动迁移**进 jt 组，行为不变；
`identityId` 空缺时仍按身份派生。可选照片背景（仅极兔）：把照片命名为
`bg.jpg`（或 png/webp/avif）放进 `lib/assets/`，动画会自动虚化压暗叠加。

## 插件结构

```
lib/index.js    Host 半侧：/jt-startup 路由（两套 runtime 的 css/js、config、asset）
                + tapIndex 按 style 注入对应运行时 + 真实清单读取（skills / 已装插件）
lib/splash.js   极兔运行时（浏览器端，零依赖）：七阶段时间线 + Canvas 长镜头 +
                WebAudio 配乐；内嵌 Natural Earth 50m 简化大陆轮廓（36KB）
lib/splash.css  极兔样式（阶段类 jts-p0…p6）
lib/w40k.js     战锤40K运行时（浏览器端，零依赖）：与极兔同协议的七阶段时间线 +
                羊皮纸星图 / 黄金王座虚化层 / 火漆密印 / 磷光终端；零素材全程序化
lib/w40k.css    40K 样式（阶段类 jtw-p0…p6；哥特衬线 + 宋体）
lib/client.js   设置页「启动动画」（风格选择卡片 + 双套身份表单 + 跨风格热切换预览）
                + 桌面端自举兜底
preview/        离线预览页（风格下拉 / ?style=w40k，复用同一份运行时）
test/smoke.mjs  冒烟测试：node test/smoke.mjs
```

两套 runtime 共用同一注入协议（root id / `jts-boot` / `jts-lock` / storage 键 /
`__JT_STARTUP__` / `__JT_STARTUP_API__` / 9 秒 failsafe），Host 侧 `configForPage`
把当前风格组扁平化成 v0.2 同款字段视图 —— `splash.js` 无需感知 schema v2。

真实清单接口：`GET /jt-startup/inventory.json` →
`{ok, skills:[{name,source}], plugins:[{name,version,tools,source}], elapsed_ms}`。
skills 读 `~/.dsh/skills/*/SKILL.md` 的 `name`（无则目录名）；plugins 枚举各
profile `package.json` 依赖中带 `dsh` 字段或 `dsh-*` 命名者（`@deepseek-ai/*`
宿主本体不计），版本以 node_modules 实际安装为准。

## 行为兼容与安全

- 首屏兜底：index 注入的引导脚本带 9 秒保险，运行时异常必放行，绝不锁屏（两套 runtime 同款）；
- 桌面端无 webServer 时由 client.js 自举（按 style 选 runtime），失败静默放行；
- 跨风格热切换：先收旧画面（立即摘根，旧 runtime 的延迟移除带 parentNode 守卫不会误杀新画面），再按新风格自举；
- 自定义路由全部过 DSH 信任栅栏（`connection.requestRejection`）；
- 配置写入原子（tmp + rename），数值夹取、枚举校验、分组深合并；
- `prefers-reduced-motion` 下各阶段自动压缩到 420ms 并停用装饰动画。

## 开发

```bash
node test/smoke.mjs      # 冒烟测试（语法 / 路由 / 双风格注入 / 清单 / 迁移 / 配置往返）
打开预览.cmd             # 离线预览（可切风格）
npm pack                 # 打 tgz
```
