# 报表平台融合方案 v2 — 配置/数据分离 + 通用模块 + 指标注册表

> 本文是 [report-platform-redesign.md](./report-platform-redesign.md) 的**收紧版**。在原方案基础上回答 4 个新问题：
> 1. 页面**通用模块**怎么拆？哪些是前端固定布局，哪些是配置控制？
> 2. 本地 JSON 怎么把**配置和数据分开**？
> 3. **指标管理（注册表）**怎么做？怎么让"很多东西"都按这个模式管理？
> 4. **数据接口地址来自配置**，前端怎么自动适应？下钻列怎么从后端动态拿？

---

## 0. 三层心智模型

把整个前端拆成三层，从外到内：

```
┌────────────────────────────────────────────────────────────────────────┐
│  Layer A: AppShell (前端固定布局，不接受 config 控制)                  │
│   ├── 顶部左：LOGO + 品牌（来自 branding.json，只是文本/图）           │
│   ├── 顶部中：一级菜单（来自 nav.json）                                │
│   ├── 顶部右：LocaleSwitcher / FontSwitcher / ThemeSwitcher / 版本号   │
│   └── 左侧栏：二/三级菜单（来自 nav.json 的 children）                 │
│                                                                        │
│   职责：导航、品牌、用户偏好（语言/字体/主题）。前端硬编码这一层。    │
│   不由 /config 控制。改这一层 = 改 layouts/default.vue。              │
├────────────────────────────────────────────────────────────────────────┤
│  Layer B: PageShell （内容页固定的 4-5 个模块）                       │
│   ├── PageHeader        标题 + 副标题 + 描述 + 右侧工具栏占位          │
│   ├── ToolBar           分页模式/转置/列定制/导出/刷新 (按 toolbar.*)  │
│   ├── FilterSection     筛选区（按 config.filters[].kind 派发）        │
│   ├── KpiSection        核心指标卡（按 config.kpi.*）                  │
│   ├── TableSection      主表格（支持 tabs；按 config.primary_view.*）  │
│   └── DrilldownLayer    弹窗下钻（按 config.drilldowns.*）             │
│                                                                        │
│   职责：把"页面配置 JSON"翻译成视觉。模块化布局，开关由 config 决定。 │
│   PageShell 自己不知道字段语义，它只渲染槽位。                        │
├────────────────────────────────────────────────────────────────────────┤
│  Layer C: 业务页面（薄壳，只负责声明 reportType）                      │
│   pages/reports/[type].vue:                                            │
│     <PageShell :report-type="reportType" />                            │
│                                                                        │
│   职责：路由参数 → reportType。其它 0 行业务代码。                    │
│   加新页面 = 加 nav.json 一条 + 加 reports/<type>/config.json + data.json
└────────────────────────────────────────────────────────────────────────┘
```

**关键决定**：Layer A 是「应用外壳」，Layer B 是「页面外壳」，Layer C 是「业务粘合层」。当前 6 个 `.vue` 页面都属于 Layer C，重构后基本只剩 4-6 行模板。

---

## 1. 通用模块（Layer B）目录

| 模块 | 路径 | 是否可关 | 配置入口 |
|---|---|---|---|
| `PageHeader` | `components/report/PageHeader.vue` | 否（标题必须有） | `meta.name` / `meta.subtitle` / `meta.description` |
| `ToolBar` | `components/report/ToolBar.vue` | 是 | `toolbar.{ show_paging_mode, show_compare, show_column_customizer, show_export, show_refresh, ... }` |
| `FilterSection` | `components/report/FilterSection.vue` | 是（`filters=[]` 即隐藏） | `filters[]` |
| `KpiSection` | `components/report/KpiSection.vue` | 是（`kpi.enabled=false` 即隐藏） | `kpi.{ groups, footnote, data_endpoint, layout_mode }` |
| `TableSection` | `components/report/TableSection.vue` | 是（`primary_view=null` 即隐藏） | `primary_view.{ tabs, paging, row_favorite, row_dim_options }` |
| `DrilldownLayer` | `components/report/DrilldownLayer.vue` | 是 | `drilldowns{}` |

**视觉一致性**：所有这些都用我们 4 套主题已有的 `bg-surface` / `border-ink-200/70` / `shadow-[var(--shadow-card)]`，不引入新设计 token。

---

## 2. 配置 / 数据 / 行为 三分离

### 2.1 文件布局

