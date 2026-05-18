# 整体 Review 总结 — 运营看板 monorepo

> 范围：`apps/web`（Nuxt 4，72 个 TS/Vue 文件）+ `services/report-query`（FastAPI 只读，13 个 Python 文件）+ `services/report-generation`（FastAPI 写 + APScheduler，13 个 Python 文件）+ `shared/contracts`。
> 工具检查：两个服务 `ruff check` / `mypy --strict` / `pytest` **全绿**，前端 vitest 5 个 spec **全过**。代码"能跑通"，但有几个结构性问题。

## TL;DR — 三个最重要的发现

**1. 协议三方漂移，根本没人 validate**（系统性问题）

前端 [report-config.ts](../../../apps/web/app/types/report-config.ts)、后端 [report-query/schemas.py](../../../services/report-query/app/schemas.py)、mock fixtures、契约文档 [report-protocol-v2.md](../../../shared/contracts/report-protocol-v2.md) 在至少 **13 个字段**上对不上号 —— `ReportMeta.version`（前端 number / 后端 str / mock int）、`ToolbarSpec`（全套字段名不同：`show_refresh` vs `refresh`）、`FilterKind`（两套枚举几乎不交集）、`Threshold`（前端纯视觉 `min/max/goodColor` / 后端业务 `good/warn/danger`）、`FilterSpec.param` 后端完全缺失、`PrimaryView.method` 缺、`TabData.has_more/extras` 缺、`ReportData.drilldowns` 缺……

