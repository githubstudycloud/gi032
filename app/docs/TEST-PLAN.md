# 测试计划

## 1. 测试金字塔

```
            ┌──────────────┐
            │ 手工 / 烟测   │  Chrome DevTools + curl + docker compose
            ├──────────────┤
            │ 集成 / 契约   │  TestClient (FastAPI) + 引用一致性 (vitest)
            ├──────────────┤
            │ 单元          │  pytest (服务) + vitest (前端)
            └──────────────┘
```

跑得快 / 数量多 / 覆盖范围窄 ← → 跑得慢 / 数量少 / 端到端

## 2. 覆盖矩阵

| 关注点 | 前端 vitest | 后端 query pytest | 后端 gen pytest | 手工 / 烟测 |
|---|---|---|---|---|
| **协议契约** | mock-fixtures（57） | TestClient 端点（12） | TestClient 端点（4） | curl 抽样 |
| **Envelope 形状** | useDataSource 解包 | envelope.shape | envelope.shape | curl 看字段 |
| **数据源切换** | mode=json/api | — | — | 切 env 重启 |
| **DB-first 回落** | — | repo fallback | — | rm db / 关 mysql |
| **Seed 幂等** | — | — | seed idempotent | exec --reset 二次 |
| **鉴权** | — | — | admin token 4 状态 | curl 不带 / 带错 / 带对 |
| **错误响应** | ErrorPanel | 404 / 422 / 500 | 401 / 403 | 输入坏数据 |
| **i18n** | — | — | — | 切 LocaleSwitcher |
| **响应式** | — | — | — | 窗口拉伸 |
| **a11y** | — | — | — | axe DevTools + 键盘 |
| **离线** | — | — | — | 断网 + system 字体跑 |

## 3. 现有用例清单

### 3.1 前端 vitest（共 70 个 / 4 个文件）

`apps/web/tests/mock-fixtures.spec.ts` —— 57 个
- discovers at least one report type
- 每个 report type（5 个）：
  - meta.report_type 跟目录名一致
  - filters 是数组
  - primary_view.tabs 非空数组
  - 每个 tab.key 在 data.tabs 里有对应条目
  - kpi.groups[].items[].key 在 data.kpi 里能找到
  - header_tree 叶子 key 在第一行数据里至少出现 50%
- nav.json 过 NavResponseSchema 校验
- admin/metrics.json 有 page_config + columns + data.items

`apps/web/app/utils/csv-page-parser.spec.ts` —— 10 个
- parse empty
- parse with only META
- parse with METRICS only
- COLUMNS 单级表头
- COLUMNS 多级表头（parent）
- COLUMNS highlight 标记
- ROWS 缺值 → 空字符串
- ROWS 多列对齐 leaves
- 整页 4 段都全 + 嵌套表头
- 异常段忽略

`apps/web/app/utils/threshold.spec.ts` —— 14 个
- higher_better good / warn / danger 三档
- lower_better 反向
- 缺 threshold → 默认 normal
- value 是字符串 / 百分号 / 单位时正确解析
- direction 缺省时默认 higher_better
- ...

### 3.2 后端 report-query pytest（共 37 个 / 4 个文件）

`services/report-query/tests/test_smoke.py`
- test_healthz
- test_config_loads_from_fixture[5 个 report type] —— parametrize
- test_data_loads_from_fixture[5 个 report type] —— parametrize
- test_config_404_on_unknown_type

### 3.3 后端 report-generation pytest（共 20 个 / 4 个文件）

`services/report-generation/tests/test_smoke.py`
- test_healthz
- test_admin_metrics_list
- test_ingest_json
- test_admin_token_when_set

### 3.4 新增用例（本轮）

**report-query**：
- `test_envelope_shape.py`
  - 任意端点返回都有 `code`, `message`, `trace_id`, `data` 四字段
  - trace_id 是 32 字符 hex
  - 失败响应 envelope shape 不变（仅 code != 0）
- `test_repo_fallback.py`
  - DB 表不存在 → 回落 fixture
  - DB 表存在但 row 为空 → 回落 fixture
  - DB 表存在且 row 有数据 → 优先 DB
- `test_drilldown.py`
  - POST drilldown 返回 items + context
  - page / page_size 透传

**report-generation**：
- `test_admin_auth.py`
  - 设 token 后：无 Authorization → 401
  - Bearer 错 token → 403
  - Bearer 对 token → 200
  - 没设 token（dev 模式）→ 不验证