```
public/mock/
├── nav.json                    # AppShell 层 — 菜单
├── branding.json               # AppShell 层 — 品牌
├── themes.json                 # 主题
├── reports/                    # PageShell 层 — 各报表
│   ├── industry/
│   │   ├── config.json         # ★ 静态：标题/筛选/列/行为/KPI 定义/下钻配置
│   │   └── data.json           # ★ 动态：rows + totals + version
│   ├── domain/{config,data}.json
│   ├── overview-summary/{config,data}.json
│   ├── general-design/{config,data}.json
│   └── general-codegen/{config,data}.json
├── dropdowns/                  # 下拉数据（按 key 分文件）
│   ├── departments.json
│   ├── projects.json
│   └── regions.json
└── admin/                      # 管理后台数据
    ├── metrics.json            # ★ 指标注册表
    ├── reports.json            # 报表注册表（哪些 report_type 存在）
    └── dropdowns.json          # 下拉源注册表
```

后端切换时（`dataSourceMode=api`）：
- 文件路径 `/mock/reports/industry/config.json` → URL `/api/reports/industry/config`
- 文件路径 `/mock/reports/industry/data.json` → URL `/api/reports/industry/summary`（带筛选/排序/分页 body）

### 2.2 config.json 形状（去掉数据，只留定义）

```jsonc
// public/mock/reports/industry/config.json
{
  "meta": {
    "report_type": "industry",
    "name": "产业落地进展",
    "subtitle": "三大先锋产业的 AI 测试覆盖进展",
    "description": "本月各产业接入 AI 测试运营 / 设计 / 脚本生成的覆盖情况，按 业务日期 + 部门 聚合。",
    "version": 1,
    "user_pref_endpoint": "/api/users/me/columns/industry"
  },

  // 工具栏开关：每个模块决定显隐
  "toolbar": {
    "show_refresh":           true,
    "show_paging_mode":       true,
    "show_compare":           false,
    "show_column_customizer": true,
    "show_export":            false
  },

  // 筛选区（同前）
  "filters": [
    { "code": "business_date", "kind": "date_range", "required": true,
      "default": { "preset": "last_30_days" },
      "param": { "from": "date_from", "to": "date_to" } },
    { "code": "department", "kind": "flat_dropdown",
      "param": { "value": "department_code" },
      "source": {
        "endpoint": "/api/dropdowns/departments",        // ★ 数据来源 endpoint 在 config 里
        "paging": {"enabled": true, "page_size": 50},
        "supports_favorite": true,
        "params_in": ["q", "page", "page_size", "sort"]
      }}
  ],

  // KPI 区配置 —— 卡片定义（不含数值）
  "kpi": {
    "enabled": true,
    "title": "核心指标",
    "data_endpoint": "/api/reports/industry/kpi",    // ★ 取数地址（也可写相对 path 在前端拼）
    "layout_mode_default": "grouped",                // grouped / flat
    "footnote": "点击卡片查看明细。",
    "groups": [
      {
        "key": "user", "label": "用户指标",
        "items": [
          { "key": "ai-user-count", "label": "AI用户数",
            "unit": "", "description": "本月 AI 测试运营活跃用户数",
            "threshold": { "min": 1000, "goodColor": "emerald", "badColor": "amber" },
            "detail_ref": "ai-user-detail"           // 引用 drilldowns
          }
        ]
      },
      {
        "key": "business", "label": "业务指标",
        "items": [
          { "key": "design-coverage", "label": "AI测试设计需求覆盖率",
            "unit": "%", "description": "AI 需求 / 需求总数",
            "threshold": { "min": 60, "goodColor": "emerald", "badColor": "rose" }
          }
        ]
      }
    ]
  },

  // 主视图 —— 表格（可 tabs 也可单表）
  "primary_view": {
    "enabled":  true,
    "title":    "试点进展明细",
    "endpoint": "/api/reports/industry/summary",          // ★ 默认 endpoint
    "method":   "POST",
    "paging":   { "default_mode": "client", "default_page_size": 10 },
    "row_favorite": {
      "enabled": true,
      "toggle_endpoint": "/api/users/me/row_favorites/industry",
      "sort_on_top": true
    },
    "row_dim_options": [
      { "code": "industry", "label": "按产业 (默认)" }
    ],
    "row_dim_default": "industry",
    "tabs": [
      {
        "key":   "industry-detail",
        "label": "产业试点进展明细",
        "data_endpoint": "/api/reports/industry/summary?tab=industry-detail",
        "header_tree_endpoint": null,        // null = 用下面的 inline header_tree；非 null = 从该地址拉
        "header_tree": [ /* 同前 N 级 */ ]
      },
      {
        "key":   "capability-map",
        "label": "产业人员能力地图",
        "data_endpoint": "/api/reports/industry/summary?tab=capability-map",
        "header_tree_endpoint": null,
        "header_tree": [ /* ... */ ]
      }
    ]
  },

  // 下钻定义（被 column.drilldown.ref 和 kpi.item.detail_ref 引用）
  "drilldowns": {
    "design_drill": {
      "title":    "测试设计明细 — {row.industry_code}",
      "endpoint": "/api/reports/industry/detail",
      "method":   "POST",
      "param_mapping": {
        "row.industry_code":       "industry_code",
        "filter.business_date.from":"date_from",
        "filter.business_date.to":  "date_to",
        "cell.column":              "metric"
      },
      "paging": { "default_page_size": 50 },
      "header_tree_endpoint": "/api/reports/industry/detail/columns",   // ★ 列从后端拉
      "header_tree": null                                                 // null + endpoint = 动态
    },
    "ai-user-detail": {
      "title":    "AI 用户明细",
      "endpoint": "/api/reports/industry/users",
      "param_mapping": { "filter.business_date.from": "date_from", "filter.business_date.to": "date_to" },
      "header_tree": [
        { "code": "user_id", "label": "用户 ID", "data_type": "string" },
        { "code": "user_name", "label": "姓名", "data_type": "string" },
        { "code": "last_call_at", "label": "最近调用", "data_type": "datetime" }
      ]
    }
  }
}
```

