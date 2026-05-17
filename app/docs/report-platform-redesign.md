# 报表平台融合方案 —— 把 Vue 看板重构为 gi031 协议客户端

> **目标**：把当前 `c:\Users\John\Desktop\claude\20260515\app`（Nuxt 4 + JSON mock）的 6 个固定页面，
> 重构为 **1 个通用 `<ReportPage>` 组件 + N 份 JSON/SQL 配置**，前端**任何业务变更不发版**。
> 数据契约对齐 `c:\Users\John\Desktop\claude\20260514` 的 gi031 报表平台（FastAPI + 自描述 `/config`），
> 前后端一体设计：前端是哑渲染器，后端配置库是单一真源。

---

## 0. 现状 vs 目标

| | 当前 (20260515) | gi031 (20260514) | 融合后 |
|---|---|---|---|
| 页面来源 | 6 份手写 `.vue` + 6 份 mock JSON | 1 份 prototype HTML + FastAPI | 1 份 `<ReportPage>` + N 份 `/config` |
| 列定义 | 写死在 mock JSON 里 | `metric_def` 表，`/config` 装配 | DB 表 → `/config` → 前端渲染 |
| 加新指标 | 改 JSON → 提交 → 部署 | INSERT metric_def → 立即生效 | 同 gi031 |
| 表头层级 | 1–4 级递归（已支持） | 任意深度 header_tree | 沿用现有 `MultiLevelTable` |
| 筛选 | 每页手写（部门/时间范围） | `filter.kind` 派发 | `<FilterBar>` 通用派发 |
| 下钻 | `console.log` 占位 | `drilldown.ref` + `param_mapping` | 抽 `<DrilldownModal>` |
| 排序 / 列筛选 | 已支持 | 已支持 + 后端 distinct | 沿用前端 + 加 `/distinct` |
| 个人偏好 | 仅主题 + 语言 | 列定制 + 行收藏 + 下拉收藏 | 加 `/users/me/columns/{report}` |
| 分页 | 本地分页（前端切片） | server / client / none 三模式 | 三模式由 `/config` 指定 |
| 转置 | 不支持 | row_dim_options + transpose | 服务端按 `row_dim` 重组 |
| 数据校验 | Zod（前端） | Pydantic（后端） | 双端共享 schema |
| 后端 | 无 | FastAPI + SQLAlchemy + Celery | FastAPI 单服务（先不上 Celery） |

---

## 1. 架构总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Nuxt 4 前端（Vue 3）                            │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  ReportPage (通用)                                              │    │
│  │   ├── FilterBar       (按 filter.kind 派发)                      │    │
│  │   ├── ViewTemplateBar (主题模板：紧凑/稀疏/KPI on/off)            │    │
│  │   ├── ToolBar         (转置 / 分页模式 / 列定制 / 收藏开关)       │    │
│  │   ├── MetricsBox      (KPI 卡，仍按当前实现，data 来自 totals)    │    │
│  │   ├── TabStrip        (多个 view 时切换：summary / detail)        │    │
│  │   ├── MultiLevelTable (复用现有 N 层表头 + 排序 + 列筛选 + 行收藏) │    │
│  │   └── DrilldownModal  (点单元格弹下钻，复用 MultiLevelTable)      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│            ↑                                                            │
│            │ useReport(reportType): { config, data, filters, ... }      │
└────────────┼────────────────────────────────────────────────────────────┘
             │ REST (JSON only, CORS by backend)
┌────────────▼────────────────────────────────────────────────────────────┐
│                FastAPI 后端 (single-process)                            │
│                                                                         │
│  /api/reports/{type}/config       ← 元数据装配                          │
│  /api/reports/{type}/summary      ← 主视图数据 (分页/排序/row_filter)   │
│  /api/reports/{type}/detail       ← 下钻（也走 summary 的同一管线）     │
│  /api/reports/{type}/distinct     ← 列筛选浮层去重值                    │
│  /api/reports/{type}/versions     ← 版本选择                            │
│  /api/dropdowns/{key}             ← 下拉数据（分页/搜索/收藏/层级）     │
│  /api/users/me/columns/{type}     ← 列偏好 GET/PUT                      │
│  /api/users/me/row_favorites/{type}  ← 行收藏                          │
│  /api/users/me/favorites/{dropdown}  ← 下拉项收藏                      │
└────────────┬────────────────────────────────────────────────────────────┘
             │ SQLAlchemy
