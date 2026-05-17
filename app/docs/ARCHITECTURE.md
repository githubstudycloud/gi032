# 架构概览

## 1. 系统全景

```
                  浏览器 (Chrome / Edge / Firefox)
                            │
                            ▼ 80
              ┌────────────────────────┐
              │   nginx (apps/web)     │
              │   - SSG 静态站         │
              │   - /api 反代          │
              └────────────────────────┘
                  │             │
            8001  ▼             ▼  8002
        ┌──────────────┐   ┌─────────────────┐
        │ report-query │   │report-generation│
        │ (FastAPI 只读)│   │ (FastAPI 写+调度)│
        └──────────────┘   └─────────────────┘
                  │             │
                  └──────┬──────┘
                         ▼ 3306
                  ┌──────────────┐
                  │  MySQL 5.7   │
                  └──────────────┘
```

## 2. 三层 UI 模型

```
AppShell（一辈子固定）         ←─── apps/web/app/layouts/default.vue
  ├── AppTopBar                   一级 nav + brand + 语言 / 字体 / 主题切换
  ├── AppSidebar                  二级 nav，按 activeTop 切
  └── <main>
       └── PageShell（6 个组件）   ←─── apps/web/app/components/report/
            ├── PageHeader            标题 / 副标题 / 描述 + 右侧 ToolBar
            ├── ToolBar               刷新 / 分页 / 对比 / 列 / 导出
            ├── FilterSection         按 filter.kind 派发到子件
            ├── KpiSection            KPI 卡片网格（支持分组 / 展开图表）
            ├── TableSection          TabStrip + MultiLevelTable
            └── DrilldownLayer        Teleport 模态层

业务页（11 行壳）               ←─── apps/web/app/pages/ai-test/**/*.vue
  <ReportPage report-type="summary" />
```

业务页只写 11 行：拿 nav 当前项 → useHead title → 调 `<ReportPage>`。其它都由 V2 协议驱动。

## 3. 数据流

### 3.1 同一份 useReport 同时支持 json / api

```
业务页 <ReportPage report-type="X" />
  └── useReport(X)
        └── Promise.all([
              useDataSource{ jsonPath, apiPath, transform }   // config
              useDataSource{ jsonPath, apiPath, transform }   // data
            ])
                └── 按 runtimeConfig.public.dataSourceMode 选 URL：
                      json → /mock/reports/X/config.json
                      api  → /api/reports/X/config  + envelope 自动解包
```

### 3.2 后端 DB-first / fixture-fallback

```
GET /api/reports/X/config
  └── api/config.read_report_config(X)
        └── services/repo.get_report_config(X)
              ├── try DB: ReportSnapshot WHERE report_type=X AND kind='config'
              │     └── 找到 → 返回 JSON
              └── 失败 / 空 → services/fixtures.load_report_config_fixture(X)
                                  └── 读 apps/web/public/mock/reports/X/config.json
```

DB 空也能跑通；连不上 DB 也能跑通；同一份代码同时支持。

### 3.3 数据生成链路

```
脚本 / API 触发
  └── POST /api/admin/seed { reset }                            ① 手工
  └── APScheduler tick (ingest cron) → _do_ingest()              ② 定时
  └── POST /api/metrics/ingest { rows }                          ③ 业务推
        └── 写入 metric_value（事实表）
                └── APScheduler (preagg cron) → 刷 report_fact_*
                      └── 查询服务读预聚合 → 返回前端
```

## 4. Monorepo 物理布局

```
20260515/app/                            ← git 根
├── apps/
│   └── web/                             Nuxt 4 前端
│       ├── app/                           Nuxt srcDir
│       │   ├── components/{layout,common,report,dashboard,admin}/
│       │   ├── composables/{use-nav,use-report,use-data-source,...}
│       │   ├── layouts/default.vue
│       │   ├── pages/                     路由
│       │   └── types/                     TS schema（含 report-config）
│       ├── public/mock/                   静态 JSON 兜底
│       ├── tests/                         vitest
│       ├── nuxt.config.ts
│       ├── package.json + pnpm-lock.yaml
│       ├── Dockerfile + infra/nginx.conf
│       └── scripts/vendor-fonts.mjs       离线字体下载
│
├── services/
│   ├── report-query/                    FastAPI 8001 只读
│   │   ├── app/{api,services,models,schemas,db,settings,envelope,main}.py
│   │   ├── tests/
│   │   ├── pyproject.toml + uv.lock
│   │   └── Dockerfile
│   └── report-generation/               FastAPI 8002 写+调度
│       ├── app/{api,seed,scheduler,security,models,...}.py
│       ├── tests/
│       ├── pyproject.toml + uv.lock
│       └── Dockerfile
│
├── shared/contracts/                    跨语言协议文档
├── docs/                                设计 / 部署 / 核验文档（本目录）
├── .claude/skills/                      Vue 11 + Python 4 个 skill
├── docker-compose.yml                   4 容器编排
├── .env.example                         deploy 环境变量样例
├── CLAUDE.md                            Monorepo 总规则
└── README.md
```

