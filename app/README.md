# 运营看板 Monorepo

三个子项目 + 共享契约，互不干扰：

| 路径 | 角色 | 语言 | 端口 |
|---|---|---|---|
| [`apps/web/`](apps/web/) | Nuxt 4 前端 | TS / Vue 3.5 | 3000 |
| [`services/report-query/`](services/report-query/) | 查询服务（只读） | Python 3.12 / FastAPI | 8001 |
| [`services/report-generation/`](services/report-generation/) | 生成服务（写 + APScheduler） | Python 3.12 / FastAPI | 8002 |
| [`shared/contracts/`](shared/contracts/) | 跨项目协议 | Markdown / JSON | — |
| [`docs/`](docs/) | 设计文档 | Markdown | — |

## 一键启动

```powershell
# 前端
cd apps/web && pnpm dev

# 查询
cd services/report-query && uv run uvicorn app.main:app --port 8001 --reload

# 生成（必须 --workers 1）
cd services/report-generation && uv run uvicorn app.main:app --port 8002 --workers 1 --reload
```

## 工具链

- `pnpm` + `vitest` + `vue-tsc` + `@nuxt/eslint`（前端）
- `uv` + `pytest` + `mypy` + `ruff`（后端）

## 协议

所有 HTTP 响应统一信封：`{ code, message, trace_id, data }`。详见 [`shared/contracts/envelope.md`](shared/contracts/envelope.md)。

报表 V2 协议（config/data 分离）：见 [`docs/report-platform-v2.md`](docs/report-platform-v2.md)。

## 共享规则

约束硬规则放在 [CLAUDE.md](CLAUDE.md)（根目录）。子项目细则各自在 `apps/web/CLAUDE.md` / `services/*/CLAUDE.md`。

## 子项目独立 README

- [apps/web/README.md](apps/web/README.md)
- [services/report-query/README.md](services/report-query/README.md)
- [services/report-generation/README.md](services/report-generation/README.md)