### 2.3 data.json 形状（纯数据）

由于 mock 阶段不能像真后端那样按 query 返回不同结果，data.json 用「场景库」结构：

```jsonc
// public/mock/reports/industry/data.json
{
  "kpi": {
    "groups": [
      { "key": "user",
        "items": [
          { "key": "ai-user-count", "value": "1,284", "mom": "+12.3%", "trend": "up" }
        ]
      },
      { "key": "business",
        "items": [
          { "key": "design-coverage", "value": "62.4%", "mom": "+4.8pp", "trend": "up" }
        ]
      }
    ]
  },
  "tabs": {
    "industry-detail": {
      "items": [
        { "industry_code": "汽车", "owner": "张三",
          "design_coverage_count": "12", "design_adoption_rate": "65.4%",
          "_row_favorite": true, "_row_key": {"industry_code":"汽车"} }
      ],
      "extras": { "totals": { "design_coverage_count": "27" } },
      "page": 1, "page_size": 10, "total": 3, "has_more": false
    },
    "capability-map": {
      "items": [ ... ],
      "page": 1, "page_size": 10, "total": 3, "has_more": false
    }
  },
  "drilldowns": {
    // 下钻数据按 ref 索引；真后端会按 ref + body 返
    "design_drill": {
      "default": {
        "items": [
          { "case_id": "TC001", "case_title": "登录流程", "is_ai_generated": true }
        ],
        "page": 1, "page_size": 50, "total": 1
      }
    },
    "ai-user-detail": {
      "default": {
        "items": [
          { "user_id": "U001", "user_name": "张三", "last_call_at": "2026-05-17 10:24" }
        ],
        "page": 1, "page_size": 50, "total": 1
      }
    }
  }
}
```

**真后端时**：data.json 不存在，每段都对应一个独立的 endpoint：
- `kpi` ← `POST /api/reports/industry/kpi`（body 同筛选）
- `tabs.<key>` ← `POST /api/reports/industry/summary?tab=<key>`
- `drilldowns.<ref>` ← `POST /api/reports/industry/detail`（body 含 row + filter + cell）

前端 `useReportData` 看 `runtimeConfig.dataSourceMode`：
- `json` → 一次性拉 data.json，按 key 切片
- `api` → 多个独立请求，按调用时机分别发

### 2.4 行为分离

「行为」= 当前页面交互逻辑的可配置部分，全部声明在 config.json：

