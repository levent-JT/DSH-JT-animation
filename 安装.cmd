@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>nul

REM ============================================================================
REM  dsh-jt-startup 安装脚本（极兔速递 · 极速干线启动画面）
REM  ----------------------------------------------------------------------------
REM  同时支持两种 DSH：
REM    web     —— `npm i -g @deepseek-ai/dsh` 起的 dsh web 服务（web profile）
REM    desktop —— DeepSeek Harness Desktop 桌面端（desktop profile）
REM
REM  注意：
REM   1) 桌面端安装前请【完全退出】桌面端（进程不要留着），装完再打开。
REM   2) 若装有 dsh-startup-screen，两套启动动画会叠屏 —— 脚本会检测并提示禁用。
REM ============================================================================

set "HERE=%~dp0"
if "%HERE:~-1%"=="\" set "HERE=%HERE:~0,-1]"

echo.
echo ============================================================
echo   dsh-jt-startup 安装 · J&T 研发控制台 R&D CONSOLE
echo ============================================================
echo   包目录：%HERE%
echo.

REM ── 1) 冲突检测：dsh-startup-screen ───────────────────────────────────────
set "OLD_CFG=%USERPROFILE%\.dsh\dsh-startup.json"
if exist "%OLD_CFG%" (
    echo [!] 检测到 dsh-startup-screen 的配置文件。两套启动动画同时启用会叠屏。
    echo     建议：让旧插件停用（enabled 改为 false），或先执行：
    echo        dsh plugin --profile desktop remove dsh-startup-screen
    set /p DISABLE_OLD="    现在把旧插件配置改为停用？[Y/n] "
    if /i not "!DISABLE_OLD!"=="n" (
        node -e "try{var fs=require('fs'),p=process.argv[1],c=JSON.parse(fs.readFileSync(p,'utf8'));c.enabled=false;fs.writeFileSync(p,JSON.stringify(c,null,2));console.log('    已停用旧插件（enabled=false），其设置与文件保留，随时可改回）')}catch(e){console.log('    修改失败：'+e.message)}" "%OLD_CFG%"
    )
    echo.
)

REM ── 2) 找 dsh ─────────────────────────────────────────────────────────────
where dsh >nul 2>nul
if errorlevel 1 goto no_dsh

REM ── 3) 打包 tgz（有 npm 就打包，没有则直接按目录安装）─────────────────────
set "TGZ="
where npm >nul 2>nul
if not errorlevel 1 (
    echo [1/3] 正在打包 dsh-jt-startup-*.tgz ...
    pushd "%HERE%"
    npm pack --pack-destination . >nul 2>nul
    if errorlevel 1 (
        echo       npm pack 失败，改为 link: 目录安装。
    ) else (
        for %%f in (dsh-jt-startup-*.tgz) do set "TGZ=%%f"
    )
    popd
)
if defined TGZ (
    set "SOURCE=%HERE%\!TGZ!"
    echo       已生成 !TGZ!
) else (
    set "SOURCE=link:%HERE%"
)
echo.

REM ── 4) 逐个安装到存在的 profile ──────────────────────────────────────────
set "INSTALLED=0"
for %%p in (web desktop) do (
    if exist "%USERPROFILE%\.dsh\profiles\%%p\package.json" (
        echo [2/3] 安装到 %%p profile ...
        dsh plugin --profile %%p add "!SOURCE!"
        if not errorlevel 1 set "INSTALLED=1"
        echo.
    )
)
if "%INSTALLED%"=="0" (
    echo [2/3] 没有找到已初始化的 profile，按默认 web 安装 ...
    dsh plugin --profile web add "!SOURCE!"
)

echo [3/3] 完成。请重启 DSH：
echo     - 桌面端：完全退出 DeepSeek Harness Desktop 后重新打开
echo     - web：关掉 dsh web 进程重新启动，然后浏览器 Ctrl+Shift+R 硬刷新
echo     设置入口：DSH 设置页 → 「启动动画 · 极兔」
echo.
goto :eof

:no_dsh
echo [错误] 找不到 dsh 命令。请先安装：npm i -g @deepseek-ai/dsh
echo        （dsh 本体只提供 plugin 子命令；桌面端用户也需要它来装插件）
echo.
goto :eof
