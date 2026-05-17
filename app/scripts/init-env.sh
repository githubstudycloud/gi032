#!/usr/bin/env bash
# 初始化 .env —— 从 .env.example 生成，自动填强密码 / token，幂等。
#
# 用法（仓库根）：
#   ./scripts/init-env.sh             # 生成 .env（已存在则跳过）
#   ./scripts/init-env.sh --force     # 强制覆盖
#
# 默认行为：每次只为 .env 中**仍是占位符**的字段填入随机值，已设置的字段不改。
# 这样可以多次跑、补字段、不丢已配置的值。

set -e
root="$(cd "$(dirname "$0")/.." && pwd)"
ex="$root/.env.example"
out="$root/.env"
force=0
[ "$1" = "--force" ] && force=1

if [ ! -f "$ex" ]; then
  echo "✖  $ex not found" >&2
  exit 1
fi

# 生成强密码（24 位 alnum）—— openssl 优先，否则用 /dev/urandom
gen_secret() {
  if command -v openssl > /dev/null 2>&1; then
    openssl rand -base64 24 | tr -d '/+=' | cut -c1-24
  else
    head -c 32 /dev/urandom | base64 | tr -d '/+=' | cut -c1-24
  fi
}

if [ -f "$out" ] && [ "$force" = 0 ]; then
  echo "▶  $out 已存在；补缺位字段（已存在的字段不动）"
  tmp="$(mktemp)"
  cp "$out" "$tmp"

  # 给所有 *_change_me 的字段重新填
  while IFS= read -r line; do
    # 匹配 KEY=value_change_me 形式
    if echo "$line" | grep -qE '_change_me$'; then
      key="${line%%=*}"
      newval="$(gen_secret)"
      sed -i "s|^$key=.*|$key=$newval|" "$tmp"
      echo "    + 填 $key"
    fi
  done < "$out"

  mv "$tmp" "$out"
  echo "✔  补完。当前 .env：$out"
else
  echo "▶  生成新 $out（基于 .env.example）"
  cp "$ex" "$out"

  # 替换所有占位符
  for placeholder in root_pwd_change_me report_pwd_change_me; do
    val="$(gen_secret)"
    sed -i "s|$placeholder|$val|g" "$out"
  done

  # ADMIN_TOKEN= 默认空 → 给个强 token
  admin="$(gen_secret)"
  sed -i "s|^ADMIN_TOKEN=\$|ADMIN_TOKEN=$admin|" "$out"

  echo "✔  $out 生成完毕。"
fi

echo ""
echo "下一步："
echo "  docker compose up -d --build"
echo "  docker compose exec report-generation python -m app.seed --reset"