- `test_seed_idempotent.py`
  - 跑两次 seed，行数一样
  - --reset 后行数不变（不是累加）
- `test_ingest_csv.py`
  - 上传合法 CSV → accepted 数 == 行数
  - 上传空文件 → accepted 0
  - 上传非 UTF-8 → 不挂

**前端 vitest**：
- `apps/web/app/composables/use-data-source.spec.ts`
  - json 模式：URL 拼成 mockBase + jsonPath
  - api 模式：URL 拼成 apiBase + apiPath
  - api 模式：response 是 envelope 自动解包
  - api 模式：envelope.code != 0 抛错
- `apps/web/app/components/report/FilterSection.spec.ts`
  - filters 为空数组 → 不渲染（v-if）
  - kind=date_range 渲染两个 input[type=date]
  - kind=text 渲染 input[type=search]
  - kind=flat_dropdown 渲染 select

## 4. 跑测试

```powershell
# 一键全跑（仓库根）
.\scripts\verify-all.ps1                # 见 VERIFICATION.md

# 分跑
cd apps/web && pnpm test
cd services/report-query && uv run pytest
cd services/report-generation && uv run pytest

# 单文件
cd services/report-query && uv run pytest tests/test_repo_fallback.py -v
cd apps/web && pnpm vitest run app/composables/use-data-source.spec.ts

# 加 verbose
uv run pytest -vv --tb=long

# 加 coverage（按需装）
uv add --dev pytest-cov
uv run pytest --cov=app --cov-report=term-missing
```

## 5. 通过率目标

| 项 | 目标 |
|---|---|
| 单元 + 集成测试 | 100% 通过（不容忍红） |
| ruff / eslint | 0 errors |
| mypy / vue-tsc | 0 errors |
| 测试覆盖率（pytest） | 后端业务逻辑 > 70% |
| 测试覆盖率（vitest） | utils + composables > 60% |

CI（如果有）：lint + types + tests 任一红都 block 合并。

## 6. 测试约定（写新测试时）

参考 [.claude/skills/python-pytest-spec/SKILL.md](../.claude/skills/python-pytest-spec/SKILL.md)：

- **命名**：`test_<scenario>__<expectation>()`
- **每个行为 ≥ 3 用例**：happy + 边界 + 错误
- **fixture > setup/teardown**
- **DB 测试用临时文件**（`tempfile`），不污染 shared.db
- **HTTP 测试断言 3 件事**：status code + body.code + body.data 形状
- **parametrize 跑矩阵**，不要复制粘贴
- **mock 谨慎**：能用真就用真；mock 只在跨服务边界

## 7. 什么不需要测

- 第三方 lib 内部行为（FastAPI / Pydantic / SQLAlchemy）
- 框架生成代码（Nuxt auto-import）
- 显式 mock 数据本身（fixture 引用一致性已经覆盖结构）
- UI 样式 / 颜色 / 字号（视觉回归用截图工具，不在单测里）

## 8. 失败处理

测试挂了优先做：
1. **重现**：跑单个测试，看具体断言
2. **看 diff**：对比期望 vs 实际
3. **不抑制**：除非 100% 确定无关，否则不要加 `xfail` / `skip`
4. **回滚**：如果是改业务代码导致，先回滚再加测试覆盖再改

千万**不要**为了让测试过：
- 改测试的期望值匹配错误实现
- 用 monkeypatch 隐藏问题
- 加 `try/except: pass` 吞异常
- 给业务代码加无意义的判空

## 9. 端到端 / 手工核验

不在自动化里跑，但每次大改 UI 后必跑（见 [VERIFICATION.md](VERIFICATION.md)）：

- Chrome DevTools 截图 + console error 检查
- 4 主题切换不挂
- 4 字体切换不挂
- zh-CN / en-US 切换正常
- 8 个核心页面 HTTP 200
- 筛选下拉有数据
- KPI 卡能展开 detail
- 表格能下钻
- 指标管理 CRUD 弹窗能开

后端：
- `curl /api/healthz` 返 envelope
- `curl /api/reports/summary/data` 跟 fixture 一致（DB 有数据时）
- `curl /api/scheduler/jobs` 有两个 job
- `docker compose up` 后 4 个容器健康（`docker compose ps`）
