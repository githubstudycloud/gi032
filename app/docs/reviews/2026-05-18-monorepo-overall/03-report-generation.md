# services/report-generation 审查

> 范围：FastAPI 写 + APScheduler 报表生成服务（13 个 Python 源文件 + 4 个测试）。
> 工具：`ruff check` ✅、`mypy --strict` ✅（13 source files）、`pytest` 20 passed ✅。

## 🔴 必须修

### 1. APScheduler 无并发护栏

[app/scheduler.py:30-49](../../../services/report-generation/app/scheduler.py#L30-L49) —— 两个 job `_do_ingest` / `_do_preagg` 都没有传 `max_instances` / `coalesce` / `misfire_grace_time`，APScheduler 默认 `max_instances=1` + `coalesce=False`，**一旦上个 tick 还没跑完**（preagg 可能很慢）下个 tick 会 raise `MaxInstancesReachedError` 而不是按业务意图（跳过 / 合并）处理；[services/report-generation/CLAUDE.md:19](../../../services/report-generation/CLAUDE.md#L19) 也明确要求"调度 job 必须幂等 + 长任务有 lock"，但代码里**没有任何 lock / advisory lock 实现**，连占位都没有。

同文件没有任何 `EVENT_JOB_ERROR` 监听，job 抛异常后 APScheduler 默认只 `log.exception`，**调用方完全感知不到**。

### 2. `--workers 1` 约束只有"文档级"强制，运行时不阻断

[app/main.py:38-69](../../../services/report-generation/app/main.py#L38-L69) `create_app()` 没有任何 worker 数检测，[Dockerfile:66](../../../services/report-generation/Dockerfile#L66) 硬编码 `--workers 1` 但 README/CLAUDE.md 给出的本地命令 ([README.md:9](../../../services/report-generation/README.md#L9)) 也只是说明，**没有 entry point 上的 guard**。任意运维把 systemd unit 写成 `--workers 4` 就会触发 ingest/preagg 重复执行（数据写入倍增正是 CLAUDE.md 反复强调的高危场景），而本服务对此没有任何自检（例如读 `os.environ.get("UVICORN_WORKERS")` 或 lifespan 起 sentinel 文件）。

### 3. 写入路径全是占位 echo，所有"幂等/事务"承诺都没有真实代码可审

- [app/api/ingest.py:35-51](../../../services/report-generation/app/api/ingest.py#L35-L51) `ingest_rows` / `ingest_csv` 都只是 `ok(...)` 回执，没有任何 DB 写入。
- [app/api/admin.py:53-97](../../../services/report-generation/app/api/admin.py#L53-L97) `list_metrics` / `upsert_metric` / `delete_metric` / `refresh_preagg` 全是 echo（注释明示"阶段一仅 echo"）。
- [services/report-generation/CLAUDE.md:19](../../../services/report-generation/CLAUDE.md#L19) 要求 ingest 用 `(date, source, version_no)` upsert —— **目前没有任何 upsert 实现**，没有 `version_no` 写入，没有 `ai_metric` / `ai_metric_invalid_mark` / `report_fact_*` 表。这是当前最大的契约/实现 gap。

### 4. `require_admin` dev 模式空 token 直接跳过，未按环境二次校验

[app/security.py:12-26](../../../services/report-generation/app/security.py#L12-L26)：`if not expected: return  # dev 模式，跳过`。生产部署若有人忘配 `ADMIN_TOKEN`（env 漏写、k8s ConfigMap 笔误），**整个 `/admin/*` + `/metrics/ingest*` 立即变为公开写接口**，没有 `service_name` / 环境标志（如 `ENV=prod`）作为二级断言。[services/report-generation/CLAUDE.md:27](../../../services/report-generation/CLAUDE.md#L27) 写了"prod 必填"，但代码层面没有 fail-fast。

### 5. `scheduler.add_job` 引用了 placeholder 函数 `_do_ingest` / `_do_preagg`，但 `/admin/preagg/refresh` 没有调用同一函数

[app/api/admin.py:81-84](../../../services/report-generation/app/api/admin.py#L81-L84) 手动触发只回 `{queued: True}`，**没有调用** [app/scheduler.py:25](../../../services/report-generation/app/scheduler.py#L25) 的 `_do_preagg`。[services/report-generation/CLAUDE.md:24](../../../services/report-generation/CLAUDE.md#L24) 禁止"在路由里直接 scheduler.add_job"是对的，但合理做法是把 job body 抽成模块级函数并被两边复用 —— 目前路由完全没碰这个函数。

## 🟡 建议

1. **[app/api/meta.py:17-28](../../../services/report-generation/app/api/meta.py#L17-L28) `/scheduler/jobs` 读 `from app.scheduler import _scheduler`** —— 引用了模块私有 `_scheduler` 变量（前缀下划线）。建议改成 `app/scheduler.py` 暴露 `get_scheduler()` 公开 getter，否则后续重构 `_scheduler` 容器（譬如改 `AsyncIOScheduler`）会沉默地破坏 `/scheduler/jobs`。
2. **[app/scheduler.py:17](../../../services/report-generation/app/scheduler.py#L17) 全局 `_scheduler: BackgroundScheduler | None = None`** —— 多次 `lifespan` 反复进入（pytest 起多次 `TestClient(create_app())`，见 [tests/test_admin_auth.py:22-23](../../../services/report-generation/tests/test_admin_auth.py#L22-L23) 反复 `create_app()`）情况下 `start_scheduler` 只起一次的好处变成"测试间状态泄漏"。`tests/test_admin_auth.py` 没有显式关 scheduler，加上 `Settings.scheduler_enabled: bool = True` 默认开启（[app/settings.py:35](../../../services/report-generation/app/settings.py#L35)），意味着**单元测试里实际起了 APScheduler 跑 cron**，CI 资源浪费 + 偶发 flakiness。建议测试 fixture 默认 `monkeypatch.setenv("SCHEDULER_ENABLED", "0")` 或在 `conftest.py` autouse 关掉。
3. **[app/db.py:28](../../../services/report-generation/app/db.py#L28) `engine` 模块级初始化** —— 导入即建池。[tests/test_seed.py](../../../services/report-generation/tests/test_seed.py) 不得不用一堆 `monkeypatch.setattr(db_module, "engine", new_engine)` + `setattr(seed_module, "engine", ...)`（[tests/test_seed.py:29-33](../../../services/report-generation/tests/test_seed.py#L29-L33)）才能切到临时 SQLite。这是典型的"模块级副作用"陷阱：应当走 `lru_cache` 工厂 `get_engine()`，跟 `get_settings()` 风格一致。当前 hack 也意味着 **`tests/test_admin_auth.py` 和 `tests/test_smoke.py` 都跑在默认 `sqlite:///../shared.db`**（即 monorepo 根目录上一层），开发机如果上一层有意外的 shared.db 会被测试触碰。
4. **[app/seed.py:113-144](../../../services/report-generation/app/seed.py#L113-L144) `seed_metrics` 全是 `Any`-style dict 访问** —— `cfg.get("kpi")` / `g.get("items")` / `it.get("key")` 等没有 Pydantic 模型校验，mock 文件结构一变就 silently `n=0` 通过。建议用 [services/report-query/app/schemas.py:88](../../../services/report-query/app/schemas.py#L88) 已有的 `KpiSpec` 复用解析（跨服务复制可，但当前是直接 raw dict 解析）。
5. **[app/api/admin.py:17-26](../../../services/report-generation/app/api/admin.py#L17-L26) 路由层 `MetricDef`、[app/models.py:71](../../../services/report-generation/app/models.py#L71) ORM 层 `MetricDef`** —— 同名类不同含义、不同字段。`MetricDef`(API) 有 `formula` / `unit` / `description` 但**没有** `created_at` / `updated_at` / `deleted_at`；`MetricDef`(ORM) 有 `deleted_at`（软删除字段，[app/models.py:100](../../../services/report-generation/app/models.py#L100)）。一旦阶段二接 DB，序列化 / 反序列化会冲突。建议改名 `MetricDefIn` / `MetricDefOut` 与 ORM 分离。
6. **[app/envelope.py:11](../../../services/report-generation/app/envelope.py#L11) PEP 695 类型参数语法 `class Envelope[T](BaseModel)`** —— 需要 Python ≥ 3.12（项目 `requires-python = ">=3.12,<3.14"` 符合）。功能正常，备注。`ok(data: Any = None)` / `fail(...)` 抛弃了 `T` 信息，返回 `dict[str, Any]` 而非 `Envelope[T]`，等于这个泛型从未被消费，可以删除 `[T]` 让代码更朴素。
7. **[app/seed.py:27](../../../services/report-generation/app/seed.py#L27) `logging.basicConfig(...)` 在 import 时执行** —— 任何 `from app.seed import run`（[app/api/admin.py:94](../../../services/report-generation/app/api/admin.py#L94)）都会全局 reconfigure logging，污染 uvicorn 自己的 logger 配置。建议把 `basicConfig` 收进 `main()` / `if __name__ == "__main__":` 块。
8. **[app/seed.py:86-90](../../../services/report-generation/app/seed.py#L86-L90) `items_raw = raw.get("items", []) if isinstance(raw, dict) else raw`** —— 这种"raw 既可能是 list 也可能是带 items 的 dict"的双形入参没有 Pydantic 校验。当 mock 改 shape，错误会推迟到测试。
9. **[app/api/ingest.py:48-51](../../../services/report-generation/app/api/ingest.py#L48-L51) `await file.read()` 一把读全部** —— CSV 上传无 size 上限，无流式解析，无字段校验，巨大文件直接 OOM。即便阶段一只数行也建议加 `MAX_UPLOAD_BYTES` 限制。
10. **CORS `allow_credentials=True` + `allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"]`** —— [app/main.py:47-53](../../../services/report-generation/app/main.py#L47-L53) / [app/settings.py:39](../../../services/report-generation/app/settings.py#L39) 默认值在 dev 没问题。生产环境若 `cors_origins` 没改成正式域名（envar 漏配），写接口暴露给 localhost source 没意义但不致命。建议生产 readme 提醒。
11. **[Dockerfile:48](../../../services/report-generation/Dockerfile#L48) `uv sync --frozen --no-install-project --no-dev --allow-insecure-host`** —— `--allow-insecure-host` 来自 PIP_INDEX_URL 抠出的 host，构建环境可控所以可接受，但 README 没强调它会跳过 TLS 校验，注释里写了一句但建议明确化。

## 🟢 备注

1. **协议字段一致**：[app/api/ingest.py:20-28](../../../services/report-generation/app/api/ingest.py#L20-L28) `IngestRow` 字段（`metric_code` / `period_date` / `domain_code` / `project_code` / `value` / `source` / `version_no` / `extra`）与 [services/report-generation/CLAUDE.md:19](../../../services/report-generation/CLAUDE.md#L19) 提到的 upsert key `(date, source, version_no)` 对得上。
2. **`/api/scheduler/jobs` 端点存在**（[app/api/meta.py:17](../../../services/report-generation/app/api/meta.py#L17)）。
3. **未发现 `print(...)` / `from ... import *` / 裸 `except:` / `except Exception: pass`**（grep 全空）。
4. **`from __future__ import annotations` 13 个源文件全覆盖**（每个文件第二/三行都有）。
5. **公开函数返回类型注解齐全**，路由签名都用 `Pydantic BaseModel`，没看到 `dict` 当请求体。
6. **[shared/contracts/report-protocol-v2.md](../../../shared/contracts/report-protocol-v2.md) 当前只列 query 服务的 `app/schemas.py`**（[shared/contracts/report-protocol-v2.md:7](../../../shared/contracts/report-protocol-v2.md#L7)），**generation 服务没有 `app/schemas.py`**（请求模型散落在 [app/api/admin.py](../../../services/report-generation/app/api/admin.py) / [app/api/ingest.py](../../../services/report-generation/app/api/ingest.py) 顶部）。这与 CLAUDE.md 根文件"跨子项目改动必须三处同步：shared/contracts + apps/web/types + services/report-query/schemas（+ generation）"对照下：generation 阶段一只 echo，没有写端 schemas 也算合理，但**契约升级时容易漏 generation**。
7. **[app/models.py:21-44](../../../services/report-generation/app/models.py#L21-L44) `ReportSnapshot` 没有 unique constraint**（`(report_type, snapshot_date, kind)` 唯一性 doc 在 line 22 写明但只建了普通 Index `idx_report_snapshot_lookup`，line 26）。[app/seed.py:59-72](../../../services/report-generation/app/seed.py#L59-L72) 的 upsert 完全靠先 SELECT 再 INSERT/UPDATE，并发下会产生重复行。
8. **[app/models.py](../../../services/report-generation/app/models.py) 缺 CLAUDE.md 提到的 `ai_metric` / `ai_metric_invalid_mark` / `report_fact_*` 表**（[services/report-generation/CLAUDE.md:50-52](../../../services/report-generation/CLAUDE.md#L50-L52)）—— 跟"全是占位"是配套现象，留作阶段二待办。
9. **Dockerfile 锁了 `--workers 1`**（[Dockerfile:66](../../../services/report-generation/Dockerfile#L66)），但 README 给的开发命令 `--workers 1` 是建议而非强制，开发机用 `--reload` 默认就是单 worker，不会触发问题，仅生产 systemd unit / k8s deployment 文件需要复核。

## Lint/Type check 结果

- **ruff check** (pyproject.toml select=E/F/W/I/B/UP/ANN/S/RUF)：`All checks passed!` 全绿。
- **mypy --strict**：`Success: no issues found in 13 source files` 全绿。
- **pytest**：`20 passed in 1.94s`（4 个测试文件 / 20 个用例）。

## 测试覆盖盘点

源文件 13 个；测试 4 个：

- [tests/test_smoke.py](../../../services/report-generation/tests/test_smoke.py)：健康检查 + admin/metrics/list + ingest JSON + admin token gate (4 用例)。
- [tests/test_admin_auth.py](../../../services/report-generation/tests/test_admin_auth.py)：dev 无 token / prod 无 header / prod 错 token / prod 对 token / prod malformed / ingest 同样要 token (6 用例)。覆盖 [services/report-generation/CLAUDE.md:56](../../../services/report-generation/CLAUDE.md#L56) 要求的 401/403/200 三态。
- [tests/test_ingest.py](../../../services/report-generation/tests/test_ingest.py)：CSV 正常/空/仅表头/UTF-8 BOM + JSON 正常/空 rows/422 (7 用例)。
- [tests/test_seed.py](../../../services/report-generation/tests/test_seed.py)：seed 行数 / 幂等 / `--reset` 清旧数据 (3 用例)。

### 明显空白

1. **scheduler.py 零测试**（[app/scheduler.py](../../../services/report-generation/app/scheduler.py) 整个文件）—— `start_scheduler` 重入幂等性、`stop_scheduler` 在未启动时调用、`/api/scheduler/jobs` 在 `_scheduler is None` 与有 job 两种状态、cron 字符串非法时 `CronTrigger.from_crontab` 报错的传播，都没测。[services/report-generation/CLAUDE.md:57](../../../services/report-generation/CLAUDE.md#L57) 还专门提了 BackgroundScheduler + MemoryJobStore 测试约定，但没人执行。
2. **`/api/admin/metrics/upsert`、`/api/admin/metrics/delete`、`/api/admin/preagg/refresh`、`/api/admin/seed` 都没有端点用例**（[app/api/admin.py:60-97](../../../services/report-generation/app/api/admin.py#L60-L97)）。即便阶段一只 echo，状态码 / envelope.code / 入参 422 路径也该测一遍。
3. **`/api/scheduler/jobs` 端点零测试**（[app/api/meta.py:17](../../../services/report-generation/app/api/meta.py#L17)）—— `running:false` 路径未被验证。
4. **`get_session()` 异常 rollback 路径未测**（[app/db.py:32-41](../../../services/report-generation/app/db.py#L32-L41)）—— `try/yield/commit/except rollback/raise` 整段无回归。
5. **CORS / unhandled_exception_handler 未测**（[app/main.py:55-60](../../../services/report-generation/app/main.py#L55-L60)）—— 500 兜底没有用例触发。
6. **scheduler 在 `TestClient(create_app())` 下默认 `scheduler_enabled=True`**（[app/settings.py:35](../../../services/report-generation/app/settings.py#L35)），所以 6+4+7 个测试每次都顺手起了 APScheduler 但没人关。如果 ingest_cron / preagg_cron 配置成"每秒"，测试就会 flake。`tests/test_admin_auth.py:22` 反复 `TestClient(create_app())` 也意味着每次都开 scheduler。
7. **`seed.py` 几个分支不全**：`_MOCK_ROOT` fallback 三档（env / `/seed-mock` / repo-relative，[app/seed.py:30-37](../../../services/report-generation/app/seed.py#L30-L37)）只测了 repo-relative 一条；`SEED_MOCK_PATH` env 路径未覆盖。
8. **`/api/metrics/ingest/csv` 鉴权未单独覆盖**（[tests/test_admin_auth.py:69-73](../../../services/report-generation/tests/test_admin_auth.py#L69-L73) 测的是 `/api/metrics/ingest`，CSV 路径没单测）。
