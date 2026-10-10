# dsh-jt-startup · 三风格启动动画「极兔干线 / 战锤40K / 禁军黄金誓约」

给 DSH（DeepSeek Harness / DeepSeek Harness Desktop）加启动动画，**v0.3 起一个插件两套、v0.5 起三套完全独立的美术风格**，设置页里随时切换、各配各的身份：

- **极兔干线 EXPRESS TRUNK** —— 原版：开发者叙事为主轴，公司业务以一条电影感开场长镜头呈现：**起于印尼（2015 · 雅加达）→ 航线沿扩张史点亮全球 → 镜头拉远 → 定影上海总部**。
- **战锤40K · 机神祷文 RITES OF THE MACHINE GOD** —— 哥特暗色致敬风格：暗虚空星语者导航星图（泰拉即燃烧的星炬 Astronomican）、贯穿全场的虚化黄金王座、电影级机锻压印祝圣、琥珀磷光思考机终端；星图与神经接驳**共用一套图形语言**（背景形态渐变，不是换场）；全程**鼠标烛光/视差/点击星火**反馈 + 胶片颗粒暗角。
- **战锤禁军 · 黄金誓约 AURAMITE VIGIL** —— 同宇宙不同派系，而且**连叙事结构都不一样**（不再是固定七幕 + 两个确认点）：培育槽里黄金天使连续成形 → 宫门开启 → **点名列队的长度等于你机器上真实的 skills/plugins 条数** → **按住不放举塔盾**（松手会回落，誓约要求的是坚持不是按一下）→ 誓约已成。auramite 金 × 圣血红 × 黑曜石，中文黑体、西文大写宽字距衬线，与机械教的黄铜羊皮纸彻底分开。

## 演出结构（约 30s，可跳过）

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

### 女声英文旁白（voice，每套风格各自一条轨）

同一个音色、三套各自重写的台词：阿里云百炼 **Qwen-TTS 声音复刻**（`qwen3-tts-vc-2026-01-22`，用原先那批本地生成的 clip 做参考音，所以音色延续），产物随包分发在 `lib/assets/voice/jt/` 与 `lib/assets/voice/w40k/`（24 kHz 单声道，来源与逐句时长见 `manifest.json`）。

台词是**按每幕真实时长排**的，不是照搬流程文案：极兔走全球研发调度台的陈述口吻，40K 走机械教礼仪英文（不出现 skills / workspace / profile 这类公司词）。短句实测有约 1.2s 的起收开销，所以一闪而过的幕（GRANTED 1.3s、CONSECRATIO 1.4s）**不放旁白**，让给音轨爆点。

| 幕 | 极兔干线 | 战锤40K |
|---|---|---|
| 00 唤醒 | —（1.3s 放不下）| Awaken, machine spirit. |
| 01 长镜头 | Jakarta. Two thousand fifteen. | Terra lights the dark. |
| 02 接驳 | Workspace linked. | The uplink is open. |
| 03 核验 | Operator verified. | Your name is inscribed. |
| 04 清单 | Loading local skills and plugins. | The relics awaken. |
| 05 通过/祝圣 | —（改由和弦爆点）| —（改由巨印撞击）|
| 06 终幕 | Welcome back, operator. | May the Machine God be with you. |
| 清单部分被禁用 | Some local resources need attention. | Some relics remain unawakened. |
| 清单读不到 | Local inventory is unavailable. | The codex could not be read. |

禁军这套**不按幕起播**：它的中段长度随真实条数变、尾段随你按多久变，所以台词挂在 progress 阈值与事件上（`wake / gate / muster / vigil` + 举盾结果二选一）。

| 触发 | 台词 |
|---|---|
| p 0.04（培育槽）| Forged of the Emperor's own flesh. |
| p 0.30（闸门）| The gate opens. |
| p 0.55（点名）| Your arms are counted. |
| p 0.55 变体（名录为空）| The muster is incomplete. |
| p 0.78（举盾）| Raise your shield, and hold. |
| 事件 lock（举满）| The oath is sworn. |
| 事件 timeout（6s 无进展）| The vigil waits. |

