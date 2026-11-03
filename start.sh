#!/usr/bin/env bash
# Java 终极笔记 · 一键启动（macOS / Linux）
#   ./start.sh            起站点(4321) + 批注服务(4400)
#   ./start.sh stop       停止
#   ./start.sh build      生产构建 + preview
#   ./start.sh clean      清 node_modules / dist / 日志
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE="$ROOT/site"
RUN="$ROOT/.run"
mkdir -p "$RUN"

SITE_PORT="${SITE_PORT:-4321}"
EDITOR_PORT="${EDITOR_PORT:-4400}"
NO_EDITOR="${NO_EDITOR:-0}"

C_CY=$'\033[36m'; C_ER=$'\033[31m'; C_OK=$'\033[32m'; C_DIM=$'\033[90m'; C_RST=$'\033[0m'
say()  { printf '%s\n' "$*"; }
step() { printf '\n%s==> %s%s\n' "$C_CY" "$*" "$C_RST"; }
die()  { printf '\n%s✗ %s%s\n' "$C_ER" "$*" "$C_RST"; exit 1; }

free_port() {
  local port="$1" pid
  pid="$(lsof -ti tcp:"$port" -sTCP:LISTEN 2>/dev/null | head -n1 || true)"
  if [ -n "${pid:-}" ]; then
    say "  端口 $port 被进程 $pid 占用，先结束"
    kill -9 "$pid" 2>/dev/null || true
  fi
}

stop_all() {
  step "停止服务"
  if [ -f "$RUN/pids" ]; then
    while read -r pid; do
      [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
    done < "$RUN/pids"
    rm -f "$RUN/pids"
  fi
  free_port "$SITE_PORT"
  free_port "$EDITOR_PORT"
  say "${C_OK}✓ 已停止${C_RST}"
}

wait_http() {
  local url="$1" limit="$2" name="$3" i=0
  while [ "$i" -lt "$limit" ]; do
    if curl -fsS -o /dev/null --max-time 3 "$url" 2>/dev/null; then return 0; fi
    sleep 1; i=$((i + 1))
  done
  say "${C_ER}  等待 $name 超时${C_RST}"; return 1
}

# 包管理器：优先 pnpm
if command -v pnpm >/dev/null; then
  PKG=pnpm
elif command -v npm >/dev/null; then
  PKG=npm
else
  PKG=""
fi

case "${1:-all}" in
  stop) stop_all; exit 0 ;;
  clean)
    stop_all
    step "清理依赖与产物"
    rm -rf "$SITE/node_modules" "$SITE/dist" "$SITE/.astro" "$RUN"
    say "${C_OK}✓ 已清理${C_RST}"; exit 0 ;;
esac

MODE="${1:-all}"
[ "$MODE" = "build" ] && DO_BUILD=1 || DO_BUILD=0

step "环境检查"
[ -d "$SITE" ] || die "找不到 site/ 目录：请在仓库根目录运行"
command -v node >/dev/null || die "找不到 node：请安装 Node 20.19+"
NODE_VER="$(node -v)"
say "  node: $NODE_VER"
node -e 'const v=process.versions.node.split(".").map(Number);process.exit(v[0]>20||(v[0]===20&&v[1]>=19)?0:1)' \
  || die "Node 版本过低（要求 >= 20.19）"
[ -n "$PKG" ] || die "找不到 pnpm / npm：先装 Node，再 npm i -g pnpm"
say "  包管理器: $PKG"

if [ ! -d "$SITE/node_modules" ]; then
  step "安装依赖（首次）"
  ( cd "$SITE" && "$PKG" install ) || {
    say "  $PKG install 失败，回退 npm install"
    ( cd "$SITE" && npm install --no-fund --no-audit ) || die "安装依赖失败"
  }
fi

step $( [ "$DO_BUILD" = "1" ] && echo "生产构建 + preview（端口 $SITE_PORT）" || echo "启动站点 dev（端口 $SITE_PORT）" )
free_port "$SITE_PORT"

ASTRO_CLI="$SITE/node_modules/astro/astro.js"
[ -f "$ASTRO_CLI" ] || die "依赖不完整（缺 node_modules/astro）：先 cd site 手动安装依赖"

if [ "$DO_BUILD" = "1" ]; then
  # 同 pnpm run build 的两步：astro build + gen-seo
  ( cd "$SITE" && node "$ASTRO_CLI" build ) || die "构建失败"
  ( cd "$SITE" && node scripts/gen-seo.mjs ) || die "gen-seo 失败"
fi

if [ "$DO_BUILD" = "1" ]; then
  ( cd "$SITE" && nohup node "$ASTRO_CLI" preview --port "$SITE_PORT" >"$RUN/site.log" 2>&1 & echo $! >>"$RUN/pids" )
else
  ( cd "$SITE" && nohup node "$ASTRO_CLI" dev --port "$SITE_PORT" >"$RUN/site.log" 2>&1 & echo $! >>"$RUN/pids" )
fi
wait_http "http://127.0.0.1:$SITE_PORT/" 150 "站点" || die "站点没起来，看 $RUN/site.log"
say "${C_OK}  ✓ 站点就绪 http://127.0.0.1:$SITE_PORT${C_RST}"

if [ "$NO_EDITOR" != "1" ]; then
  step "启动批注服务（端口 $EDITOR_PORT）"
  free_port "$EDITOR_PORT"
  ( cd "$SITE" && ANNO_PORT="$EDITOR_PORT" nohup node scripts/anno-server.mjs >"$RUN/anno.log" 2>&1 & echo $! >>"$RUN/pids" )
  if wait_http "http://127.0.0.1:$EDITOR_PORT/api/anno/all" 60 "批注服务"; then
    say "${C_OK}  ✓ 批注服务就绪 http://127.0.0.1:$EDITOR_PORT${C_RST}"
  else
    say "${C_ER}  批注服务没起来，站点仍可阅读（批注只存浏览器本地）${C_RST}"
  fi
fi

step "完成"
say "  站点：http://127.0.0.1:$SITE_PORT"
say "  停止：./start.sh stop"
say "${C_DIM}日志：$RUN${C_RST}"
if command -v open >/dev/null; then open "http://127.0.0.1:$SITE_PORT" >/dev/null 2>&1 || true; fi
if command -v xdg-open >/dev/null; then xdg-open "http://127.0.0.1:$SITE_PORT" >/dev/null 2>&1 || true; fi