┌────────────▼────────────────────────────────────────────────────────────┐
│  SQLite (dev) / MySQL 8 / PostgreSQL (prod)                             │
│   ├── 元数据：report_def / field_def / dropdown_def / view_template     │
│   ├── 事实表：report_fact_<type>（按报表类型一张表，加列不影响其他）     │
│   ├── 预聚合：report_fact_<type>_daily（latest-valid 已 sum）           │
│   └── 个人偏好：user_column_pref / user_row_favorite / user_option_fav  │
└─────────────────────────────────────────────────────────────────────────┘
```

设计决定：
- **前端不知道字段语义**，只渲染 `/config` 给出的形状。
- **后端单进程起步**，不上 Celery / Redis，等真有数据生成流程再拆。
- **dev 用 SQLite，prod 用 MySQL/PG**，schema 通过 `with_variant` 兼容（参考 gi031 已经验证过）。

---

## 2. 后端设计

### 2.1 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| Web | **FastAPI** | OpenAPI 自动生成；Pydantic v2 校验入参；async 性能足够 |
| ORM | **SQLAlchemy 2 (Mapped, async optional)** | 类型友好；多 DB 后端 |
| 校验 | **Pydantic v2** | 与 FastAPI 原生；前端用 Zod 镜像 |
| 迁移 | **Alembic** | autogenerate 加列体验好 |
| 测试 | **pytest + httpx async client** | |
| 部署 | **uvicorn + systemd** 或 **docker-compose** | gi031 已经有现成模板 |

### 2.2 数据模型（核心 8 张表）

```python
# 元数据 — 不发版改这些即可加报表/列/筛选
class ReportDef(Base):
    """一类报表，对应前端一个 page。"""
    __tablename__ = "report_def"
    code: str = pk(64)                          # 'ai_metrics' / 'industry_landing'
    name: str = col(255)                        # '产业落地进展'
    version: int = col(default=1)               # 改了 +1，前端按它失效缓存
    primary_keys: JSON                          # ['domain_code'] —— 行收藏 key
    primary_view_endpoint: str = col(255)       # '/api/reports/ai_metrics/summary'
    paging_mode_default: str = col(16, "server")
    row_favorite_enabled: bool = True
    compare_supported: bool = False
    is_active: bool = True

class FieldDef(Base):
    """报表内一个字段的元数据。"""
    __tablename__ = "field_def"
    report_code: str = pk(64)
    code: str = pk(64)                          # 'gmv_app' / 'design-adoption-rate'
    label: str = col(255)
    parent_code: str | None = col(64)           # 父节点 code → header_tree
    data_type: str = col(16)                    # int / decimal / percent / string
    display: JSON                               # {kind:'number', precision:1, thousand:true, unit:'%'}
    aggregation: str | None = col(32)           # sum / avg / weighted_avg / computed
    weight_field: str | None = col(64)          # for weighted_avg
    computed_formula: str | None = col(255)     # for computed: 'gmv_app + gmv_web'
    is_default_visible: bool = True
    default_order: int = 0
    default_pinned: str = col(16, "none")       # left / right / none
    default_width: int | None = None
    sortable: bool = True
    row_filterable: bool = True
    highlight: bool = False                     # 重点列高亮
    threshold: JSON | None = None               # {min:60, goodColor:'emerald', badColor:'rose'}
    drilldown_ref: str | None = col(64)         # 引用 drilldown_def.code
    physical_present: bool = True               # 软隐藏 / 物理保留
    is_active: bool = True

class FilterDef(Base):
    __tablename__ = "filter_def"
    report_code: str = pk(64)
    code: str = pk(64)                          # 'business_date' / 'projects'
    label: str = col(64)
    kind: str = col(32)                         # date_range / multi_select / hierarchy_dropdown ...
    required: bool = False
    sort_order: int = 0
    config: JSON                                # 余下细节（param/source/default/depends_on/visible_if）

class DropdownDef(Base):
    __tablename__ = "dropdown_def"
    key: str = pk(64)                           # 'projects' / 'region_tree'
    endpoint: str = col(255)
    source_kind: str = col(16)                  # table / sql / function
    source_ref: str = col(255)                  # 'dim_project' / 'SELECT ...' / 'app.dropdowns:region_tree'
    max_levels: int | None = None
    select_at_any_depth: bool = False
    supports_favorite: bool = True

class DrilldownDef(Base):
    __tablename__ = "drilldown_def"
    code: str = pk(64)                          # 'orders_drilldown'
    title_tpl: str = col(255)                   # 含 {row.x} {filter.y} 占位
    endpoint: str = col(255)
    param_mapping: JSON                         # {'row.region_code': 'region_code', ...}
    header_tree: JSON                           # 跟 columns 一样的递归结构

# 事实表 + 个人偏好 — 见 §2.5 / §2.6
```

### 2.3 `/config` 装配 —— 单一真源

```python
def assemble_config(db: Session, report_type: str) -> dict:
    rd = db.execute(select(ReportDef).where(ReportDef.code == report_type)).scalar_one()
    fields = sorted(
        db.execute(select(FieldDef)
                   .where(FieldDef.report_code == report_type,
                          FieldDef.is_active, FieldDef.physical_present)).scalars(),
        key=lambda f: (f.default_order, f.code))

    return {
        "meta":     _meta(rd),
        "filters":  [_filter_to_dict(f) for f in filter_defs(db, rd.code)],
        "primary_keys": rd.primary_keys,
        "version":  _version_spec(rd),
        "primary_view": _primary_view(rd),
        "columns":  {"summary": {"header_tree": _build_tree(fields)}},
        "drilldowns": {d.code: _drilldown(d) for d in drilldowns(db, rd.code)},
    }

def _build_tree(fields: list[FieldDef]) -> list[dict]:
    """parent_code 链 → 递归 children 树。任意层。"""
    by_parent: dict[str | None, list[FieldDef]] = defaultdict(list)
    for f in fields: by_parent[f.parent_code].append(f)
    def build(parent_code):
        nodes = []
        for f in by_parent.get(parent_code, []):
            if f.parent_code is None and not by_parent.get(f.code):
                # 顶层叶子：直接当列
                nodes.append(_leaf_to_dict(f))
            else:
                children = build(f.code)
                if children:
                    nodes.append({"code": f.code, "label": f.label, "children": children})
                else:
                    nodes.append(_leaf_to_dict(f))
        return nodes
    return build(None)
