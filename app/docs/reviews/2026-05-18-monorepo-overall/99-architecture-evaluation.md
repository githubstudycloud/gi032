# 架构评估 — 灵活报表框架方向

> 触发：2026-05-18 整体 review 发现协议三方漂移、envelope 4xx 不生效、文档承诺与实现脱节等系统问题；用户随后明确表达"前端需要尽可能灵活，业务/架构分离"。本文是评估 + 设计建议，不是已确认的方案。

## 0. 用户表达的核心目标

提炼成 5 个设计原则：

1. **三层配置合并**：default（前端内置） + user（用户定义） + API（接口下发）
2. **表头按模块分类**：不再平铺一棵 `header_tree`
3. **样式可隔离切换**：按 report / 业务域局部 override 主题
4. **查询服务 + 前端 业务/架构分离（成对设计）**
5. **生成服务 业务/架构分离**

→ 目标：把平台变成"可配置报表框架"，而不是固定产品。

## 1. 现状 vs 目标的差距

| 目标 | 当前状态 | 差距 |
|---|---|---|
| 三层配置 | 只有一层：fetch `/api/reports/<type>/config`（JSON 模式从 mock 直读） | 缺 default + user 层；缺 merge 策略；user-data overlay 存在但只覆盖 data 不覆盖 config |
| 表头按模块分类 | 平铺的 `header_tree: TableColumn[]`（多级树但顶层无分组） | 需要 `header_modules` 包装层 |
| 样式隔离 | 全局 OKLCH token + 一键切主题 | 没有 per-report 隔离机制 |
| 业务/架构分离 | `app/{api,services,...}` + `schemas.py` 平铺；前端 `app/{components,composables,...}` 平铺 | 没区分 framework vs business 层 |
| 协议一致性 | TS / Pydantic / mock / contracts 四方各自定义 | 13+ 字段对不上；运行时无 validate |

## 2. 推荐设计

### 2.1 三层配置合并

```
┌──────────────────────────────────────────────────┐
│  Default Layer (TypeScript)                      │
│  apps/web/app/business/reports/<type>/           │
│    default-config.ts                             │
│  → 每个 report type 内置 baseline                │
└──────────────────────────────────────────────────┘
         ↓ deepMerge (by-key for arrays)
┌──────────────────────────────────────────────────┐
│  User Layer (overlay)                            │
│  apps/web/public/user-data/<type>/config.json    │
│  + localStorage("user-pref-<type>")              │
│  → 可空；存在时 partial override                 │
└──────────────────────────────────────────────────┘
         ↓ deepMerge
┌──────────────────────────────────────────────────┐
│  API Layer (源自后端)                            │
│  /api/reports/<type>/config                      │
│  → 生产环境权威                                  │
└──────────────────────────────────────────────────┘
         ↓
   Final ReportConfig (经 Zod 校验)
```

**关键决策点**：

- **合并优先级（谁 wins）**：
  - **(A) API > User > Default**（推荐）：生产权威 wins；User 仅作为"用户偏好补丁"
  - **(B) User > API > Default**：用户 override 一切（个人工作站调试场景）
  - **(C) 字段级混合**：`meta/toolbar` 走 A，`filters/kpi/header_modules` 走 B（最灵活但最复杂）
- **数组合并策略**：filters/columns 等数组带 `code` / `field` 标识，建议 **by-key merge**（同 key 字段级覆盖；新 key 追加）而不是整数组替换
- **逃生口**：URL 参数 `?config_override=user` 强制切到 (B)，便于无后端调试

工具选择：`deepmerge-ts`（已支持 by-key 数组合并）或自写 ~50 行 utility。

### 2.2 表头按模块分类

**现状**：
```ts
PrimaryViewTab.header_tree: TableColumn[]  // 平铺多级
```

**建议**：
```ts
interface HeaderModule {
  key: string                    // "kpi" / "trend" / "compare"
  label: I18nKey
  description?: I18nKey
  columns: TableColumn[]         // module 内仍保持多级
  default_visible?: boolean
  collapsible?: boolean
  style_scope?: string           // 关联 2.3 的隔离样式
}

PrimaryViewTab.header_modules?: HeaderModule[]
```

**渲染**：[MultiLevelTable.vue](../../../apps/web/app/components/dashboard/MultiLevelTable.vue) 顶层先按 module 渲染（可折叠分组、可勾选显示），module 内仍走现有多级表头逻辑。

**迁移策略**：保留 `header_tree` 兼容一段时间，新增 `header_modules` 优先生效；前端组件优先读 `header_modules`，回落到 `header_tree`。

