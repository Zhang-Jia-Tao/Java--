@echo off
rem Java 终极笔记 · 双击启动。用 -ExecutionPolicy Bypass 规避 Restricted 策略（只对本次进程生效）
setlocal
set "PS=powershell"
where pwsh >nul 2>nul && set "PS=pwsh"
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
if errorlevel 1 (
  echo.
  echo 启动失败，按任意键查看 .run 目录日志...
  pause >nul
)
endlocal
