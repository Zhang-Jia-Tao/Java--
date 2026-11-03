<#
.SYNOPSIS
  Java 终极笔记 · 一键启动本地站点（Astro dev 4321 + 批注服务 4400）

.DESCRIPTION
  环境检查 → 首次自动 pnpm install → 起 Astro dev → 起批注服务 → 打开浏览器。
  只启 4321 也能读，但批注 / 内容编辑只落浏览器本地；起 4400 才会写进 site/server-data。

.EXAMPLE
  .\start.ps1                 起站点 + 批注服务
  .\start.ps1 -NoEditor       只起站点（纯阅读）
  .\start.ps1 -Build          生产构建后 preview（看最终产物）
  .\start.ps1 -Port 4500      换站点端口
  .\start.ps1 -Stop           停止（含 4321 / 4400）
  .\start.ps1 -Clean          清 node_modules / dist / 日志

.NOTES
  执行策略被限制时用 start.cmd，或：
  powershell -NoProfile -ExecutionPolicy Bypass -File .\start.ps1
#>
[CmdletBinding()]
param(
  [switch]$Stop,
  [switch]$Clean,
  [switch]$Build,
  [switch]$NoEditor,
  [int]$Port = 4321,
  [int]$EditorPort = 4400
)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$Site = Join-Path $Root 'site'
$RunDir = Join-Path $Root '.run'
$PidFile = Join-Path $RunDir 'pids.json'
New-Item -ItemType Directory -Force -Path $RunDir | Out-Null

