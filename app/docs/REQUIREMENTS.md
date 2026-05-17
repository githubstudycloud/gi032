# 需求规格

## 1. 项目概述

**运营看板**：把分散的 AI 测试运营数据（指标、产业 / 领域试点、测试设计 / 代码生成成效）聚合成一个统一可下钻、可对比的实时视图，给一线运营和决策层使用。

- 项目代号：**gi032**（参考 gi031 FastAPI 报表平台）
- 状态：开发中（含完整前端 UI + 双服务 Python 后端骨架 + Docker 部署）
- 第三方依赖最少化，可断网运行

## 2. 用户角色

| 角色 | 关心什么 | 高频操作 |
|---|---|---|
| 一线运营 | 当天数据 / 待处理反馈 | 看核心指标、点卡片下钻、按部门筛选 |
| 业务决策层 | 趋势、对比、覆盖率 | 总览页 KPI、月环比、产业 / 领域排名 |
| 数据组 | 指标定义、数据源、责任人 | 指标管理 CRUD、Excel 导入 |
| 后端 / 运维 | 系统健康 / 调度 / 鉴权 | scheduler/jobs / admin 写入 / 部署 |

## 3. 功能模块

### 3.1 首页（简介示例）

- 平台 logo + 标题 + 子标题
- 4 个核心指标卡（今日新增用例 / 待处理反馈 / 运维告警 / 活跃用户）
- 入口卡片（一级导航做成卡片，去掉 single）
- 最近动态列表（10 条）

### 3.2 首页1（示例外链嵌入）

- iframe 嵌入指定 URL（demo 时为 `https://www.google.com/`，离线时由部署方改）
- 顶部一级 nav 第一个

### 3.3 AI 辅助测试运营（5 个二级页）

每个二级页都是同一份 `<ReportPage>` 模板 + 一份 `config.json` + 一份 `data.json` 驱动。

| 路径 | 标题 | 特征 |
|---|---|---|
| `/ai-test/overview/summary` | 总览 | 多 tab（产业试点 / 领域试点）、3 组 13 个 KPI、KPI 卡可展开图表 |
| `/ai-test/overview/industry` | 产业落地进展 | 时间范围 + 部门筛选、单 tab 多级表头 |
| `/ai-test/overview/domain` | 领域落地进展 | 同 industry，统计口径不同 |
| `/ai-test/general/design` | AI 辅助测试设计 | 按部门 AI 测试设计渗透率排行 |
| `/ai-test/general/codegen` | AI 辅助测试代码生成 | 代码生成覆盖与质量 |

页面级能力：
- **筛选区** —— 12 种 filter kind（date_range / flat_dropdown / search_dropdown / text / multi_select / number_range / ...）由 `config.filters[].kind` 派发
- **KPI 区** —— `config.kpi.groups[].items[]` 定义 + `data.kpi.groups[].items[]` 数值合并；支持阈值色（高于 / 低于阈值变色）和趋势（mom / trend up/down/flat）
- **主视图区** —— TabStrip + MultiLevelTable，header_tree 任意嵌套
- **下钻** —— 列里 `drilldown_ref` 命中后弹模态层，加载 `config.drilldowns[ref]` 描述的详情接口
- **工具条** —— 刷新 / 分页模式 / 对比策略 / 列定制 / 导出

### 3.4 系统设置 / 指标管理 (`/ai-test/system/metrics`)

- 表头字段：指标 ID / 指标名称 / 分类 / 数据源 / 状态 / 负责人 / 更新时间 / 操作
- 顶部 search + 分类（用户 / 业务 / 能力）+ 状态（启用 / 草稿 / 废弃）筛选
- 新增 / 编辑 / 删除三类操作（dialog 弹窗）
- 分页 10/页

### 3.5 系统设置 / Excel 导入 (`/ai-test/system/excel`)

- 拖拽 / 粘贴 CSV，按 `##META / ##METRICS / ##COLUMNS / ##ROWS` 分段
- 支持 `##COLUMNS parent` 嵌套出 N 级表头
- 支持 `highlight=1` 标重点列
- 一键预览成"概览 / 通用 Agent"页同款看板

### 3.6 后端接口（两服务）

**查询服务 report-query (端口 8001，只读)**

| 方法 | 路径 | 行为 |
|---|---|---|
| GET | `/api/healthz` | 活性 |
| GET | `/api/branding` | 平台 logo / 标题 / 副标题 / 版本 |
| GET | `/api/nav` | 顶部 + 侧边导航树 |
| GET | `/api/fonts` | 字体切换器配置 |
| GET | `/api/themes` | 主题切换器配置 |
| GET | `/api/dropdowns/{code}` | 通用下拉（DB → fixture 回落） |
| GET | `/api/reports/{type}/config` | 报表配置 |
| GET | `/api/reports/{type}/data` | 默认数据 |
| POST | `/api/reports/{type}/data` | 带筛选 / 分页 / 排序 / 对比 |
| POST | `/api/reports/{type}/drilldown/{ref}` | 钻取明细 |