```

### 2.4 `/summary` 数据接口

POST（query 太长用 body）：

```jsonc
// request body
{
  "filter": { "date_from": "2026-05-01", "date_to": "2026-05-13",
              "project_codes": ["P001", "P002"] },
  "version": "latest",
  "sort":    [{"field": "_row_favorite", "dir": "desc"},
              {"field": "gmv_app",       "dir": "desc"}],
  "page": 1, "page_size": 50, "paging_mode": "server",
  "columns": ["domain_code", "gmv_app", "gmv_web", "orders"],
  "row_filter": [{"column":"region_code","op":"in","value":["CN-31","CN-44"]}],
  "row_dim": "domain",            // 转置维度（见 §2.7）
  "compare_with": "prev_period"   // none / prev_period / prev_year
}
```

服务端流程：
1. 读 `ReportDef` 确定主表 = `report_fact_<type>`（或 `_daily` 预聚合表）
2. 解析 `filter`：用 `FilterDef.param` 把前端业务名映射到 SQL 字段名
3. 解析 `row_filter`：对每条 `{column, op, value}` 校验 `FieldDef.row_filterable=True`，组装 WHERE
4. 解析 `row_dim`：决定 GROUP BY 维度（详见 §2.7 转置）
5. 解析 `version`：`latest` 时 join `latest_valid_version` 视图；具体整数时 `WHERE version_no=N`
6. 解析 `sort`：`_row_favorite` 走 `LEFT JOIN user_row_favorite` 的虚拟列；其他列必须 `FieldDef.sortable=True`
7. 解析 `compare_with`：再跑一次同样 SQL 但 filter 偏移一个时段，结果作为 `_prev_<metric>` 拼回 items
8. 应用 `paging_mode`：server=`LIMIT/OFFSET`；client/none=全量（cap 10k）
9. `totals` 由 `FieldDef.aggregation` 决定：sum/avg/weighted_avg/computed

```jsonc
// response
{
  "code": 0,
  "data": {
    "items": [
      { "domain_code": "core",
        "gmv_app": 12345, "gmv_web": 8001, "orders": 421,
        "_prev_gmv_app": 11000, "_delta_pct_gmv_app": 12.2,
        "_row_favorite": true,
        "_row_key": {"domain_code": "core"}
      }
    ],
    "page": 1, "page_size": 50, "total": 6, "has_more": false,
    "extras": {
      "totals": {"gmv_app": 1023456, "orders": 9999},
      "compare": {"policy":"prev_period", "prev_from":"2026-04-18", "prev_to":"2026-04-30",
                  "now_from":"2026-05-01", "now_to":"2026-05-13"}
    }
  }
}
```

### 2.5 行级筛选 `row_filter` 协议

| op | 说明 |
|---|---|
| `eq` / `ne` | 等 / 不等 |
| `in` / `not_in` | 多值 |
| `gt` / `gte` / `lt` / `lte` / `between` | 数值范围 |
| `ilike` | 大小写不敏感模糊匹配 |
| `is_null` / `is_not_null` | NULL 判断 |

每条 op 在 `FieldDef.row_filterable=True` 时才允许，否则 400。SQL 生成统一过 `sqlalchemy.literal_column` + 参数化，绝不用字符串拼接，防注入。

### 2.6 列偏好 / 行收藏 / 选项收藏

```
# 列偏好
GET  /api/users/me/columns/{report}    → [{field_code, is_visible, order_idx, width, pinned}]
PUT  /api/users/me/columns/{report}    body 同上 → 增量覆盖（缺省字段不变）
DELETE /api/users/me/columns/{report}  → 回到后端默认

# 行收藏
PUT  /api/users/me/row_favorites/{report}  body {row_key:{domain_code:'core'}, favorited:true}

# 下拉项收藏（按 dropdown key 分桶）
PUT  /api/users/me/favorites/{dropdown_key}  body {option_value:'P001', favorited:true}
```

存储用 3 张表（gi031 已实现）：`user_column_pref` / `user_row_favorite` / `user_option_favorite`。
所有 PUT 都是 **upsert**，无 user 时按 `Authorization` 头取，未登录走 cookie session（dev 阶段固定 `user_id='dev'`）。

### 2.7 **转置接口** —— `row_dim` 维度切换

实际业务很常见："默认按领域聚合 6 行；切换后按 项目×领域 24 行；再切换为 按 项目 聚合 4 行"。
解决方式：`primary_view.row_dim_options` 在 `/config` 中声明，`/summary` 请求里传 `row_dim` 即可。

```jsonc
// /config 片段
"primary_view": {
  ...
  "row_dim_options": [
    {"code": "domain",          "label": "领域 (默认)",  "row_count_hint": 6},
    {"code": "project>domain",  "label": "项目 + 领域",   "row_count_hint": 24},
    {"code": "project",         "label": "仅项目",       "row_count_hint": 4}
  ],
  "row_dim_default": "domain"
}
```

服务端按 `row_dim` 解析为 GROUP BY 列：
- `domain` → `GROUP BY domain_code`
- `project>domain` → `GROUP BY project_code, domain_code`
- `project` → `GROUP BY project_code`

度量列按 `FieldDef.aggregation` 卷起来（sum/avg/weighted_avg/computed）。前端 `MultiLevelTable` 收到的还是同一种 `{columns, rows}` 形状，**不需要任何改动**。

可选高级形态：**真正的行列转置**（行变列、列变行）。这种用法相对罕见，且会让 column 数量随数据变化（违反 `/config` 静态契约）。建议**不要**在协议里支持，让前端在导出 Excel 时另做。

### 2.8 列值去重 `/distinct`

```
POST /api/reports/{type}/distinct
{ "column": "domain_code", "filter": {...}, "limit": 1000 }
```

返回 `[{value, label, count}]`，前端列筛选浮层用。值数 > 1000 时 `truncated:true`，前端切到"输入搜索"模式。

### 2.9 多版本 `versions`

```
GET /api/reports/{type}/versions?date_from=&date_to=&source=
POST /api/reports/{type}/versions/mark
  body: { period_date, source, version_no, is_valid, reason }
