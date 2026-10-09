@echo off
chcp 65001 >nul 2>nul
REM 离线预览：直接用默认浏览器打开启动动画预览页（无需安装、无需宿主）。
start "" "%~dp0preview\index.html"
