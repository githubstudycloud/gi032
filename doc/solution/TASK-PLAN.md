# 团队任务拆分与并行开发计划

> 团队 7 人，按现有项目状态，为架构改造分配任务。

---

## 1. 团队角色与代号

| 代号 | 角色 | 人数 | 主要工作目录 | 分支前缀 |
|---|---|---|---|---|
| **FE-1** | 前端开发 A | 1 | `apps/web/app/components/` `types/` | `feat/fe1-*` |
| **FE-2** | 前端开发 B | 1 | `apps/web/app/composables/` `pages/` | `feat/fe2-*` |
| **PY-1** | Python 后端 A | 1 | `services/report-query/` | `feat/py1-*` |
| **PY-2** | Python 后端 B | 1 | `services/report-generation/` | `feat/py2-*` |
| **JAVA** | Java 开发 | 1 | `services/report-query-java/`（新建） | `feat/java-*` |
| **DATA** | 数据计算 | 1 | `services/report-generation/app/pipeline/` | `feat/data-*` |
| **UI** | UI 设计 | 1 | `apps/web/app/assets/` `public/mock/` | `feat/ui-*` |

---

## 2. 文件归属与冲突隔离规则

### 2.1 目录归属

```
apps/web/
├── app/
│   ├── assets/css/main.css         ← UI 独占（主题色 / 字体栈 / token）
│   ├── components/
│   │   ├── layout/                 ← FE-1（AppTopBar / Sidebar / Switcher 改造）
│   │   ├── report/                 ← FE-1（ReportPage / Filter / KPI / Table）
│   │   ├── dashboard/              ← FE-1（MetricCard / Charts）
│   │   ├── widget/                 ← FE-1（新建 Widget 渲染器）
│   │   ├── admin/                  ← FE-2（ManagementTable 增强）
│   │   └── common/                 ← 谁用谁改（TabStrip / ErrorPanel）
│   ├── composables/                ← FE-2 独占
│   ├── types/                      ← FE-1 + FE-2 共管（改前知会对方）
│   ├── pages/                      ← FE-2 独占
│   ├── utils/                      ← 谁用谁改
│   └── i18n/locales/               ← FE-2（新 key），UI（校对文案）
│
├── public/mock/                    ← UI 负责数据内容，FE-2 负责结构
│   ├── reports/*/config.json       ← FE-2 定义结构，UI 填具体文案/数值
│   ├── reports/*/data.json         ← UI 独占（业务数据内容）
│   ├── nav.json                    ← FE-2（路由变更时同步改）
│   ├── themes.json / fonts.json    ← UI 独占
│   └── branding.json               ← UI 独占

services/
├── report-query/                   ← PY-1 独占
├── report-generation/
│   ├── app/api/                    ← PY-2
│   ├── app/connectors/             ← PY-2 + DATA 共管
│   ├── app/pipeline/               ← DATA 独占
│   ├── app/scheduler.py            ← PY-2
│   └── app/models.py               ← PY-2（DATA 需要加表时提 PR 由 PY-2 review）
├── report-query-java/              ← JAVA 独占（新建目录）

shared/contracts/                   ← 全员只读，改动需 PR + 至少 2 人 review
```

### 2.2 冲突热点与规避策略

| 热点文件 | 风险 | 规避方法 |
|---|---|---|
| `types/report-config.ts` | FE-1 加 Widget 类型 / FE-2 加 filter kind | **约定**：FE-1 负责 Widget 相关类型，FE-2 负责 Filter / Data 相关类型。改前在群里知会。 |
| `public/mock/reports/*/config.json` | FE-2 改结构 / UI 改文案 | **约定**：结构变更（加字段/改 key）走 FE-2 分支；纯文案/数值调整走 UI 分支。不同时改同一个报表的 config。 |
| `shared/contracts/` | 协议变更影响全员 | **约定**：改协议必须开 PR，标题带 `[contract]`，PY-1 + FE-1 至少两人 approve。 |
| `services/report-generation/app/models.py` | PY-2 加采集表 / DATA 加 pipeline 表 | **约定**：DATA 需要新表时在 PR 描述里标注 schema，PY-2 review 后合入。 |