**生成服务 report-generation (端口 8002，写 + 调度)**

| 方法 | 路径 | 鉴权 | 行为 |
|---|---|---|---|
| GET | `/api/healthz` | — | 活性 |
| GET | `/api/scheduler/jobs` | — | 当前 job + next_run |
| POST | `/api/metrics/ingest` | ✅ | JSON 推送数据 |
| POST | `/api/metrics/ingest/csv` | ✅ | CSV 上传 |
| POST | `/api/admin/metrics/list` | ✅ | 指标列表 |
| POST | `/api/admin/metrics/upsert` | ✅ | 新建 / 更新 |
| POST | `/api/admin/metrics/delete` | ✅ | 删除（软删） |
| POST | `/api/admin/preagg/refresh` | ✅ | 预聚合重算 |
| POST | `/api/admin/seed` | ✅ | 从 mock 重灌 DB |

## 4. 非功能需求

| 类型 | 要求 |
|---|---|
| **国际化** | zh-CN（默认） / en-US，cookie 持久化（`ops-dashboard:locale`），切语言不刷新 |
| **主题** | 4 套：minimal / business / ant-cn / dark-ops；切主题不刷新 |
| **字体** | 4 套：system（默认 / 离线零依赖） / noto / lxgw / playfair（后 3 需 vendor-fonts.mjs） |
| **数据源** | 前端 `dataSourceMode` 切 `json`（读 `/mock/*.json`）↔ `api`（走 `/api/...`） |
| **DB 兼容** | MySQL 5.7 / 8.0 / PostgreSQL / SQLite，由 `DATABASE_URL` 切换 |
| **离线** | 系统字体 + 已安装依赖 + 本地 mock 即可跑通；docker save/load 传镜像 |
| **可访问性** | aria-label / aria-pressed / role / 键盘可达；MultiLevelTable / FilterSection 已做 |
| **响应式** | 顶部 nav 横向滚动；TopBar `max-w-[1680px] mx-auto`；主区按 sidebar 显隐切宽 |
| **类型** | TS strict / Python mypy strict |
| **静态检查** | ESLint 0 / Ruff 0 |
| **性能** | 单页首屏 < 2s（local mock），ssg generate 后静态站可 CDN |
| **可观察** | 每个 envelope 带 `trace_id`；日志带级别；scheduler/jobs 暴露当前 job |

## 5. 用户场景示例

### 场景 A：运营每天上班看总览

1. 浏览器打开 `http://192.168.0.132/`
2. 点 nav 「AI辅助测试运营」→「概览」→「总览」
3. 看 13 个核心指标的环比 + 趋势
4. 某个指标变红（低于阈值）→ 点卡片展开 → 看图表细节
5. 切下面 tab「产业试点进展」→ 看 3 个产业的本月数据
6. 点某行的「下钻」→ 弹模态层 → 看该产业的明细

### 场景 B：数据组维护指标

1. nav 「系统设置」→「指标管理」
2. 看到 13 个指标的卡片化列表
3. 点「+ 新增」→ 填表 → 提交 → 列表刷新
4. 编辑某行 → 改公式 / 数据源 → 保存
5. 切换分类筛选 → 看「能力指标」组

### 场景 C：决策层切 EN

1. 顶部右侧 LocaleSwitcher 点 EN
2. 全站文案切英文（cookie 记住）
3. 数据值（标签 / 列名）保持原文（数据=语言无关，由 JSON 决定）

### 场景 D：部署后切真后端

1. 编辑 `apps/web/Dockerfile` ARG `NUXT_PUBLIC_DATA_SOURCE_MODE=api`
2. `docker compose build web && docker compose up -d web`
3. 浏览器看到的数据现在来自 MySQL（之前是静态 mock）

### 场景 E：离线机部署

1. 联网机 `docker compose build` 得到镜像
2. `docker save` → `scp` → 离线机 `docker load`
3. 离线机 `docker compose up -d` → `docker compose exec report-generation python -m app.seed`
4. 访问 `http://内网IP/` 全功能可用（除非用户主动切非系统字体）

## 6. 排除范围（暂不做）

- 用户登录 / 权限分级（admin token 是简化方案）
- 实时推送（WebSocket / SSE）
- 移动端独立 App（Web 自适应即可）
- 全文检索（关键词检索仅限当前列表）
- 跨语言数据值翻译

## 7. 接受标准

- ✅ 三个服务 lint = 0 / 类型 = 0 / tests 全过
- ✅ 7 个前端页面 200，关键路径在 Chrome 跑通
- ✅ `docker compose up -d` 后 4 个容器健康
- ✅ `seed` 后查询服务从 DB 读数据
- ✅ `NUXT_PUBLIC_DATA_SOURCE_MODE=api` 重建后前端走真后端
- ✅ 部署文档可独立执行（无需问开发者）
