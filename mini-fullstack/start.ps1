<#
.SYNOPSIS
  mini-fullstack 一键启动（Windows / PowerShell 5.1+ 与 7+ 均可）

.DESCRIPTION
  检查环境 → 首次安装前端依赖 → 后台起后端(8080) → 起前端(5173) → 打开浏览器。
  默认用 H2 文件库，不需要 MySQL / Docker。

.EXAMPLE
  .\start.ps1                 起前后端
  .\start.ps1 -Stop           停止（含被占用的 8080/5173）
  .\start.ps1 -BackendOnly    只起后端
  .\start.ps1 -FrontendOnly   只起前端
  .\start.ps1 -Clean          清数据、依赖与日志
  .\start.ps1 -Jar            用 backend/target 里打好的 jar 起后端（需先 mvn package）
#>
[CmdletBinding()]
param(
  [switch]$Stop,
  [switch]$BackendOnly,
  [switch]$FrontendOnly,
  [switch]$Clean,
  [switch]$Jar
)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$Backend = Join-Path $Root 'backend'
$Frontend = Join-Path $Root 'frontend'
$RunDir = Join-Path $Root '.run'
$PidFile = Join-Path $RunDir 'pids.json'
New-Item -ItemType Directory -Force -Path $RunDir | Out-Null

function Say($msg, $color = 'Gray') { Write-Host $msg -ForegroundColor $color }
function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Die($msg) { Write-Host "`n✗ $msg" -ForegroundColor Red; exit 1 }
function Has($cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

function Read-DotEnv {
  $file = Join-Path $Root '.env'
  if (-not (Test-Path $file)) { return }
  Get-Content $file | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $i = $line.IndexOf('=')
    if ($i -lt 1) { return }
    $k = $line.Substring(0, $i).Trim()
    $v = $line.Substring($i + 1).Trim().Trim('"')
    if ($k) { [Environment]::SetEnvironmentVariable($k, $v, 'Process') }
  }
}

function Get-Major($cmd, $pattern) {
  try {
    $out = (& $cmd $args 2>&1 | Out-String)
    if ($pattern -eq 'java') {
      $m = [regex]::Match($out, 'version "(\d+)(?:\.(\d+))?')
      if (-not $m.Success) { return 0 }
      $major = [int]$m.Groups[1].Value
      if ($major -eq 1 -and $m.Groups[2].Success) { return [int]$m.Groups[2].Value }
      return $major
    }
    $m = [regex]::Match($out, '(\d+)\.(\d+)')
    if (-not $m.Success) { return 0 }
    return [int]$m.Groups[1].Value * 100 + [int]$m.Groups[2].Value
  } catch { return 0 }
}

function Get-ListenerPid([int]$port) {
  try {
    $c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop | Select-Object -First 1
    return $c.OwningProcess
  } catch {
    $line = (netstat -ano | Select-String ":$port\s+.*LISTENING" | Select-Object -First 1)
    if ($line -and $line.Line -match '(\d+)\s*$') { return [int]$Matches[1] }
    return 0
  }
}

function Free-Port([int]$port, $label) {
  $procId = Get-ListenerPid $port
  if (-not $procId) { return }
  Say "  端口 $port 被进程 $procId 占用（$label），先释放" Yellow
  try { Stop-Process -Id $procId -Force -ErrorAction Stop } catch { Die "无法结束进程 $procId，请手动处理" }
}

function Wait-Http([string]$url, [int]$seconds, [string]$name) {
  $deadline = (Get-Date).AddSeconds($seconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
      if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { return $true }
    } catch { }
    Start-Sleep -Milliseconds 800
  }
  Say "  等待 $name 超时（$seconds 秒）" Red
  return $false
}

