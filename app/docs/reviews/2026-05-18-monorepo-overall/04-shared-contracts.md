# shared/contracts + 跨项目审查

> 范围：`shared/contracts/{envelope.md, report-protocol-v2.md}` + `docker-compose.yml` + `.env.example` + `scripts/` + 根级 CLAUDE.md 级联。

## 🔴 契约漂移 / 配置问题

### 1. `ReportMeta.version` 三方类型不一致（最严重）

- [shared/contracts/report-protocol-v2.md](../../../shared/contracts/report-protocol-v2.md) 未给出字段类型，但 [docs/report-platform-v2.md:107](../../../docs/report-platform-v2.md#L107) 写 `"version": 1`（整数）。
- 前端 [apps/web/app/types/report-config.ts:21](../../../apps/web/app/types/report-config.ts#L21) —— `version: number`。
- 后端 [services/report-query/app/schemas.py:26](../../../services/report-query/app/schemas.py#L26) —— `version: str = "v2"`。
- mock fixtures（全部 8 份 config.json，例如 [apps/web/public/mock/reports/summary/config.json:6](../../../apps/web/public/mock/reports/summary/config.json#L6)）—— 整数 `1`。
- 后果：若真把 fixture 经过 `ReportConfig` Pydantic 校验，必报 `string_type` 错误。

### 2. `ToolbarSpec` 字段名整套不同

- 前端 [report-config.ts:27-33](../../../apps/web/app/types/report-config.ts#L27-L33) + mocks 用 `show_refresh / show_paging_mode / show_compare / show_column_customizer / show_export`。
- 后端 [schemas.py:29-34](../../../services/report-query/app/schemas.py#L29-L34) 用 `refresh / paging / compare / columns / export`。
- 后端 `StrictModel` 设 `extra="forbid"` —— 一旦做反序列化校验，所有 mock 都直接 422。

### 3. `FilterSpec` —— 整个字段集对不上

- 前端 [report-config.ts:60-76](../../../apps/web/app/types/report-config.ts#L60-L76) 有 `param`（必填）、`depends_on`、`options`、`placeholder`、`min/max/step/unit/multi`。
- 后端 [schemas.py:49-56](../../../services/report-query/app/schemas.py#L49-L56) 只有 `code/label/kind/required/placeholder/default/source`，**完全没有 `param`**。
- mock 中所有 filter 都带 `"param": {...}`（例如 `industry/config.json:25,33`）—— 严格模式下 `forbid`。
- `FilterKind` 列表也不同：前端有 `hierarchy_dropdown / multi_search / boolean / enum_radio / enum_chips`；后端有 `tag / checkbox_group / radio_group / cascade / tree_select`。两套基本不交集。mock 实际用 `hierarchy_dropdown`（`industry/config.json:32`）—— **后端 Literal 不接受**。

### 4. `FilterSourceSpec` 字段缩水

- 前端有 `paging / sortable_by / default_sort / supports_favorite / supports_filter / params_in / max_levels / select_at_any_depth / max_picks / min_chars / debounce_ms`。
- 后端 `FilterSource` 只有 `endpoint / method` 两字段，且 `extra="forbid"`。mock 全部带 `params_in` / `max_levels` / `supports_favorite` 等 —— 全挡。

### 5. `Threshold` 形状差太远

- 前端 `Threshold: { min, max, goodColor, badColor }`（[report-config.ts:80-85](../../../apps/web/app/types/report-config.ts#L80-L85)，纯视觉化）。
- 后端 `Threshold: { good, warn, danger, direction }`（[schemas.py:59-63](../../../services/report-query/app/schemas.py#L59-L63)，业务化）。
- mock 走前端形状（`industry/config.json:48` `"threshold": { "min": 1000, "goodColor": "emerald", "badColor": "amber" }`）—— 完全无法通过后端校验。

### 6. `KpiSpec` 漏了 `layout_mode_default`

- 前端有 `layout_mode_default: 'grouped' | 'flat'`；后端没有；mock 全部带（`industry/config.json:43`）。

### 7. `PrimaryView` 漏字段 + `TabDef`(后端) vs `PrimaryViewTab`(前端) 名字不同

- 前端 `PrimaryView` 有 `method / row_dim_options / row_dim_default / row_favorite`，后端全部没有。
- 前端 `PrimaryViewTab.{key,label,data_endpoint,header_tree_endpoint,header_tree}`；后端 `TabDef.{key,label,header_tree}` —— `data_endpoint` 和 `header_tree_endpoint` 后端缺失。
- mock 用 `header_tree_endpoint: null`（`industry/config.json:119`）—— 严格模式挡。

### 8. `KpiItemValue.value` 类型不一致

- 前端 `value: string`（[report-config.ts:174](../../../apps/web/app/types/report-config.ts#L174)）。
- 后端 `value: str | float | int | None`（[schemas.py:149](../../../services/report-query/app/schemas.py#L149)）。
- mock 给字符串 `"1,284"` —— 前端 OK；如果后端某天真生产数据走 `float` 1284.0，前端 TS 会拒。

### 9. `TabData` 形状不一致

- 前端 `TabData` 含可选 `has_more` 与 `extras: { totals: {...} }`（[report-config.ts:185-192](../../../apps/web/app/types/report-config.ts#L185-L192)）。
- 后端 `TabData` 只有 `items/page/page_size/total`，无 `has_more`、无 `extras`。
- mock data.json 普遍含 `extras.totals` 和 `has_more`（如 [docs/report-platform-v2.md:256-257](../../../docs/report-platform-v2.md#L256-L257) 示例）—— 严格模式挡。

### 10. `ReportData.drilldowns` 后端缺失

- 前端 `ReportData.drilldowns?: Record<string, { default: TabData }>`（[report-config.ts:197](../../../apps/web/app/types/report-config.ts#L197)）。
- 后端 `ReportData` 只声明 `kpi` 和 `tabs`，无 `drilldowns`。fixture 里有（[docs/report-platform-v2.md:264-279](../../../docs/report-platform-v2.md#L264-L279)）。

### 11. `DrilldownDef` `param_mapping` 必/默认 + `header_tree` 字段缺

- 前端 `param_mapping: Record<string,string>` 必填；后端 `param_mapping: dict[str,str] = default_factory(dict)` 默认空 dict。
- 前端 `DrilldownDef.header_tree?: TableColumn[] | null`；后端没有 `header_tree` 字段（只有 `header_tree_endpoint`）。mock 里 `"header_tree": [...]` 同时出现（`industry/config.json:217`）—— 严格模式挡。

### 12. `ReportMeta.show_subtitle` / `user_pref_endpoint` 后端缺失

- 前端 [report-config.ts:18-22](../../../apps/web/app/types/report-config.ts#L18-L22) 有 `show_subtitle`、`user_pref_endpoint`；后端 [schemas.py:21-26](../../../services/report-query/app/schemas.py#L21-L26) 无。mock `industry/config.json:8` 实际写了 `user_pref_endpoint`。

### 13. `report-generation/app/schemas.py` 根本不存在

- 根 [CLAUDE.md:113-115](../../../CLAUDE.md#L113-L115) 明确要求 "`shared/contracts/...` + `apps/web/app/types/report-config.ts` + `services/report-query/app/schemas.py`（**+ generation 的 schemas**）" 三处同步。
- 实际 [services/report-generation/app/](../../../services/report-generation/app/) 下没有 `schemas.py`，admin/ingest 路由就地内嵌 `BaseModel`（[api/admin.py:17-31](../../../services/report-generation/app/api/admin.py#L17-L31)、[api/ingest.py:20-32](../../../services/report-generation/app/api/ingest.py#L20-L32)）。`MetricDef` Pydantic 类与 [models.py:71](../../../services/report-generation/app/models.py#L71) 的 SQLAlchemy `MetricDef` 名字相同但字段不完全对得上（ORM 多了 `created_at/updated_at/deleted_at`）。
- 等于契约同步规则在 generation 侧从未落地。

### 14. envelope 协议：`trace_id` 长度未在代码层强制 32 字符

- [shared/contracts/envelope.md:19](../../../shared/contracts/envelope.md#L19) 写 "32 字符 hex (uuid4.hex)"。
- 两份 `envelope.py`（[report-query/app/envelope.py:16](../../../services/report-query/app/envelope.py#L16)、[report-generation/app/envelope.py:13](../../../services/report-generation/app/envelope.py#L13)）都用 `uuid.uuid4().hex` —— 实际值确实是 32 字符 hex，OK。
- 但 envelope 包装是 `BaseModel + .model_dump()` 后返回 `dict`，并未把它当 `JSONResponse` 包；若上层 `raise HTTPException` 走默认 handler，会出**非 envelope** 响应（`{"detail": ...}`）。`main.py` 只挂了 `Exception` handler，没挂 `HTTPException` / `RequestValidationError` handler，所以 envelope.md 第 38 行的 "Pydantic 校验失败 HTTP 422 + `code=40001`" **没有实现**。

### 15. `report-query` 路径上 `/data` 协议跟前端调用名字不一致

- [services/report-query/CLAUDE.md](../../../services/report-query/CLAUDE.md) 列 `GET/POST /api/reports/{type}/data`。
- 但 [docs/report-platform-v2.md:94](../../../docs/report-platform-v2.md#L94) 写"`/mock/reports/industry/data.json` → URL `/api/reports/industry/summary`"，且 `summary/config.json` 里 `primary_view.endpoint` 多半写的是 `/summary` 而非 `/data`。前端是哪个？文档自相矛盾。

### 16. `docker-compose.yml` `report-query` 没有强制单 worker 是正确的；但 `report-generation` 也没显式 `command:`

- 注释里说"Dockerfile CMD 已经 --workers 1，这里不覆盖"（[docker-compose.yml:86](../../../docker-compose.yml#L86)）。
- 对照 [services/report-generation/Dockerfile:66](../../../services/report-generation/Dockerfile#L66) —— `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002", "--workers", "1"]`。✅ 一致。
- [report-query/Dockerfile:73](../../../services/report-query/Dockerfile#L73) —— `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]`（默认 1 worker）；compose 端口映射 `${QUERY_PORT:-8001}:8001`、`${GEN_PORT:-8002}:8002`、`${WEB_PORT:-80}:80`、MySQL `${MYSQL_PORT:-3306}:3306`。✅ 没有冲突。

### 17. `docker-compose.yml` 端口对外 != 文档 3000/8001/8002

- 根 [CLAUDE.md:25](../../../CLAUDE.md#L25) 写"端口分配固定：3000 / 8001 / 8002"。
- compose 默认 web → `80`（不是 3000），report-query → 8001 ✅，report-generation → 8002 ✅。
- 即 prod 与 dev 端口不一致是设计，但 root CLAUDE 没明说"3000 仅 dev / prod 走 80"，新人会被绕。

### 18. `CORS_ORIGINS` 来源没列出 dev 域

- compose 里 `CORS_ORIGINS: '["http://${SERVER_HOST:-192.168.0.132}", "http://localhost", "http://localhost:3000"]'`。
- 缺 `http://127.0.0.1:3000`（前端默认 dev host 是 `127.0.0.1:3000`，见 [apps/web/CLAUDE.md:124](../../../apps/web/CLAUDE.md#L124)）。本地用 docker 跑 + 浏览器开 `127.0.0.1:3000` 会被 CORS 挡。

### 19. `.env.example` 字段不全

- compose 用到的变量：`SERVER_HOST / WEB_PORT / MYSQL_PORT / MYSQL_ROOT_PASSWORD / MYSQL_DATABASE / MYSQL_USER / MYSQL_PASSWORD / ADMIN_TOKEN / TAG / QUERY_PORT / GEN_PORT / PIP_INDEX_URL / APT_MIRROR / NPM_REGISTRY / NUXT_PUBLIC_DATA_SOURCE_MODE / NUXT_PUBLIC_API_BASE / NUXT_PUBLIC_MOCK_BASE`。
- `.env.example` 只列 `SERVER_HOST / WEB_PORT / MYSQL_PORT / MYSQL_ROOT_PASSWORD / MYSQL_DATABASE / MYSQL_USER / MYSQL_PASSWORD / ADMIN_TOKEN / TAG`（9 个）。
- 缺：`QUERY_PORT / GEN_PORT / PIP_INDEX_URL / APT_MIRROR / NPM_REGISTRY / NUXT_PUBLIC_*` 五大组。

### 20. `init-env.sh` 与 `.env.example` 不对齐

- [scripts/init-env.sh:55](../../../scripts/init-env.sh#L55) 替换 `root_pwd_change_me` 与 `report_pwd_change_me`；但 `.env.example` 中的 `MYSQL_PASSWORD=report_pwd_change_me` 是合法占位 ✅。仍然漏了上面那 5 组变量的占位填充。

## 🟡 建议

### A. `pnpm-workspace.yaml` 与目录不完全协调

`packages: ["apps/*"]` 只覆盖 `apps/`。`services/*` 是 Python，不需要纳入。✅ 一致。但根目录没有顶层 `package.json` —— `pnpm-workspace.yaml` 单独放置等同于把 `apps/web/` 当工作区根。如果将来加 `packages/` 共享 ts lib，建议同时加上。

### B. envelope 重复实现

[services/report-query/app/envelope.py](../../../services/report-query/app/envelope.py) 与 [services/report-generation/app/envelope.py](../../../services/report-generation/app/envelope.py) 是同一份复制（generation 注释里写"暂时复制；后续抽到 shared/"）。漂移风险存在。根 CLAUDE.md:27 同时说"共享只通过 `shared/contracts/` 走文档契约，不共享代码"—— 即明确允许 copy；但两份代码字段已 100% 重叠，应当至少跑一致性测试。

### C. `report-query` repo 层不过 Pydantic

[repo.py:46-47](../../../services/report-query/app/services/repo.py#L46-L47) 直接 `json.loads(raw)` 返回 dict，路由 `ok(cfg)` 也直接吐。整个 schemas.py 实际只是文档化用，**没有任何 runtime 校验**，这就是漂移没被早发现的根本原因。

### D. `01-home.png` 在仓库根

不是版本化 fixture，看上去是临时调试截图；建议归到 `verify-screenshots/` 或 `.tmp-shots/`（后者已被 `.gitignore` 通过 `.tmp-*` 规则忽略）。

### E. `scripts/deploy/_build/` 含 `.env / *.log / source.tar.gz`

是 [deploy.py:19-20](../../../scripts/deploy/deploy.py#L19-L20) 跑时生成的中间物，期望本地化但未被 `.gitignore` 覆盖。**强烈建议加 `scripts/deploy/_build/` 到 `.gitignore`**，否则 `.env` 含强口令会被 commit 风险。

### F. `apps/web/dist` 出现在子项目里

顶层 `.gitignore:6` 已忽略 `dist`。✅ 已防住。

### G. screenshots 提交策略不统一

`verify-screenshots/01-home-api-mode.png` … `13-theme-switched.png` 已 tracked；现在新增 4 个 `api-mode-*.png` / `json-mode-*.png` 与根 `01-home.png` 未 tracked。`.gitignore` 没有为 PNG 设规则；如果团队是"verify-screenshots 入 git，其它不入"，最好显式加注释说明，并把根 `01-home.png` 删除或归位。

### H. `services/shared.db` 物理存在

`.gitignore` 的 `*.db` 已忽略它 ✅。但根 CLAUDE 没说明 dev 默认 SQLite 路径在 `services/shared.db`（两边 `database_url = "sqlite:///../shared.db"` 隐式假设 cwd 在 `services/report-*/`）。新手 PowerShell 在仓库根跑 `uv run uvicorn ...` 会得到另一个相对路径的 db 文件 —— 静默错配。

### I. `report-platform-v2.md` vs 真实 mock 差距大

文档里大量"`extras` / `has_more` / `_row_favorite` / `_row_key`"等示例字段，前端 TS 部分支持（`extras`/`has_more` 有），后端 schemas 完全无。文档 + 前端 ≠ 后端。

### J. `report-protocol-v2.md` 文档单薄

只列 3 行"修改流程"和 6 步检查表。真正的契约表（字段一览）放在 [docs/report-platform-v2.md](../../../docs/report-platform-v2.md) 长文里 —— 等于"契约"实际是个 README 引导。建议把字段表搬到 contracts/ 里成为单一事实源，或反过来明确"contracts 是入口，真表在 docs"。

## 🟢 备注

- `docs/` 11 份文档总览：`README.md / REQUIREMENTS.md / ARCHITECTURE.md / FILE-MAP.md / TEST-PLAN.md / VERIFICATION.md / VERIFICATION-RUN-2026-05-18.md / USER-DATA-OVERRIDE.md / api-split-plan.md / deploy-server.md / report-platform-redesign.md / report-platform-v2.md` —— 索引在 [docs/README.md](../../../docs/README.md)，**结构完整且互相链接**，未发现失效链接。`VERIFICATION-RUN-2026-05-18.md` 是手工核验日志，今日（2026-05-18）即新鲜的，**未过期**。
- `scripts/` 4 项：`init-env.sh / verify-all.ps1 / verify-all.sh / deploy/{deploy.py, nuxt-api.cmd, nuxt-json.cmd, probe.sh, setup-ssh-key.py, _build/}`。功能清晰、有注释。
- `docker-compose.yml` 网络拆 `internal / public` ✅，mysql 不暴露给 public ✅，web 走 nginx 反代 ✅。
- volume 挂载只有两处只读 bind：`./apps/web/public/mock:/seed-mock:ro` —— 路径相对仓库根，**不会泄漏宿主机**。
- 鉴权：`ADMIN_TOKEN` 走 env vars，[.env.example:19](../../../.env.example#L19) 留空，没有硬编码生产 token ✅。`MYSQL_ROOT_PASSWORD` 默认 `root_pwd_change_me` —— `.env.example` 已注明"务必改"，compose 也给了同样的默认。注意：**默认密码会跑通且持久化**，新部署若忘了改将留下弱口令。
- [services/report-generation/Dockerfile.intranet](../../../services/report-generation/Dockerfile.intranet) 与 [Dockerfile.offline](../../../services/report-generation/Dockerfile.offline) 在仓库内但未在审查范围（task 未要求），仅备注存在。

## CLAUDE.md 一致性

- **根 [CLAUDE.md:115](../../../CLAUDE.md#L115)：** "`services/report-query/app/schemas.py`（+ generation 的 schemas）" —— generation 端 `schemas.py` 文件**不存在**。该 CLAUDE 条目与现实不符。
- **根 [CLAUDE.md:25](../../../CLAUDE.md#L25) vs [docker-compose.yml:105](../../../docker-compose.yml#L105)：** 根 CLAUDE 说 "端口分配固定 3000/8001/8002"，docker-compose 默认 web 走 80 —— 表述未说明 dev/prod 差异。
- **根 [CLAUDE.md:101](../../../CLAUDE.md#L101) ("前端 i18n / 后端中文 message")：** report-generation [main.py:59](../../../services/report-generation/app/main.py#L59) 抛 `f"unhandled: {exc.__class__.__name__}"` —— 是英文异常类名进 message，违反"不写英文 stacktrace 给前端看"。query 端 [main.py:59](../../../services/report-query/app/main.py#L59) 同样。
- **[apps/web/CLAUDE.md](../../../apps/web/CLAUDE.md) vs 根 CLAUDE：** 一致，无冲突。子项目 CLAUDE 主要细化 Vue / Nuxt 约束，与根的 Python / 端口 / commit 规约互补。
- **[services/report-query/CLAUDE.md:40](../../../services/report-query/CLAUDE.md#L40) 强调"协议同源"：** 跟 [shared/contracts/report-protocol-v2.md](../../../shared/contracts/report-protocol-v2.md) 一致，但实际 schemas.py 与前端 TS 漂移如本报告 🔴 1–12 节所列；**约定本身没问题，问题在执行**。
- **[services/report-generation/CLAUDE.md:18](../../../services/report-generation/CLAUDE.md#L18) "--workers 1"：** Dockerfile + 根 CLAUDE + service CLAUDE + compose 注释四处都一致 ✅。
- **[services/report-query/CLAUDE.md:13-19](../../../services/report-query/CLAUDE.md#L13-L19) 端点表 vs `app/api/` 实际：** CLAUDE 列 `/api/dropdowns/{code}` —— 对应 [api/meta.py](../../../services/report-query/app/api/meta.py)。CLAUDE 没列 `chrome` 路由，但 [main.py:62](../../../services/report-query/app/main.py#L62) 已挂 `chrome_router`（branding/nav/themes/fonts），即 CLAUDE 端点清单滞后于代码。
