# CLAUDE.md — report-generation（生成服务）

> 加载顺序：根 `CLAUDE.md` → 本文件。根已规定全 Python 通用约束，**这里只列差异**。

## 角色

**写 + 调度**。包含：
- ingest（外部数据推入 / CSV 上传）
- admin（指标 CRUD / 预聚合手动刷新）
- APScheduler（cron 任务）

端口 **8002**。

## 必守

- ✅ `uvicorn` 启动 **必须** `--workers 1`。APScheduler 是进程内调度，多 worker 会让 ingest / preagg 重复执行。
- ✅ `/admin/*` 和 `/metrics/ingest*` 全部 `Depends(require_admin)`。
- ✅ 所有写表走事务（`get_session` 末尾 commit / 异常 rollback）。
- ✅ 调度 job 必须**幂等**：同一时间窗多跑一次结果一致（比如 ingest 用 `(date, source, version_no)` upsert）。
- ✅ 长任务（preagg）有 lock 表 / advisory lock，避免手动触发 + cron 同时跑。

## 禁忌

- ❌ 在 lifespan 启动钩子里跑昂贵任务（DB 初始化、回填、回放） —— 那些放 admin endpoint 手动触发。
- ❌ 在路由里直接调 scheduler.add_job —— 调度只在启动时注册。
- ❌ 用 `time.sleep` 同步阻塞 —— 异步任务用 APScheduler / FastAPI BackgroundTasks。
- ❌ 把生产 token 写进代码 —— 一律读 `ADMIN_TOKEN` 环境变量。

## 端点约定

| 方法 | 路径 | 鉴权 |
|---|---|---|
| GET  | `/api/healthz` | — |
| GET  | `/api/scheduler/jobs` | — |
| POST | `/api/metrics/ingest` | ✅ |
| POST | `/api/metrics/ingest/csv` | ✅ |
| POST | `/api/admin/metrics/list` | ✅ |
| POST | `/api/admin/metrics/upsert` | ✅ |
| POST | `/api/admin/metrics/delete` | ✅ |
| POST | `/api/admin/preagg/refresh` | ✅ |

## 调度规则

- cron 写在 `.env`（`INGEST_CRON` / `PREAGG_CRON`），不要硬编码。
- 时区固定 `Asia/Shanghai`。
- 任何新 job 必须：(1) 写明 cron；(2) 写明幂等策略；(3) 写明失败重试规则；(4) 写明监控指标。

## 数据写入规则

- 长表 `ai_metric` 存原始事实，多版本共存（`version_no` 区分）。
- 失效用独立标记表 `ai_metric_invalid_mark`，**禁止物理删除**。
- 预聚合表 `report_fact_*` 由 preagg job 重算；前端查询优先走预聚合。

## 测试约定

- 每个 admin endpoint 都要测：(1) 无 token 401；(2) 错 token 403；(3) 正确 token 200。
- 调度器测试用 `BackgroundScheduler` + `MemoryJobStore`，不要测真 cron 触发时机（不稳定）。
