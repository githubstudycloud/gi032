# 核验清单

让任何人按这份文档照着跑，就能判断"这个仓库是不是健康的"。

## 1. 一键全过（推荐先跑这个）

仓库根：

```powershell
.\scripts\verify-all.ps1
```

跑完会输出：

```text
[1/6] frontend lint .... OK
[2/6] frontend tests ... OK (xxx tests)
[3/6] frontend types ... OK
[4/6] report-query .... OK (lint+mypy+pytest)
[5/6] report-generation OK (lint+mypy+pytest)
[6/6] docker compose config OK (skipped if docker missing)
ALL GREEN.
```

任一红 = 不能合并 / 不能部署。脚本源码：[`scripts/verify-all.ps1`](../scripts/verify-all.ps1)。

## 2. 分项手动核验

### 2.1 前端

```powershell
cd apps/web
pnpm install                    # 第一次跑
pnpm lint                       # ESLint = 0
pnpm test                       # vitest，期望 90+ 个测试全过
pnpm typecheck                  # vue-tsc + nuxt typecheck，exit=0
```

**手工跑一次界面**：

```powershell
pnpm dev
# 浏览器开 http://127.0.0.1:3000
```

逐项检查：

| 页面 | 预期 |
|---|---|
| `/` | 4 卡片 + 入口卡 + 动态列表，无 console error |
| `/embed/home1` | iframe 显示外链（在线时是 Google）|
| `/ai-test/overview/summary` | 多 tab + 13 KPI + 表格，无筛选 |
| `/ai-test/overview/industry` | 时间范围 + 部门下拉**有数据** |
| `/ai-test/overview/domain` | 同上 |
| `/ai-test/general/design` | 部门排名表 |
| `/ai-test/general/codegen` | 代码生成覆盖 |
| `/ai-test/system/metrics` | 13 个指标，「+ 新增」弹窗能开 |
| `/ai-test/system/excel` | 拖拽 / 粘贴区都在 |

切换核验：
- ZH ↔ EN：所有 chrome 文案要变；数据列 / 标签留中文（数据 ≠ chrome）
- 4 主题：颜色变，layout 不挂
- 4 字体：字形变；non-system 字体需 `vendor-fonts.mjs` 跑过

### 2.2 后端 report-query

```powershell
cd services/report-query
uv sync                          # 第一次跑
uv run ruff check .              # = 0
uv run mypy app                  # success no issues
uv run pytest -q                 # 37 passed
```

启服务：

```powershell
uv run uvicorn app.main:app --port 8001 --reload
```

curl 自检：

```powershell
curl -s http://127.0.0.1:8001/api/healthz
# {"code":0,"message":"ok","trace_id":"...","data":{"status":"ok"}}

curl -s http://127.0.0.1:8001/api/dropdowns/departments | head -c 300
# 应该有 items 数组

curl -s http://127.0.0.1:8001/api/reports/summary/config | head -c 300
# meta + filters + kpi + primary_view

curl -i http://127.0.0.1:8001/api/reports/__nope__/config
# HTTP 404
```

### 2.3 后端 report-generation

```powershell
cd services/report-generation
uv sync
uv run ruff check .
uv run mypy app
uv run pytest -q                 # 20 passed
```

启服务 + seed：

```powershell
uv run uvicorn app.main:app --port 8002 --workers 1 --reload
uv run python -m app.seed --reset
```

curl 自检：

```powershell
curl -s http://127.0.0.1:8002/api/healthz
curl -s http://127.0.0.1:8002/api/scheduler/jobs
# data.jobs 里有 ingest + preagg 两个

curl -X POST -H 'Content-Type: application/json' `
     -d '{"page":1,"page_size":5}' `
     http://127.0.0.1:8002/api/admin/metrics/list
# items[] 至少 3 个

# 鉴权（开 ADMIN_TOKEN 后）
$env:ADMIN_TOKEN = "secret-123"
# 重启服务
curl -i -X POST -H 'Content-Type: application/json' `
     -d '{"page":1}' `
     http://127.0.0.1:8002/api/admin/metrics/list
# HTTP 401

curl -X POST -H 'Authorization: Bearer secret-123' `
     -H 'Content-Type: application/json' `
     -d '{"page":1}' `
     http://127.0.0.1:8002/api/admin/metrics/list
