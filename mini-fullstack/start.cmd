@echo off
rem 双击即启动。用 -ExecutionPolicy Bypass 绕过公司电脑常见 Restricted 策略：
rem 这个参数只对本次进程生效，不改系统设置。
setlocal
set "PS=powershell"
where pwsh >nul 2>nul && set "PS=pwsh"
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
if errorlevel 1 (
  echo.
  echo 启动失败，按任意键查看日志...
  pause >nul
)
endlocal
