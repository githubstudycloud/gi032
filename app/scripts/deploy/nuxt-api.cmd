@echo off
REM 启动 nuxt dev (api mode = 连服务器后端 192.168.0.132)
REM nginx 反代在 80 端口, 一并接管 /api/admin /api/scheduler 路由
set "NUXT_PUBLIC_DATA_SOURCE_MODE=api"
REM 服务器 80 端口被 k8s/traefik 劫持, 走 report-query 直连 18001
REM 注意: /api/admin /api/scheduler 由 report-generation 提供, 18001 不接管那两条线
REM 本场景只测前端浏览, 走 query 足够
set "NUXT_PUBLIC_API_BASE=http://192.168.0.132:18001"
set "NUXT_PUBLIC_MOCK_BASE=/mock"
cd /d "%~dp0..\..\apps\web"
call node_modules\.bin\nuxt.CMD dev
