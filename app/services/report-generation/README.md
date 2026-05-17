# report-generation

生成服务（写 + 调度）。端口 **8002**。

## 启动

```powershell
uv sync
uv run uvicorn app.main:app --host 127.0.0.1 --port 8002 --workers 1
```

**警告**：`--workers` 必须 = 1。APScheduler 是进程内调度，多 worker 会让 ingest/preagg 重复执行，数据写入倍增。

OpenAPI 文档：http://127.0.0.1:8002/docs

## 端点速查

| 方法 | 路径 | 说明 |
|---|---|---|
| GET  | `/api/healthz` | 活性 |
| GET  | `/api/scheduler/jobs` | 当前调度 job 列表（id + next_run） |
| POST | `/api/metrics/ingest` | JSON 推送指标数据 |
| POST | `/api/metrics/ingest/csv` | CSV 上传 |
| POST | `/api/admin/metrics/list` | 指标定义列表 |
| POST | `/api/admin/metrics/upsert` | 新建 / 更新指标 |
| POST | `/api/admin/metrics/delete` | 删除指标 |
| POST | `/api/admin/preagg/refresh` | 手动触发预聚合 |

## 鉴权

`/admin/*` 和 `/metrics/ingest*` 路由需要 `Authorization: Bearer <ADMIN_TOKEN>` header。

dev 模式下 `ADMIN_TOKEN` 留空即跳过；prod 必填。

## 协议

跟 report-query 一致：`{ code, message, trace_id, data }`。

## 测试 / 静态检查

```powershell
uv run pytest
uv run ruff check .
uv run mypy app
```