> ⚠️ **禁军旁白当前待录**：`qwen3-tts-vc-*` 的合成需要在百炼控制台**开通模型**（建音色用的是复刻额度，合成另计；未开通时接口返回 `AccessDenied.Unpurchased`）。开通后跑
> `node tools/audio/tts.mjs batch --style=custodes && node tools/audio/tts.mjs promote --style=custodes`
> 即可（音色沿用已注册的 `voice_id`，不必重新复刻）。在录上之前运行时会**静默跳过**这些句子——不出声、不报错、不卡动画。

行为：跟随「界面音效」开关与音量；人声期间音轨 duck 6dB 正好那么久（时长取自解码后的实际 buffer）；`speed > 1.5` 不播旁白（幕时长除以 speed 后台词必然跨幕）；减弱动效下整体不播；被自动播放策略拦截时在首个手势**从当前进度续播**，不再整句丢弃；Esc / 跳过 / 揭幕瞬间淡出并停掉全部已排节点。

### 音轨（每套风格一条完整配曲）

音效不再是「每幕几条固定 blip」。`lib/score.js` 是三套共用的音轨引擎（master 总线 → 限幅 → 程序生成的混响 IR），三套各自的谱表写死在同一份文件里：

- **极兔干线**：A 小调五声、96BPM 干线脉搏、0.9s 短混响；长镜头幕十音级联的声像随网络铺满六洲扫到右，定影上海一记撞击，终幕完整回收母题并八度重叠。
- **战锤40K**：D 弗里吉亚、60BPM、3.2s 大教堂混响；管风集群缓慢涌出，八记不谐泛音钟点亮星域，铁砧四击的锻打节奏，巨印砸落的大钟尾巴拖满全场，终幕把朝圣动机放慢一倍回收。
- **战锤禁军**：E 小调多利亚（与 40K 的弗里吉亚同族不同脸）、84BPM、2.0s 宫殿混响，但**不是「幕 × cue 表」**——是一条随进度变形的声床：滤波开度、混响湿度、唱垫声部、心跳周期全是 progress 的函数（从封在培育槽里走到大殿敞阔），**战鼓击点数等于真实条目数**，举盾时另有一路由按住比例驱动的 riser —— 音乐听得到你的动作。誓约那一击走侧链（先把床压下 0.42s），否则它会被开满的声床顶到限幅器后面，全片最响点会错落到开头的闸门上。

**cue 用「该幕进度的比例」描述**，绝对秒数由当幕真实时长推导 —— 所以 `speed`、减弱动效、确认节点的实际等待时长都会带着音乐一起变速，音高不变。这修掉了旧实现里音效硬编码绝对秒数、2× 速度下音乐落后画面约 3 秒的错位。

| # | 阶段 | 画面 |
|---|------|------|
| 00 | AWAKENING 唤醒机魂 | CRT 上电横线展开 → 一枚齿轮开始转动，二进制圣歌逐字敲出；末段中央暖光涨起，把烛光递给下一幕 |
| 01 | VIA SANCTA 朝圣航路 | **开场长镜头**：暗虚空导航星图（星云 + 三景深星野 + 极坐标刻度网），**泰拉即星炬**——白金焰核 + 灯塔扫掠环 + 圣光芒；暗腥红 ramp 航线（每条独立弧度、错峰生长，主脉彗星巡航 / 支线流光虚线）点亮 41 星域；**背景虚化的黄金王座**随镜头拉出渐显；终场镜头焦点交给「驻地」节点 |
| 02 | UPLINK 神经接驳 | **星图自身渐变为神经网络**：虚空褪成电路面、航线退为低亮暖铜神经束、汇聚脉冲潜向星炬接口、镜头推向泰拉；尖拱浮现作画框、拱内悬香炉齿轮（确认节点 ①「诵念接驳祷文」） |
| 03 | INSCRIPTIO 铭刻圣名 | 名录密卷展开：名讳 / 圣秩 / 驻地 / 编序 + 羽笔书写 + 火漆小印 + 二进制圣歌条（确认节点 ②「落笔铭刻」）；尖拱自上一幕延续、缓缓让位 |
| 04 | RELICS 唤醒圣物 | 密卷卷轴上收离场 → 琥珀磷光思考机终端 `cogitator --rites`：**真实读取** `~/.dsh` 名录，圣仪（skills）/ 圣物（plugins）逐件唤醒（awakened）+ 圣歌间奏 |
| 05 | CONSECRATIO 机神祝圣 | **机锻压印**：巨型机械齿轮压头（冲头杆 + 三导杆）砸下，把 Cog Mechanicum 圣徽**等离子蚀刻**进场面 —— 撞击闪光 + 能量冲击环 + 白金火星 + 边缘电弧，压头回缩后圣徽由炽金冷却成暗金浮雕；「CONSECRATA · 祝圣」金线铭文 |
| 06 | BENEDICTIO 机神庇佑 | **欧姆尼赛亚祝词**：拱顶齿轮骷髅圣徽下「愿欧姆尼赛亚与你同在 / 名讳」（两行）+ 圣言引文轮换（Blessed is the mind too small for doubt 等，编序播种）+ 圣仪/圣物回执；蚀刻圣徽余温光环扩散托出会话卡 |

