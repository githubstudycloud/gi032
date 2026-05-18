# services/report-query 审查

> 范围：FastAPI 只读报表查询服务（13 个 Python 源文件 + 5 个测试）。
> 工具：`ruff check` ✅、`mypy --strict` ✅（16 source files）、`pytest` 20 passed ✅。

## 🔴 必须修

### Envelope 契约破坏（4xx 全走默认）

`HTTPException` 不会被 `@app.exception_handler(Exception)` 拦截（FastAPI 内置 `HTTPException` handler 在它之前匹配），所有 4xx 返回的是 FastAPI 默认 `{"detail": "..."}` 而非 `{code, message, trace_id, data}`。违反根 CLAUDE.md "错误响应必带 envelope；HTTP 状态码 + `code` 双轨"。

- [app/main.py:53-59](../../../services/report-query/app/main.py#L53-L59) 只挂了 `Exception` handler，缺 `HTTPException` 和 `RequestValidationError` 的 envelope 化处理。
- [app/api/config.py:28](../../../services/report-query/app/api/config.py#L28)、[app/api/data.py:23,36](../../../services/report-query/app/api/data.py#L23)、[app/api/chrome.py:27,35,43,51,64](../../../services/report-query/app/api/chrome.py#L27)：所有 404 都不带 envelope。
- [shared/contracts/envelope.md:38](../../../shared/contracts/envelope.md#L38) 明确要求 Pydantic 校验失败应该 `code=40001` + `data.issues=[...]`，本服务也没做。

### Schema 与 TS 协议大面积漂移

`app/schemas.py` ↔ `apps/web/app/types/report-config.ts`：

- **`ReportMeta.version`**：Python `str = "v2"` vs TS `number`（[schemas.py:26](../../../services/report-query/app/schemas.py#L26) vs [report-config.ts:21](../../../apps/web/app/types/report-config.ts#L21)）。
- **`ReportMeta` 缺 `show_subtitle?`、`user_pref_endpoint?`**（[schemas.py:21-26](../../../services/report-query/app/schemas.py#L21-L26) vs [report-config.ts:19-22](../../../apps/web/app/types/report-config.ts#L19-L22)）。
- **`ToolbarSpec` 字段名完全不同**：Python `refresh/paging/compare/columns/export` vs TS `show_refresh/show_paging_mode/show_compare/show_column_customizer/show_export`（[schemas.py:29-34](../../../services/report-query/app/schemas.py#L29-L34) vs [report-config.ts:27-33](../../../apps/web/app/types/report-config.ts#L27-L33)）。
- **`FilterKind` 枚举值完全错位**：Python 有 `tag/checkbox_group/radio_group/cascade/tree_select`，TS 有 `hierarchy_dropdown/multi_search/boolean/enum_radio/enum_chips`（[schemas.py:42-46](../../../services/report-query/app/schemas.py#L42-L46) vs [report-config.ts:37-42](../../../apps/web/app/types/report-config.ts#L37-L42)）。
- **`FilterSpec` 缺 `param/depends_on/options/min/max/step/unit/multi`**（[schemas.py:49-56](../../../services/report-query/app/schemas.py#L49-L56) vs [report-config.ts:60-76](../../../apps/web/app/types/report-config.ts#L60-L76)）。
- **`FilterSource` 只有 `endpoint+method`**；TS `FilterSourceSpec` 多 11 个字段（[schemas.py:37-39](../../../services/report-query/app/schemas.py#L37-L39) vs [report-config.ts:44-58](../../../apps/web/app/types/report-config.ts#L44-L58)）。
- **`Threshold` 模型完全不同**：Python 是 `good/warn/danger/direction`，TS 是 `min/max/goodColor/badColor`（[schemas.py:59-63](../../../services/report-query/app/schemas.py#L59-L63) vs [report-config.ts:80-85](../../../apps/web/app/types/report-config.ts#L80-L85)）。
- **`KpiSpec` 缺 `layout_mode_default`**（[schemas.py:83-88](../../../services/report-query/app/schemas.py#L83-L88) vs [report-config.ts:104-111](../../../apps/web/app/types/report-config.ts#L104-L111)）。
- **`PrimaryView` 缺 `method/row_dim_options/row_dim_default/row_favorite`**（[schemas.py:120-125](../../../services/report-query/app/schemas.py#L120-L125) vs [report-config.ts:135-145](../../../apps/web/app/types/report-config.ts#L135-L145)）。
- **`TabDef` 缺 `data_endpoint?/header_tree_endpoint?`**，且 `header_tree` 在后端是必填，TS 是可选（[schemas.py:108-111](../../../services/report-query/app/schemas.py#L108-L111) vs [report-config.ts:115-121](../../../apps/web/app/types/report-config.ts#L115-L121)）。
- **`PrimaryViewPaging` 多 `page_size_options`，缺 `enabled?`**（[schemas.py:114-117](../../../services/report-query/app/schemas.py#L114-L117) vs [report-config.ts:123-127](../../../apps/web/app/types/report-config.ts#L123-L127)）。
- **`KpiItemValue.value`**：Python `str | float | int | None`，TS `string`（[schemas.py:149](../../../services/report-query/app/schemas.py#L149) vs [report-config.ts:174](../../../apps/web/app/types/report-config.ts#L174)）。
- **`ReportData` 缺顶层 `drilldowns?`**（[schemas.py:170-172](../../../services/report-query/app/schemas.py#L170-L172) vs [report-config.ts:194-198](../../../apps/web/app/types/report-config.ts#L194-L198)）。
- **`TabData` 缺 `has_more?/extras?`**（[schemas.py:163-167](../../../services/report-query/app/schemas.py#L163-L167) vs [report-config.ts:185-192](../../../apps/web/app/types/report-config.ts#L185-L192)）。

漂移本身能"过编译"是因为模型从未被用作 `response_model`，没人 validate 真正的 fixture payload；这相当于 schemas.py 是过期文档。

### `page_size` 无上限

违反 [services/report-query/CLAUDE.md:27](../../../services/report-query/CLAUDE.md#L27) "分页参数 page_size 上限 200"：

- [app/schemas.py:182](../../../services/report-query/app/schemas.py#L182) `QueryRequest.page_size: int = 20`，无 `le=200`。
- [app/api/drilldown.py:24](../../../services/report-query/app/api/drilldown.py#L24) `DrilldownRequest.page_size: int = 50`，无上限。
- [app/api/drilldown.py:35](../../../services/report-query/app/api/drilldown.py#L35) 直接 `range(1, req.page_size + 1)`，对方传 `1e7` 就 OOM。

## 🟡 建议

- **路由参数没有用 `Annotated[T, Path/Query/...]`**，违反根 CLAUDE.md "路径参数 / 查询参数都标类型；用 `Annotated[T, Path/Query/Header]` 而非默认值魔法"：
  - [app/api/config.py:19](../../../services/report-query/app/api/config.py#L19) `report_type: str`
  - [app/api/data.py:19,31](../../../services/report-query/app/api/data.py#L19) `report_type: str`
  - [app/api/drilldown.py:28](../../../services/report-query/app/api/drilldown.py#L28) `report_type: str, ref: str`
  - [app/api/meta.py:20](../../../services/report-query/app/api/meta.py#L20) `code: str`
- **DB session 不走 `Depends(get_session)`**：[app/db.py:40](../../../services/report-query/app/db.py#L40) 定义了 `get_session`，但 [app/services/repo.py:53,64,76](../../../services/report-query/app/services/repo.py#L53) 全部直接 `SessionLocal()`。根 CLAUDE.md "鉴权 / DB session 都用 Depends"。
- **`DrilldownRequest` 不严格**：[app/api/drilldown.py:19](../../../services/report-query/app/api/drilldown.py#L19) 用 `BaseModel`（没 `extra="forbid"`），违反根 CLAUDE.md "严格模型用 `ConfigDict(extra=\"forbid\")`"。其它 schemas 都继承 `StrictModel`。
- **`DrilldownRequest.filter`** 字段名遮蔽内置 `filter`（[app/api/drilldown.py:22](../../../services/report-query/app/api/drilldown.py#L22)）。功能上没问题，但命名风格不佳。
- **路由 return 类型 `dict[str, object]` 过松**，丢失 envelope 类型信息：所有 router file 的返回标注（[config.py:19](../../../services/report-query/app/api/config.py#L19)、[data.py:19,31](../../../services/report-query/app/api/data.py#L19)、[drilldown.py:28](../../../services/report-query/app/api/drilldown.py#L28)、[meta.py:14,20](../../../services/report-query/app/api/meta.py#L14)、[chrome.py:24,32,40,48,56](../../../services/report-query/app/api/chrome.py#L24)）。可以定义一个 `EnvelopeDict` 别名或干脆用 `Envelope[ReportConfig]` 配 `response_model`。
- **测试不验 envelope 字段**：[tests/test_smoke.py:46](../../../services/report-query/tests/test_smoke.py#L46) 只断言 `r.status_code == 404`，没断言 envelope 形状；[tests/test_envelope_shape.py:82](../../../services/report-query/tests/test_envelope_shape.py#L82) 422 测试同样只看状态码 —— 配合上面"4xx 不走 envelope"的 bug，这俩测试是漏网之鱼。
- **`/api/admin/metrics` 端点**（[app/api/chrome.py:55-68](../../../services/report-query/app/api/chrome.py#L55-L68)）跟 service CLAUDE.md:34 "❌ 加 admin 路由" 字面冲突。虽然 docstring 说明这是只读快照路径，仍可考虑改成 `/api/metrics/admin-page` 之类避免歧义。
- **`QueryRequest.sort: list[dict[str, str]]`**（[schemas.py:183](../../../services/report-query/app/schemas.py#L183)）应该用强类型 `SortSpec` 子模型，否则 `{field, dir}` 形状靠运气。

## 🟢 备注

- 全 13 个业务 Python 模块都正确加了 `from __future__ import annotations`。✅
- 没有 `print(...)`、没有 `from X import *`、没有裸 `except:`、没有 `except Exception: pass`。✅
- 没有 `session.commit()` 调用（只读约束 OK），仅在 [tests/test_repo_fallback.py:86,108,134](../../../services/report-query/tests/test_repo_fallback.py#L86) 有测试用 commit。✅
- 没有 `@app.get` 形式，全部走 `APIRouter`。✅
- 所有 request body 都是 Pydantic `BaseModel`，没有用 `dict`。✅
- `class Base(DeclarativeBase)`（[app/db.py:18](../../../services/report-query/app/db.py#L18)）符合 SQLAlchemy 2.x 风格。✅
- 查询全部 `select(...).where(...)` 表达式（[app/services/repo.py:37-41,78-80](../../../services/report-query/app/services/repo.py#L37-L41)），没有用旧 `Query` API。✅
- `model_config = ConfigDict(extra="forbid")` 用在 `StrictModel`（[schemas.py:16](../../../services/report-query/app/schemas.py#L16)），settings 用 `SettingsConfigDict`（[settings.py:15](../../../services/report-query/app/settings.py#L15)）。✅
- 全局 `@app.exception_handler(Exception)` 兜底产生 `code=500`（[app/main.py:53-59](../../../services/report-query/app/main.py#L53-L59)）。✅
- Repo 层 DB 失败回落 fixture，对应 service CLAUDE.md "零 DB 可启动"原则（[app/services/repo.py:50-86](../../../services/report-query/app/services/repo.py#L50-L86)）。✅
- 启动时没跑 migration / data init（[app/main.py:30-33](../../../services/report-query/app/main.py#L30-L33) lifespan 直接 yield）。✅
- 路由层未写 SQL 字符串。✅
- [app/services/repo.py:35-42](../../../services/report-query/app/services/repo.py#L35-L42) 查询 `report_snapshot` 走 `order_by(snapshot_date.desc(), id.desc())` + `limit(1)`，避免 N+1。✅

## Lint/Type check 结果

- `ruff check app`：**All checks passed!**
- `mypy --strict app`：**Success: no issues found in 16 source files**
- `pytest`：20 passed in 1.94s

## 测试覆盖盘点

源码 13 个业务模块（除 3 个 `__init__.py`），测试 5 个文件。

| 模块 | 测试覆盖 |
|---|---|
| `app/main.py`（含全局异常 handler）| ❌ 没有测试触发 `unhandled_exception_handler`，没验它返回 envelope 形状（`fail()` 当前给的是 `code=500`，但没单测） |
| `app/envelope.py` | 间接（`test_envelope_shape.py`）。`Envelope[T]` 泛型 / `trace_id` 唯一性已覆盖 |
| `app/settings.py` | ❌ 完全无测试（`cors_origins` 解析、env 覆盖、默认 url 等） |
| `app/db.py` | 间接（`test_repo_fallback.py` 通过 monkeypatch 验 `SessionLocal`、`get_session` 没测） |
| `app/models.py` | 间接（snapshot/dropdown CRUD 在 `test_repo_fallback.py:80,128` 用过）。`MetricDef` 完全没用过 |
| `app/schemas.py` | ❌ 完全没单测。`StrictModel` 的 `extra="forbid"` 行为、`HeaderNode.model_rebuild()` 递归形状、各字段默认值都没验证 |
| `app/services/fixtures.py` | 间接（路径加载通过 smoke/chrome 测）。但 `REPORT_MOCK_PATH` 环境变量覆盖、容器形态 `_default_mock` fallback、`lru_cache` 行为没单测 |
| `app/services/repo.py` | ✅ `test_repo_fallback.py` 全覆盖（fallback / DB 优先 / 最新 snapshot / dropdown 排序 + enabled 过滤） |
| `app/api/meta.py` | `/healthz` 覆盖；`/dropdowns/{code}` 仅 envelope 形状测试覆盖了 `departments`。**4xx 用例缺失**（违反 service CLAUDE.md:46 "每个新端点都要 1 个 happy path + 1 个 4xx 用例"）|
| `app/api/chrome.py` | `test_chrome.py` 覆盖 happy path。**4xx 用例缺失**：没测 fixture 缺失时的 404 envelope |
| `app/api/config.py` | smoke 测了 5 个 happy + 1 个 404。**404 envelope 形状未断言**（响应是 `{"detail": "..."}` 还是 envelope 没人看）|
| `app/api/data.py` | smoke 测了 GET happy。**POST happy 缺独立测试**（仅在 `test_envelope_shape.py:66` 顺带过一次）；422 用例存在但同样不验 envelope 形状 |
| `app/api/drilldown.py` | `test_drilldown.py` 4 个用例全覆盖 happy。**4xx 用例完全缺失**（page_size 异常大、ref 不存在等） |

总结：5 个文件覆盖了路由层 happy paths，但全局 4xx envelope 形状、settings、schemas 验证、main lifespan + global exception handler 都是空白。
