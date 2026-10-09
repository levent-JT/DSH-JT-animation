# dsh-jt-startup · 极兔速递启动画面「J&T 研发控制台」

给 DSH（DeepSeek Harness / DeepSeek Harness Desktop）加一套极兔速递原创的
启动动画。**开发者叙事为主轴**，公司业务以一条电影感开场长镜头呈现：
**起于印尼（2015 · 雅加达）→ 航线沿扩张史点亮全球 → 镜头拉远 → 定影上海总部**。

## 演出结构（七阶段，约 30s，可跳过）

| # | 阶段 | 画面 |
|---|------|------|
| 00 | BOOT 启动引导 | 品牌红满屏，制图风方标（选框式徽记）矢量描线成型 |
| 01 | ORIGIN 起于印尼 | **开场长镜头**：雅加达多线齐发，全网级联开花 —— 六洲 **69 站 ~328 线**（64 粗 / 264 细，含上海与悉尼两条平滑跨太平洋大弧与中国国内子网）；31 国首次触达淡入极简极兔红兔标→ 镜头定影「SHA · 全球总部」 |
| 02 | LINK 连接工作区 | 总部节点握手波纹接通本机 DSH 工作区（确认节点 ①） |
| 03 | PROFILE 身份核验 | 工牌指纹逐位滚动校验 + 选区括号锁定 + VERIFIED + 身份卡（确认节点 ②） |
| 04 | AUTH 权限认证 | 终端式授权台 `jt-auth`：**真实读取** `~/.dsh/skills` 与各 profile 已装插件，逐条 granted + 作用域计数 |
| 05 | GRANTED 认证通过 | ACCESS GRANTED 汇总（N skills · N plugins · 耗时），背景大陆航线网 |
| 06 | ONLINE 欢迎回来 | 方标徽记定妆 + 上线光带 + 时段问候与作用域回执收尾 |

设计原则：**零依赖、无网络请求、除公有领域简化大陆轮廓（Natural Earth）外无任何外部素材**；
音效全部 WebAudio 现场合成；清单读取的是真实本地数据，读不到就如实标注
「离线预览」，绝不模拟进度。

## 安装

```bash
# 桌面端：先完全退出 DeepSeek Harness Desktop，然后
dsh plugin --profile desktop add ./dsh-jt-startup-0.2.19.tgz
# web 端
dsh plugin --profile web add ./dsh-jt-startup-0.2.19.tgz
```

Windows 双击 `安装.cmd` 会自动打包并安装到检测到的 profile。

装完**重启 DSH**（桌面端完全退出再打开；web 重启进程 + 浏览器 Ctrl+Shift+R 硬刷新）。
设置入口：DSH 设置页 →「启动动画 · 极兔」。

> ⚠️ 若装有 `dsh-startup-screen`：两套启动动画会叠屏，请先
> `dsh plugin --profile desktop remove dsh-startup-screen`
> （或把 `~/.dsh/dsh-startup.json` 的 `enabled` 改为 `false`）。
> `安装.cmd` 会自动检测并提示。

## 离线预览

双击 `打开预览.cmd`（或浏览器打开 `preview/index.html`）——与正式运行时同一份
`lib/splash.js`。file:// 下无法访问宿主接口，勾选预览台里的「演示清单」可看
「权限认证」阶段效果；URL 加 `?motion=full` 可在系统"减弱动态效果"下仍预览完整节奏。

## 配置（`~/.dsh/jt-startup.json`，设置页可改）

| 字段 | 默认 | 说明 |
|---|---|---|
| enabled | true | 总开关（session/daily 模式由存储标记判定） |
| mode | session | 每会话一次 / always / 每天一次 |
| theme | light | 暖白图纸 / 深夜分拣场 |
| speed | 1 | 0.35×–3× |
| requireInteraction | true | 两个确认节点等待用户（Enter/Space/点击） |
| allowSkip | true | Esc / 右下角跳过 |
| sound / soundVolume | true / 0.5 | WebAudio 合成音效 |
| identity / identityId | JT-DEVELOPER / JT0001 | 访问身份 / 工牌号（指纹与位图种子） |
| hub | SHANGHAI · GLOBAL HQ | 身份卡「接入节点」 |
| inventory | true | 中段读取真实清单 |
| background | true | 业务背景层（简化大陆航线地球） |
| accent | #d8232a | 品牌红 |

首次运行会把旧插件 `~/.dsh/dsh-startup.json` 里已配置的 identity/identityId
带过来。可选照片背景：把照片命名为 `bg.jpg`（或 png/webp/avif）放进
`lib/assets/`，动画会自动虚化压暗叠在纸面底色上（不放则只用程序化地球）。

## 插件结构

```
lib/index.js    Host 半侧：/jt-startup 路由（splash.css/js、config、asset）
                + tapIndex 首屏注入 + 真实清单读取（skills / 已装插件）
lib/splash.js   运行时（浏览器端，零依赖）：七阶段时间线 + Canvas 长镜头 +
                WebAudio 配乐；内嵌 Natural Earth 50m 简化大陆轮廓（DP 抽稀 + 0.05° 量化 + base36 编码，仅 36KB）
lib/splash.css  全部样式（阶段类 jts-p0…jts-p6 控制可见性）
lib/client.js   设置页「启动动画 · 极兔」+ 桌面端自举兜底
preview/        离线预览页（复用同一份运行时）
test/smoke.mjs  冒烟测试：node test/smoke.mjs
```

真实清单接口：`GET /jt-startup/inventory.json` →
`{ok, skills:[{name,source}], plugins:[{name,version,tools,source}], elapsed_ms}`。
skills 读 `~/.dsh/skills/*/SKILL.md` 的 `name`（无则目录名）；plugins 枚举各
profile `package.json` 依赖中带 `dsh` 字段或 `dsh-*` 命名者（`@deepseek-ai/*`
宿主本体不计），版本以 node_modules 实际安装为准。

## 行为兼容与安全

- 首屏兜底：index 注入的引导脚本带 9 秒保险，运行时异常必放行，绝不锁屏；
- 桌面端无 webServer 时由 client.js 自举，失败静默放行；
- 自定义路由全部过 DSH 信任栅栏（`connection.requestRejection`）；
- 配置写入原子（tmp + rename），数值夹取、枚举校验；
- `prefers-reduced-motion` 下各阶段自动压缩到 420ms 并停用装饰动画。

## 开发

```bash
node test/smoke.mjs      # 冒烟测试（语法 / 路由 / 注入 / 清单 / 配置往返）
打开预览.cmd             # 离线预览
npm pack                 # 打 tgz
```