### 战锤禁军 · 黄金誓约（三段式，不是七幕）

刻意不复用前两套的骨架——它们的节奏所有权是「我播给你看，你点两下确认」，禁军把两处所有权交出去：

| 段 | 画面 | 时长由谁决定 |
|---|------|---|
| I · VAT 培育槽 | 竖槽内液面缓缓下降，auramite 金纹沿预生成折线爬上甲面，最后睁眼；名号一笔一笔铸进盾面。**没有幕界**，一个 `grow` 驱动全部视觉 | 定长 5.2s |
| II · GATE → MUSTER 点名 | 两扉宫门分开、门缝漏光 → 真实 skills/plugins **一位位走上前来列队**，每步一记战鼓 + 一次转身分列，超出 12 位的归并成 `+N`；hover 某位会让它亮起并浮出名牌 | **真实条目数**（`gate + N × 0.62s`，封顶 12 位） |
| III · VIGIL 举盾 | 塔盾随压力升起，背后金光与冲击环跟着涨；鹰徽落下 = 誓约成立 | **你按住多久**（默认 2.6s 举满，松手回落） |

三条兜底纪律（都是实测踩出来的，不是设计时想当然）：

- **超时按「无进展时长」计**，不按「进段以来的总时长」—— 否则用户犹豫一下或失手掉一次盾，就再也举不满、只能被超时放行，交互变成惩罚。
- **闸门段等名录到手才开始**（最多再等 2.6s）。名录是异步取的，不等的话整段点名会被当成 0.9s 的闪幕。
- **时间线不挂在 `requestAnimationFrame` 上**。后台标签里 Chrome 会停掉 rAF，而 `jts-boot` 在接管时已经摘掉、9 秒兜底不再放行 —— 挂在 rAF 上等于「用户切走标签就被锁在启动屏前」。状态由 `consume()` 消费真实时钟，rAF 只管画，另加一个 interval 兜住后台。

契约层照旧共用（root id / `jts-boot` / `jts-lock` / storage 键 / `__JT_STARTUP_API__` / 9 秒兜底 / 信任栅栏）：**共享骨架机制，不共享叙事形状**。

设计原则：**零依赖、无网络请求**。画面：极兔与 40K 两套全程序化绘制（极兔版内嵌公有
领域 Natural Earth 简化大陆轮廓；40K 版星图 / 王座 / 压印 / 齿轮只用通用哥特符号）；
禁军版是**预渲染底片 + 实时叠加层**（见下）。三套的图形资产都是本插件自己生成的原创
素材，**不引用、不打包任何 GW / Games Workshop 的官方图片或模型照片**。音效 WebAudio
现场合成；随包的二进制资产只有女声旁白 wav（来源与校验见 manifest）与禁军底片 webp；
清单读取真实本地数据，读不到就如实标注「离线预览」，绝不模拟进度。