| 行为 | 配置项 | 默认 |
|---|---|---|
| 整页可刷新 | `toolbar.show_refresh` | true |
| 表格分页模式 | `primary_view.paging.default_mode` | server |
| KPI 卡可下钻 | `kpi.items[].detail_ref` 非 null | 不可点 |
| 表格列可下钻 | `header_tree leaf.drilldown.ref` 非 null | 不可点 |
| 单元格点击 → drill | 默认 = 列有 ref 时启用 | 同上 |
| 行收藏 | `primary_view.row_favorite.enabled` | false |
| 列定制（用户改后存 server） | `toolbar.show_column_customizer` | true |
| 同 / 环比 | `toolbar.show_compare` | false |
| 转置维度 | `primary_view.row_dim_options.length > 1` | 只有一个时不显切换 |

「行为」也包括前端硬编码的逻辑（键盘 a11y / 焦点管理 / 主题切换）—— **不**进 config，由组件自己保证。

---

## 3. 指标注册表（"指标管理"）— 通用 CRUD 后台模式

### 3.1 数据模型（后端 + mock）

```python
# server/app/models.py 新增（或归并到 metric_def）
class MetricRegistry(Base):
    __tablename__ = "metric_registry"
    id:          str = pk(64)                            # 'ai-user-count'
    name:        str = col(255)                          # '智能终端 AI 用户数'
    category:    str = col(64)                           # '用户指标' / '业务指标' / '能力指标'
    source:      str = col(64)                           # 'ai-platform-event' / 'jira' / 'manual'
    status:      str = col(16)                           # active / draft / deprecated
    owner:       str = col(64)                           # '张三'
    description: str = col(500)                          #
    unit:        str = col(32, default='')               # %, 个, 行 ...
    data_type:   str = col(16)                           # int / decimal / percent
    aggregation: str = col(32, default='sum')            # sum / avg / weighted_avg / computed
    formula:     str | None = col(255)                   # 当 aggregation=computed 时
    threshold:   JSON | None                              # {min, max, goodColor, badColor}
    drilldown_ref: str | None = col(64)
    is_default_visible: bool = True
    sort_order:  int = 0
    created_at:  datetime = col(default=_utc_now)
    updated_at:  datetime = col(default=_utc_now, onupdate=_utc_now)
```

### 3.2 mock JSON

```jsonc
// public/mock/admin/metrics.json — 给 指标管理 页用
{
  "items": [
    { "id": "ai-user-count", "name": "AI 用户数", "category": "用户指标",
      "source": "AI 平台埋点", "status": "active", "owner": "张三",
      "description": "本月使用过 AI 测试运营任意功能的活跃用户数",
      "unit": "人", "data_type": "int", "aggregation": "sum",
      "threshold": { "min": 1000, "goodColor": "emerald", "badColor": "amber" },
      "drilldown_ref": "ai-user-detail",
      "is_default_visible": true,
      "updated_at": "2026-05-17 10:00:00"
    }
  ],
  "total": 12,
  "page": 1,
  "page_size": 20
}
```

### 3.3 「通用 CRUD 后台」前端模板

**为什么"很多东西"都能这样管理**：管理类页面的视觉本质都一样——一个**列表表格 + 顶部筛选 + 右上新增 + 行操作（编辑/删除）+ 弹窗表单**。我们抽 1 个 `ManagementTable` 通用组件，配上每个实体的「字段定义」就能复用：

```
ManagementTable 通用件 prop:
  config: {
    title:       string                # 页面标题
    list_endpoint:   string            # 列表数据接口
    create_endpoint: string            # 新增接口
    update_endpoint: string            # 更新接口（PUT/PATCH）
    delete_endpoint: string            # 删除接口
    primary_key:     string            # 主键字段名（默认 'id'）
    columns:         Column[]          # 列表列
    form_fields:     FormField[]       # 新增/编辑表单字段
    filters:         FilterSpec[]      # 顶部筛选
    can_create / can_edit / can_delete: bool
  }
```