function Say($msg, $color = 'Gray') { Write-Host $msg -ForegroundColor $color }
function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Die($msg) { Write-Host "`n✗ $msg" -ForegroundColor Red; exit 1 }
function Has($cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

# 原生命令的 stderr 在 $ErrorActionPreference=Stop 下并进管道会抛终止异常，统一走 cmd /c
function Get-NodeVersion {
  try {
    $out = (& cmd /c "node -v 2>&1" | Out-String)
    $m = [regex]::Match($out, 'v(\d+)\.(\d+)')
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
  try { Stop-Process -Id $procId -Force -ErrorAction Stop } catch { Die "无法结束进程 $procId" }
}

function Wait-Http([string]$url, [int]$seconds, [string]$name) {
  $deadline = (Get-Date).AddSeconds($seconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
      if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { return $true }
    } catch { }
    Start-Sleep -Milliseconds 600
  }
  Say "  等待 $name 超时（$seconds 秒）" Red
  return $false
}

function Stop-All {
  Step '停止服务'
  if (Test-Path $PidFile) {
    $pids = Get-Content $PidFile -Raw | ConvertFrom-Json
    foreach ($p in @($pids.site, $pids.editor)) {
      if ($p -and (Get-Process -Id $p -ErrorAction SilentlyContinue)) {
        Say "  结束进程 $p"
        try { Stop-Process -Id $p -Force -ErrorAction Stop } catch { }
      }
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
  }
  foreach ($port in @($Port, $EditorPort)) { Free-Port $port '清理' }
  Say '✓ 已停止' Green
}

if ($Stop) { Stop-All; exit 0 }

if ($Clean) {
  Stop-All
  Step '清理依赖与产物'
  foreach ($p in @((Join-Path $Site 'node_modules'), (Join-Path $Site 'dist'), (Join-Path $Site '.astro'), $RunDir)) {
    if (Test-Path $p) { Remove-Item $p -Recurse -Force; Say "  删除 $p" }
  }
  Say '✓ 已清理（下次启动会重新安装依赖）' Green
  exit 0
}

# ---------------- 环境检查 ----------------
Step '环境检查'
if (-not (Test-Path $Site)) { Die "找不到 site/ 目录：请在仓库根目录运行本脚本" }

if (-not (Has 'node')) { Die '找不到 node：请安装 Node 20+（推荐 22 LTS）' }
$nodeVer = Get-NodeVersion
# 20.19 起才满足 Astro 5 + Vite 的要求；写成 主版本*100+次版本 便于比较
if ($nodeVer -lt 2019) { Die "Node 版本过低（要求 >= 20.19）：当前 $((& cmd /c 'node -v'))" }
Say ('  node: ' + (& cmd /c 'node -v' 2>&1))

$pkgMgr = 'pnpm'
$pkgCmd = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
if (-not $pkgCmd) {
  if (Has 'npm') {
    $pkgMgr = 'npm'
    $pkgCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
    Say '  未装 pnpm，回退用 npm（首次安装会慢一些）' Yellow
  } else {
    Die '找不到 pnpm / npm：先装 Node，再 npm i -g pnpm'
  }
}
$pkgExe = if ($pkgCmd) { $pkgCmd.Source } else { $pkgMgr }
Say "  包管理器: $pkgMgr"

# ---------------- 依赖 ----------------
if (-not (Test-Path (Join-Path $Site 'node_modules'))) {
  Step '安装依赖（首次）'
  Push-Location $Site
  try {
    & $pkgExe install
    if ($LASTEXITCODE -ne 0) {
      # pnpm 11 会因「忽略 build 脚本」直接退出（ERR_PNPM_IGNORED_BUILDS），换 npm 装一遍
      Say '  pnpm install 失败，回退 npm install' Yellow
      & (Get-Command npm.cmd).Source install --no-fund --no-audit
      if ($LASTEXITCODE -ne 0) { Die '安装依赖失败，检查网络或换镜像源' }
    }
  } finally { Pop-Location }
}

# 直接调 astro CLI：pnpm run 会先做依赖状态检查，新版 pnpm 对 esbuild/sharp 的
# build 脚本被忽略时会直接退出（ERR_PNPM_IGNORED_BUILDS），绕开它更稳。
$astroCli = Join-Path $Site 'node_modules\astro\astro.js'
if (-not (Test-Path $astroCli)) { Die '依赖不完整（缺 node_modules/astro）：先 cd site 手动安装依赖' }

$pids = @{}
if (Test-Path $PidFile) {
  try { $old = Get-Content $PidFile -Raw | ConvertFrom-Json; $pids.site = $old.site; $pids.editor = $old.editor } catch { }
}

# ---------------- 站点 ----------------
Step $(if ($Build) { "生产构建 + preview（端口 $Port）" } else { "启动站点 dev（端口 $Port）" })
Free-Port $Port '站点'
$siteLog = Join-Path $RunDir 'site.log'
$siteErr = Join-Path $RunDir 'site.err.log'

if ($Build) {
  Push-Location $Site
  try {
    Say '  astro build + gen-seo（约 30 秒）'
    & node $astroCli build
    if ($LASTEXITCODE -ne 0) { Die '构建失败，看上面的报错' }
    & node scripts/gen-seo.mjs
    if ($LASTEXITCODE -ne 0) { Die 'gen-seo 失败' }
  } finally { Pop-Location }
}

$siteArgs = if ($Build) { @($astroCli, 'preview', '--port', "$Port") } else { @($astroCli, 'dev', '--port', "$Port") }
$siteProc = Start-Process -FilePath 'node' -ArgumentList $siteArgs `
  -WorkingDirectory $Site -PassThru -WindowStyle Hidden `
  -RedirectStandardOutput $siteLog -RedirectStandardError $siteErr
$pids.site = $siteProc.Id

if (-not (Wait-Http "http://127.0.0.1:$Port/" 150 $(if ($Build) { 'preview' } else { 'dev server' }))) {
  Say "  查看日志：$siteLog" Yellow
  if (Test-Path $siteErr) { Get-Content $siteErr -Tail 20 | ForEach-Object { Say "  $_" DarkGray } }
  Die '站点没起来'
}
Say "  ✓ 站点就绪 http://127.0.0.1:$Port" Green

# ---------------- 批注服务 ----------------
if (-not $NoEditor) {
  Step "启动批注服务（端口 $EditorPort）"
  Free-Port $EditorPort '批注服务'
  $env:ANNO_PORT = "$EditorPort"
  $annoLog = Join-Path $RunDir 'anno.log'
  $annoErr = Join-Path $RunDir 'anno.err.log'
  $annoProc = Start-Process -FilePath 'node' -ArgumentList @('scripts/anno-server.mjs') `
    -WorkingDirectory $Site -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput $annoLog -RedirectStandardError $annoErr
  $pids.editor = $annoProc.Id

  if (-not (Wait-Http "http://127.0.0.1:$EditorPort/api/anno/all" 60 '批注服务')) {
    Say "  批注服务没起来，站点仍可阅读（批注只存浏览器本地）。日志：$annoLog" Yellow
    if (Test-Path $annoErr) { Get-Content $annoErr -Tail 10 | ForEach-Object { Say "  $_" DarkGray } }
  } else {
    Say "  ✓ 批注服务就绪 http://127.0.0.1:$EditorPort（批注/编辑会写进 site/server-data）" Green
  }
}

$pids | ConvertTo-Json | Set-Content -Path $PidFile -Encoding utf8

Step '打开浏览器'
Say "  站点：http://127.0.0.1:$Port" Green
if (-not $NoEditor) { Say "  批注服务：http://127.0.0.1:$EditorPort" Green }
Say '  提示：双击正文可就地编辑（需 4400 才会持久化到 server-data）' DarkGray
Say '  停止：.\start.ps1 -Stop' DarkGray
if (-not $env:NO_OPEN) { Start-Process "http://127.0.0.1:$Port" | Out-Null }
Say "`n日志：$RunDir" DarkGray
exit 0
