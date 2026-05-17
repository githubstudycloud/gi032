# report-query

查询服务（只读）。端口 **8001**。

## 启动

```powershell
# 装依赖（uv 会创建 .venv 并装好所有依赖）
uv sync

# 跑服务
uv run uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

OpenAPI 文档：http://127.0.0.1:8001/docs

## 端点速查

| 方法 | 路径 | 说明 |
|---|---|---|
| GET  | `/api/healthz` | 活性 |
| GET  | `/api/dropdowns/{code}` | 下拉数据（fixtures 优先，后续接 dim 表） |
| GET  | `/api/reports/{type}/config` | 报表配置（meta + filters + kpi + primary_view + drilldowns） |
| GET  | `/api/reports/{type}/data` | 默认数据 |
| POST | `/api/reports/{type}/data` | 带筛选 / 分页 / 排序 / 对比 |
| POST | `/api/reports/{type}/drilldown/{ref}` | 钻取明细 |

## 协议

所有响应统一信封：

```json
{ "code": 0, "message": "ok", "trace_id": "...", "data": { ... } }
```

`code != 0` 即错误，`message` 描述，`data` 可选。

## 配置

复制 `.env.example` → `.env`，按本机改 `DATABASE_URL`。

支持 MySQL 5.7+ / 8.0 / PostgreSQL / SQLite，由 URL prefix 自动切换。

## 测试 / 静态检查

```powershell
uv run pytest        # 单元 + 冒烟
uv run ruff check .  # lint
uv run ruff format --check .  # 格式
uv run mypy app      # 类型
```

## 设计原则

- **只读**：路由层禁止 commit；写入走 report-generation。
- **零 DB 可跑**：fixtures 兜底（直接读 `apps/web/public/mock/`），方便前端联调。
- **协议同源**：`app/schemas.py` 跟前端 `apps/web/app/types/report-config.ts` 一一对应。
