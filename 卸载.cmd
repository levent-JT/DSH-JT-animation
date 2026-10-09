@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>nul

REM dsh-jt-startup 卸载脚本：从所有已初始化的 profile 移除本插件。
REM 配置文件 ~/.dsh/jt-startup.json 会保留（重装时身份等设置还在）。

where dsh >nul 2>nul
if errorlevel 1 (
    echo [错误] 找不到 dsh 命令。
    goto :eof
)

set "REMOVED=0"
for %%p in (web desktop) do (
    if exist "%USERPROFILE%\.dsh\profiles\%%p\node_modules\dsh-jt-startup" (
        echo 从 %%p profile 移除 dsh-jt-startup ...
        dsh plugin --profile %%p remove dsh-jt-startup
        set "REMOVED=1"
    )
)
if "%REMOVED%"=="0" echo 没有发现已安装的 dsh-jt-startup。
echo.
echo 配置保留在 %%USERPROFILE%%\.dsh\jt-startup.json，可手动删除。
echo 重启 DSH 后生效。