```jsonc
// public/mock/admin/metric-registry-pageconfig.json — 指标管理"页面"的配置
{
  "title": "指标管理",
  "list_endpoint":   "/admin/metrics",
  "create_endpoint": "/admin/metrics",
  "update_endpoint": "/admin/metrics/{id}",
  "delete_endpoint": "/admin/metrics/{id}",
  "primary_key": "id",
  "filters": [
    { "code": "q", "kind": "text", "placeholder": "搜索 ID / 名称" },
    { "code": "category", "kind": "enum_chips",
      "options": [
        {"value": "用户指标", "label": "用户指标"},
        {"value": "业务指标", "label": "业务指标"},
        {"value": "能力指标", "label": "能力指标"}
      ]},
    { "code": "status", "kind": "enum_chips",
      "options": [{"value":"active","label":"启用"},{"value":"draft","label":"草稿"},
                  {"value":"deprecated","label":"废弃"}] }
  ],
  "columns": [
    { "code": "id",          "label": "指标 ID",  "width": "180px", "data_type": "string" },
    { "code": "name",        "label": "指标名称", "width": "200px", "data_type": "string" },
    { "code": "category",    "label": "分类",     "width": "100px",  "data_type": "string",
      "display": { "kind": "badge", "color_map": {"用户指标":"sky","业务指标":"brand","能力指标":"violet"} } },
    { "code": "source",      "label": "数据源",   "width": "140px",  "data_type": "string" },
    { "code": "status",      "label": "状态",     "width": "90px",
      "display": { "kind": "badge",
                   "color_map": {"active":"emerald","draft":"amber","deprecated":"rose"} } },
    { "code": "owner",       "label": "负责人",   "width": "90px" },
    { "code": "updated_at",  "label": "更新时间", "width": "150px", "display": { "kind": "datetime" } },
    { "code": "actions",     "label": "操作",     "width": "120px", "cellType": "row_actions",
      "actions": ["edit", "delete"] }
  ],
  "form_fields": [
    { "code": "id",          "label": "指标 ID",  "kind": "text",  "required": true, "readonly_on_edit": true,
      "placeholder": "kebab-case，如 ai-user-count" },
    { "code": "name",        "label": "指标名称", "kind": "text",  "required": true },
    { "code": "category",    "label": "分类",     "kind": "enum_radio",
      "options": [{"value":"用户指标"},{"value":"业务指标"},{"value":"能力指标"}], "required": true },
    { "code": "source",      "label": "数据源",   "kind": "search_dropdown",
      "source": { "endpoint": "/admin/data-sources", "params_in": ["q","page"] } },
    { "code": "status",      "label": "状态",     "kind": "enum_radio",
      "options": [{"value":"active"},{"value":"draft"},{"value":"deprecated"}], "default": "active" },
    { "code": "owner",       "label": "负责人",   "kind": "search_dropdown",
      "source": { "endpoint": "/admin/users", "params_in": ["q","page"] } },
    { "code": "description", "label": "口径描述", "kind": "textarea", "rows": 3 },
    { "code": "unit",        "label": "单位",     "kind": "text",  "placeholder": "%, 个, 行" },
    { "code": "data_type",   "label": "数据类型", "kind": "enum_radio",
      "options": [{"value":"int"},{"value":"decimal"},{"value":"percent"}], "default": "decimal" },
    { "code": "aggregation", "label": "聚合方式", "kind": "enum_radio",
      "options": [{"value":"sum"},{"value":"avg"},{"value":"weighted_avg"},{"value":"computed"}],
      "default": "sum" },
    { "code": "formula",     "label": "公式",     "kind": "text",
      "placeholder": "ai_user_count / total_user_count", "visible_if": {"aggregation": "computed"} },
    { "code": "threshold",   "label": "阈值",     "kind": "threshold",  // 自定义复合控件
      "description": "min/max/达标色/不达标色" }
  ]
}
```

**通用扩展**：除了指标，下面所有都能套同一个 `ManagementTable`：

| 实体 | URL | 备注 |
|---|---|---|
| 指标 | `/ai-test/system/metrics` | 本节示例 |
| 报表 | `/ai-test/system/reports` | 哪些 report_type 存在 |
| 数据源 | `/ai-test/system/data-sources` | 数据来源 |
| 下拉源 | `/ai-test/system/dropdowns` | 下拉接口注册 |
| 用户 | `/settings/account/user` | 用户列表 |
| 角色 | `/settings/account/role` | 角色权限 |
| 视图模板 | `/ai-test/system/view-templates` | 报表预设视图 |
| 告警规则 | `/ops/log/alert` | |

加新管理页 = 一份页面 config + 一行 `<ManagementTable :config="cfg" />`。

---

## 4. 动态接口 + 动态列

### 4.1 数据接口来自配置