# 200
```

### 2.4 三服务联调

并行起 3 个服务：

```powershell
# 终端 1
cd apps/web && pnpm dev

# 终端 2
cd services/report-query && uv run uvicorn app.main:app --port 8001

# 终端 3
cd services/report-generation && uv run uvicorn app.main:app --port 8002 --workers 1
```

切前端到 api 模式（临时）：

```powershell
cd apps/web
$env:NUXT_PUBLIC_DATA_SOURCE_MODE = "api"
# apiBase 不带 /api —— 因为 composables 的 apiPath 已经带（如 /api/reports/X/config）
$env:NUXT_PUBLIC_API_BASE = "http://127.0.0.1:8001"
pnpm dev
# 浏览器看到的数据现在来自 8001，不是 /mock/*.json
```

> ⚠️ 容易踩坑：`NUXT_PUBLIC_API_BASE` 写成 `http://127.0.0.1:8001/api` 会导致请求拼成
> `/api/api/branding` 双 `/api/`。**正确写法**：base 是裸 host（不含 `/api`），apiPath
> 由各 composable 内部带 `/api/...` 前缀。已在 [docs/VERIFICATION-RUN-2026-05-18.md](VERIFICATION-RUN-2026-05-18.md)
> 记录此坑。

打开 DevTools Network，看请求路径都是 `http://127.0.0.1:8001/api/...`。

### 2.5 Docker（仅在装了 docker 的机器上）

```bash
cd ~/path/to/repo
cp .env.example .env
# 改 MYSQL_PASSWORD / ADMIN_TOKEN

docker compose config           # 验证 YAML 合法
docker compose up -d --build
docker compose ps               # 4 个容器 healthy

# 灌种子
docker compose exec report-generation python -m app.seed --reset

# 浏览器 http://localhost/
# /api 自动反代到 query
```

## 3. 测试数据预期值

| 项 | 预期数 | 出处 |
|---|---|---|
| frontend vitest | 70 个（4 个文件） | mock-fixtures + csv-page-parser + threshold + envelope |
| query pytest | 45 个 | smoke 12 + envelope 13 + repo 6 + drilldown 4 + chrome 8 + 2 |
| generation pytest | 20 个 | smoke 4 + admin-auth 6 + seed 3 + ingest 7 |
| seed 行数 | 10 / 9 / 12 | snapshots / dropdowns / metrics |
| 容器数 | 4 | mysql + query + generation + web |
| 端口 | 3000/8001/8002 (dev) / 80+3306 (prod) | — |

## 4. 失败现象 → 排查方向

| 现象 | 优先查 |
|---|---|
| `pnpm lint` 报 envelope 之类 import 错 | `apps/web/app/utils/envelope.ts` 是否存在 |
| `pytest` repo-fallback 测试卡住 | Windows file lock；fixture 里 `engine.dispose()` 是否被调用 |
| 前端筛选下拉空 | json 模式：URL 是否有 `.json`；api 模式：query 服务 8001 是否起 |
| 总览页有空筛选 div | `summary/config.json` 的 `filters` 是不是空数组 |
| nav 顺序不对 / 「首页」名字旧 | `apps/web/public/mock/nav.json` 是不是最新 |
| api 模式拿不到数据 | DevTools 看响应是不是 envelope；后端 logs 有没有 500 |
| Docker `web` 502 | 容器名是不是 `report-query`/`report-generation`（hyphens） |
| Scheduler 重复跑 | `report-generation` workers > 1，必须 = 1 |
| MySQL 拒绝连接 | `.env` 凭据；`docker compose logs mysql` |

## 5. 自检脚本

PowerShell 版本：[`scripts/verify-all.ps1`](../scripts/verify-all.ps1)

bash 版本：[`scripts/verify-all.sh`](../scripts/verify-all.sh)

两份内容等价。CI 里跑 bash 版；本地 Windows 跑 PowerShell 版。