---

## 3. Sprint 1：第一轮任务分配（2 周）

> 目标：查询增强 + 采集基础 + Widget 原型 + 主题优化，7 人全部并行。

### FE-1（前端开发 A）— Widget 渲染引擎

| # | 任务 | 产出文件 | 天 |
|---|---|---|---|
| F1-1 | Widget 类型定义 | `types/widget.ts` | 1 |
| F1-2 | WidgetGrid + WidgetRenderer 组件 | `components/widget/WidgetGrid.vue` `WidgetRenderer.vue` | 2 |
| F1-3 | V2→V3 自动转换函数 | `utils/config-compat.ts` | 1 |
| F1-4 | ReportPage 分流（检测 layout_version） | 改 `components/report/ReportPage.vue` | 0.5 |
| F1-5 | WidgetSwitcher（展示模型切换） | `components/widget/WidgetSwitcher.vue` | 1 |
| F1-6 | 写 V3 demo config + 验证 | `public/mock/reports/demo-v3/{config,data}.json` | 0.5 |
| F1-7 | 现有 V2 页面回归测试 | `tests/widget-compat.spec.ts` | 1 |

**分支**：`feat/fe1-widget-engine`  
**验收**：现有 8 个 V2 页面不回归 + demo-v3 页面可并排渲染 KPI + 图表 + 表格

### FE-2（前端开发 B）— 数据层增强 + composable

| # | 任务 | 产出文件 | 天 |
|---|---|---|---|
| F2-1 | useWidgetData composable | `composables/use-widget-data.ts` | 2 |
| F2-2 | 数据缓存层 | `utils/data-cache.ts` | 1 |
| F2-3 | useDataSource 增强（三级优先级） | 改 `composables/use-data-source.ts` | 1 |
| F2-4 | 数据适配器（envelope / spring / custom） | `types/data-adapter.ts` + `utils/data-adapters.ts` | 1 |
| F2-5 | JSON 格式自动检测 | `composables/use-adaptive-data.ts` | 1 |
| F2-6 | 新增 demo-v3 页面路由 | `pages/ai-test/demo/v3.vue` + nav.json | 0.5 |
| F2-7 | 联调 FE-1 的 WidgetGrid 数据流 | — | 1 |

**分支**：`feat/fe2-data-layer`  
**验收**：Widget 级独立数据获取 + 缓存命中 + 三级 mode 优先级生效

### PY-1（Python 后端 A）— 查询服务增强

| # | 任务 | 产出文件 | 天 |
|---|---|---|---|
| P1-1 | QueryEngine（动态 SQL） | `services/report-query/app/services/query_engine.py` | 2 |
| P1-2 | POST /reports/{type}/data 端点 | 改 `app/api/data.py` | 1 |
| P1-3 | GET /api/nav 端点 | `app/api/nav.py` | 0.5 |
| P1-4 | GET /api/dropdowns/{code} | `app/api/dropdowns.py` | 0.5 |
| P1-5 | GET /api/fonts + GET /api/themes | 改 `app/api/chrome.py` | 0.5 |
| P1-6 | 内存查询缓存 | `app/services/cache.py` | 1 |
| P1-7 | CompareEngine（环比/同比） | `app/services/compare_engine.py` | 2 |
| P1-8 | 全部端点的 pytest | `tests/` | 2 |

**分支**：`feat/py1-query-engine`  
**验收**：前端切 `dataSourceMode=api` 后所有页面数据正确 + pytest 全过

### PY-2（Python 后端 B）— 数据采集基础设施

| # | 任务 | 产出文件 | 天 |
|---|---|---|---|
| P2-1 | DataConnector 基类 + 注册表 | `app/connectors/{base,registry}.py` | 1 |
| P2-2 | DatabaseConnector | `app/connectors/database.py` | 1 |
| P2-3 | ApiConnector | `app/connectors/api.py` | 1 |
| P2-4 | CsvConnector | `app/connectors/csv_connector.py` | 0.5 |
| P2-5 | IngestJob + IngestExecution 模型 | 改 `app/models.py` | 1 |
| P2-6 | SchedulerManager 重构 | 改 `app/scheduler.py` | 2 |
| P2-7 | 调度管理 API (CRUD + trigger + backfill) | `app/api/scheduler_admin.py` | 2 |
| P2-8 | 连接器 + 调度的 pytest | `tests/` | 1 |

