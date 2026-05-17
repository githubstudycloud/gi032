# CLAUDE.md — report-query（查询服务）

> 加载顺序：根 `CLAUDE.md` → 本文件。根文件已规定全 Python 通用约束，**这里只列差异**。

## 角色

**只读**。前端 `/api/reports/...` 系列查询走这里。不挂 admin / ingest / scheduler。

端口 **8001**。

## 端点约定

| 方法 | 路径 | 说明 |
|---|---|---|
| GET  | `/api/healthz` | 健康 |
| GET  | `/api/dropdowns/{code}` | 通用下拉数据（dim_* / 枚举字典） |
| GET  | `/api/reports/{type}/config` | 报表配置（V2 协议） |
| GET  | `/api/reports/{type}/data` | 默认数据（无筛选） |
| POST | `/api/reports/{type}/data` | 带筛选 / 分页 / 排序 / 对比 |
| POST | `/api/reports/{type}/drilldown/{ref}` | 钻取明细 |

## 必守

- ✅ 路由层禁止 `session.commit()`。FastAPI 的 `get_session` 在查询服务里**不开 commit**。
- ✅ 任何写表想法 → 它属于 `report-generation`，跨服务通信走 HTTP（不要直接调）。
- ✅ 大查询走预聚合表（`report_fact_*`），实时长表 `ai_metric` 只在版本/明细页用。
- ✅ 分页参数 `page_size` 上限 200，防止误打全表。
- ✅ 错误响应必带 envelope；HTTP 状态码 + `code` 双轨。

## 禁忌

- ❌ 在路由里写 SQL 字符串 —— 用 SQLAlchemy 表达式 / ORM。
- ❌ 把 `dict` 直接当请求体 —— 必须 Pydantic Model。
- ❌ 加 admin 路由（鉴权 / 写库） —— 走 `report-generation`。
- ❌ 启动时跑数据初始化 / migration —— 只允许 `select 1` 探活。

## 设计原则

- **零 DB 可启动**：DB 没数据时回落到读 `apps/web/public/mock/`（`app/services/fixtures.py`）。前端开发不依赖后端落库。
- **协议同源**：`app/schemas.py` 跟 `apps/web/app/types/report-config.ts` 一一对应。改一边必改另一边 + `shared/contracts/`。
- **缓存策略**：`/config` 默认 `lru_cache` 60s（配置不常变）；`/data` 不缓存（每次重新算）。
- **查询计划**：每个表格 tab 一次 SQL，禁止 N+1。需要预聚合就走 `report_fact_*` 表。

## 测试约定

- 每个新端点都要 1 个 happy path + 1 个 4xx 用例。
- 引用一致性回归依赖前端 fixtures 文件存在；CI 跑前端测试已经卡了这一层，后端不重复造轮子。
- DB 测试用 SQLite 临时文件，禁止用主 db。
