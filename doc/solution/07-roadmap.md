# 07 — 落地路线图

> 分阶段实施计划，每个阶段可独立上线、向后兼容。

## 0. 阶段总览

```
时间轴 ──────────────────────────────────────────────────────────────►

Phase 1         Phase 2          Phase 3         Phase 4         Phase 5
查询增强        数据采集          Widget UI       Pipeline        Java + 编辑器
(Python)        (Generation)     (Frontend)      Engine          (远期)
                                 
├── 1-2 周 ──┤├── 2-3 周 ───┤├── 2-3 周 ──┤├── 3-4 周 ──┤├── 4-6 周 ──┤
```

---

## Phase 1：Python 查询服务增强

**目标**：让 report-query 能处理真实的动态查询，而非只能返回静态 fixture。

**优先级**：最高（后续所有功能都依赖查询能力）

### 任务清单

| # | 任务 | 涉及文件 | 复杂度 |
|---|---|---|---|
| 1.1 | 实现 QueryEngine（动态 SQL 构建） | `services/report-query/app/services/query_engine.py` | 中 |
| 1.2 | POST /reports/{type}/data 端点（带筛选/分页/排序） | `services/report-query/app/api/data.py` | 中 |
| 1.3 | GET /api/nav 端点 | `services/report-query/app/api/nav.py` | 低 |
| 1.4 | GET /api/dropdowns/{code} 端点 | `services/report-query/app/api/dropdowns.py` | 低 |
| 1.5 | GET /api/fonts, GET /api/themes 端点 | `services/report-query/app/api/chrome.py` | 低 |
| 1.6 | 内存查询缓存 | `services/report-query/app/services/cache.py` | 低 |
| 1.7 | CompareEngine（环比/同比） | `services/report-query/app/services/compare_engine.py` | 中 |
| 1.8 | 契约测试套件 | `shared/contracts/api-contract-tests/` | 低 |

### 验收标准
- 前端切 `dataSourceMode=api` 后，所有页面数据正确
- POST /reports/{type}/data 支持筛选 + 分页 + 排序
- 所有 GET 端点从 DB 读取，DB 空时从 fixture 兜底
- 查询缓存命中率可观测（日志 / 端点）

### 依赖
- 无外部依赖，可立即开始

---

## Phase 2：数据采集基础设施

**目标**：让 report-generation 能从真实数据源拉取数据写入 DB。

**优先级**：高（有了数据才能真正用起来）

### 任务清单

| # | 任务 | 涉及文件 | 复杂度 |
|---|---|---|---|
| 2.1 | DataConnector 基类 + 注册表 | `services/report-generation/app/connectors/` | 中 |
| 2.2 | DatabaseConnector 实现 | `connectors/database.py` | 中 |
| 2.3 | ApiConnector 实现 | `connectors/api.py` | 中 |
| 2.4 | CsvConnector 实现 | `connectors/csv_connector.py` | 低 |
| 2.5 | IngestJob + IngestExecution 数据模型 | `models.py` | 低 |
| 2.6 | SchedulerManager 重构（动态 job CRUD） | `scheduler.py` | 中 |
| 2.7 | 调度管理 API（list/create/trigger/backfill） | `api/scheduler_admin.py` | 中 |
| 2.8 | TransformRule 链（重命名/类型转换/计算字段/过滤） | `transforms/` | 中 |
| 2.9 | PreAggregator 预聚合引擎 | `services/preagg.py` | 高 |
| 2.10 | 执行历史查询端点 | `api/scheduler_admin.py` | 低 |

### 验收标准
- 能配置一个从 MySQL → IngestJob → report_snapshot 的真实采集任务
- 能从 REST API 拉取数据并写入 DB
- 调度管理 API 全部可用（CRUD + 手动触发 + 补采集）
- 执行历史可查询（状态、行数、错误信息）

### 依赖
- 不依赖 Phase 1（但 Phase 1 完成后可端到端验证）

---

## Phase 3：前端 Widget 模型

**目标**：页面结构从固定 6 模块升级到自由 Widget 组合。

**优先级**：中高（用户体验核心升级）

### 任务清单

| # | 任务 | 涉及文件 | 复杂度 |
|---|---|---|---|
| 3.1 | Widget 类型定义 + 注册表 | `types/widget.ts` + `composables/use-widget-registry.ts` | 中 |
| 3.2 | WidgetGrid + WidgetRenderer 组件 | `components/widget/` | 中 |
| 3.3 | useWidgetData composable | `composables/use-widget-data.ts` | 中 |
| 3.4 | V2 → V3 自动转换（config-compat） | `utils/config-compat.ts` | 中 |
| 3.5 | ReportPage 分流（V2 legacy / V3 widget） | `components/report/ReportPage.vue` | 低 |
| 3.6 | PageHeader Widget 增强（标题层级配置） | `components/widget/PageHeaderWidget.vue` | 低 |
| 3.7 | 展示模型切换器（WidgetSwitcher） | `components/widget/WidgetSwitcher.vue` | 中 |
| 3.8 | 新增容器 Widget（TabGroup / CollapseGroup） | `components/widget/` | 中 |
| 3.9 | 写一个 V3 demo 页面验证全链路 | `public/mock/reports/demo-v3/` | 低 |
| 3.10 | 数据缓存层 | `utils/data-cache.ts` | 低 |

### 验收标准
- 现有 V2 页面无回归（自动转换透明兼容）
- 新建一个 V3 demo 页面，包含并排 KPI + 图表 + 表格
- Widget 切换器可在折线图 ↔ 柱状图 ↔ 表格之间切换
- 所有 Widget 支持 json / api 双模数据源

### 依赖
- 不依赖 Phase 1/2（可用 mock JSON 验证）
- Phase 1 完成后切 API 模式可端到端验证