```

数据表里 `version_no` 字段 + `*_invalid_mark` 软删表（gi031 已落地）。前端 `versions` 端点专门给"版本回放"用，普通用户用默认 `latest`。

---

## 3. 前端设计

### 3.1 目录改造（增量）

```
app/
├── pages/
│   ├── index.vue                         # 不变
│   └── reports/
│       └── [report_type].vue             # ★ 新：通用报表页路由
├── components/
│   ├── report/                           # ★ 新：报表通用件
│   │   ├── ReportPage.vue                # 主入口（接收 reportType prop）
│   │   ├── FilterBar.vue                 # 按 kind 派发到下面 12 种
│   │   ├── filters/                      # 子件按 kind 1-1 对应
│   │   │   ├── FilterDateRange.vue
│   │   │   ├── FilterFlatDropdown.vue
│   │   │   ├── FilterHierarchyDropdown.vue
│   │   │   ├── FilterSearchDropdown.vue
│   │   │   ├── FilterMultiSelect.vue
│   │   │   ├── FilterText.vue
│   │   │   ├── FilterNumberRange.vue
│   │   │   ├── FilterBoolean.vue
│   │   │   └── FilterEnum.vue
│   │   ├── ToolBar.vue                   # 转置 / 分页模式 / 列定制 / 收藏开关
│   │   ├── ColumnCustomizer.vue          # 列定制抽屉
│   │   ├── DrilldownModal.vue            # 下钻弹窗
│   │   └── VersionPicker.vue             # 版本选择器
│   └── dashboard/                        # 现有件保留 + 适配新协议
│       ├── MetricsBox.vue                # 接 totals 即可
│       ├── MultiLevelTable.vue           # 已支持 N 层 + 排序 + 列筛选
│       └── ...
├── composables/
│   ├── use-report.ts                     # ★ 主：拉 config + data + 维护查询参数
│   ├── use-dropdown.ts                   # ★ 通用下拉数据获取（分页/搜索/收藏）
│   ├── use-column-pref.ts                # ★ 列偏好 merge
│   └── use-row-favorite.ts               # ★ 行收藏
├── types/
│   ├── report-protocol.ts                # ★ /config 协议 TS 类型（跟后端 Pydantic 镜像）
│   └── schemas.ts                        # 现有 Zod 扩展，加 ReportConfigSchema
└── utils/
    ├── header-tree.ts                    # ★ 共享纯函数 isLeaf/depth/leaves/buildHeaderMatrix
    └── filter-encode.ts                  # ★ FilterSpec[] + state → query 对象
```

### 3.2 通用 `ReportPage`

```vue
<!-- pages/reports/[report_type].vue -->
<script setup lang="ts">
const route = useRoute();
const reportType = computed(() => String(route.params.report_type));
</script>

<template>
  <ReportPage :report-type="reportType" />
</template>
```

```vue
<!-- components/report/ReportPage.vue -->
<script setup lang="ts">
const props = defineProps<{ reportType: string }>();

// 一次性拉 config + 数据；config 缓存到 version 变化
const {
  config,             // 静态元数据：filters / columns / drilldowns / version / row_dim_options
  filterState,        // v-model：当前筛选值
  rowFilterState,     // 表头 row_filter 状态
  sortState,          // 排序
  pagingState,        // 分页（mode + page + page_size）
  rowDimState,        // 转置维度
  versionState,       // 当前版本
  compareState,       // 同环比
  columnPref,         // 个人列偏好（已合并默认）
  rows,               // 表格 items
  totals,             // KPI 卡数据
  loading,
  error,
  refresh,
} = useReport(props.reportType);

const summaryView = computed(() => config.value?.columns.summary ?? null);
</script>

<template>
  <ClientOnly>
    <ErrorPanel v-if="error" :error="error" @retry="refresh" />

    <div v-else-if="config">
      <!-- 标题（来自 config.meta.name，不再硬编码） -->
      <header class="flex items-center gap-2 mb-4">
        <h1 class="font-display text-[20px] font-semibold">{{ config.meta.name }}</h1>
        <VersionPicker v-if="config.version" v-model="versionState" :spec="config.version" />
        <div class="flex-1" />
        <ToolBar
          v-model:paging-mode="pagingState.mode"
          v-model:row-dim="rowDimState"
          v-model:compare="compareState"
          :primary-view="config.primary_view"
          @open-columns="openColumnCustomizer = true"
        />
      </header>

      <!-- 筛选条：按 kind 自动派发 -->
      <FilterBar
        v-model="filterState"
        :filters="config.filters"
        @search="refresh"
      />

      <!-- KPI 卡（如果 config 标记了 row_totals） -->
      <MetricsBox v-if="config.primary_view.row_totals" :totals="totals" class="mt-4" />

      <!-- 主表格 -->
      <div class="mt-4">
        <MultiLevelTable
          :header-tree="summaryView?.header_tree"
          :columns-pref="columnPref"
          :rows="rows"
          :primary-keys="config.primary_keys"
          :sort.sync="sortState"
          :row-filter.sync="rowFilterState"
          :paging="pagingState"
          :row-favorite="config.primary_view.row_favorite"
          :drilldowns="config.drilldowns"
          @cell-drilldown="openDrilldown"
          @row-favorite-toggle="toggleRowFavorite"
        />
      </div>

      <ColumnCustomizer
        v-model="openColumnCustomizer"
        :header-tree="summaryView?.header_tree"
        v-model:pref="columnPref"
        :user-pref-endpoint="config.meta.user_pref_endpoint"
      />

      <DrilldownModal v-model="drilldownState" :drilldowns="config.drilldowns" />
    </div>
  </ClientOnly>
