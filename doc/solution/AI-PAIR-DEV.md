# 团队 AI 协作结对开发指南

> 如何让团队中的每个人（前端/后端/全栈/产品/新人）都能高效地使用 AI 工具参与 gi032 项目开发。

---

## 1. 协作模式总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                    团队 AI 协作全景                                  │
│                                                                     │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐        │
│  │ 前端开发  │   │ 后端开发  │   │ 产品/运营 │   │ 新人入职  │        │
│  │          │   │          │   │          │   │          │        │
│  │ Claude   │   │ Claude   │   │ Claude   │   │ Claude   │        │
│  │ Code     │   │ Code     │   │ Code     │   │ Code     │        │
│  │ +Cursor  │   │ +Codex   │   │ (只读)   │   │ /onboard │        │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘        │
│       │              │              │              │               │
│       └──────────────┴──────────────┴──────────────┘               │
│                              │                                      │
│                      CLAUDE.md + Skills                             │
│                    (项目级 AI 规则统一)                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.1 角色与工具矩阵

| 角色 | 主力 AI 工具 | 辅助工具 | 典型任务 |
|---|---|---|---|
| **前端开发** | Claude Code (VSCode 扩展) | Cursor / Trae | 写组件、改样式、新增报表页 |
| **后端开发 (Python)** | Claude Code (CLI) | Codex | 写端点、改 ORM、调度任务 |
| **后端开发 (Java)** | Claude Code / Cursor | Codex | 复刻查询服务 |
| **全栈** | Claude Code | Codex + Cursor | 跨层联调 |
| **产品/运营** | Claude Code (只读模式) | — | 改 mock 数据、调 config、看代码 |
| **新人** | Claude Code + /onboard | — | 了解项目、跟着 AI 做第一个任务 |

### 1.2 项目已有的 AI 基础设施

本项目已经为 AI 协作做了充分准备：

| 基础设施 | 位置 | 作用 |
|---|---|---|
| `CLAUDE.md`（根） | `app/CLAUDE.md` | 全局规则：项目布局、禁止事项、提交规范 |
| `CLAUDE.md`（前端） | `app/apps/web/CLAUDE.md` | 前端规则：Vue 约定、Tailwind v4、测试 |
| `CLAUDE.md`（查询服务） | `app/services/report-query/CLAUDE.md` | 后端规则：FastAPI、ORM、测试 |
| `CLAUDE.md`（生成服务） | `app/services/report-generation/CLAUDE.md` | 调度、采集、写入规则 |
| `AGENTS.md` | `app/AGENTS.md` | Codex / OpenCode 兼容规则 |
| `.claude/skills/` | `app/.claude/skills/` | 12 个 AI Skill（组件/模型/路由等脚手架） |
| 契约文档 | `app/shared/contracts/` | 跨语言协议（envelope + report-protocol-v2） |
| 本文档 | `doc/solution/PROTOCOL.md` | 前端架构完整约定 |

---

## 2. 前端开发者的 AI 结对工作流

### 2.1 新增报表页面（最常见任务）

**给 AI 的 prompt 模板**：

```
新增一个报表页面，report_type 为 "xxx"，标题"XXX 报表"。
参照 PROTOCOL.md 的 3.1 节"新增报表页面标准流程"。

需要的筛选器：
- 时间范围（date_range，必填，默认近 30 天）
- 部门（hierarchy_dropdown，数据来自 /dropdowns/departments-tree）

KPI 指标：
- XXX 总数（int, 阈值 ≥ 1000）
- XXX 覆盖率（percent, 阈值 ≥ 60%）

表格列：
- 部门（200px）
- 指标 A（100px，可排序）
- 指标 B（100px，阈值着色）
```

**AI 会自动做什么**：
1. 根据 CLAUDE.md 使用正确的框架和约定
2. 根据 PROTOCOL.md 生成标准的 config.json / data.json
3. 创建 11 行的页面薄壳 .vue
4. 在 nav.json 中注册路径
5. 运行 `pnpm typecheck && pnpm test && pnpm lint` 验证

**你需要做什么**：
- 审阅生成的 config.json（字段名、阈值、布局是否符合业务需求）
- 启动 dev server 看一眼页面效果
- 如果不对，直接告诉 AI 调整

### 2.2 修改组件样式/行为

**Prompt 示例**：

```
MetricCard 的 tooltip 在移动端被裁切了。
参考 PROTOCOL.md 6.2 节的定位策略，改成在屏幕宽度 < 768px 时 tooltip 居中显示。
```

### 2.3 新增 Filter Kind

```
新增一个 filter kind "rating"（评分筛选），1-5 星。
按照 PROTOCOL.md 5.1 节的扩展流程走。
```

### 2.4 使用项目 Skills

