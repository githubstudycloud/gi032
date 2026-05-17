# 文件清单

按"想找什么/想改什么"分组。

## 仓库根

| 路径 | 内容 | 何时改 |
|---|---|---|
| `CLAUDE.md` | Monorepo 总规则 + Python 通用约束 | 新增跨项目规则时 |
| `README.md` | 一页式总览 | 顶层介绍变化 |
| `docker-compose.yml` | 4 服务编排 | 加 / 改容器 |
| `.env.example` | docker compose 用的环境变量模板 | 加新变量 |
| `.gitignore` | 全仓 git 忽略 | 加新临时产物 |
| `pnpm-workspace.yaml` | pnpm 识别 apps/* | 加新 JS 工作区 |

## apps/web/ —— Nuxt 4 前端

```
apps/web/
├── nuxt.config.ts              compatibility、runtimeConfig、modules
├── package.json + pnpm-lock    deps
├── tsconfig.json               extends .nuxt/tsconfig
├── vitest.config.ts            test 配置
├── eslint.config.mjs           @nuxt/eslint stylistic
├── tailwind 无 config           ← v4 CSS-first，写在 app/assets/css/main.css
│
├── Dockerfile                  多阶段 node → nginx
├── .dockerignore
├── infra/nginx.conf            反代 + SPA fallback
│
├── i18n/locales/{zh-CN,en-US}.json  120+ keys，14 个分组
├── public/mock/                静态 JSON 兜底（dev 默认数据源）
│   ├── nav.json                左 + 顶部 nav
│   ├── branding.json / themes.json / fonts.json
│   ├── reports/<type>/{config,data}.json   5 个报表
│   ├── dropdowns/{departments,time-ranges}.json
│   └── admin/metrics.json
│
├── tests/mock-fixtures.spec.ts  fixture 引用一致性回归
├── scripts/check-setup.mjs      装机自检
├── scripts/vendor-fonts.mjs     离线字体下载 → public/fonts-vendor/
│
└── app/                         Nuxt srcDir
    ├── app.vue                  根组件
    ├── layouts/default.vue      AppShell
    ├── pages/                   路由
    │   ├── index.vue            首页（简介示例）
    │   ├── [...slug].vue        catch-all（NotImplemented）
    │   └── ai-test/
    │       ├── overview/{summary,industry,domain}.vue   3 个总览
    │       ├── general/{design,codegen}.vue             2 个通用
    │       └── system/{metrics,excel}.vue               2 个系统设置
    │
    ├── components/
    │   ├── layout/{AppTopBar,AppSidebar,AppSidebarItem,LocaleSwitcher,FontSwitcher,ThemeSwitcher}.vue
    │   ├── common/{EmbedFrame,ErrorPanel,NavIcon,NotImplemented,TabStrip}.vue
    │   ├── report/{ReportPage,PageHeader,ToolBar,FilterSection,KpiSection,TableSection,DrilldownLayer}.vue
    │   ├── dashboard/{MetricCard,MetricsBox,MetricDetailPanel,MultiLevelTable}.vue + charts/
    │   └── admin/ManagementTable.vue
    │
    ├── composables/
    │   ├── use-nav.ts           读 nav.json
    │   ├── use-branding.ts      读 branding
    │   ├── use-report.ts        ★ 组装 config + data + 筛选状态
    │   ├── use-data-source.ts   ★ json ↔ api 切换层（含 envelope 解包）
    │   └── use-theme.ts / use-font.ts / ...
    │
    ├── types/
    │   ├── report-config.ts     ★ V2 协议 TS 镜像
    │   ├── nav.ts / data-source.ts / ...
    │   └── schemas.ts           Zod schema
    │
    └── utils/
        ├── csv-page-parser.ts + .spec.ts    Excel 导入解析
        ├── threshold.ts + .spec.ts          阈值色逻辑
        └── nav-flat.ts
```

打 ★ 的是改 V2 协议时最先要动的几个文件。

## services/report-query/ —— FastAPI 只读

```
services/report-query/
├── pyproject.toml + uv.lock    依赖 + lint / type / test 配置
├── Dockerfile + .dockerignore
├── .env.example
├── README.md / CLAUDE.md
│
├── app/
│   ├── main.py                 ★ 入口；create_app() + lifespan + 全局错误兜底
│   ├── settings.py             pydantic-settings；DATABASE_URL / CORS / TTL
│   ├── db.py                   SQLAlchemy engine + Base + get_session
│   ├── envelope.py             { code, message, trace_id, data }
│   ├── schemas.py              ★ Pydantic V2 镜像（跟前端 types/ 同步）
│   ├── models.py               ★ ORM：ReportSnapshot / DimDropdownOption / MetricDef
│   │
│   ├── api/                    路由层
│   │   ├── meta.py             healthz + dropdowns
│   │   ├── config.py           /reports/{type}/config
│   │   ├── data.py             /reports/{type}/data (GET/POST)
│   │   └── drilldown.py        /reports/{type}/drilldown/{ref}
│   │
│   └── services/
│       ├── fixtures.py         读 apps/web/public/mock/ 兜底
│       └── repo.py             ★ DB-first + fixture 回落
│
└── tests/test_smoke.py         12 个用例
```

## services/report-generation/ —— FastAPI 写+调度

```
services/report-generation/
├── pyproject.toml + uv.lock
├── Dockerfile + .dockerignore
├── .env.example
├── README.md / CLAUDE.md
│
├── app/
│   ├── main.py                 ★ lifespan 起 scheduler；--workers 1
│   ├── settings.py             含 ADMIN_TOKEN / INGEST_CRON / PREAGG_CRON
│   ├── db.py / envelope.py     同 query 同款
│   ├── models.py               同款 ORM
│   ├── security.py             require_admin (Bearer token)
│   ├── scheduler.py            APScheduler 实例 + ingest / preagg 占位 job
│   ├── seed.py                 ★ CLI / API 双入口；灌 mock → DB
│   │
│   └── api/
│       ├── meta.py             healthz + scheduler/jobs
│       ├── ingest.py           /metrics/ingest + /ingest/csv
│       └── admin.py            /admin/metrics/* + /admin/preagg/refresh + /admin/seed
│
└── tests/test_smoke.py         4 个用例
```

## shared/ —— 跨语言契约

```
shared/
├── README.md
└── contracts/
    ├── envelope.md             { code, message, trace_id, data } 详细约定
    └── report-protocol-v2.md   V2 协议三方同步规则（前端 TS / 后端 Pydantic / mock JSON）
```

## docs/ —— 设计 + 部署 + 核验

```
docs/
├── README.md                   ★ 文档索引
├── REQUIREMENTS.md             ★ 业务需求 + 用户场景
├── ARCHITECTURE.md             ★ 技术架构 + 数据流
├── FILE-MAP.md                 ★ 本文件
├── TEST-PLAN.md                ★ 测试矩阵
├── VERIFICATION.md             ★ 自检 + 核验
├── deploy-server.md            ubuntu@192.168.0.132 离线部署
├── report-platform-v2.md       V2 协议详细规范（前后端契约）
├── report-platform-redesign.md V1 设计稿 / 决策回溯
└── api-split-plan.md           查询 / 生成拆分方案
```

## .claude/ —— Claude Code 配置 + skill

```
.claude/skills/
├── vue-best-practices/         (vendored hyf0/vue-skills)
├── component-spec / new-vue-component / pinia-store / composable-spec
├── a11y-vue / a11y-check
├── frontend-design
├── perf-budget
├── python-fastapi-route / python-pydantic-schema / python-pytest-spec / python-sqlalchemy-model
```

## 历史 / 决策档案

| 路径 | 内容 |
|---|---|
| `apps/web/PROMPT-LOG.md` | 每次对话的决策记录（时间倒序） |
| `apps/web/SETUP-LOG.md` | 安装坑 / Node 24 / Windows 专项 |
| `apps/web/STYLE-GUIDE.md` | OKLCH 色阶 / 字号 / 阴影 token |
| `apps/web/AGENTS.md` | AI agent 使用约定（待整理） |
| `apps/web/.cursor/` | Cursor IDE rules（Vue / shadcn / Pinia） |

## 生成 / 临时（git ignored）

| 路径 | 内容 |
|---|---|
| `apps/web/node_modules/` | pnpm install 产物 |
| `apps/web/.nuxt/ .output/ .nitro/` | nuxt 构建产物 |
| `services/*/.venv/` | uv 装的 Python |
| `services/*/.ruff_cache/ .mypy_cache/ .pytest_cache/` | 工具缓存 |
| `services/shared.db` | 本地 dev SQLite |
| `apps/web/.playwright-mcp/` | playwright 状态 |

## 部署产物（运行时挂载）

| 路径 | 内容 |
|---|---|
| `mysql-data` docker volume | MySQL 数据持久化 |
| `apps/web/public/fonts-vendor/` | 离线字体打包后产物 |

## 改文件时常见误区速查

| 改了 | 也得改 |
|---|---|
| `app/types/report-config.ts` | `services/report-query/app/schemas.py` + mock JSON |
| `services/*/app/models.py` | 另一边 service 的 `models.py`（双向同步） |
| `nav.json` | 可能 `app/pages/` 下新增对应 .vue |
| `nuxt.config public.dataSourceMode` 默认 | `apps/web/Dockerfile` ARG |
| 加端点 | `nginx.conf` 反代路径可能要改 |
| 加表 | `seed.py` 可能要扩 |