**分支**：`feat/py2-ingest-infra`  
**验收**：可配置一个 DB→IngestJob→report_snapshot 的真实采集任务 + 手动触发/补采集可用

### JAVA（Java 开发）— 查询服务复刻

| # | 任务 | 产出文件 | 天 |
|---|---|---|---|
| J-1 | Spring Boot 脚手架 + Envelope | `services/report-query-java/` 全部 | 1 |
| J-2 | ReportSnapshot 实体 + Mapper | `model/entity/` + `mapper/` | 1 |
| J-3 | FixtureService（JSON fallback） | `service/FixtureService.java` | 1 |
| J-4 | GET /api/reports/{type}/config | `controller/ReportConfigController.java` | 1 |
| J-5 | GET /api/reports/{type}/data | `controller/ReportDataController.java` | 1 |
| J-6 | GET /api/nav + dropdowns + chrome | `controller/` 3 个文件 | 1 |
| J-7 | QueryEngine Java 版 | `service/QueryEngine.java` | 3 |
| J-8 | 契约测试对齐（同一套 pytest） | 配合 PY-1 调试 | 1 |

**分支**：`feat/java-query-service`  
**验收**：`pytest shared/contracts/api-contract-tests/ --base-url http://localhost:8003` 全过

### DATA（数据计算）— Pipeline 引擎核心

| # | 任务 | 产出文件 | 天 |
|---|---|---|---|
| D-1 | DataFrame + PipelineContext | `app/pipeline/engine.py` | 1 |
| D-2 | DAG 拓扑排序 + 并行执行引擎 | `app/pipeline/engine.py` | 2 |
| D-3 | Source 处理器（db_query / api_fetch / csv） | `app/pipeline/handlers/source.py` | 2 |
| D-4 | Transform 处理器（rename / cast / compute / filter） | `app/pipeline/handlers/transform.py` | 1 |
| D-5 | Merge 处理器（join / union） | `app/pipeline/handlers/merge.py` | 1 |
| D-6 | Aggregate 处理器（group_by） | `app/pipeline/handlers/aggregate.py` | 2 |
| D-7 | Sink 处理器（db_write / snapshot_write） | `app/pipeline/handlers/sink.py` | 1 |
| D-8 | Pipeline 验证器（DAG 合法性） | `app/pipeline/validator.py` | 0.5 |
| D-9 | 写一个完整 demo Pipeline JSON | `pipeline_definitions/demo.json` | 0.5 |

**分支**：`feat/data-pipeline-engine`  
**验收**：demo pipeline 3 步骤（Source→Transform→Sink）执行成功 + 循环依赖检测拦截

### UI（UI 设计）— 主题/视觉/Mock 数据

| # | 任务 | 产出文件 | 天 |
|---|---|---|---|
| U-1 | 梳理现有 4 主题色板的 OKLCH 色阶一致性 | 改 `assets/css/main.css` | 1 |
| U-2 | 新增 1-2 个业务方要求的主题 | 改 `themes.json` + `main.css` | 1 |
| U-3 | Widget 模式的布局 mockup（V3 demo 页的视觉稿） | 设计文件 + demo-v3 config.json 的数据内容 | 2 |
| U-4 | 所有报表 mock 数据的真实化（目前是占位数据） | 改 `public/mock/reports/*/data.json` | 3 |
| U-5 | 主题编辑器面板 UI 设计（远期交付物的设计先行） | 设计文件 | 1 |
| U-6 | i18n 英文翻译校对 | 改 `i18n/locales/en-US.json` | 1 |
| U-7 | 图表色板优化（8 色系在 4 个主题下的可读性验证） | 改 `chart-colors.ts` / `main.css` | 1 |

**分支**：`feat/ui-theme-and-mock`  
**验收**：4 个主题下所有页面视觉一致 + demo-v3 有真实感的 mock 数据

---