```bash
# 新建组件前先出规约表（CLAUDE.md 强制要求）
/component-spec

# 脚手架一个新组件
/new-vue-component FilterRating

# 写 composable 前先检查 VueUse 有没有
/composable-spec

# 无障碍检查
/a11y-vue app/components/report/FilterSection.vue

# 性能审计
/perf-budget /ai-test/overview/summary
```

---

## 3. 后端开发者的 AI 结对工作流

### 3.1 新增 API 端点

**Prompt 模板**：

```
在 report-query 服务中新增端点：
POST /api/reports/{type}/data

参照 CLAUDE.md 的 FastAPI 约定：
- 路由挂 APIRouter
- 请求体用 Pydantic BaseModel
- 响应走 envelope.ok()
- 参数用 Annotated[T, Path/Query]

请求体包含：
- filters: dict（筛选条件）
- sort: list[{field, dir}]（排序）
- page: int（页码，默认 1）
- page_size: int（每页条数，默认 10）

返回 envelope 包裹的 { items, total, page, page_size }。
```

### 3.2 使用项目 Skills

```bash
# 端点规约（先设计再编码）
/python-fastapi-route

# Pydantic schema 设计
/python-pydantic-schema

# SQLAlchemy 模型
/python-sqlalchemy-model

# 写测试（CLAUDE.md 要求：happy path + boundary + error）
/python-pytest-spec
```

### 3.3 Codex 协作（第二意见）

```bash
# 让 Codex 审查你的代码
/codex:rescue "审查 services/report-query/app/services/query_engine.py 的 SQL 注入风险"

# 让 Codex 做复杂调查
/codex:rescue "report-generation 的 APScheduler job 在 Docker 多副本下会重复执行，分析根因和解决方案"
```

---

## 4. 产品/运营人员的 AI 协作

### 4.1 修改 Mock 数据（最安全的操作）

产品/运营不需要碰 .vue / .py 代码，只需要改 JSON：

```
帮我修改 summary 报表的 mock 数据：
- 把 AI 用户数从 1,284 改成 2,500
- 把设计覆盖率从 62.4% 改成 78.1%
- 新增一个产业行"新能源"

文件在 public/mock/reports/summary/data.json
```

### 4.2 调整报表配置

```
帮我给 industry 报表：
- 增加一个"项目"筛选器（flat_dropdown 类型）
- 把 KPI 区的标题从"核心指标"改成"本月关键指标"
- 表格的设计覆盖率列加上阈值着色（≥60% 绿色，<60% 红色）

文件在 public/mock/reports/industry/config.json
```

### 4.3 查看架构了解

```
/onboard

或者：
帮我理解这个项目的前端架构。我是产品经理，想知道：
1. 新增一个报表需要改哪些文件
2. 报表的筛选器怎么配置
3. KPI 卡片怎么配颜色
```

---

## 5. 新人入职的 AI 引导

### 5.1 第一天：认识项目

```bash
# 步骤 1：让 AI 介绍项目
/onboard

# 步骤 2：启动项目看效果
cd app/apps/web && pnpm install && pnpm dev
# 浏览器打开 http://localhost:3000

# 步骤 3：问 AI 理解代码
"帮我解释 useReport composable 的完整流程，我是刚接触 Vue 3 的开发者"
```

### 5.2 第一个任务：改一个 mock 数据

```
这是我的第一个任务：把 design 报表的 KPI 覆盖率阈值从 60% 改成 70%。
帮我找到要改的文件，告诉我改哪一行，改完帮我验证。
```

### 5.3 第二个任务：加一个报表页面

```
我要加一个新的报表页面 "api-quality"，放在"通用 Agent"分类下。
请一步步带我做，每一步解释为什么。
参照 PROTOCOL.md 的新增报表流程。
```

---

## 6. 团队协作规范

### 6.1 AI 生成代码的审查清单

每个团队成员在 AI 生成代码后，必须检查：

| 检查项 | 具体内容 |
|---|---|
| **类型安全** | `pnpm typecheck` / `mypy --strict` 是否通过 |
| **lint 干净** | `pnpm lint` / `ruff check` 零错误 |
| **测试通过** | `pnpm test` / `pytest` 全绿 |
| **协议一致** | config.json 是否符合 PROTOCOL.md 的 schema |
| **同步点** | 改了类型 → 5 个同步点是否都更新了 |
| **i18n** | 新增 UI 文案是否走 `$t()` 而非硬编码 |
| **安全** | 无 XSS / SQL 注入 / 命令注入 |
| **无冗余** | AI 是否多加了不需要的注释、类型、文件 |

### 6.2 Prompt 书写原则

| 原则 | 好的 Prompt | 坏的 Prompt |
|---|---|---|
| **给上下文** | "在 report-query 服务中，参照 CLAUDE.md 的 FastAPI 约定，新增..." | "帮我写一个接口" |
| **引用约定** | "参照 PROTOCOL.md 5.2 节新增图表类型的流程" | "加一个新图表" |
| **指定范围** | "只改 FilterSection.vue，不要动其他组件" | "改一下筛选器" |
| **说明验收** | "改完运行 pnpm typecheck && pnpm test 确认通过" | "改完告诉我" |
| **说明不做什么** | "不要加新的依赖，用现有的 SVG 方式" | （让 AI 自由发挥引入 ECharts） |

