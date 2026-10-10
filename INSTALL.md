# 安装说明

## 一、直接安装（推荐）

```bash
dsh plugin --profile desktop add ./dsh-jt-startup-0.5.0.tgz
```

Windows 上双击 `安装.cmd` 一样（自动 npm pack 并安装到检测到的 profile）。

装完**重启 DSH**（桌面端完全退出再重新打开；web 端重启 dsh web 进程，
浏览器 **Ctrl+Shift+R** 硬刷新——客户端 bundle 带 immutable 缓存，普通 F5 不够）。

### 为什么必须用 `dsh plugin add`

DSH 靠 **`dsh.profile.bundles`** 层堆栈决定加载哪些插件，而
`dsh plugin add` 是 `pnpm add` 的包装，装完之后 DSH 会自动把
「声明了 `dsh.bundle` 的依赖」并入层堆栈——插件自带的 `cordis.patch.yml`
就是在那时候作为一层被应用的。**手工把目录拷进 `node_modules` 不会被识别。**

### 与 dsh-startup-screen 的冲突

本插件与 `dsh-startup-screen` 都是全屏启动画面，**同时启用会叠屏**。
安装前请先卸载或停用旧的：

```bash
dsh plugin --profile desktop remove dsh-startup-screen
# 或保留但停用：把 ~/.dsh/dsh-startup.json 的 "enabled" 改为 false
```

`安装.cmd` 会检测旧配置并询问是否自动停用（只改 enabled，文件保留）。

## 二、验证装好了

重启后，**没带 token** 访问插件路由：

- `/jt-startup/splash.js`（或 `/jt-startup/w40k.js`）返回 **401** → 路由已注册（401 是信任栅栏，正常）
- 返回 **404** → 没装成功，或没重启

设置页应出现「启动动画」一节（含「动画风格」选择：极兔干线 / 战锤40K）；点其中的「保存并立即预览」可直接重播。

## 三、桌面端注意

desktop profile 的 `package.json` 由桌面端进程加锁管理：
**安装前请完全退出 DeepSeek Harness Desktop**（进程不要留着），
装完再打开。进程在跑时安装会被覆盖或直接报错。

## 四、卸载

```bash
dsh plugin --profile desktop remove dsh-jt-startup
```

配置 `~/.dsh/jt-startup.json` 会保留（重装时身份等设置还在），可手动删除。
双击 `卸载.cmd` 等效。
