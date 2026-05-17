#!/usr/bin/env bash
# 一键自检（仓库根跑）—— bash / CI
#
# 用法：./scripts/verify-all.sh
# 任一红 = exit 1，CI 直接挂。

set -e
root="$(cd "$(dirname "$0")/.." && pwd)"
failed=()

green='\033[0;32m'
red='\033[0;31m'
cyan='\033[0;36m'
nc='\033[0m'

step() {
  local name="$1"; shift
  echo -e "${cyan}▶  $name${nc}"
  if "$@"; then
    echo -e "${green}✔  $name${nc}"
  else
    echo -e "${red}✖  $name${nc}"
    failed+=("$name")
  fi
}

run_pnpm() { (cd "$2" && corepack pnpm "$1"); }
run_uv()   { (cd "$2" && uv run $1); }

web="$root/apps/web"
step "[1/7] frontend lint"      run_pnpm lint      "$web"
step "[2/7] frontend tests"     run_pnpm test      "$web"
step "[3/7] frontend typecheck" run_pnpm typecheck "$web"

q="$root/services/report-query"
step "[4/7] report-query ruff"   run_uv "ruff check ." "$q"
step "[5/7] report-query mypy"   run_uv "mypy app"     "$q"
step "[6/7] report-query pytest" run_uv "pytest -q"    "$q"

g="$root/services/report-generation"
step "[7/7] report-generation lint+mypy+pytest" bash -c "
  cd '$g' && uv run ruff check . && uv run mypy app && uv run pytest -q
"

if command -v docker > /dev/null 2>&1; then
  step "[bonus] docker compose config" docker compose -f "$root/docker-compose.yml" config
fi

echo
if [ ${#failed[@]} -eq 0 ]; then
  echo -e "${green}═══════════════════════════════${nc}"
  echo -e "${green}      ALL CHECKS PASSED${nc}"
  echo -e "${green}═══════════════════════════════${nc}"
  exit 0
else
  echo -e "${red}═══════════════════════════════${nc}"
  echo -e "${red}  FAILED:${nc}"
  for f in "${failed[@]}"; do
    echo -e "${red}    - $f${nc}"
  done
  echo -e "${red}═══════════════════════════════${nc}"
  exit 1
fi