</template>
```

### 3.3 `useReport` 核心 composable

```ts
// composables/use-report.ts
import { ReportConfigSchema } from '~/types/schemas';

export async function useReport(reportType: string) {
  // 1. /config —— 一次性，按 version 缓存
  const configDs = await useDataSource<unknown, ReportConfig>({
    key: `report-config:${reportType}`,
    jsonPath: `/configs/${reportType}.json`,      // dev: 本地 mock
    apiPath: `/api/reports/${reportType}/config`, // prod: 后端
    transform: raw => ReportConfigSchema.parse(raw),
  });
  const config = configDs.data;

  // 2. 查询状态（filter / sort / row_filter / paging / row_dim / version / compare）
  const filterState   = ref<Record<string, unknown>>({});
  const rowFilterState = ref<Array<{column:string, op:string, value:unknown}>>([]);
  const sortState     = ref<Array<{field:string, dir:'asc'|'desc'}>>([]);
  const pagingState   = ref({ mode: 'server', page: 1, page_size: 50 });
  const rowDimState   = ref<string>('');
  const versionState  = ref<string|number>('latest');
  const compareState  = ref<'none'|'prev_period'|'prev_year'>('none');

  // 3. 初始化默认值（来自 config）
  watch(config, (cfg) => {
    if (!cfg) return;
    // 填默认筛选
    for (const f of cfg.filters) {
      if (f.default !== undefined && filterState.value[f.code] === undefined) {
        filterState.value[f.code] = f.default;
      }
    }
    // 默认分页
    pagingState.value.mode = cfg.primary_view.paging.default_mode ?? 'server';
    pagingState.value.page_size = cfg.primary_view.paging.default_page_size ?? 50;
    // 默认 row_dim
    rowDimState.value = cfg.primary_view.row_dim_default ?? '';
  }, { immediate: true });

  // 4. 列偏好：合并 config 默认 + 服务端个人偏好
  const columnPref = useColumnPref(reportType, config);

  // 5. 数据查询
  const dataDs = await useDataSource<unknown, SummaryResponse>({
    key: `report-data:${reportType}`,
    jsonPath: `/mock/data/${reportType}.json`,
    apiPath: () => config.value?.primary_view.endpoint ?? '',
    method: 'POST',
    params: () => ({
      filter: filterState.value,
      sort:   sortState.value,
      paging_mode: pagingState.value.mode,
      page: pagingState.value.page,
      page_size: pagingState.value.page_size,
      row_filter: rowFilterState.value,
      row_dim: rowDimState.value,
      version: versionState.value,
      compare_with: compareState.value,
    }),
    transform: raw => SummaryResponseSchema.parse(raw),
    immediate: false,    // 等 config 加载完才发数据请求
  });

  // 6. 自动重查：任一状态变 → debounce → 重发
  const refresh = () => dataDs.refresh();
  watchDebounced(
    [filterState, sortState, pagingState, rowFilterState, rowDimState, versionState, compareState],
    () => refresh(),
    { debounce: 150, deep: true },
  );

  return {
    config,
    filterState, rowFilterState, sortState, pagingState, rowDimState, versionState, compareState,
    columnPref,
    rows:    computed(() => dataDs.data.value?.items ?? []),
    totals:  computed(() => dataDs.data.value?.extras?.totals ?? {}),
    loading: dataDs.pending,
    error:   dataDs.error,
    refresh,
  };
}
```

### 3.4 标题头 + 表头 + 数据如何对接 JSON

**JSON 结构**（一份，三段挂载点）：

```jsonc
{
  "meta":     { "name": "产业落地进展", "version": 12 },     // ← 页面标题
  "primary_view": { "endpoint": "/api/.../summary", ... },
  "columns":  { "summary": { "header_tree": [ ... ] } },     // ← 表头（递归）
  "drilldowns": { ... }
}
```

**数据 JSON**：

```jsonc
{
  "items": [
    { "domain_code": "core", "gmv_app": 12345, "_row_favorite": true,
      "_row_key": {"domain_code": "core"} }
  ],
  "extras": { "totals": {"gmv_app": 1023456} }
}
```

**前端绑定**：
- 标题：`config.meta.name` → `<h1>`
- 表头：`config.columns.summary.header_tree` → `MultiLevelTable :header-tree`（已支持 N 级）
- 行数据：`response.items` → `MultiLevelTable :rows`，key 用列叶子 `code`
- KPI：`response.extras.totals` → `MetricsBox`
- 下钻：列 `drilldown.ref` + `drilldowns` 字典 → `DrilldownModal`

**列与数据的对齐规则**：每个叶子列 `code` 必须对应 `items[i][code]`；缺失 → 渲染 `—`（灰）。不嵌套行对象，永远扁平 key-value。

### 3.5 数据动态化控件 —— `filter.kind` 派发器

```vue
<!-- components/report/FilterBar.vue -->
<script setup lang="ts">
const props = defineProps<{
  modelValue: Record<string, unknown>;
  filters: FilterSpec[];
}>();
const emit = defineEmits<{ 'update:modelValue': [v: Record<string, unknown>], search: [] }>();