```ts
// composables/use-report-config.ts
export async function useReportConfig(reportType: string) {
  const ds = await useDataSource<unknown, ReportConfig>({
    key: `report-config:${reportType}`,
    jsonPath: `/reports/${reportType}/config.json`,
    apiPath:  `/api/reports/${reportType}/config`,
    transform: raw => ReportConfigSchema.parse(raw),
  });
  return ds;
}

// composables/use-report-data.ts
export async function useReportData(reportType: string, config: Ref<ReportConfig | null>) {
  // mock 模式：从 data.json 整页拉一次，按段切片
  // api 模式：每个段是独立 endpoint
  const mode = useRuntimeConfig().public.dataSourceMode;

  const kpiData = computed(() => /* mock: data.json.kpi; api: 单独请求 */);
  const tabData = (key: string) => computed(() => /* ... */);
  const drilldownData = (ref: string, body: object) => /* ... */;

  return { kpiData, tabData, drilldownData };
}
```

关键：
1. **endpoint 全部来自 config**，前端不硬编码 URL；
2. mock 模式一次拉 data.json，所有段都从内存切；
3. api 模式分别请求，按需 lazy。

### 4.2 下钻列从后端动态拉

当 `drilldowns[ref]` 中 `header_tree` 是 null 而 `header_tree_endpoint` 不为 null，前端打开下钻弹窗时**先**拉这个 endpoint 拿列定义，再拉数据：

```ts
async function openDrilldown(ref: string, row: Row, cell: Cell) {
  const dd = config.value!.drilldowns[ref];
  let headerTree = dd.header_tree;
  if (!headerTree && dd.header_tree_endpoint) {
    headerTree = await $fetch(dd.header_tree_endpoint, { params: { row: row._row_key } });
  }
  const dataBody = applyParamMapping(dd.param_mapping, { row, cell, filter: filterState.value });
  const data = await $fetch(dd.endpoint, { method: dd.method ?? 'POST', body: dataBody });
  showDrilldownModal({ title: applyTemplate(dd.title, { row, cell, filter }), headerTree, data });
}
```

**后端实装**（FastAPI）：
```
POST /api/reports/{type}/detail/columns
  body: { row_key: {...} }
  → { header_tree: [...], cache_key: "..." }   # 列定义按行/上下文变化时由后端决定
```

如此**下钻列可以按行情景动态变**——例如点不同产业，明细列不同。

### 4.3 自动适应未知字段

后端返回的 `items[i]` 中如果存在 `header_tree` 没声明的字段，前端**静默忽略**（不报错也不显示）。这让后端可以为调试 / 内部审计塞额外字段（`_audit`、`_lineage` 等）而不影响 UI。

反之，列声明里的字段在 `items[i]` 中缺失，UI 显示 `—`（已有逻辑）。

---

## 5. 落地计划（更新）

| 阶段 | 周期 | 内容 |
|---|---|---|
| **本期 M1**（实施） | 1 天 | 拆 industry 一页：`/mock/reports/industry/{config,data}.json` 双文件；写 `useReportConfig` / `useReportData`；不动其它页面 |
| **本期 M2**（实施） | 1 天 | 写 `ManagementTable` 通用件；`/ai-test/system/metrics` 页用它；mock `/admin/metrics.json` |
| **后续 M3** | 2 天 | 拆其它 5 页 + 写 `PageShell` 通用件，替换它们的 `.vue` |
| **后续 M4** | 3 天 | FastAPI 后端实装：`/config` 装配 + `/summary` 查询 + `/admin/metrics` CRUD |
| **后续 M5** | 1 天 | 动态下钻列：drilldown.header_tree_endpoint 联调 |

本期目标 = M1+M2（4 个文件 + 2 个组件 + 1 个 mock），证明方案可行；其它页不动，回归无影响。

---

## 6. 跟 v1 设计的差异

| 点 | v1（report-platform-redesign.md） | v2（本文） |
|---|---|---|
| 标题/筛选/KPI/表格/下钻 | 单文件 ReportPage | **拆成 5 个独立模块**（PageHeader/ToolBar/FilterSection/KpiSection/TableSection/DrilldownLayer） |
| 配置与数据 | 同一 JSON | **强制分离**：config.json + data.json |
| 下钻列 | 静态在 config | **可静态可动态**（header_tree 或 header_tree_endpoint） |
| KPI 卡的取数 | 跟主表一起 | **独立 endpoint**（`kpi.data_endpoint`），允许预聚合 |
| 后台管理 | 没提 | **专门一节**：ManagementTable 通用件 + 指标注册表落地示例 |
| AppShell 层 | 含糊 | **明确**：顶部/侧栏/右侧切换器属于 Layer A，不进 config |

v2 用更结构化的分层、更清晰的契约，回答了 "什么是必须前端定的 / 什么是配置控制的"。