## 5. 三服务交互（端口 / 网络）

| 服务 | 容器端口 | 宿主端口 | 入网 | 出网 |
|---|---|---|---|---|
| mysql | 3306 | 3306 | internal | — |
| report-query | 8001 | 8001 | internal+public | mysql |
| report-generation | 8002 | 8002 | internal+public | mysql |
| web (nginx) | 80 | 80 (`WEB_PORT`) | public | report-query / report-generation |

容器间 DNS 走 docker 内置（直接 `mysql` / `report-query` / `report-generation`）。
浏览器进 nginx，nginx 按路径反代到对应服务，**同源无 CORS**。

## 6. DB Schema（最小可用）

| 表 | 说明 | 主要字段 |
|---|---|---|
| `report_snapshot` | 每个报表的 config / data JSON 快照 | report_type, snapshot_date, kind('config'\|'data'), payload_json |
| `dim_dropdown_option` | 通用下拉选项 | code, value, label, sort_order, enabled |
| `metric_def` | 指标管理 CRUD 表 | code, name, category, data_source, status, owner, formula, unit |

阶段二会扩：`metric_value`（事实表，多版本）+ `metric_value_invalid_mark`（软失效）+ `report_fact_*`（预聚合）。

ID 字段在 SQLite 下变 `INTEGER`、其它走 `BIGINT`，由 `BigInteger().with_variant(Integer, "sqlite")` 自动处理。

## 7. 工具链矩阵

| 任务 | 前端 (apps/web) | 后端 (services/*) |
|---|---|---|
| 包管理 | `pnpm` (corepack) | `uv` |
| 静态检查 | `eslint` (stylistic) | `ruff` (E/F/W/I/B/UP/ANN/S/RUF) |
| 类型 | `vue-tsc` strict | `mypy --strict` |
| 单测 | `vitest` 3 | `pytest` 8 + httpx |
| 测试 fixtures | 引用一致性 | TestClient + 临时 SQLite |
| 构建 | `nuxt generate` → SSG | `uv sync` → .venv |

CI 期望：lint=0, types=0, tests 全过。

## 8. 数据源切换（json ↔ api）

| 位置 | 方式 | 影响 |
|---|---|---|
| 本地 dev | `NUXT_PUBLIC_DATA_SOURCE_MODE=api pnpm dev` | 当次有效 |
| Docker | `apps/web/Dockerfile` ARG | build 时 baked |
| Nuxt 配置 | `nuxt.config.ts public.dataSourceMode` | 全局默认 |
| 单 composable | `useDataSource({ mode: 'api', ... })` | 单次调用 |

SSG 后切换不行（runtimeConfig.public baked）—— 要么 build 时定，要么改 SSR。

## 9. 容器内运行时差异

| 项 | 本地 dev | Docker |
|---|---|---|
| Python | uv 装的 Python 3.12 | python:3.12-slim |
| DB URL | `sqlite:///../shared.db` | `mysql+pymysql://...@mysql:3306/report` |
| Mock 路径 | `apps/web/public/mock/` 直接读 | seed 时 bind mount 到 `/seed-mock/` |
| Nuxt 数据源 | json（默认） | api（Dockerfile ARG） |
| Scheduler | enabled | enabled + `--workers 1` 强制 |

## 10. 演进路线（roadmap）

| 阶段 | 完成度 | 待办 |
|---|---|---|
| Phase 1：mock 驱动前端 | ✅ | — |
| Phase 2：双服务 + Docker + seed | ✅ | — |
| Phase 3：DB-first 查询 | ✅ | — |
| Phase 4：指标管理 CRUD 接后端 | ⬜ | `/api/admin/metrics/*` 暂用 mock |
| Phase 5：长表 + 预聚合 + 多版本 | ⬜ | metric_value / preagg job 待实装 |
| Phase 6：实时推送 | ⬜ | WebSocket / SSE，对 UI 弹幕 / 实时 KPI |
| Phase 7：权限分级 | ⬜ | 替换 admin token 为 OAuth2 / SSO |
