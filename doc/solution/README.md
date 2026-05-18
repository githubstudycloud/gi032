# gi032 愿景实现方案 — 总览

> 基于 `思路.txt` 的 13 条愿景，逐条拆解"已有什么 / 缺什么 / 怎么补"。

## 0. 愿景清单与现状矩阵

| # | 愿景（思路.txt 原文） | 完成度 | 现状 | 差距 |
|---|---|---|---|---|
| F1 | 语言字体样式可自由切换 | 80% | LocaleSwitcher + FontSwitcher + ThemeSwitcher 已上线；4 主题 4 字体 2 语言 | 缺：运行时自定义色板 / 用户自建主题 / 主题持久化到服务端 |
| F2 | 标题层级组合可定义 | 60% | config.json `meta.name/subtitle/description` 驱动 PageHeader；header_tree N 级表头 | 缺：页面布局级标题层级自由组合（如 H1→H3 跳级、自定义装饰线） |
| F3 | 结构可组装 | 70% | V2 协议 6 个模块（PageHeader/ToolBar/Filter/KPI/Table/Drilldown），config 开关控制显隐 | 缺：模块顺序自由拖拽、自定义插槽、widget 级自由布局 |
| F4 | 数据展示形式模型可定义 | 50% | 8 种 chart + MetricCard + MultiLevelTable | 缺：展示模型注册表、用户选择"用哪种图呈现这组数据" |
| F5 | 一个页面由几个数据展示形式模型组成 | 60% | ReportPage = KPI + Table + Drilldown，固定槽位 | 缺：自由组合多 widget（如一页放 2 个表 + 3 个图） |
| F6 | 数据格式可切换（JSON/API） | 95% | useDataSource 已实现 json/api 双模 + user-data overlay | 缺：页面级 mode override、混合模式（部分 json 部分 api） |
| B1 | 查询部分先 Python | 80% | report-query FastAPI 服务已跑通，DB-first + fixture fallback | 缺：高级查询（聚合/对比/排名）、缓存层 |
| B2 | 查询部分再实现 Java | 0% | 无 Java 代码 | 需要完整的 Java 查询服务 |
| B3 | 数据生成部分 | 30% | report-generation 骨架 + APScheduler placeholder | 缺：真实 ingest 逻辑、多数据源适配器、ETL 链路 |
| B4 | 接入各类组件获取和组合数据 | 10% | ingest endpoint 壳子存在 | 缺：数据源连接器（DB/API/CSV/Excel/MQ）、组合逻辑 |
| B5 | 定时运行 | 40% | APScheduler + cron 配置已接入 | 缺：job 管理 UI、执行历史、失败重试、告警 |
| B6 | 部分数据运行 + 补采集 + 手动触发 | 20% | admin/seed 和 preagg/refresh endpoint 存在 | 缺：增量采集、时间窗口补采、任务参数化 |
| B7 | 通用组件自动配置数据生成流 | 0% | 无 | 需要完整的 Pipeline Engine |

## 1. 文档索引

### 架构核心（必读）

| 文档 | 说明 |
|---|---|
| [PROTOCOL.md](PROTOCOL.md) | **前端架构协议** — 非业务层与业务层的动态定义、完整约定、所有组件/类型/数据格式的权威契约 |
| [AI-PAIR-DEV.md](AI-PAIR-DEV.md) | **团队 AI 协作指南** — 前端/后端/产品/新人如何使用 AI 工具结对开发 |
| [TASK-PLAN.md](TASK-PLAN.md) | **任务拆分与分配** — 7 人团队 Sprint 1 任务表、文件归属、并行开发规则、合并流程 |

### 各领域方案

| 文档 | 覆盖愿景 | 核心主题 |
|---|---|---|
| [01-frontend-appearance.md](01-frontend-appearance.md) | F1 | 语言 / 字体 / 主题 / 色板的自由切换体系 |
| [02-frontend-composable-ui.md](02-frontend-composable-ui.md) | F2 F3 F4 F5 | 可组装页面结构 + 数据展示模型注册 + Widget 自由布局 |
| [03-frontend-data-layer.md](03-frontend-data-layer.md) | F6 | 数据源切换增强：混合模式、页面级 override、适配器模式 |
| [04-backend-query.md](04-backend-query.md) | B1 B2 | Python 查询服务增强 + Java 查询服务复刻方案 |
| [05-backend-generation.md](05-backend-generation.md) | B3 B4 B5 B6 | 数据生成服务：多源采集、调度增强、补采集 |
| [06-pipeline-engine.md](06-pipeline-engine.md) | B7 | 通用数据流引擎：连接器 + 转换器 + 编排器 |
| [07-roadmap.md](07-roadmap.md) | 全部 | 分阶段落地路线图 |

## 2. 设计原则

整体方案遵循以下原则（与现有 CLAUDE.md / V2 协议一致）：

1. **协议驱动（Protocol-Driven）** — 新增能力优先扩展 config.json 协议，而非写新的硬编码页面
2. **渐进增强（Progressive Enhancement）** — 每个阶段可独立上线、向后兼容，不破坏已有页面
3. **配置 > 代码** — 用户能通过 JSON/UI 配置的能力，不让用户改 .vue / .py 文件
4. **双模不变** — 所有新功能都同时支持 json mock 和 api 两种数据源模式
5. **最小依赖** — 新引入的第三方库必须论证必要性；能用已有栈解决的不加新依赖

## 3. 架构演进方向

```
当前（V2 协议驱动的固定槽位报表平台）
  │
  ├─► Phase A：外观自由度（F1 增强）
  │     主题编辑器 / 运行时色板 / 用户偏好服务端持久化
  │
  ├─► Phase B：页面结构自由度（F2-F5）
  │     Widget 注册表 + 页面 Layout 编辑器 + 展示模型选择器
  │     config.json 从"固定 6 模块"演进到"widget 列表"
  │
  ├─► Phase C：数据层增强（F6 + B1）
  │     查询引擎抽象层 / 缓存 / 高级聚合 / Java 复刻
  │
  └─► Phase D：数据生成引擎（B3-B7）
        Pipeline 定义语言 / 连接器市场 / 调度编排 / 监控面板
```

## 4. 阅读建议

- **产品经理 / 决策者**：读本文件 + [07-roadmap.md](07-roadmap.md)
- **前端开发**：读 01 → 02 → 03
- **后端开发**：读 04 → 05 → 06
- **全栈 / 架构师**：全部阅读
