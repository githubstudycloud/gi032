@echo off
REM 启动 nuxt dev (json mode = 单独前端, 读 public/mock/*.json)
REM 注意 set 用引号包裹避免尾部空白污染 env 值
set "NUXT_PUBLIC_DATA_SOURCE_MODE=json"
set "NUXT_PUBLIC_MOCK_BASE=/mock"
set "NUXT_PUBLIC_API_BASE="
cd /d "%~dp0..\..\apps\web"
call node_modules\.bin\nuxt.CMD dev