---

## Phase 4：Pipeline Engine

**目标**：可配置的多步骤数据生成流水线。

**优先级**：中（Phase 2 采集 + Phase 1 查询稳定后再建流水线）

### 任务清单

| # | 任务 | 涉及文件 | 复杂度 |
|---|---|---|---|
| 4.1 | DataFrame + PipelineContext 数据模型 | `pipeline/engine.py` | 中 |
| 4.2 | DAG 引擎（拓扑排序 + 并行执行） | `pipeline/engine.py` | 高 |
| 4.3 | Source 处理器（db_query / api_fetch / csv_read） | `pipeline/handlers/source.py` | 中 |
| 4.4 | Transform 处理器（rename / cast / compute / filter） | `pipeline/handlers/transform.py` | 中 |
| 4.5 | Merge 处理器（join / union / lookup） | `pipeline/handlers/merge.py` | 中 |
| 4.6 | Aggregate 处理器（group_by / window） | `pipeline/handlers/aggregate.py` | 高 |
| 4.7 | Sink 处理器（db_write / snapshot_write） | `pipeline/handlers/sink.py` | 中 |
| 4.8 | Control 处理器（notify / condition） | `pipeline/handlers/control.py` | 低 |
| 4.9 | Pipeline CRUD API | `api/pipeline.py` | 中 |
| 4.10 | PipelineDefinition + PipelineRun 数据模型 | `models.py` | 低 |
| 4.11 | Pipeline 验证（DAG 合法性、连接器测试） | `pipeline/validator.py` | 中 |
| 4.12 | Pipeline 预览（step 级数据采样） | `api/pipeline.py` | 中 |

### 验收标准
- 能定义一个 3 步骤 Pipeline（Source → Transform → Sink）并成功执行
- DAG 并行执行正确（无依赖的步骤同时跑）
- 循环依赖检测能拦截非法定义
- 执行历史可查（每个 step 的状态和数据量）

### 依赖
- Phase 2 的 Connector 和 TransformRule（复用）

---

## Phase 5：Java 查询服务 + 可视化编辑器

**目标**：Java 版查询服务并存 + 前端可视化 Pipeline / Layout 编辑器。

**优先级**：远期（团队有 Java 需求或规模需要时启动）

### 任务清单

| # | 任务 | 复杂度 |
|---|---|---|
| 5.1 | Spring Boot 项目脚手架 | 中 |
| 5.2 | Java QueryEngine + CompareEngine | 高 |
| 5.3 | Java Envelope 统一 + 契约测试通过 | 中 |
| 5.4 | nginx 灰度路由（按 header 切 Python/Java） | 低 |
| 5.5 | 前端主题编辑器（ThemeEditor Drawer） | 中 |
| 5.6 | 前端 Pipeline 可视化编辑器（vue-flow） | 高 |
| 5.7 | 前端页面布局编辑器（Widget 拖拽） | 高 |
| 5.8 | 用户偏好服务端持久化 | 低 |

### 验收标准
- Java 查询服务通过与 Python 版相同的契约测试套件
- nginx 可按 header 切换后端，前端零改动
- Pipeline 编辑器可拖拽创建完整 DAG 并保存
- Layout 编辑器可自由排列 Widget 并保存

### 依赖
- Phase 1-4 全部完成

---

## 阶段依赖关系

```
Phase 1 (查询增强) ───────────────────────► Phase 5 (Java)
                                              ▲
Phase 2 (数据采集) ──► Phase 4 (Pipeline) ───┘
                                              ▲
Phase 3 (Widget UI) ─────────────────────────┘
```

- Phase 1 和 Phase 2 可并行开展（互不依赖）
- Phase 3 可与 Phase 1/2 并行（用 mock JSON）
- Phase 4 依赖 Phase 2 的连接器
- Phase 5 依赖所有前序阶段

---

## 技术债管理

### 每个 Phase 结束前必须完成

- [ ] 所有新增端点的契约测试
- [ ] 前端 `pnpm typecheck && pnpm test && pnpm lint` 全过
- [ ] 后端 `ruff check && mypy --strict && pytest` 全过
- [ ] 更新 `shared/contracts/` 协议文档（如有变更）
- [ ] 更新 `app/docs/ARCHITECTURE.md`（如有架构变更）
- [ ] 更新 mock JSON 保持与代码一致
- [ ] CLAUDE.md 同步新规则

### 已知技术债（建议在 Phase 1 之前清理）

| 债务 | 影响 | 建议处理时机 |
|---|---|---|
| Pinia 导入但未使用 | 无运行时影响，代码噪音 | Phase 3 Widget 模型引入时启用 |
| V0 legacy report shape 共存 | 类型复杂度 | Phase 3 V2→V3 迁移时统一清理 |
| APScheduler placeholder jobs | 不做实际工作 | Phase 2 替换为真实逻辑 |
| summary 页 7 组 KPI 硬编码映射 | 与 V2 协议不完全对齐 | Phase 3 Widget 化时统一 |

---

## 风险与应对

| 风险 | 概率 | 影响 | 应对 |
|---|---|---|---|
| QueryEngine 动态 SQL 注入 | 中 | 高 | 只允许 SQLAlchemy 参数化查询，禁止字符串拼接 |
| Pipeline 大数据量 OOM | 中 | 中 | 流式处理（Iterator），batch 写入，内存监控 |
| V2→V3 兼容破坏 | 低 | 高 | 自动转换 + 回归测试 + 灰度（V3 只给新页面） |
| Java 服务与 Python 行为不一致 | 中 | 中 | 契约测试强制一致 |
| Widget 类型爆炸（维护成本） | 低 | 中 | Widget 注册表 + 按需加载 + 严格审核新类型 |
