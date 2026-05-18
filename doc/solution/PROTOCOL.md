# gi032 前端架构协议 — 非业务层与业务层的动态定义

> **定位**：本文档是前端架构的唯一权威契约。所有组件开发、配置扩展、后续定制化都以此为准。
> 
> **结构**：先定义"什么是非业务层、什么是业务层"，再逐层列出所有约定——现有实现、常见模式、特殊情况、扩展点。

---

## 目录

- [第一部分：分层模型](#第一部分分层模型)
- [第二部分：非业务层约定（Layer A + B）](#第二部分非业务层约定layer-a--b)
- [第三部分：业务层约定（Layer C）](#第三部分业务层约定layer-c)
- [第四部分：数据协议](#第四部分数据协议)
- [第五部分：扩展协议](#第五部分扩展协议)
- [第六部分：常见与特殊模式速查](#第六部分常见与特殊模式速查)

---

## 第一部分：分层模型

### 1.1 三层架构

```
┌─────────────────────────────────────────────────────────────┐
│  Layer A：应用外壳（Application Shell）                      │
│  ── 固定布局，不受 config.json 控制 ──                       │
│                                                             │
│  职责：导航、品牌、用户偏好（语言/字体/主题）                 │
│  改动方式：改 layouts/default.vue + layout/ 组件              │
│  改动频率：极低（建站时定好，之后几乎不动）                   │
│                                                             │
│  组件清单：                                                  │
│   AppTopBar / AppSidebar / AppSidebarItem                    │
│   LocaleSwitcher / FontSwitcher / ThemeSwitcher              │
│   NavIcon                                                    │
├─────────────────────────────────────────────────────────────┤
│  Layer B：页面外壳（Page Shell）                             │
│  ── 通用模块，开关由 config.json 控制 ──                     │
│                                                             │
│  职责：把 config JSON 翻译成视觉。不知道字段语义，只渲染槽位  │
│  改动方式：改 components/report/ 组件 + types/report-config   │
│  改动频率：中（新增 filter kind / chart type 时改）           │
│                                                             │
│  组件清单：                                                  │
│   ReportPage / FilterSection / KpiSection / TableSection     │
│   ToolBar / DrilldownLayer                                   │
│   MetricCard / MetricsBox / MetricDetailPanel                │
│   MultiLevelTable / TabStrip                                 │
│   Chart* (8 种) / ManagementTable                            │
├─────────────────────────────────────────────────────────────┤
│  Layer C：业务页面（Business Pages）                          │
│  ── 薄壳，只声明 reportType 或 embed URL ──                  │
│                                                             │
│  职责：路由参数 → 组件 props。零行业务逻辑。                 │
│  改动方式：加 pages/ 下 .vue 文件 + nav.json 一条            │
│  改动频率：高（每新增一个报表就加一个）                       │
│                                                             │
│  典型代码量：1-11 行                                         │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心约束

| 约束 | 说明 |
|---|---|
| **Layer A 不读 config.json** | 导航/品牌/偏好的数据来自 nav.json / branding.json / themes.json / fonts.json，这些是应用级配置，不是报表级配置 |
| **Layer B 不知道业务语义** | KpiSection 不知道"覆盖率"是什么，它只知道 `item.key="design-coverage"` + `item.value="62.4%"` |
| **Layer C 不包含渲染逻辑** | 页面 .vue 里不写 `<div>` / `<table>` / `v-for`，只写 `<ReportPage report-type="X" />` |
| **数据双模透明** | 所有层的数据获取都走 `useDataSource`，json/api 切换对组件不可见 |

---

## 第二部分：非业务层约定（Layer A + B）

### 2.1 导航系统

#### NavItem 完整字段表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `key` | string | 是 | — | 全局唯一标识，kebab-case |
| `label` | string | 是 | — | 中文标签（i18n 兜底） |
| `label_i18n` | `{ "zh-CN": string, "en-US": string }` | 否 | — | 多语言覆盖（优先于 label） |
| `path` | string | 否 | — | 路由路径（叶子节点必填） |
| `icon` | string | 否 | — | 图标名（先找 /nav-icons/custom/，再找 /default/，兜底为圆点） |
| `badge` | string | 否 | — | 角标文字（"new" / "beta" / 数字） |
| `disabled` | boolean | 否 | false | 禁用（灰显不可点） |
| `single` | boolean | 否 | false | true = 顶级独立页（不展示侧边栏） |
| `embed` | string | 否 | — | 嵌入 URL（有此字段 → 渲染 EmbedFrame） |
| `embedSandbox` | string[] | 否 | `['allow-scripts','allow-forms','allow-popups']` | iframe sandbox tokens |
| `children` | NavItem[] | 否 | — | 子节点（递归） |

#### 导航渲染规则

```
顶部一级菜单：nav.json → items[*]（只取第一层）
  点击 → firstLeafPath(item)（递归找第一个有 path 的叶子）

左侧栏：
  显示条件：!activeTop.single
  数据来源：activeTop.children
  层级：
    depth=0 → 分组标题（有 children → 可折叠 / 无 children+有 path → 链接）
    depth=1 → 链接项（有 children → 子折叠）
    depth≥2 → 嵌套链接
  缩进：depth=0 → 12px, depth=1 → 28px, depth≥2 → +14px/层
  激活态：左边蓝色竖条 + 背景高亮
  自动展开：路由命中时，祖先节点自动展开
```

#### 路由匹配逻辑

```typescript
// 精确匹配或前缀匹配
function isPathUnderItem(routePath: string, item: NavItem): boolean {
  if (item.path && routePath.startsWith(item.path)) return true;
  return item.children?.some(c => isPathUnderItem(routePath, c)) ?? false;
}
```

#### 特殊页面处理

| 场景 | 条件 | 渲染 |
|---|---|---|
| 嵌入全屏 | `single=true && embed` | `<EmbedFrame variant="full">` 填满 main |
| 嵌入卡片 | `embed && !single` | `<EmbedFrame variant="panel">` 带标题栏 |
| 报表页 | pages/ 下有对应 .vue | `<ReportPage report-type="X">` |
| 未实现 | nav 有路径但 pages/ 无 .vue | `<NotImplemented>` 占位 |

### 2.2 品牌系统

#### branding.json

| 字段 | 类型 | 说明 |
|---|---|---|
| `title` | string | 品牌标题（顶部左侧） |
| `subtitle` | string | 副标题（标题下方小字） |
| `shortName` | string | 1 个字符（logo 兜底） |
| `logo` | string | Logo 图片 URL（空串 = 用 shortName 圆形头像） |
| `version` | string | 版本号（顶部右侧灰色小标签） |

### 2.3 主题系统

#### themes.json

| 字段 | 类型 | 说明 |
|---|---|---|
| `default` | string | 默认主题 key |
| `items[].key` | string | 主题标识 |
| `items[].label` | string | 显示名 |
| `items[].subtitle` | string | 风格描述 |
| `items[].swatch` | string[3] | 三色色板（深/品牌/浅），hex 格式 |
| `items[].htmlClass` | string | 注入到 `<html class="">` 的 CSS 类名 |

#### 主题运行机制

```
1. FOUC 防护：nuxt.config.ts 内联 IIFE → 读 localStorage('ops-dashboard:theme') → 设 html.className
2. 运行时：useTheme() → watch activeKey → classList.remove(old) + classList.add(new)
3. 持久化：存 htmlClass 到 localStorage（而非 key，因为 IIFE 不加载 themes.json）
4. 校验：setTheme 时验证 htmlClass 在当前 items 中存在，不存在 → 回落 default
5. CSS 变量：每个 htmlClass 对应 assets/css/main.css 中的 :root 变量组
```

#### 现有主题

| key | htmlClass | 色调 |
|---|---|---|
| minimal | `theme-minimal` | 白底灰边蓝强调 |
| business | `theme-business` | 深蓝底白字 |
| ant-cn | `theme-ant-cn` | Ant Design 风格蓝 |
| dark-ops | `theme-dark-ops` | 深色运维风 |

### 2.4 字体系统

#### fonts.json

| 字段 | 类型 | 说明 |
|---|---|---|
| `default` | string | 默认字体 key |
| `items[].key` | string | 字体标识 |
| `items[].label` | string | 显示名 |
| `items[].subtitle` | string | 风格来源描述 |
| `items[].htmlClass` | string | 注入到 `<html>` 的 CSS 类名 |
| `items[].preview` | string | 预览文字（如 "Aa 运"） |
| `items[].body` | string | CSS font-family（正文） |
| `items[].display` | string | CSS font-family（标题） |
| `items[].mono` | string | CSS font-family（等宽） |
| `items[].stylesheets` | string[] | 外部 CSS URLs（Google Fonts / CDN） |

#### 字体加载机制

```
1. FOUC 防护：同主题，读 localStorage('ops-dashboard:font')
2. 外部字体：useHead() 动态注入 <link rel="preconnect"> + <link rel="stylesheet">
3. 离线兜底：vendor-fonts.mjs 预下载字体文件到 public/fonts/
4. 系统字体：key=system 不需要外部加载，CSS 用 system-ui 栈
```

#### 现有字体

| key | 正文 | 标题 | 需联网 |
|---|---|---|---|
| system | system-ui | system-ui | 否 |
| noto | Noto Sans SC | Noto Sans SC | 是（Google Fonts） |
| lxgw | LXGW WenKai | LXGW WenKai | 是（jsdelivr） |
| playfair | InterDisplay + Noto Sans SC | Playfair Display | 是（Google Fonts） |

### 2.5 国际化

#### 约定

| 项 | 规则 |
|---|---|
| 默认语言 | zh-CN |
| 策略 | no_prefix（URL 不带语言前缀） |
| 持久化 | cookie `ops-dashboard:locale` |
| 范围 | 所有 Layer A/B 组件的 UI 文案 |
| 不翻译的 | 数据值（KPI 数字、表格内容、指标名称 —— 这些由 JSON 决定） |
| 扩展 | nav.json 的 `label_i18n` 字段覆盖导航菜单翻译 |

#### i18n key 命名空间

| 命名空间 | 示例 key | 用途 |
|---|---|---|
| `common` | `common.loading`, `common.noData` | 全局通用文案 |
| `topbar` | `topbar.search` | 顶部栏 |
| `themeSwitcher` | `themeSwitcher.title` | 主题切换器面板 |
| `fontSwitcher` | `fontSwitcher.title` | 字体切换器面板 |
| `filters` | `filters.search`, `filters.reset` | 筛选区按钮 |
| `toolbar` | `toolbar.refresh`, `toolbar.export` | 工具条 |
| `table` | `table.actions`, `table.noData` | 表格 |
| `metric` | `metric.noData`, `metric.threshold` | 指标卡 |
| `management` | `management.create`, `management.edit` | 管理表格 |
| `report` | `report.kpi`, `report.detail` | 报表通用 |
| `error` | `error.title`, `error.retry` | 错误面板 |
| `tabs` | `tabs.noTabs` | Tab 条 |

### 2.6 数据获取层

#### useDataSource 完整签名

```typescript
useDataSource<TRaw, T>(opts: {
  key: string;            // 唯一缓存 key（不同 key → 独立缓存）
  jsonPath: string;       // JSON 模式下的路径（相对 /mock）
  apiPath: string;        // API 模式下的路径（相对 /api）
  params?: Record<string, unknown>;  // query params（JSON 模式忽略，API 模式透传）
  transform?: (raw: TRaw) => T;     // 原始 → 内部模型的适配器
  mode?: 'json' | 'api';            // 覆盖全局 mode
  immediate?: boolean;               // 是否立即执行（默认 true）
}) → {
  data: ComputedRef<T | null>;       // transform 后的数据
  raw: Ref<TRaw | null>;            // 原始数据
  error: Ref<unknown>;
  pending: Ref<boolean>;
  refresh: () => Promise<void>;
  mode: DataSourceMode;              // 实际使用的 mode
  url: string;                       // 实际请求的 URL
}
```

#### 数据获取流程

```
JSON 模式：
  1. 检查 /user-data/{jsonPath} 缓存 → 已知缺失则跳过
  2. 请求 /user-data/{jsonPath}
     ├─ 成功 + 响应是 object/array → 使用用户覆盖数据
     └─ 失败 / 响应是 HTML 字符串 → 标记缺失，回落
  3. 请求 /mock/{jsonPath} → 使用标准 mock
  4. transform() 转换

API 模式：
  1. 请求 /api/{apiPath}?{params}
  2. unwrapEnvelope() 解包 { code, data } → 取 data
  3. transform() 转换
```

#### Envelope 协议

```typescript
// 后端统一响应格式
{
  code: number;       // 0 = 成功；40001 = 参数校验失败；500xx = 服务器错误
  message: string;    // 中文描述
  trace_id: string;   // 32 位 UUID（日志关联）
  data: T;            // 业务数据（前端只取这个）
}

// 前端自动解包
unwrapEnvelope<T>(resp) → resp.data  // 如果是 envelope 格式
                        → resp       // 否则原样返回
```

### 2.7 报表模块组件约定

#### ReportPage — 总编排器

```
Props:
  reportType: string        ← 唯一入参

内部流程：
  1. useReport(reportType) → 拉 config + data
  2. 按 config 控制 5 个子组件的显隐和配置：
     FilterSection  ← config.filters[]
     ToolBar        ← config.toolbar
     KpiSection     ← config.kpi + data.kpi
     TableSection   ← config.primary_view + data.tabs
     DrilldownLayer ← config.drilldowns + data.drilldowns
  3. 维护交互状态：filterState / pagingMode / compare
```

#### FilterSection — 筛选区

| Filter Kind | 渲染形式 | 数据来源 |
|---|---|---|
| `date_range` | 两个 date input | 内联 default |
| `date_single` | 一个 date input | 内联 default |
| `flat_dropdown` | select 下拉 | `source.endpoint` 动态加载 |
| `hierarchy_dropdown` | select + optgroup | `source.endpoint` 动态加载（树形扁平化） |
| `search_dropdown` | select（带搜索） | `source.endpoint` + debounce |
| `multi_select` | checkbox group | `source.endpoint` |
| `multi_search` | checkbox + 搜索 | `source.endpoint` |
| `text` | text input | — |
| `number_range` | 两个 number input | — |
| `boolean` | toggle / checkbox | — |
| `enum_radio` | radio group | `options[]` 内联 |
| `enum_chips` | 标签选择器 | `options[]` 内联 |

#### FilterSpec 完整字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `code` | string | 是 | 筛选器唯一标识 |
| `label` | string | 是 | 显示标签 |
| `kind` | FilterKind | 是 | 12 种之一 |
| `required` | boolean | 否 | 是否必填（默认 false） |
| `default` | unknown | 否 | 默认值（结构取决于 kind） |
| `param` | Record<string, string> | 是 | 值到 query param 的映射 |
| `depends_on` | string[] | 否 | 依赖的其他 filter code（级联） |
| `source` | FilterSourceSpec | 否 | 动态数据来源 |
| `options` | `{value, label}[]` | 否 | 静态选项（enum_radio / enum_chips） |
| `placeholder` | string | 否 | 占位文字 |
| `min` / `max` / `step` | number | 否 | number_range 约束 |
| `unit` | string | 否 | 单位后缀 |
| `multi` | boolean | 否 | 是否多选 |

#### FilterSourceSpec（下拉数据来源）

| 字段 | 类型 | 说明 |
|---|---|---|
| `endpoint` | string | 数据获取 URL |
| `method` | 'GET' \| 'POST' | 默认 GET |
| `paging` | `{enabled, page_size}` | 分页加载 |
| `sortable_by` | string[] | 可排序字段 |
| `default_sort` | `{field, dir}[]` | 默认排序 |
| `supports_favorite` | boolean | 是否支持收藏置顶 |
| `supports_filter` | boolean | 是否支持搜索过滤 |
| `params_in` | string[] | 透传到请求的参数名 |
| `max_levels` | number | 树形最大层级 |
| `select_at_any_depth` | boolean | 任意层级可选 |
| `max_picks` | number | 多选最大数量 |
| `min_chars` | number | 搜索最小字符数 |
| `debounce_ms` | number | 搜索防抖（毫秒） |

#### KpiSection — 指标卡

```
显示条件：config.kpi.enabled === true
数据合并：config.kpi.groups[*].items[*] (定义) + data.kpi.groups[*].items[*] (数值)
布局模式：grouped（分组标题 + 卡片网格）/ flat（全部平铺）
展开详情：点击卡片 → MetricDetailPanel 滑出（含图表）
  ├─ item.detail 存在 → 展开内联图表面板
  └─ item.detail_ref 存在 → 触发 drilldown 弹窗
```

#### KPI 阈值着色规则

```
给定 threshold = { min, max, goodColor, badColor }：
  值 >= min && 值 <= max (或无 max) → goodColor（默认 emerald）
  值 < min || 值 > max             → badColor（默认 rose）
  无 threshold                      → 中性色（brand-700 / ink-900）

颜色映射：
  emerald → text-emerald-600   // 达标
  rose    → text-rose-600      // 不达标
  amber   → text-amber-600     // 警告
  brand   → text-brand-700     // 品牌色
  sky/violet/slate → 对应色系
```

#### TableSection — 数据表

```
单 tab：不显示 TabStrip，直接渲染表格
多 tab：TabStrip 切换 → 不同 header_tree + 不同 data.tabs[key]

表格特性：
  N 级表头：header_tree 递归嵌套，自动计算 rowspan/colspan
  排序：sortable=true 的叶子列可三态排序（asc/desc/none）
  列过滤：filterable=true 的列显示过滤下拉（checkbox 多选）
  阈值染色：threshold 字段 → 单元格显示为彩色 pill
  行动作：cellType="row_actions" / "action" → 按钮 / 标签
  分页：客户端分页（当前），page_size 来自 config
  斑马纹：偶数行 bg-ink-50/30
```

#### TableColumn（N 级表头）完整字段表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `key` | string | 是 | 列标识（对应 data 中的字段名） |
| `label` | string | 是 | 列标题 |
| `width` | string | 否 | CSS 宽度（如 "200px", "15%"） |
| `align` | 'left' \| 'center' \| 'right' | 否 | 对齐方式 |
| `sortable` | boolean | 否 | 是否可排序 |
| `filterable` | boolean | 否 | 是否可列过滤 |
| `highlight` | boolean | 否 | 是否加粗/强调 |
| `threshold` | Threshold | 否 | 阈值着色规则 |
| `cellType` | 'value' \| 'action' \| 'row_actions' | 否 | 单元格渲染类型 |
| `drilldown_ref` | string | 否 | 点击触发钻取的目标 ref |
| `children` | TableColumn[] | 否 | 子列（形成多级表头） |

#### 图表系统

所有图表均为**纯 SVG Vue SFC**，无第三方图表库依赖。

| 类型 | 组件 | 数据形状 |
|---|---|---|
| 趋势线 | ChartTrend | `points: {x, y}[]` + threshold line |
| 柱状图 | ChartBar | `items: {label, value}[]` |
| 分布图 | ChartDistribution | `items: {label, value}[]`（横向） |
| 环形图 | ChartDonut | `items: {key, label, value, color}[]` |
| 仪表盘 | ChartGauge | `{value, target?, min, max}` |
| 堆叠图 | ChartStacked | `series: string[]` + `rows: {label, values[]}[]` |
| 热力图 | ChartHeatmap | `xLabels, yLabels, values[][]` |
| 雷达图 | ChartRadar | `axes: string[]` + `series: {label, values[]}[]` |

**图表色板**：8 色固定序列（brand / sky / violet / amber / emerald / rose / slate / cyan），由 `chart-colors.ts` 管理。

#### ManagementTable — CRUD 后台

```
Props: config (ManagementPageConfig)

config 字段：
  title / list_endpoint / create_endpoint / update_endpoint / delete_endpoint
  primary_key / filters[] / columns[] / form_fields[]
  can_create / can_edit / can_delete

列显示类型 (display.kind)：
  badge       → 彩色标签，color_map 映射值到颜色
  datetime    → 日期格式化
  row_actions → 编辑/删除按钮

表单字段类型 (form_field.kind)：
  text / textarea / enum_radio / enum_chips
  search_dropdown（带异步搜索）/ threshold（复合控件）
  visible_if → 条件显示（如 formula 只在 aggregation=computed 时显示）
```

### 2.8 通用组件约定

#### EmbedFrame

```
Props:
  src: string           — 嵌入 URL
  title?: string        — 标题
  variant: 'panel'|'full' — 卡片/全屏
  sandbox: string[]|false — iframe 安全策略

panel 模式：带标题栏 + URL 显示 + "新窗口打开"按钮 + 安全提示条
full 模式：iframe 填满父容器 + 浮动"新窗口打开"按钮
```

#### ErrorPanel

```
Props:
  error: unknown        — 错误对象
  title?: string        — 标题

渲染规则：
  ZodError → 逐条列出 issues（path + message）
  Error    → 显示 message + 可展开 stack
  其它     → JSON.stringify
```

#### TabStrip

```
Props:
  modelValue: string
  tabs: { key: string; label: string }[]
  ariaLabel?: string

可访问性：
  role="tablist" + role="tab" + aria-selected
  键盘：ArrowLeft/Right 切换焦点，Home/End 跳转首尾，Enter/Space 选中
```

---

## 第三部分：业务层约定（Layer C）

### 3.1 新增报表页面标准流程

```
第 1 步：创建 mock 数据
  public/mock/reports/{type}/config.json   ← 参照下方模板
  public/mock/reports/{type}/data.json     ← 参照下方模板

第 2 步：注册导航
  public/mock/nav.json → 在对应 section 的 children 下加一条

第 3 步：创建页面文件
  pages/ai-test/{section}/{type}.vue → 11 行薄壳
```

#### 页面薄壳模板

```vue
<template>
  <ReportPage report-type="my-report" />
</template>
```

如果需要设置页面 title：

```vue
<script setup lang="ts">
import { flattenNav } from '~/utils/nav-flat';
const { items } = await useNav();
const flat = computed(() => flattenNav(items.value ?? []));
const current = computed(() =>
  flat.value.find(n => n.path === useRoute().path),
);
useHead({ title: current.value?.label });
</script>

<template>
  <ReportPage report-type="my-report" />
</template>
```

#### config.json 最小模板

```jsonc
{
  "meta": {
    "report_type": "my-report",     // 与文件夹名一致
    "name": "报表标题",
    "subtitle": "副标题（可选）",
    "version": 1
  },
  "toolbar": {
    "show_refresh": true
  },
  "filters": [],                    // 无筛选器时留空数组
  "kpi": {
    "enabled": false                // 不需要 KPI 时设 false
  },
  "primary_view": {
    "enabled": true,
    "tabs": [
      {
        "key": "main",
        "label": "主表",
        "header_tree": [
          { "key": "name", "label": "名称", "width": "200px" },
          { "key": "value", "label": "值", "width": "100px" }
        ]
      }
    ],
    "paging": { "default_mode": "client", "default_page_size": 10 }
  }
}
```

#### data.json 最小模板

```jsonc
{
  "tabs": {
    "main": {
      "items": [
        { "name": "示例行 A", "value": "100" },
        { "name": "示例行 B", "value": "200" }
      ],
      "page": 1,
      "page_size": 10,
      "total": 2,
      "has_more": false,
      "extras": { "totals": {} }
    }
  }
}
```

### 3.2 现有报表类型清单

| report_type | 路径 | KPI | Tabs | Filters | 特殊功能 |
|---|---|---|---|---|---|
| `summary` | /ai-test/overview/summary | 3 组 13 项（含内联图表） | 2 (industry/domain) | 无 | KPI 展开图表面板、filter variants |
| `industry` | /ai-test/overview/industry | 3 组 4 项 | 2 (detail/capability) | date+dept(hierarchy) | row_favorite、drilldown、column customizer |
| `domain` | /ai-test/overview/domain | 3 组 4 项 | 1 (domain-detail) | date+dept(hierarchy) | row_dim_options |
| `design` | /ai-test/general/design | 3 组 4 项 | 1 | date+dept(flat) | 排名表 |
| `codegen` | /ai-test/general/codegen | 3 组 4 项 | 1 | date+dept(flat) | 同 design 结构 |
| `exec` | /ai-test/general/exec | 3 组 4 项 | 1 | date+dept(flat) | 执行通过率 |
| `result` | /ai-test/general/result | 3 组 4 项 | 1 | date+dept(flat) | 分析采纳率 |
| `e2e-api` | /ai-test/e2e/api | 3 组 4 项 | 1 | date+dept(flat) | API 覆盖率 |

### 3.3 KPI 组通用结构

所有报表统一使用 3 个 KPI 分组：

| group.key | group.label | 典型指标 |
|---|---|---|
| `user` | 用户指标 | AI 用户数、活跃率 |
| `business` | 业务指标 | 覆盖率、采纳率 |
| `capability` | 能力指标 | 生成质量、执行成功率 |

### 3.4 阈值标准

| 指标类型 | 典型 min | goodColor | badColor |
|---|---|---|---|
| 用户数 | 1000 | emerald | amber |
| 覆盖率 | 50-65% | emerald | rose |
| 采纳率 | 60-80% | emerald | rose |
| 成功率 | 75-80% | emerald | rose |
| 质量分 | 4.0 (满分 5) | emerald | amber |

---

## 第四部分：数据协议

### 4.1 config.json 完整 Schema

```typescript
interface ReportConfig {
  meta: {
    report_type: string;          // 唯一标识，kebab-case
    name: string;                 // 报表标题
    subtitle?: string;            // 副标题
    show_subtitle?: boolean;      // 是否显示副标题（默认 false）
    description?: string;         // 描述文字
    version: number;              // 配置版本号
    user_pref_endpoint?: string;  // 用户列偏好保存端点
  };
  toolbar?: ToolbarSpec;
  filters: FilterSpec[];          // 空数组 = 无筛选区
  kpi?: KpiSpec;                  // undefined 或 enabled=false = 无 KPI 区
  primary_view?: PrimaryView;     // undefined 或 enabled=false = 无表格区
  drilldowns?: Record<string, DrilldownDef>;
}
```

### 4.2 data.json 完整 Schema

```typescript
interface ReportData {
  kpi?: {
    groups: {
      key: string;
      items: {
        key: string;             // 对应 config 中 KPI item 的 key
        value: string;           // 格式化的显示值（如 "1,284", "62.4%"）
        mom?: string;            // 环比（如 "+12.3%", "-1.2%", "+4.8pp"）
        trend?: 'up' | 'down' | 'flat';
      }[];
    }[];
  };
  tabs: Record<string, {
    items: Record<string, unknown>[];    // 表格行数据
    page?: number;
    page_size?: number;
    total?: number;
    has_more?: boolean;
    extras?: {
      totals?: Record<string, unknown>;  // 合计行
    };
  }>;
  drilldowns?: Record<string, {
    default: {                           // 默认钻取数据（mock 用）
      items: Record<string, unknown>[];
      page?: number;
      page_size?: number;
      total?: number;
    };
  }>;
}
```

### 4.3 Dropdown 数据格式

```typescript
// 扁平下拉
{ items: { value: string; label: string }[] }

// 树形下拉
{ items: {
    value: string;
    label: string;
    children?: { value: string; label: string }[];
  }[]
}
```

### 4.4 同步点清单

修改以下任一文件时，其余必须同步：

| 位置 | 说明 |
|---|---|
| `shared/contracts/report-protocol-v2.md` | 协议文档（人读） |
| `apps/web/app/types/report-config.ts` | 前端 TypeScript 类型 |
| `apps/web/app/types/schemas.ts` | 前端 Zod 运行时校验 |
| `services/report-query/app/schemas.py` | 后端 Pydantic 模型 |
| `services/report-generation/app/schemas.py` | 生成服务 Pydantic 模型 |
| `apps/web/public/mock/reports/*/config.json` | Mock 数据 |

---

## 第五部分：扩展协议

### 5.1 新增 Filter Kind

```
1. types/report-config.ts → FilterKind 联合类型加新值
2. components/report/FilterSection.vue → 模板中加 v-else-if 分支
3. 编写对应的子组件（如 FilterRating.vue）
4. 后端 schemas.py 加对应枚举值
5. 写一个 mock config.json 使用新 kind
6. 写测试
```

### 5.2 新增图表类型

```
1. components/dashboard/charts/ 下新建 ChartXxx.vue
2. chart-colors.ts 如需新色不够可扩展
3. types/overview-summary.ts → MetricChart.kind 加新值
4. MetricDetailPanel.vue → resolveChart() 加分支
5. 未来 Widget 模式：在 widget-registry 中注册
```

### 5.3 新增 CellType

```
1. MultiLevelTable.vue → 行渲染区加 v-else-if(col.cellType === 'new_type')
2. types/overview-summary.ts → TableColumn.cellType 加新值
3. 可选：抽独立子组件（如 CellProgress.vue）
```

### 5.4 新增主题

```
1. assets/css/main.css → 加 .theme-new-name { --color-xxx: oklch(...); ... }
2. public/mock/themes.json → items[] 加一条
3. 无需改任何组件代码
```

### 5.5 新增字体

```
1. public/mock/fonts.json → items[] 加一条
2. 如果是在线字体：填 stylesheets 数组
3. 如果要离线：scripts/vendor-fonts.mjs 加下载配置
4. assets/css/main.css → .font-new-name { --font-body: '...'; --font-display: '...'; }
5. 无需改组件代码
```

### 5.6 新增语言

```
1. i18n/locales/ 下新建 xx-YY.json（复制 zh-CN.json 翻译）
2. nuxt.config.ts → i18n.locales 加一条
3. LocaleSwitcher 自动从 i18n 配置读取可用语言
```

### 5.7 自定义页面（非报表）

```
不是所有页面都走 ReportPage。自定义页面的约定：

1. pages/ 下正常写 .vue 文件
2. nav.json 里注册路径
3. 可以 import 任何 Layer B 组件单独使用
4. 可以不走 useReport()，直接 useDataSource() 拿数据

已有的非报表页面：
  - index.vue（首页 — 自定义布局）
  - ai-test/system/excel.vue（CSV 导入 — 自定义交互）
  - ai-test/system/metrics.vue（指标管理 — ManagementTable）
  - [...slug].vue（路由兜底 — EmbedFrame / NotImplemented）
```

---

## 第六部分：常见与特殊模式速查

### 6.1 数据展示中的特殊值

| 值 | 显示 | 说明 |
|---|---|---|
| `null` / `undefined` | "—"（em-dash） | 缺失值 |
| `"—"` | "—" | 数据源已标记为不适用 |
| `"0"` / `0` | "0" | 真实的零，不是缺失 |
| `"+12.3%"` | 绿色 ↑ | 正向趋势 |
| `"-1.2%"` | 红色 ↓ | 负向趋势 |
| `"+4.8pp"` | — | 百分点变化（与百分比不同） |

### 6.2 Tooltip 定位策略

```
MetricCard / MultiLevelTable 的弹出层（Teleport to body, position: fixed）：

水平定位：优先左对齐，距右边界 < 宽度时右对齐
垂直定位：优先下方，距底部 < 高度时上方
重计算触发：scroll / resize / IntersectionObserver
关闭：onClickOutside / Escape / 再次 click 同触发器
```

### 6.3 FOUC（无样式闪烁）防护

```
nuxt.config.ts → app.head.script → 内联 IIFE：
  1. 读 localStorage('ops-dashboard:theme') → html.classList.add(savedClass)
  2. 读 localStorage('ops-dashboard:font')  → html.classList.add(savedClass)
  3. 在任何 Vue 渲染之前执行，避免"先白色再暗色"的闪烁
```

### 6.4 图表 filter variants

```
summary 页的 KPI 展开图表支持按 filter 维度切换：

config.kpi.groups[0].items[0].detail.charts[0].variants = {
  "dept-1": { points: [...], title: "部门 1 趋势" },
  "dept-2": { points: [...], title: "部门 2 趋势" },
}

用户在 detail panel 选 department=dept-1 → resolveChart() 合并 variant → 更新图表
```

### 6.5 表头嵌套层级计算

```
对于 N 级表头（如 industry 报表的 SDV Test Agent → 需求 → AI需求 → 覆盖率）：

depthOf(col)  = 0 if 叶子; 1 + max(children.depth) if 有子列
leavesOf(col) = [col] if 叶子; flatMap(children.leaves) if 有子列

渲染：
  第 1 行（th）：所有 depth=maxDepth 的列，colspan = leavesOf(col).length
  第 2 行（th）：depth=maxDepth-1 的列
  ...
  叶子行的 rowspan = maxDepth - depth + 1
```

### 6.6 用户数据覆盖层

```
public/user-data/ 目录下放同名文件 → 整文件替换 mock 数据
例如：public/user-data/reports/summary/data.json → 替换 summary 的数据

检测机制：
  1. fetch /user-data/reports/summary/data.json
  2. 成功 + 响应是 JSON object → 使用
  3. 失败 / 响应是 HTML → 标记缺失（会话级缓存，不重复探测）

注意：Nuxt dev server 对不存在的静态文件返回 SPA fallback HTML（200），
      所以必须检查响应类型是 object/array 而非字符串
```