function set(code: string, value: unknown) {
  emit('update:modelValue', { ...props.modelValue, [code]: value });
}

// 12 种 kind 的组件按名约定，加新 kind 只加文件 + 加一行
const kindMap = {
  date_single:         resolveComponent('FilterDateSingle'),
  date_range:          resolveComponent('FilterDateRange'),
  flat_dropdown:       resolveComponent('FilterFlatDropdown'),
  hierarchy_dropdown:  resolveComponent('FilterHierarchyDropdown'),
  search_dropdown:     resolveComponent('FilterSearchDropdown'),
  multi_select:        resolveComponent('FilterMultiSelect'),
  multi_search:        resolveComponent('FilterMultiSearch'),
  text:                resolveComponent('FilterText'),
  number_range:        resolveComponent('FilterNumberRange'),
  boolean:             resolveComponent('FilterBoolean'),
  enum_radio:          resolveComponent('FilterEnum'),
  enum_chips:          resolveComponent('FilterEnum'),
} as const;
</script>

<template>
  <section class="filter-bar grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
    <component
      v-for="f in filters"
      :key="f.code"
      :is="kindMap[f.kind]"
      :spec="f"
      :model-value="modelValue[f.code]"
      @update:model-value="set(f.code, $event)"
    />
    <div class="col-span-full flex justify-end gap-2">
      <button @click="emit('search')">{{ $t('common.search') }}</button>
      <button @click="emit('update:modelValue', {})">{{ $t('common.reset') }}</button>
    </div>
  </section>
