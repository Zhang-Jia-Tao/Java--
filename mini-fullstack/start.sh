#!/usr/bin/env bash
# mini-fullstack 一键启动（macOS / Linux）
# 用法：
#   ./start.sh            起前后端（默认 H2，无需 MySQL/Docker）
#   ./start.sh stop       停止
#   ./start.sh backend    只起后端
#   ./start.sh frontend   只起前端
#   ./start.sh clean      清数据、依赖与日志
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
RUN="$ROOT/.run"
mkdir -p "$RUN"

C_OK=$'\033[36m'; C_ERR=$'\033[31m'; C_OK2=$'\033[32m'; C_DIM=$'\033[90m'; C_RST=$'\033[0m'
say()  { printf '%s\n' "$*"; }
step() { printf '\n%s==> %s%s\n' "$C_OK" "$*" "$C_RST"; }
die()  { printf '\n%s✗ %s%s\n' "$C_ERR" "$*" "$C_RST"; exit 1; }

# 读取 .env
if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT/.env"
  set +a
fi

SERVER_PORT="${SERVER_PORT:-8080}"
WEB_PORT="${FRONTEND_PORT:-5173}"
export SERVER_PORT JWT_SECRET="${JWT_SECRET:-dev-only-please-replace-me-with-32-bytes-min}"
export ADMIN_USER="${ADMIN_USER:-demo}" ADMIN_PASS="${ADMIN_PASS:-123456}"
export COOKIE_SECURE="${COOKIE_SECURE:-false}"

free_port() {
  local port="$1"
  local pid
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
  free_port "$SERVER_PORT"
  free_port "$WEB_PORT"
  say "${C_OK2}✓ 已停止${C_RST}"
}

case "${1:-all}" in
  stop) stop_all; exit 0 ;;
  clean)
    stop_all
    step "清理数据与依赖"
    rm -rf "$BACKEND/data" "$BACKEND/target" "$FRONTEND/node_modules" "$RUN"
    say "${C_OK2}✓ 已清理${C_RST}"; exit 0 ;;
esac

MODE="${1:-all}"

# ---------- 环境检查 ----------
step "环境检查"
if [ "$MODE" != "frontend" ]; then
  command -v java >/dev/null || die "找不到 java：请安装 JDK 17+"
  JAVA_MAJOR="$(java -version 2>&1 | head -n1 | sed -E 's/.*version "([0-9]+).*/\1/')"
  [ "$JAVA_MAJOR" -ge 17 ] 2>/dev/null || die "java 版本过低（$JAVA_MAJOR）：需要 JDK 17+"
  say "  java: $JAVA_MAJOR"
  command -v mvn >/dev/null || die "找不到 mvn：装 Maven 3.9+，或用 IDEA 跑 MiniApplication"
fi
if [ "$MODE" != "backend" ]; then
  command -v node >/dev/null || die "找不到 node：请安装 Node 20.19+"
  say "  node: $(node -v)"
  command -v npm >/dev/null || die "找不到 npm"
fi

wait_http() {
  local url="$1" limit="$2" name="$3" i=0
  while [ "$i" -lt "$limit" ]; do
    if curl -fsS -o /dev/null --max-time 3 "$url" 2>/dev/null; then return 0; fi
    sleep 1; i=$((i + 1))
  done
  say "${C_ERR}  等待 $name 超时${C_RST}"; return 1
}

# ---------- 后端 ----------
if [ "$MODE" != "frontend" ]; then
  step "启动后端（端口 $SERVER_PORT）"
  free_port "$SERVER_PORT"
  ( cd "$BACKEND" && nohup mvn -q -DskipTests spring-boot:run >"$RUN/backend.log" 2>&1 & echo $! >>"$RUN/pids" )
  wait_http "http://127.0.0.1:$SERVER_PORT/api/ping" 180 后端 || die "后端没起来，看 $RUN/backend.log"
  say "${C_OK2}  ✓ 后端就绪 http://localhost:$SERVER_PORT/api/ping${C_RST}"
fi

# ---------- 前端 ----------
if [ "$MODE" != "backend" ]; then
  step "启动前端（端口 $WEB_PORT）"
  free_port "$WEB_PORT"
  if [ ! -d "$FRONTEND/node_modules" ]; then
    say "  npm install（第一次较慢）"
    ( cd "$FRONTEND" && npm install --no-fund --no-audit ) || die "npm install 失败"
  fi
  ( cd "$FRONTEND" && nohup npm run dev -- --port "$WEB_PORT" --strictPort >"$RUN/frontend.log" 2>&1 & echo $! >>"$RUN/pids" )
  wait_http "http://127.0.0.1:$WEB_PORT/" 120 前端 || die "前端没起来，看 $RUN/frontend.log"
  say "${C_OK2}  ✓ 前端就绪 http://localhost:$WEB_PORT${C_RST}"
fi

step "完成"
say "  地址：http://127.0.0.1:$WEB_PORT"
say "  演示账号：demo / 123456"
say "  停止：./start.sh stop"
say "${C_DIM}日志：$RUN${C_RST}"
if command -v open >/dev/null; then open "http://127.0.0.1:$WEB_PORT" >/dev/null 2>&1 || true; fi
if command -v xdg-open >/dev/null; then xdg-open "http://127.0.0.1:$WEB_PORT" >/dev/null 2>&1 || true; fi