### 禁军底片管线（frames）

Canvas 手绘 bezier 到不了写实质感，所以禁军改成「**静帧承载画质，程序化层承载运动**」：
结构照搬 AE/PS 那套 2.5D 视差（主体单独一层、背景另起一张、两层按各自速率缩放位移），
只是用 canvas 实时合成。液面、光扫、金尘、盾身充能、六边形偏导场这些必须随时间与
按压变化的东西仍然是画出来的 —— 静帧负责质感，程序负责响应。

| 底片 | 用途 |
| --- | --- |
| `hall-bg.webp` | 帝国皇宫殿堂（满幅背景板，不键控只压缩） |
| `vat-figure.webp` | 甲士全身；点名段按真实条数多次实例化 |
| `storm-shield.webp` | 鹰形风暴盾；举盾段的交互主体，终幕复用它定格 |

只有 3 张、合计 ~570KB。点名段刻意不画「一张预先排好队的图」：**队列长度必须等于
真实清单条数**，所以是同一张甲士静帧的实例化（水平偏移 + 交替翻转 + 走近时由小变大
+ alpha 拉开层次）。

管线三步，都在本地、零新依赖：

```bash
# 1) 出图：纯色青底主体板 / 满幅背景板，源图落在 gitignore 的 tools/refs/plates/
# 2) 键控烘焙：浏览器开 http://127.0.0.1:8138/tools/artgen/bake.html?src=../refs/plates/<图>.png
#    四角取样当中位数当底色（不写死 #00FFFF —— 出图给的是偏 teal 的青）；
#    背景平坦度超 9% 会直接警告而不是硬键出一圈脏边；去溢色压掉边缘的青色通道；
#    再 toDataURL('image/webp') 出带 alpha 的成品。Node 端没有图像编解码库，
#    而 canvas 天生就有，并且和运行时同一套渲染栈，不会「本地看着对、跑起来不对」。
node tools/audio/serve.mjs        # 提供 bake 页面并接收导出（/render/save）
# 3) 落位
cp tools/audio/out/plate-custodes-*.webp lib/assets/frames/custodes/
```

**降级链路**：底片是异步读的，最多等 900ms 就开演（读不到不能把人卡在屏前）；缺任何
一张，对应那一段整段退回纯程序化绘制，并在角标上写明 `DSH · PROCEDURAL FALLBACK`。
`test/smoke.mjs` 锁住这条链：清单里点了名字就必须有文件（防死引用）、目录里不许有
未被引用的图（防体积失控）、总体积 < 2MB、超时兜底与降级标记必须存在。

## 安装

```bash
# 桌面端：先完全退出 DeepSeek Harness Desktop，然后
dsh plugin --profile desktop add ./dsh-jt-startup-0.5.0.tgz
# web 端
dsh plugin --profile web add ./dsh-jt-startup-0.5.0.tgz
```

Windows 双击 `安装.cmd` 会自动打包并安装到检测到的 profile。

装完**重启 DSH**（桌面端完全退出再打开；web 重启进程 + 浏览器 Ctrl+Shift+R 硬刷新）。
设置入口：DSH 设置页 →「启动动画」（「动画风格」组里选极兔 / 40K，「保存并立即
预览」支持跨风格热切换）。

> ⚠️ 若装有 `dsh-startup-screen`：两套启动动画同时启用会叠屏，请先
> `dsh plugin --profile desktop remove dsh-startup-screen`
> （或把 `~/.dsh/dsh-startup.json` 的 `enabled` 改为 `false`）。
> `安装.cmd` 会自动检测并提示。

## 离线预览

双击 `打开预览.cmd`（或浏览器打开 `preview/index.html`）——与正式运行时同一份
`lib/splash.js` / `lib/w40k.js` / `lib/custodes.js`。预览台顶部可即时切换风格（跨风格热切换走的就是
设置页「立即预览」的同款逻辑）；file:// 下无法访问宿主接口，勾选「演示清单」可看
认证与点名阶段效果；URL 加 `?motion=full` 可在系统"减弱动态效果"下仍预览完整节奏，
`?style=w40k` / `?style=custodes` 直接进对应风格。禁军那套的点名单会用演示清单的
9 条数据排 9 位，举盾要**按住**鼠标或空格。