# ---------------- 停止 ----------------
function Stop-All {
  Step '停止服务'
  if (Test-Path $PidFile) {
    $pids = Get-Content $PidFile -Raw | ConvertFrom-Json
    foreach ($p in @($pids.backend, $pids.frontend)) {
      if ($p -and (Get-Process -Id $p -ErrorAction SilentlyContinue)) {
        Say "  结束进程 $p"
        try { Stop-Process -Id $p -Force -ErrorAction Stop } catch { }
      }
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
  }
  foreach ($port in @(8080, 5173)) { Free-Port $port '清理' }
  Say '✓ 已停止' Green
}

if ($Stop) { Stop-All; exit 0 }

if ($Clean) {
  Stop-All
  Step '清理数据与依赖'
  foreach ($p in @((Join-Path $Backend 'data'), (Join-Path $Backend 'target'), (Join-Path $Frontend 'node_modules'), $RunDir)) {
    if (Test-Path $p) { Remove-Item $p -Recurse -Force; Say "  删除 $p" }
  }
  Say '✓ 已清理（下次启动会重新安装依赖）' Green
  exit 0
}

# ---------------- 环境检查 ----------------
Step '环境检查'
Read-DotEnv

$serverPort = if ($env:SERVER_PORT) { [int]$env:SERVER_PORT } else { 8080 }
$webPort = if ($env:FRONTEND_PORT) { [int]$env:FRONTEND_PORT } else { 5173 }

if (-not $FrontendOnly) {
  if (-not (Has 'java')) { Die '找不到 java：请安装 JDK 17+ 并确保在 PATH 中' }
  $javaMajor = Get-Major 'java' 'java'
  if ($javaMajor -lt 17) { Die "java 版本过低（当前主版本 $javaMajor）：Spring Boot 3 需要 JDK 17+" }
  Say "  java: $javaMajor"

  if (-not $Jar -and -not (Has 'mvn')) {
    Die "找不到 mvn：装 Maven 3.9+，或在 IDEA 里跑 MiniApplication，或先 mvn package 后用 .\start.ps1 -Jar"
  }
}

# 优先用 npm.cmd：npm.ps1 会被执行策略拦下（很多公司电脑是 Restricted）
$npmExe = 'npm'
$npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
if ($npmCmd) { $npmExe = $npmCmd.Source }
if (-not $BackendOnly) {
  if (-not (Has 'node')) { Die '找不到 node：请安装 Node 20.19+（Vite 7 要求）' }
  $nodeVer = (Get-Major 'node' 'node')
  if ($nodeVer -lt 2019) { Die "Node 版本过低（当前 $nodeVer / 需要 >= 20.19）：升级 Node 后重开终端" }
  Say ('  node: ' + (& node -v))
  if (-not (Has 'npm')) { Die '找不到 npm：随 Node 安装，检查 PATH' }
}

# ---------------- 后端 ----------------
if (-not $FrontendOnly) {
  Step "启动后端（端口 $serverPort）"
  Free-Port $serverPort '后端'

  $env:SERVER_PORT = "$serverPort"
  if (-not $env:JWT_SECRET) { $env:JWT_SECRET = 'dev-only-please-replace-me-with-32-bytes-min' }
  if (-not $env:ADMIN_USER) { $env:ADMIN_USER = 'demo' }
  if (-not $env:ADMIN_PASS) { $env:ADMIN_PASS = '123456' }
  if (-not $env:COOKIE_SECURE) { $env:COOKIE_SECURE = 'false' }

  $outLog = Join-Path $RunDir 'backend.log'
  $errLog = Join-Path $RunDir 'backend.err.log'

  if ($Jar) {
    $jar = Get-ChildItem (Join-Path $Backend 'target') -Filter '*.jar' -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -notlike '*sources*' -and $_.Name -notlike '*.original' } |
      Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $jar) { Die '没有找到 jar：先在 backend 下执行 mvn -DskipTests package' }
    Say "  java -jar $($jar.Name)"
    $be = Start-Process -FilePath 'java' -ArgumentList @('-jar', $jar.FullName) `
      -WorkingDirectory $Backend -PassThru -WindowStyle Hidden `
      -RedirectStandardOutput $outLog -RedirectStandardError $errLog
  } else {
    Say '  mvn spring-boot:run（第一次会下载依赖，耐心等）'
    $be = Start-Process -FilePath 'mvn' -ArgumentList @('-q', '-DskipTests', 'spring-boot:run') `
      -WorkingDirectory $Backend -PassThru -WindowStyle Hidden `
      -RedirectStandardOutput $outLog -RedirectStandardError $errLog
  }

  if (-not (Wait-Http "http://127.0.0.1:$serverPort/api/ping" 180 '后端')) {
    Say "  查看日志：$outLog" Yellow
    if (Test-Path $errLog) { Get-Content $errLog -Tail 20 | ForEach-Object { Say "  $_" DarkGray } }
    Die '后端没起来'
  }
  Say "  ✓ 后端就绪 http://localhost:$serverPort/api/ping" Green
}

$pids = @{}
if (Test-Path $PidFile) {
  try { $old = Get-Content $PidFile -Raw | ConvertFrom-Json; $pids.backend = $old.backend; $pids.frontend = $old.frontend } catch { }
}
if ($be) { $pids.backend = $be.Id }

# ---------------- 前端 ----------------
if (-not $BackendOnly) {
  Step "启动前端（端口 $webPort）"
  Free-Port $webPort '前端'

  if (-not (Test-Path (Join-Path $Frontend 'node_modules'))) {
    Say '  npm install（第一次较慢）'
    Push-Location $Frontend
    try {
      & $npmExe install --no-fund --no-audit
      if ($LASTEXITCODE -ne 0) { Die 'npm install 失败，检查网络或 npm 源' }
    } finally { Pop-Location }
  }

  $fOut = Join-Path $RunDir 'frontend.log'
  $fErr = Join-Path $RunDir 'frontend.err.log'
  $fe = Start-Process -FilePath $npmExe -ArgumentList @('run', 'dev', '--', '--port', "$webPort", '--strictPort') `
    -WorkingDirectory $Frontend -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput $fOut -RedirectStandardError $fErr
  $pids.frontend = $fe.Id

  if (-not (Wait-Http "http://127.0.0.1:$webPort/" 120 '前端')) {
    Say "  查看日志：$fOut" Yellow
    if (Test-Path $fErr) { Get-Content $fErr -Tail 20 | ForEach-Object { Say "  $_" DarkGray } }
    Die '前端没起来'
  }
  Say "  ✓ 前端就绪 http://127.0.0.1:$webPort" Green
}

$pids | ConvertTo-Json | Set-Content -Path $PidFile -Encoding utf8

Step '打开浏览器'
Say "  地址：http://127.0.0.1:$webPort" Green
Say '  演示账号：demo / 123456' Green
Say '  停止：.\start.ps1 -Stop' DarkGray
if (-not $env:NO_OPEN) { Start-Process "http://127.0.0.1:$webPort" | Out-Null }

Say "`n日志：$RunDir" DarkGray
Say '祝面试顺利。' Green