## 4. 时间线 Gantt（Sprint 1，共 10 个工作日）

```
工作日    1    2    3    4    5    6    7    8    9    10
         ├────┤────┤────┤────┤────┤────┤────┤────┤────┤
FE-1     [F1-1][  F1-2   ][F1-3][F14][F1-5][F16][ F1-7 ]
FE-2     [   F2-1    ][F2-2][F2-3][F2-4][F2-5][F26][F2-7]
PY-1     [   P1-1    ][P1-2][P13][P14][P15][P1-6][  P1-7   ][ P1-8 ]
PY-2     [P2-1][P2-2][P2-3][P24][  P2-5  ][   P2-6    ][  P2-7  ][P28]
JAVA     [J-1 ][J-2 ][J-3 ][J-4 ][J-5 ][  J-6  ][    J-7       ][J8]
DATA     [D-1 ][   D-2    ][   D-3    ][D-4][D-5][  D-6   ][D-7][D89]
UI       [U-1 ][U-2 ][    U-3     ][       U-4          ][U-5][U6][U7]
                                    ▲                     ▲
                                    │                     │
                               中期 review            最终 review
                              (Day 5 午后)            (Day 9 午后)
```

### 关键里程碑

| 日 | 事件 |
|---|---|
| Day 1 | 全员各自建分支，开始独立开发 |
| Day 3 | FE-1 Widget 类型定义完成 → FE-2 可以开始集成 useWidgetData |
| Day 5 | **中期 Review**：PY-1 QueryEngine 可演示 + FE-1 WidgetGrid 可渲染 + PY-2 连接器可用 |
| Day 7 | FE-1 + FE-2 联调 Widget 数据流 |
| Day 8 | PY-1 契约测试写好 → JAVA 用同套测试验证 |
| Day 9 | **最终 Review**：全员 demo 各自成果 |
| Day 10 | 修复 review 问题 → 合并到 master |

---

## 5. 多人 Claude Code 并行开发指南

### 5.1 为什么能并行

```
本项目的架构天然支持并行：

  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │  apps/web/   │  │ report-query │  │ report-gen   │
  │  (前端)      │  │ (Python 查询) │  │ (Python 生成) │
  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
         │                 │                 │
   独立 pnpm          独立 uv venv       独立 uv venv
   独立 node_modules  独立 .venv         独立 .venv
   端口 3000          端口 8001          端口 8002

  三个子项目互不 import，只通过 shared/contracts/ 的 JSON 协议通信。
  → 7 个人可以同时改不同子项目，几乎不产生冲突。
```

### 5.2 每人一个分支

```bash
# 每个人从 master 拉自己的分支
git checkout master && git pull
git checkout -b feat/fe1-widget-engine   # FE-1
git checkout -b feat/fe2-data-layer      # FE-2
git checkout -b feat/py1-query-engine    # PY-1
git checkout -b feat/py2-ingest-infra    # PY-2
git checkout -b feat/java-query-service  # JAVA
git checkout -b feat/data-pipeline-engine # DATA
git checkout -b feat/ui-theme-and-mock   # UI

# 每天结束前推送自己的分支
git push -u origin feat/fe1-widget-engine
```

### 5.3 Claude Code 并行使用规则

每个人在自己的分支上独立使用 Claude Code，互不干扰：

```bash
# 每个人在自己的终端 / VSCode 窗口中
cd d:/202605/gi032
git checkout feat/fe1-widget-engine

# 启动 Claude Code（自动加载 CLAUDE.md）
claude
# 或者在 VSCode 中打开项目，使用 Claude Code 扩展
```

**关键规则**：

| 规则 | 说明 |
|---|---|
| **各写各的分支** | 永远不要在别人的分支上直接 commit |
| **CLAUDE.md 不要改** | 它是全员共享的 AI 规则，改动需要 PR |
| **types/ 改前知会** | 在群里说一声"我要改 report-config.ts 加 xxx 类型" |
| **shared/contracts/ 改前开 PR** | 协议变更影响全员，必须 review |
| **config.json 分工** | 结构改动找 FE-2，纯数据改动找 UI |
| **每天 rebase master** | `git fetch origin && git rebase origin/master` 减少最终合并冲突 |