为什么没炸：[repo.py:46-47](../../../services/report-query/app/services/repo.py#L46-L47) 直接 `json.loads(raw)` 返回 dict，路由 `ok(cfg)` 也直接吐 —— **schemas.py 从未被当作 `response_model` 使用，是个永远不会被执行的"文档"**。一旦哪天接 DB + 真校验，所有 mock 都会 422。

**2. envelope 协议形同虚设（4xx 全走默认）**

两个服务都只挂了 `@app.exception_handler(Exception)`（[query/main.py:53-59](../../../services/report-query/app/main.py#L53-L59)、[generation/main.py:55-60](../../../services/report-generation/app/main.py#L55-L60)），**没挂 `HTTPException` 和 `RequestValidationError`** 的 envelope 化处理。所有 404 / 422 都返回 FastAPI 默认 `{"detail": "..."}`，与契约 [envelope.md:38](../../../shared/contracts/envelope.md#L38) 要求的 `code=40001 + data.issues=[]` 不符。前端任何依赖 `code` 字段判断错误的代码在 4xx 路径都拿不到值。

**3. 文档承诺的基础设施不存在**

- `apps/web/CLAUDE.md:11` + `AGENTS.md` 都说"UI 用 shadcn-vue + Reka UI primitives"，但 [app/components/ui/](../../../apps/web/app/components/ui/) 目录不存在，`package.json` 里既无 shadcn-vue 也无 reka-ui/radix-vue。所有 UI 都是手撸 native input/select/button。
- 根 `CLAUDE.md:115` 说契约同步要改 `services/report-generation/app/schemas.py` —— **该文件不存在**，generation 的请求体散落在 [api/admin.py:17-31](../../../services/report-generation/app/api/admin.py#L17-L31) 和 [api/ingest.py:20-32](../../../services/report-generation/app/api/ingest.py#L20-L32) 各自就地定义。

---

## 跨子项目主题

### 主题 A — 类型安全在边界处被绕开

| 位置 | 问题 |
|---|---|
| [use-report.ts:74-75](../../../apps/web/app/composables/use-report.ts#L74-L75) | `error as unknown as Ref<unknown>` / `pending as unknown as Ref<boolean>` —— `ComputedRef` 强转 `Ref` |
| [use-data-source.ts:110](../../../apps/web/app/composables/use-data-source.ts#L110) | `raw as unknown as T` 盲转，注释里挂着的 `TODO: 接 Zod .parse` 没做 |
| [use-report-config.ts:21](../../../apps/web/app/composables/use-report-config.ts#L21) | `(raw): ReportConfig => raw as ReportConfig` 同上 |
| `report-query/schemas.py` 整文件 | 定义了一堆 `StrictModel`，但从来没被任何路由当 `response_model` 用 |

→ 共同模式：**类型系统在编译期看似严格，运行时被 `as` 或 `dict` 旁路**。这是 schema 漂移没被早发现的根因。

### 主题 B — i18n 单语化

`apps/web/i18n/locales/zh-CN.json` + `en-US.json` 框架齐全，但实际代码里硬编码中文遍地：

- [pages/index.vue:8-152](../../../apps/web/app/pages/index.vue#L8-L152) 整页 hero / 入口 / 动态全硬编码
- 8 个 chart SFC 的"暂无数据"/"目标"/"已达成"全硬编码（i18n 里 `common.noData` 已存在但没人用）
- [MultiLevelTable.vue:14-16](../../../apps/web/app/components/dashboard/MultiLevelTable.vue#L14-L16) 把 `'详情'` 同时当 i18n 文本和 type discriminator —— 切到 en-US 后整列退化成 N/A
- [AppSidebar.vue:23](../../../apps/web/app/components/AppSidebar.vue#L23) 版权文字硬编码
- [excel.vue:43](../../../apps/web/app/pages/ai-test/system/excel.vue#L43) `window.alert('该指标 ID 已存在')`

→ "支持 en-US"目前是个**幻觉**，切换 locale 大部分文字不会变。

### 主题 C — 测试覆盖结构性偏低

| 项目 | 源文件 | 测试文件 | 主要缺口 |
|---|---|---|---|
| apps/web | 72 | 5 | 8 个 composable 主体逻辑 0 测试；SFC 0 测试；MultiLevelTable 多级表头 rowspan 算法靠肉眼看 |
| report-query | 13 | 5 | 4xx envelope 形状从未断言；settings / schemas / lifespan 0 测；drilldown page_size 巨大值边界没测 |
| report-generation | 13 | 4 | scheduler.py 整文件 0 测；6 个 admin/ingest/preagg 端点全没测（即便是 echo 阶段）；scheduler 在测试里默认开启，造成跨测试污染 |

→ 5 个 spec 测的 happy path 都过，但**正是契约 4xx envelope、4 月新增的回归（user-data overlay）的关键路径没人盯**。Commit b7dde38 说"加回归测试"，加了 `looksLikeOverlayJson` 4 个 case，但 `useDataSource` 主体逻辑仍未单测。

### 主题 D — 阶段一占位代码与文档承诺脱节

`report-generation` 的写接口 / admin 接口几乎全是占位 echo（[api/ingest.py:35-51](../../../services/report-generation/app/api/ingest.py#L35-L51)、[api/admin.py:53-97](../../../services/report-generation/app/api/admin.py#L53-L97)），文档却已经写清了 `(date, source, version_no)` upsert + 软删除 + `ai_metric` / `ai_metric_invalid_mark` / `report_fact_*` 表的契约。**实施 vs 文档之间隔着整个阶段二**。这不是 bug，但需要的是：要么文档明确"阶段一仅 echo"，要么排出阶段二的 todo。

### 主题 E — 生产部署的几颗"软地雷"

1. **`require_admin` dev 模式默认放行** —— [generation/security.py:12-26](../../../services/report-generation/app/security.py#L12-L26) `if not expected: return  # dev 模式，跳过`。运维忘配 `ADMIN_TOKEN` → `/admin/*` 立即变公开写接口。没有 `ENV=prod` 双重断言。
2. **`--workers 1` 只在 Dockerfile 硬编码** —— [generation/Dockerfile:66](../../../services/report-generation/Dockerfile#L66) ✅，但 systemd unit / k8s deployment 写错就会触发 ingest/preagg 重复执行。entry point 没有 worker 数自检。
3. **APScheduler 默认开启在测试环境** —— [generation/settings.py:35](../../../services/report-generation/app/settings.py#L35) `scheduler_enabled: bool = True`，[test_admin_auth.py:22](../../../services/report-generation/tests/test_admin_auth.py#L22) 反复 `TestClient(create_app())` 等于每次都起 cron。CI 资源浪费 + 偶发 flake。
4. **MySQL 默认密码 `root_pwd_change_me`** —— `.env.example` 注了"务必改"，但 `docker-compose.yml` 给了同样默认值，跑通后忘改就留下弱口令。
5. **`.gitignore` 漏 `scripts/deploy/_build/`** —— `git status` 显示该目录 untracked，里面有 `.env` 文件，**一次手滑 commit 就会把口令推到 GitHub**。
6. **CORS_ORIGINS 缺 `127.0.0.1:3000`** —— 本地 docker + 浏览器 `127.0.0.1` 会被挡。

---

## 优先级清单

### 🔴 Blocker — 应立即处理

1. **加 `HTTPException` + `RequestValidationError` 全局 handler**（两个服务），把 4xx 全部包成 envelope。否则前端错误处理永远拿不到 `code`。
2. **`scripts/deploy/_build/`** 加进 `.gitignore`，防止 `.env` 误 commit。
3. **`require_admin` 加 `ENV=prod` 二次断言**，prod 必须有 token，缺则启动失败。
4. **schema 三方漂移**：先决定"前端 TS 是 source of truth"还是"后端 Pydantic 是 source of truth"，按一个方向修齐 13 个字段；同时把 [report-query/main.py](../../../services/report-query/app/main.py) 的 `/api/reports/{type}/config` 路由加上 `response_model=ReportConfig`，强制运行时校验，再也漂不掉。
5. **修 i18n hardcode 的 8 个 chart + index.vue + MultiLevelTable.vue 的 `'详情'` discriminator**（这个 bug 是英文 locale 下整列丢失）。

### 🟡 Should — 这周/下周

6. **APScheduler job 加 `max_instances/coalesce/misfire_grace_time` + `EVENT_JOB_ERROR` listener**；测试环境默认 `SCHEDULER_ENABLED=0`。
7. **`page_size` 加 `le=200` 上限**（[query schemas.py:182](../../../services/report-query/app/schemas.py#L182)、[drilldown.py:24](../../../services/report-query/app/api/drilldown.py#L24)）。
8. **CLAUDE.md / AGENTS.md 与现实对齐**：要么补 shadcn-vue，要么把"shadcn-vue + Reka UI"那段删掉；`generation/schemas.py` 要么建文件，要么从契约同步规则里去掉。
9. **MetricCard.vue 的 `onBeforeUnmount` 嵌在 `onMounted` 里** —— Vue 文档明确禁止异步钩子内登记侦听器，需要移出 setup 同步段。
10. **CORS_ORIGINS 加 `http://127.0.0.1:3000`**，否则本地 docker 调试踩坑。
11. **`.env.example` 补齐 `QUERY_PORT / GEN_PORT / PIP_INDEX_URL / APT_MIRROR / NPM_REGISTRY / NUXT_PUBLIC_*` 五组缺失变量**。
12. **路由参数改 `Annotated[T, Path/Query]`**（违反根 CLAUDE.md）：[query config.py:19](../../../services/report-query/app/api/config.py#L19)、[data.py:19,31](../../../services/report-query/app/api/data.py#L19)、[drilldown.py:28](../../../services/report-query/app/api/drilldown.py#L28)、[meta.py:20](../../../services/report-query/app/api/meta.py#L20)。

### 🟢 Nice — 有空再说

- `Dockerfile` / `Dockerfile.intranet` / `Dockerfile.offline` 抽公共基础层
- `SETUP-LOG.md` 标注已过期 / `dist/` vs `.output/` 二选一
- `MultiLevelTable` 排序两种 locale 不一致 + `uniqueValuesByKey` 性能
- VueUse 复用 `onClickOutside` / `useIntersectionObserver`（dashboard 部分没用）
- envelope 两份重复实现加一致性测试（或抽到 `shared/python-lib`）
- 8 个 chart 加 `defineAsyncComponent` 拆 chunk

---

## 工具自检结论

```
report-query:       ruff ✅  mypy --strict ✅  pytest 20 passed ✅
report-generation:  ruff ✅  mypy --strict ✅  pytest 20 passed ✅
apps/web:           5 vitest spec 全过 ✅
```

→ "工具层面零警告"，但**工具检查不到的全在协议层和契约层**。本次审查的核心结论就是：**lint 绿不等于契约对**。把 Pydantic schema 真接进 `response_model` + 前端在 fetch 处真接 Zod `.parse`，是堵这个口子的关键。