### 6.3 分支与提交

```
每个任务一个分支：
  feat/add-api-quality-report
  fix/metric-card-tooltip-mobile
  refactor/filter-section-hierarchy

提交信息（中文 conventional commit）：
  feat(web): 新增 API 质量报表页面
  fix(web): MetricCard tooltip 移动端裁切
  feat(report-query): /reports/{type}/data POST 端点

AI 生成的提交会自动加 Co-Authored-By
```

### 6.4 并行开发不冲突的要点

```
前端团队内部：
  - 不同报表页面之间完全独立（不同 report_type、不同文件夹）
  - 改 Layer B 组件时注意：一次只一人改同一个组件
  - config.json / data.json 改动不影响代码，可随时合并

前后端并行：
  - 前端用 json 模式开发，后端独立写接口
  - 约定 config.json 中的 endpoint → 后端按此实现
  - 联调时前端切 api 模式 → 发现不一致就修 mock 或后端

Python + Java 并行：
  - 共享 shared/contracts/ 协议文档
  - 契约测试（同一套 pytest）保证行为一致
  - 互不依赖，各自独立开发
```

---

## 7. AI 工具配置建议

### 7.1 Claude Code（推荐所有人）

```bash
# 安装
npm install -g @anthropic-ai/claude-code

# 在项目根目录启动（自动加载 CLAUDE.md）
cd d:/202605/gi032/app
claude

# VSCode 扩展：安装 Claude Code 扩展 → 自动集成
```

**关键配置**：项目已有的 `CLAUDE.md` + `.claude/skills/` 会自动加载，无需额外配置。

### 7.2 Cursor / Trae（前端开发补充）

```
优势：多文件编辑、实时预览
使用场景：大范围样式调整、组件重构
注意：在 .cursorrules 或 .trae/rules 中引用 CLAUDE.md 的核心规则
```

### 7.3 Codex（后端开发补充）

```bash
# 已集成为 Claude Code skill
/codex:rescue "描述问题或任务"

使用场景：
- 复杂 bug 需要第二意见
- 性能优化分析
- 跨服务调试
```

---

## 8. 常见场景 Prompt 速查表

### 8.1 前端任务

| 场景 | Prompt |
|---|---|
| 新增报表 | "按 PROTOCOL.md 3.1 节流程，新增 report_type='xxx' 的报表页面。筛选器：...，KPI：...，表格列：..." |
| 改 KPI 阈值 | "把 reports/summary/config.json 里 design-coverage 的阈值从 60 改成 70" |
| 加筛选器 | "给 industry 报表加一个 text 类型的搜索筛选器，code='keyword'，placeholder='搜索项目名'" |
| 改表格列 | "给 design 报表的表格加一列 'quality_score'，宽度 100px，阈值 ≥ 4.0 绿色" |
| 新增图表 | "按 PROTOCOL.md 5.2 节流程，新增一个 ChartWaterfall 瀑布图组件" |
| 样式修复 | "MetricCard 在 dark-ops 主题下文字颜色不够对比，修复" |
| 国际化 | "给 FilterSection 的新增按钮加 i18n key" |

### 8.2 后端任务

| 场景 | Prompt |
|---|---|
| 新增端点 | "在 report-query 中新增 GET /api/dropdowns/{code}，参照 CLAUDE.md FastAPI 约定" |
| 加 ORM 模型 | "新增 report_fact 表模型，参照 CLAUDE.md SQLAlchemy 约定。字段：report_type, date, department, metric_code, value" |
| 写测试 | "给 /api/reports/{type}/config GET 端点写 pytest 测试：happy path + 404 + 500" |
| 调度任务 | "在 report-generation 中新增一个每天 3 点跑的 job，从 /api/external/data 拉数据写入 metric_value 表" |
| 修复 bug | "report-query 的 fixture fallback 在 config.json 有 BOM 头时解析失败，修复" |

### 8.3 跨层任务

| 场景 | Prompt |
|---|---|
| 端到端联调 | "前端 industry 页面切 api 模式后 KPI 数据为空。帮我检查：1) config.json 里的 data_endpoint 是否正确 2) 后端对应端点是否实现 3) envelope 格式是否匹配" |
| 新增实体 | "新增'数据源'管理功能：后端 CRUD 端点 + 前端 ManagementTable 页面 + mock 数据。参照指标管理的完整模式" |
| 协议变更 | "给 FilterSpec 增加 'tags' kind。需要同步更新的 5 个文件参照 PROTOCOL.md 4.4 节同步点清单" |
