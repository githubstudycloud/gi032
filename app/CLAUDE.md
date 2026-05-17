# CLAUDE.md — 运营看板 Monorepo（根目录）

> Claude Code 启动时自动加载本文件 + **当前工作目录所在子项目** 的 CLAUDE.md。
> 例：在 `apps/web/` 下编辑 Vue 文件，会加载 `<root>/CLAUDE.md` + `<root>/apps/web/CLAUDE.md`。

## 项目布局

```
20260515/app/                 (git 根)
├── apps/
│   └── web/                  Nuxt 4 前端（端口 3000）
├── services/
│   ├── report-query/         FastAPI 只读（端口 8001）
│   └── report-generation/    FastAPI 写 + APScheduler（端口 8002，必须 --workers 1）
├── shared/
│   └── contracts/            envelope.md + report-protocol-v2.md
├── docs/                     跨项目设计文档
├── .claude/skills/           共享 skills（Vue 系 + Python 系）
└── CLAUDE.md                 ← 本文件
```

## 互不干扰原则（重要）

- 每个子项目自带 `pyproject.toml` 或 `package.json` + 锁文件 + 独立 venv / node_modules。**不要在根目录装依赖**。
- 端口分配固定：`3000 / 8001 / 8002`。三者可以同时跑，互不影响。
- `apps/web/` 的 `pnpm` 命令在 `apps/web/` 目录跑；`services/*/` 的 `uv` 命令在 service 目录跑。
- 共享只通过 `shared/contracts/` 走文档契约，**不共享代码**（直到有必要再抽 `shared/python-lib` 之类）。

## 启动三件套（开发）

```powershell
# 前端
cd apps/web && pnpm dev

# 查询服务
cd services/report-query && uv run uvicorn app.main:app --port 8001 --reload

# 生成服务（必须 --workers 1）
cd services/report-generation && uv run uvicorn app.main:app --port 8002 --workers 1 --reload
```

## 工具链锁定

| 语言 | 包管理 | Lint | 类型 | 测试 |
|---|---|---|---|---|
| TypeScript / Vue | `pnpm` | `@nuxt/eslint` (stylistic 2 空格) | `vue-tsc` | `vitest` |
| Python | `uv` | `ruff` (E/F/W/I/B/UP/ANN/S/RUF) | `mypy --strict` | `pytest` |

**绝对不要**：
- ❌ 在子项目里用 `pip` / `poetry` / `pdm` / `npm` / `yarn` —— 一律 `uv` / `pnpm`。
- ❌ 在根目录建 `node_modules` 或 `.venv` —— 它们属于子项目。
- ❌ 跨项目直接 import（除非通过 `shared/`）。

## Python 通用约束（适用于 `services/*` 所有 Python 项目）

### 语言

- Python ≥ 3.12（uv 自动管理）。
- `from __future__ import annotations` 写在每个模块顶部（让所有类型注解都是 lazy 字符串）。
- **所有公开函数标注返回类型**；模块级常量标注 `Final` 或直接用类型注解。
- 禁止 `from xxx import *`。
- 禁止 `print(...)` 做调试 —— 用 `logging.getLogger(__name__)`。

### FastAPI

- 路由文件挂 `APIRouter`，**不要直接 `@app.get`**。
- 路由签名里 `request body` 用 Pydantic `BaseModel`；**不要用 `dict`**。
- 路径参数 / 查询参数都标类型；用 `Annotated[T, Path/Query/Header]` 而非默认值魔法。
- 鉴权 / DB session 都用 `Depends`。
- 响应统一过 `app.envelope.ok()` / `fail()`。

### Pydantic

- v2，配置走 `model_config = ConfigDict(...)`，不再 `class Config`。
- 严格模型（不接陌生字段）用 `ConfigDict(extra="forbid")`。
- 默认值用 `Field(default_factory=...)`，**不要写 `Field(default=[])` 这类共享可变默认**。
- DateTime / Decimal 字段在 schemas 里就标好类型，别在 service 层再 str 转。

### SQLAlchemy 2.x

- ORM 走 `DeclarativeBase`（Python 类），不用 `declarative_base()` 工厂函数。
- 查询走 `select(...).where(...)`，不用 `Query` 旧风格。
- Session 用 `with Session(engine) as session:` 或 `Depends(get_session)`，**不要全局 session**。
- 写操作显式 `session.commit()`；查询服务路由层禁止 commit。

### 错误处理

- 业务错误抛 `HTTPException(status_code=..., detail=...)`，由全局 handler 转 envelope。
- 未捕获异常由 `@app.exception_handler(Exception)` 兜底成 `code=500`。
- 不要 swallow exception（裸 `except:` 或 `except Exception: pass`）。

### 测试

- pytest fixtures 优先 `pytest.fixture`；不要在测试间共享状态。
- `TestClient(app)` 用 fixture 注入，每个测试拿干净 client。
- HTTP 测试 必看：状态码 + envelope.code + envelope.data 形状。
- DB 测试用临时 SQLite（`tempfile` + `sqlite:///<temp>`），不要污染主 db。

## 用户可见文本

- 前端：i18n（`useI18n()`），见 `apps/web/i18n/locales/*.json`。
- 后端：所有 `message` / 错误描述用**中文**（团队语言），不写英文 stacktrace 给前端看。

## 提交规范

中文 commit message，conventional commits 前缀（`feat:` / `fix:` / `refactor:` / `chore:` / `docs:`）。

例：`feat(report-query): /config 端点接入 DB`。

## 跨子项目改动

涉及契约（envelope / 报表协议）的改动**必须三处同步**：
- `shared/contracts/...` 描述更新
- `apps/web/app/types/report-config.ts`
- `services/report-query/app/schemas.py`（+ generation 的 schemas）

漏改 → 测试会挂。

## 已踩过的坑

- Nuxt 4.4 + Node 24 + Windows：`devServer.host='127.0.0.1'`，详见 `apps/web/CLAUDE.md`。
- APScheduler 多 worker：生成服务 prod 启动 `--workers 1`，详见 `services/report-generation/README.md`。
- WebStorm 锁 src 目录：迁移时先杀 Nuxt dev / esbuild / @nuxt/cli 进程，再 git mv。

## 子项目独立 CLAUDE.md

- [apps/web/CLAUDE.md](apps/web/CLAUDE.md) —— Vue / Nuxt / Pinia / Tailwind v4 细则
- [services/report-query/CLAUDE.md](services/report-query/CLAUDE.md) —— 查询服务细则
- [services/report-generation/CLAUDE.md](services/report-generation/CLAUDE.md) —— 生成服务细则