后端 schema 同步加 `header_modules`（一旦决定 source of truth 方向）。

### 2.3 样式隔离

**现状**：[main.css](../../../apps/web/app/assets/css/main.css) 全局 `:root` 注入 OKLCH variables，[ThemeSwitcher](../../../apps/web/app/components/common/ThemeSwitcher.vue) 切换换整套。

**建议**：
- 每个 `ReportConfig` 加可选 `style_scope?: string` 字段
- CSS 用 layer + 属性选择器隔离：

```css
@layer report-scope {
  [data-report-scope="industry"] {
    --color-primary: oklch(0.6 0.2 200);
    --font-display: "Source Han Serif", serif;
  }
  [data-report-scope="ai-test"] {
    --color-primary: oklch(0.5 0.25 280);
    ...
  }
}
```

- `ReportPage` 根元素：`<div :data-report-scope="cfg.style_scope ?? 'default'">`
- 全局主题切换器仍作用于 `:root`，被 `[data-report-scope]` 局部 override

**可覆盖的 token**：
- 色彩（primary / accent / surface）
- 字体（display / body / mono）
- 间距 / 阴影 / 圆角
- 动效偏好（reduced-motion 行为）

**文件组织**：`apps/web/app/business/reports/<type>/style.css` 与该 report 的代码同目录。

### 2.4 业务 / 架构分离

#### 查询服务（report-query）

```
services/report-query/app/
├── framework/                     ← 架构层（业务无关）
│   ├── envelope.py                ← Envelope[T] + ok/fail
│   ├── exceptions.py              ← HTTPException → envelope；ValidationError → envelope
│   ├── deps.py                    ← get_session, get_settings
│   ├── pagination.py              ← 通用 PageRequest（含 le=200）
│   ├── lifespan.py
│   └── schemas/                   ← 协议层 schema
│       ├── envelope.py
│       ├── report_config.py       ← ReportConfig + 所有 sub-schemas
│       └── report_data.py
├── business/                      ← 业务层（按域分）
│   ├── reports/
│   │   ├── industry/
│   │   │   ├── router.py          ← config/data/drilldown
│   │   │   ├── service.py         ← fixture 回落 + DB 查询
│   │   │   └── schemas.py         ← 业务特有字段（如有）
│   │   ├── ai_test_system/
│   │   └── ...
│   ├── chrome/                    ← branding/nav/themes/fonts
│   └── meta/                      ← healthz / dropdowns
├── main.py                        ← 组装 framework + business
└── settings.py
```

**收益**：
- 加一个 report type = `business/reports/<new>/` 加 3 个文件，不动 framework
- 改 envelope / pagination = 改 framework，所有业务自动跟上
- 测试粒度对齐目录：framework 测协议、business 测业务

#### 前端（apps/web）

```
apps/web/app/
├── framework/                     ← 架构层
│   ├── composables/
│   │   ├── use-data-source.ts     ← 三层 merge 逻辑（新）
│   │   ├── use-report-config.ts
│   │   ├── use-report-data.ts
│   │   ├── use-report.ts
│   │   └── use-config-merge.ts    ← 新增 default/user/api merge 工具
│   ├── components/
│   │   ├── report/                ← ReportPage, FilterSection, DrilldownLayer
│   │   ├── dashboard/             ← MultiLevelTable, MetricCard, charts
│   │   └── common/
│   ├── types/                     ← ReportConfig + Zod schemas
│   ├── utils/
│   └── styles/
│       ├── tokens.css             ← 全局 :root token
│       └── scopes.css             ← [data-report-scope=*]
├── business/                      ← 业务层（按 report type）
│   └── reports/
│       ├── industry/
│       │   ├── default-config.ts  ← 默认层
│       │   ├── default-data.ts    ← 可选离线 fixture
│       │   └── style.css          ← 隔离样式
│       └── ...
├── pages/
└── stores/
```

#### 生成服务（report-generation）

```
services/report-generation/app/
├── framework/
│   ├── envelope.py
│   ├── exceptions.py
│   ├── deps.py
│   ├── security.py                ← require_admin + prod 断言
│   ├── scheduler/
│   │   ├── __init__.py            ← 单例 BackgroundScheduler + EVENT_JOB_ERROR listener
│   │   ├── lock.py                ← advisory lock 工具
│   │   └── decorators.py          ← @scheduled_job 包装 max_instances/coalesce/misfire
│   └── lifespan.py
├── business/
│   ├── ingest/
│   │   ├── router.py
│   │   ├── service.py             ← 真正的 upsert
│   │   └── schemas.py
│   ├── preagg/
│   │   ├── router.py
│   │   ├── job.py                 ← scheduler 调的函数 = 路由手动触发的函数
│   │   └── service.py
│   ├── seed/
│   └── admin/                     ← metric def CRUD
├── main.py
└── settings.py
```