## 配置（`~/.dsh/jt-startup.json`，设置页可改）

v0.3 起 schema 分层、v0.5 起三组：**全局字段**三套动画共用，**身份与外观按风格分组**（`jt` / `w40k` / `custodes`）。

### 全局

| 字段 | 默认 | 说明 |
|---|---|---|
| enabled | true | 总开关（session/daily 模式由存储标记判定） |
| holdSeconds | 2.6 | **仅禁军**：举盾要按住多久算举满（1.2–5s；`requireInteraction` 关掉则自动升起） |
| mode | session | 每会话一次 / always / 每天一次 |
| style | jt | **选哪套动画**：jt 极兔干线 / w40k 战锤40K / custodes 战锤禁军 |
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

### custodes 组（战锤禁军）

| 字段 | 默认 | 说明 |
|---|---|---|
| accent | #c8a24a | auramite 金（禁军金，刻意与机械教黄铜分开） |
| identity | *跟随 jt* | 名号（留空则播种极兔组的真实身份，终幕誓约卡念它） |
| rank | KEEPSAKE | 职阶（SENTINEL / WARDEN 等） |
| cohort | FIRST BROTHERHOOD | 同袍队 |
| station | IMPERIAL PALACE · TERRA | 守地 |
| cipher | *按名讳派生* | 盾徽编号（金纹走向与金尘分布的种子） |
| holdSeconds | 2.6 | 举盾要按住多久算举满，夹在 1.2–5s；`requireInteraction: false` 时自动升起 |

旧版扁平配置（identity 等在顶层）首次读取时**自动迁移**进 jt 组，行为不变；
`identityId` 空缺时仍按身份派生。可选照片背景（仅极兔）：把照片命名为
`bg.jpg`（或 png/webp/avif）放进 `lib/assets/`，动画会自动虚化压暗叠加。

## 插件结构

```
lib/index.js    Host 半侧：/jt-startup 路由（三套 runtime 的 css/js、config、asset）
                + tapIndex 按 style 注入对应运行时 + 真实清单读取（skills / 已装插件）
lib/splash.js   极兔运行时（浏览器端，零依赖）：七阶段时间线 + Canvas 长镜头 +
                WebAudio 配乐；内嵌 Natural Earth 50m 简化大陆轮廓（36KB）
lib/splash.css  极兔样式（阶段类 jts-p0…p6）
lib/w40k.js     战锤40K运行时（浏览器端，零依赖）：与极兔同协议的七阶段时间线 +
                羊皮纸星图 / 黄金王座虚化层 / 火漆密印 / 磷光终端；零素材全程序化
lib/w40k.css    40K 样式（阶段类 jtw-p0…p6；哥特衬线 + 宋体）
lib/custodes.js 禁军运行时（浏览器端，零依赖）：三段式 act 机 + 名录驱动的点名列队 +
                按住/回落的举盾状态机；契约层与前两套同协议，叙事结构完全独立。
                画面 = 预渲染底片（lib/assets/frames/custodes/*.webp）+ Canvas 实时叠加层
                （液面、光扫、金尘、盾身沿鹰形轮廓的充能叠光、六边形偏导场）
lib/frames/     禁军底片目录（见下「底片管线」）；缺失时整段退回纯程序化绘制
lib/custodes.css 禁军样式（act 类 jtg-a-<act>；中文黑体 + 西文大写宽字距衬线）
lib/score.js    三套共用的音轨引擎（总线/限幅/程序混响 + 合成原语 + 三套谱表与旁白 cue 表）
                —— 运行时、离线预览、tools/audio 渲染台读这一份，不存在多份实现漂移
                时间线两种 kind：phases（极兔/40K 的幕表）与 continuous（禁军：声床
                随 progress 变形 + 事件战鼓 + 按压 riser），planContinuous 是两边共用的
                时长算式
lib/client.js   设置页「启动动画」（风格选择卡片 + 三套身份表单 + 跨风格热切换预览）
                + 桌面端自举兜底
preview/        离线预览页（风格下拉 / ?style=w40k / ?style=custodes，复用同一份运行时）
tools/audio/    音频生产线（跑的是发布代码，不是复刻一份）：
                tts.mjs        百炼声音复刻旁白：probe / enroll / say / batch / promote / check
                serve.mjs      渲染台与预览台的静态服务器（127.0.0.1:8138）
                render.html    OfflineAudioContext 离线渲染整片（含旁白与 ducking）
                analyze.mjs    音轨体检：峰值 / 响度 / 动态范围 / 最响时刻 / 削顶
                runtime-harness.mjs  假 DOM 台架，在 Node 里真跑禁军的 canvas 与 act 机
                narration.json 三套台词表（含每句的时间窗预算）
test/smoke.mjs  冒烟测试：node test/smoke.mjs
```