</template>
```

每个 `Filter<Kind>` 子件签名一致：`:spec="FilterSpec" v-model="value"`。无业务耦合，加新 kind 不改 dispatcher。

### 3.6 精细控制：点击 / 收藏 / 分页 / 样式

| 行为 | 配置入口 | 前端实现 |
|---|---|---|
| **单元格点击 → 下钻** | `FieldDef.drilldown_ref → DrilldownDef` | `<MultiLevelTable @cell-click>` 检查 column.drilldown，有则按 `param_mapping` 填模板请求 |
| **不可点击列** | `drilldown_ref` 为空 | 鼠标不变手型 |
| **行收藏** | `primary_view.row_favorite.enabled=true` | 行左侧加 ★ 按钮；点击 PUT `/row_favorites/{type}`；sort 加虚拟 `_row_favorite` |
| **下拉项收藏** | `source.supports_favorite=true` | 下拉每项加 ★；按 favorite + label 排序 |
| **列定制** | 默认每个报表都开 | `<ColumnCustomizer>` 列树 + 拖拽排序 + 显隐 + 宽度；PUT `/columns/{type}` |
| **列固定** | `FieldDef.default_pinned` | `table th[data-pinned="left"]` 加 `sticky` |
| **分页** | `paging.default_mode` | server: 标准请求；client: 一次拉全量、前端切；none: 显示全部带 cap 提示 |
| **样式 — 阈值套色** | `FieldDef.threshold` | 已有 `thresholdPillClass`；threshold 列单元格自动套色 |
| **样式 — 高亮列** | `FieldDef.highlight=true` | 表头 + 整列底色（已有） |
| **样式 — display** | `FieldDef.display = {kind, precision, thousand, unit}` | 数字 → `formatNumber(v, display)`；percent → `(v*100).toFixed(precision)%`；text → 原值 |
| **样式 — 主题** | 全局 ThemeSwitcher | 当前 4 套主题不变 |
| **同 / 环比** | `compare_with=prev_period` | 单元格右侧 `▲/▼ N%` 小标签，从 `_delta_pct_<metric>` 读 |
| **版本** | `version.endpoint` | `<VersionPicker>` 拉版本列表，切版本重发数据请求 |

### 3.7 共享纯函数（前后端镜像）

| 函数 | 前端位置 | 后端位置 | 说明 |
|---|---|---|---|
| `isLeaf(node)` | `utils/header-tree.ts` | `services/header_tree.py` | 表头节点是否叶子 |
| `depth(tree)` | 同 | 同 | 表头最大深度 |
| `leaves(tree)` | 同 | 同 | DFS 取所有叶子 |
| `buildHeaderMatrix(tree)` | 同 | 同 | thead 矩阵（rowspan/colspan） |
| `mergeColumns(default, pref)` | 同 | 同 | 默认 + 个人偏好合并 |
| `validateRowFilter(rf, fields)` | 同 | 同 | row_filter 合法性 |

前端 TS / 后端 Python 各一份，**单元测试一致**（同输入同输出），保证渲染与查询的列集合永远对齐。

---

## 4. JSON 配置示例（直接可用）

### 4.1 报表 `/config` 示例（最小可用）

```jsonc
// public/mock/configs/industry_landing.json （或后端 /api/reports/industry_landing/config）
{
  "meta": {
    "report_type": "industry_landing",
    "name": "产业落地进展",
    "version": 1,
    "user_pref_endpoint": "/api/users/me/columns/industry_landing"
  },
  "primary_keys": ["industry_code"],
  "filters": [
    { "code": "business_date", "label": "时间范围", "kind": "date_range", "required": true,
      "default": { "preset": "last_30_days" },
      "param": { "from": "date_from", "to": "date_to" } },
    { "code": "department", "label": "部门", "kind": "flat_dropdown",
      "param": { "value": "department_code" },
      "source": { "endpoint": "/api/dropdowns/departments",
                  "paging": {"enabled":true, "page_size":50},
                  "supports_favorite": true,
                  "params_in": ["q","page","page_size","sort"] } }
  ],
  "version": { "endpoint": "/api/reports/industry_landing/versions",
               "param": "version", "default": "latest", "policy": "latest_per_day" },
  "primary_view": {
    "endpoint": "/api/reports/industry_landing/summary",
    "method": "POST",
    "sortable": true,
    "paging": { "enabled": true, "default_page_size": 50, "default_mode": "server" },
    "row_favorite": { "enabled": true,
                      "toggle_endpoint": "/api/users/me/row_favorites/industry_landing",
                      "sort_on_top": true },
    "row_totals": true,
    "row_dim_options": [
      {"code": "industry", "label": "按产业 (默认)", "row_count_hint": 6}
    ],
    "row_dim_default": "industry"
  },
  "columns": {
    "summary": {
      "header_tree": [
        { "code": "industry_code", "label": "产业", "data_type": "string",
          "is_default_visible": true, "default_order": 1, "default_pinned": "left",
          "default_width": 100, "sortable": true, "row_filterable": true,
          "display": { "kind": "text" } },
        { "code": "owner", "label": "接口人", "data_type": "string",
          "is_default_visible": true, "default_order": 2,
          "sortable": true, "row_filterable": true, "display": { "kind": "text" } },
        { "code": "_design", "label": "测试设计阶段",
          "children": [
            { "code": "design_coverage_count", "label": "测试设计覆盖人数",
              "data_type": "int", "is_default_visible": true, "default_order": 10,
              "sortable": true, "display": { "kind": "number" } },
            { "code": "design_adoption_rate", "label": "用例采纳率",
              "data_type": "decimal", "is_default_visible": true, "default_order": 12,
              "sortable": true, "highlight": true,
              "threshold": { "min": 65, "goodColor": "emerald", "badColor": "rose" },
              "display": { "kind": "percent", "precision": 1 },
              "drilldown": { "ref": "design_drill" } }
          ]}
      ]
    }
  },
  "drilldowns": {
    "design_drill": {
      "title": "测试设计明细 — {row.industry_code} / {filter.business_date.from} ~ {filter.business_date.to}",
      "endpoint": "/api/reports/industry_landing/detail",
      "method": "POST",
      "param_mapping": {
        "row.industry_code": "industry_code",
        "filter.business_date.from": "date_from",
        "filter.business_date.to": "date_to",
        "cell.column": "metric"
      },
      "paging": { "enabled": true, "default_page_size": 50 },
      "header_tree": [
        { "code": "case_id", "label": "用例 ID", "data_type": "string", "is_default_visible": true, "default_order": 1 },
        { "code": "case_title", "label": "标题",  "data_type": "string", "is_default_visible": true, "default_order": 2 },
        { "code": "is_ai_generated", "label": "AI 生成", "data_type": "boolean", "is_default_visible": true, "default_order": 3 }
      ]
    }
  }
}
```

### 4.2 数据 `/summary` 示例

```jsonc
{
  "code": 0,
  "data": {
    "items": [
      { "industry_code": "汽车", "owner": "张三",
        "design_coverage_count": 12, "design_adoption_rate": 65.4,
        "_row_favorite": true, "_row_key": {"industry_code":"汽车"} },
      { "industry_code": "金融", "owner": "李四",
        "design_coverage_count": 9, "design_adoption_rate": 71.2,
        "_row_favorite": false, "_row_key": {"industry_code":"金融"} }
    ],
    "page": 1, "page_size": 50, "total": 2, "has_more": false,
    "extras": {
      "totals": { "design_coverage_count": 21, "design_adoption_rate": 68.3 }
    }
  }
}
```

---

## 5. 落地路线（建议节奏）

| 阶段 | 周期 | 内容 | 验收 |
|---|---|---|---|
| **M1 后端骨架** | 3 天 | FastAPI + SQLAlchemy + Alembic；`report_def` / `field_def` / `filter_def` 3 张表；`/config` 拼一份固定报表 | `curl /api/reports/industry_landing/config` 返回有效 JSON |
| **M2 数据接口** | 2 天 | `/summary` + `/distinct` + `/versions`，连原始事实表 | `curl ... /summary` 跟 mock 形状对齐 |
| **M3 前端 ReportPage** | 4 天 | `useReport` + `<FilterBar>` 12 kind + `<ToolBar>` + `<MultiLevelTable>` 适配（基于现有件） | 1 个真实报表跑通：进入页面 → 加载 config → 拉数据 → 渲染 |
| **M4 个人偏好** | 2 天 | 列定制抽屉 + 行收藏按钮 + 下拉项收藏 + 3 张 user_* 表 | 切换列 / 收藏 / 重进保留状态 |
| **M5 下钻 + 转置** | 2 天 | `<DrilldownModal>` 复用 `<MultiLevelTable>`；`row_dim` 切换 | 点 design_adoption_rate → 弹窗；切 row_dim → 表格行数变 |
| **M6 灰度迁移** | 3 天 | 把现有 6 个固定页面**逐个**切到 `/reports/<type>` 路由；删除老 page 文件 | 6 个页面行为完全等价；菜单链接更新 |
| **M7 加新报表实战** | 0.5 天 | INSERT 一组 metric_def + 试跑 | 不发版前端，新报表上线 |

---

## 6. 风险 / 权衡

- **从 mock JSON 切到后端**：当前 6 个页面 mock JSON 已用了我们自己的 `OverviewSummaryResponse` 形状，跟本协议 `ReportConfig + SummaryResponse` 不完全一致。
  迁移策略：先在前端写 `transform`（在 `useDataSource.transform` 里）从旧形状映射到新形状，**老 JSON 不动**；后端实装后改 `dataSourceMode='api'` 一行切换。
- **协议复杂度**：`/config` 字段多，初学者直接读容易晕。**对策**：写 `report_def` "脚手架"管理后台（M5 后），点选模板生成最常见的报表配置。
- **数据库**：dev 用 SQLite 已够；prod 第一版用 MySQL 8 即可，不必上 PG。
- **认证**：本期沿用 dev 阶段固定 user，prod 接公司 SSO（不在本设计范围）。
- **缓存**：`/config` 按 `meta.version` 在前端 localStorage 缓存；后端可加 Redis（M3+），不是 P0。
- **列删除**：后端用 `is_active=false` 软隐藏，物理列保留；真要删才改生成代码。

---

## 7. 与现有 Vue 项目的关系

**完全增量**，**不破坏现状**：
1. 现有 6 个固定页面继续可用（catch-all 不动）。
2. 新增 `/reports/[report_type].vue` 路由 + ReportPage 组件，跑通后再迁。
3. 现有 `MultiLevelTable` / `MetricsBox` / `MetricCard` 三大件**完全复用**，本协议恰好覆盖了它们已经支持的能力（N 级表头 / 排序 / 列筛选 / 行操作）。
4. 新增的纯函数 (`buildHeaderMatrix` / `mergeColumns`) 跟现有 `depthOf` / `leavesOf` 同形，可以合并或共存。
5. `i18n` / `ThemeSwitcher` / 安全 headers / Zod 校验全部继承。

## 8. 后续可选扩展（不在本期）

- **导出 Excel/PDF**：服务端 openpyxl / reportlab；前端只调 `/export`
- **报表生成 DAG**：gi031 设计的 `flow_def` + Celery 异步流水；多来源、版本合并、source mark
- **WebSocket 推送**：长查询 / 数据刷新通知
- **行级权限**：`field_def.row_policy` 加表达式，根据 user 过滤
- **公式列编辑器**：管理后台 UI 写 `computed_formula`（当前手填 SQL 表达式）
- **管理后台**：FastAPI 的 `/admin/*` + 一个独立的简单 Vue 后台，CRUD `report_def / field_def / filter_def`

---

## 附录 A · 与 gi031 `ai-metrics` 的差异 / 共性

**共性**：
- `/config` 自描述协议 ✅
- header_tree N 级 ✅
- filter.kind 派发 ✅
- 行收藏 / 列偏好 ✅
- 多版本 / row_filter / distinct ✅
- 同环比 + threshold ✅

**差异（我们这边的简化）**：
- 不上 Celery 生成服务（先纯查询，数据从外部导入）
- 不做 source_mark 多来源合并
- 多租户权限不实现
- 暂不支持 WebSocket / 实时
- 字段 `display` 用我们已有的 `{kind, precision, thousand, unit}`（gi031 也是这套）

**直接照搬**：
- `assemble_config` 装配逻辑（Python）
- `buildHeaderMatrix` / `isLeaf` / `depth` / `leaves`（JS/TS，前端已经基本实现）
- `kind` 枚举 12 种
- `param_mapping` 模板替换语法（row.* / filter.* / cell.*）

---

## 附录 B · 文件清单（新建项）

```
docs/report-platform-redesign.md         （本文件）
server/                                  ← 新：FastAPI 后端
├── pyproject.toml
├── app/
│   ├── main.py
│   ├── settings.py
│   ├── db.py
│   ├── models.py
│   ├── schemas.py
│   ├── api/
│   │   ├── config.py
│   │   ├── summary.py
│   │   ├── distinct.py
│   │   ├── versions.py
│   │   ├── drilldown.py
│   │   ├── dropdowns.py
│   │   └── user_prefs.py
│   ├── services/
│   │   ├── config_assembler.py
│   │   ├── header_tree.py
│   │   ├── filter_encode.py
│   │   ├── row_filter.py
│   │   └── query_builder.py
│   └── seed/
│       └── fake_data.py
├── alembic/
└── tests/

app/                                     ← 增量
├── pages/reports/[report_type].vue                       ★ 新
├── components/report/                                    ★ 新
│   ├── ReportPage.vue
│   ├── FilterBar.vue
│   ├── filters/Filter{12 种}.vue
│   ├── ToolBar.vue
│   ├── ColumnCustomizer.vue
│   ├── DrilldownModal.vue
│   └── VersionPicker.vue
├── composables/use-report.ts                             ★ 新
├── composables/use-dropdown.ts                           ★ 新
├── composables/use-column-pref.ts                        ★ 新
├── composables/use-row-favorite.ts                       ★ 新
├── types/report-protocol.ts                              ★ 新（TS 类型，与 Pydantic 镜像）
├── types/schemas.ts                                      ★ 改（追加 ReportConfigSchema 等）
└── utils/header-tree.ts                                  ★ 新（纯函数）
```