### 5.4 给 Claude Code 的 Prompt 中要加的上下文

```
每个人在使用 Claude Code 时，在 prompt 中指明自己的角色和任务范围：

FE-1: "我是 FE-1，当前任务是 F1-2（WidgetGrid 组件）。只改 components/widget/ 目录。"
PY-1: "我是 PY-1，当前任务是 P1-1（QueryEngine）。只改 services/report-query/。"

这样 AI 不会越界去改别人负责的文件。
```

### 5.5 合并流程

```
Day 9-10 合并顺序（按依赖关系）：

  1. UI     → master   （最不可能冲突：只改 CSS/JSON）
  2. PY-1   → master   （独立子项目）
  3. PY-2   → master   （独立子项目）
  4. DATA   → master   （在 PY-2 之后，因为共享 models.py）
  5. JAVA   → master   （独立子项目）
  6. FE-2   → master   （composables + pages）
  7. FE-1   → master   （最后合：Widget 依赖 FE-2 的 composables）

每个 PR：
  - 标题：[角色] 任务简述
  - 描述：改了什么、验收标准、截图/命令输出
  - Review：至少 1 个相关角色 approve
    PY-1 的 PR → PY-2 review
    FE-1 的 PR → FE-2 review
    JAVA 的 PR → PY-1 review（契约一致性）
    DATA 的 PR → PY-2 review（模型兼容性）
```

---

## 6. Sprint 2 预览（第 3-4 周）

Sprint 1 合并后，Sprint 2 按以下方向继续：

| 角色 | Sprint 2 任务 |
|---|---|
| FE-1 | 容器 Widget（TabGroup / CollapseGroup）+ 页面布局编辑器原型 |
| FE-2 | API 模式全链路联调（切 api mode 跑通所有页面）+ 混合模式 |
| PY-1 | 预聚合查询 + 缓存刷新机制 + 性能调优 |
| PY-2 | Pipeline API（CRUD + run + backfill）+ 与 DATA 的 engine 集成 |
| JAVA | POST /reports/{type}/data + CompareEngine Java 版 |
| DATA | Pipeline 预览（step 级采样）+ 更多 Transform/Aggregate 处理器 |
| UI | Pipeline 编辑器 UI 设计 + 主题编辑器组件实现（配合 FE-1） |

---

## 7. 每日站会模板

```
【日期】2026-05-XX
【FE-1】昨天：完成 F1-2 WidgetGrid | 今天：F1-3 V2→V3 转换 | 阻塞：无
【FE-2】昨天：完成 F2-1 useWidgetData | 今天：F2-2 缓存层 | 阻塞：无
【PY-1】昨天：完成 P1-1 QueryEngine | 今天：P1-2 POST data | 阻塞：无
【PY-2】昨天：完成 P2-2 DatabaseConnector | 今天：P2-3 ApiConnector | 阻塞：无
【JAVA】昨天：完成 J-3 FixtureService | 今天：J-4 config 端点 | 阻塞：需要 PY-1 契约测试
【DATA】昨天：完成 D-2 DAG 引擎 | 今天：D-3 Source 处理器 | 阻塞：需要 PY-2 连接器
【UI  】昨天：完成 U-2 新主题 | 今天：U-3 Widget mockup | 阻塞：等 FE-1 的 Widget 类型定义
```

---

## 8. 风险与应对

| 风险 | 概率 | 应对 |
|---|---|---|
| types/ 文件冲突 | 中 | FE-1 负责 Widget 类型，FE-2 负责 Data/Filter 类型，改前群里知会 |
| models.py 冲突 | 低 | DATA 新表提 PR 描述 schema，PY-2 统一合入 |
| mock JSON 格式不一致 | 中 | 全员参照 PROTOCOL.md 第四部分 data schema |
| JAVA 契约不一致 | 中 | Day 8 必须跑契约测试，不过不合入 |
| FE-1 / FE-2 联调延迟 | 中 | Day 3 前 FE-1 先交付 types/widget.ts，FE-2 可提前 mock |
| 某人进度滞后 | 中 | Day 5 中期 Review 检查，及时调整 |
