#!/usr/bin/env bash
# 探测服务器端口占用
set -u
echo "=== ports ==="
ss -tln | tail -n +2 | awk '{print $4}' | sort -u
echo "=== specific ==="
for p in 80 3306 8001 8002 8088 18001 18002 18000; do
  if ss -tln | awk '{print $4}' | grep -qE "(^|:)$p$"; then
    echo "$p USED"
  else
    echo "$p FREE"
  fi
done
echo "=== docker net ==="
docker network ls