### 2.5 整体验证（前后端 schema 真接通）

**问题**：当前 schemas.py 从未被当 response_model 用，前端 transform 也没接 Zod —— 漂移没人发现。

**最小可行方案**：

1. **后端**：所有路由加 `response_model=Envelope[XXX]`，FastAPI 自动校验返回 + 拒绝漂移
2. **前端**：所有 fetch 在 transform 处接 `ReportConfigSchema.parse(raw)`，schema 不匹配抛错
3. **跨端契约测试**：
   - 前端 `tests/contract/integration.spec.ts` —— 起 report-query 子进程，调 `/api/reports/industry/config`，对返回值跑 Zod parse → 失败即 schema 漂移
   - 后端 `tests/test_contract.py` —— 读 `apps/web/public/mock/reports/industry/config.json`，喂给 Pydantic → 失败即 mock 漂移
4. **共享 JSON Schema（可选演进）**：
   - 用 `pydantic.TypeAdapter(ReportConfig).json_schema()` 导出
   - 用 `json-schema-to-zod` 生成前端 Zod
   - CI 检查"schemas.py 改了但 Zod 没更新" → 失败

**契约 source of truth 的选择**（关键决策）：

- **(A) 后端 Pydantic 为源**：前端 Zod 由 Pydantic 导出生成（推荐，业务字段一般后端先定义）
- **(B) 前端 TS / Zod 为源**：后端 Pydantic 由 TS 反推
- **(C) JSON Schema 文件为源**：两边都从 `shared/contracts/schemas/*.json` 生成

## 3. 推进顺序（分阶段）

| Phase | 内容 | 工作量 | 风险/影响 |
|---|---|---|---|
| 0 | 保存 review、写本架构文档 | 小 | 无 |
| 1 | 决定协议方向 + 齐 13 字段 | 中 | 中：mock 可能批量改 |
| 2 | 加 envelope 4xx handler + response_model + Zod.parse | 中 | 低：纯加 |
| 3 | 跨端契约测试（mock JSON 喂两边） | 小 | 低 |
| 4 | 拆 framework/business 目录（先重命名 + 移文件，不改逻辑） | 中 | 中：git 历史会动 |
| 5 | 加三层 config merge + 抽 `use-config-merge.ts` | 中 | 中：行为变更 |
| 6 | 加 `header_modules` 包装 + MultiLevelTable 改造 | 中 | 中 |
| 7 | 加 `data-report-scope` + scopes.css | 小 | 低 |
| 8 | 修 i18n hardcode 8 个 chart + index.vue | 小 | 低 |
| 9 | scheduler 改造：lock + max_instances + EVENT_JOB_ERROR | 小 | 低 |
| 10 | 填 generation 业务层（真实 upsert / preagg） | 大 | 高：阶段二项目本身 |

预估：1-3 一周；4-7 两周；8-9 一周；10 是另一个阶段。

## 4. 关键决策（动代码前需要拍板）

**Q1. 三层 config 合并优先级**
- (A) API > User > Default（生产权威，推荐）
- (B) User > API > Default（用户 override 一切）
- (C) 字段级混合策略

**Q2. 契约 source of truth**
- (A) 后端 Pydantic 为源（推荐）
- (B) 前端 TS / Zod 为源
- (C) JSON Schema 文件为源

**Q3. business 分目录的粒度**
- (A) 按 report type 分（`business/reports/industry/`、`ai_test_system/`）
- (B) 按业务域分（`business/{ingest,preagg,reports,admin,scheduler}/`）
- (C) 两层都分（`business/<domain>/<entity>/`）

## 5. 风险与权衡

- **拆 framework/business 会动一大票 import 路径** —— 一次性 git mv 比逐步迁移好；要规划好测试是否通过
- **三层 merge 调试成本** —— deepMerge 不像简单替换那么直观，建议加 devtools 入口显示三层各自的值与最终值
- **header_modules 引入是非破坏性的**（保留 header_tree fallback），可以先后端加字段、前端兼容老 fixture
- **样式隔离扩展性 ≠ 一致性** —— scope 多了会失去全局视觉一致；建议 token 数量保持有限（5-8 个），不要把整套 design system token 都做成可 override
- **Pydantic 为源时**前端开发节奏依赖后端先 ship schema —— 对小团队可能成为瓶颈；解决：开发期前端可临时用本地 Zod 然后 CI 检查