三套 runtime 共用同一注入协议（root id / `jts-boot` / `jts-lock` / storage 键 /
`__JT_STARTUP__` / `__JT_STARTUP_API__` / 9 秒 failsafe），Host 侧 `configForPage`
把当前风格组扁平化成 v0.2 同款字段视图 —— `splash.js` 无需感知 schema v2。

音轨引擎走 `<script defer>` 的文档顺序（`/jt-startup/score.js` 先于 runtime），并暴露
`__JT_STARTUP_SCORE_URL__` / `config.scoreUrl`；桌面端自举与跨风格重放若绕开 index 注入，
runtime 自己补挂一次，等引擎到货再把挂起的乐句从当前进度续播 —— 拿不到引擎也只影响声音，
不阻塞画面。

真实清单接口：`GET /jt-startup/inventory.json` →
`{ok, skills:[{name,source}], plugins:[{name,version,tools,source}], elapsed_ms}`。
skills 读 `~/.dsh/skills/*/SKILL.md` 的 `name`（无则目录名）；plugins 枚举各
profile `package.json` 依赖中带 `dsh` 字段或 `dsh-*` 命名者（`@deepseek-ai/*`
宿主本体不计），版本以 node_modules 实际安装为准。

## 行为兼容与安全

- 首屏兜底：index 注入的引导脚本带 9 秒保险，运行时异常必放行，绝不锁屏（三套 runtime 同款）；
- 禁军的时间线不挂在 `requestAnimationFrame` 上：后台标签里 Chrome 会停掉 rAF，挂在上面会让用户切走标签后永远走不完、而兜底类已摘除等于锁死；状态由真实时钟 + interval 驱动（详见「禁军 · 三段式」的三条兜底纪律）；
- 桌面端无 webServer 时由 client.js 自举（按 style 选 runtime），失败静默放行；
- 跨风格热切换：先收旧画面（立即摘根，旧 runtime 的延迟移除带 parentNode 守卫不会误杀新画面），再按新风格自举；
- 自定义路由全部过 DSH 信任栅栏（`connection.requestRejection`）；
- 配置写入原子（tmp + rename），数值夹取、枚举校验、分组深合并；
- `prefers-reduced-motion` 下各阶段自动压缩到 420ms 并停用装饰动画。

## 开发

```bash
node test/smoke.mjs      # 冒烟测试（语法 / 三风格路由与注入 / 清单 / 迁移 / 配置往返 /
                         #   跨文件时长契约 / cue 必须是幕内比例 / 旁白不越窗）
node tools/audio/runtime-harness.mjs   # 假 DOM 台架：在 Node 里真跑禁军的 canvas 与 act 机
node tools/audio/serve.mjs             # 起渲染台/预览台 http://127.0.0.1:8138/tools/audio/render.html
node tools/audio/analyze.mjs a.wav b.wav  # 音轨体检：峰值 / 响度 / 动态范围 / 削顶
打开预览.cmd             # 离线预览（可切风格）
npm pack                 # 打 tgz
```
