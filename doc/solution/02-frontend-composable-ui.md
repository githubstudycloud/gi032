# 02 — 可组装页面结构 + 数据展示模型

> 愿景：「标题层级组合可定义」「结构可组装」「数据展示形式模型可定义」「一个页面由几个数据展示形式模型组成」

## 1. 问题拆解

这四条愿景本质上是一个问题的四个层面：**如何让一个页面的视觉结构从"固定模板"演进到"自由组装"**。

```
当前（V2 协议）：                           目标：
┌─────────────────┐                    ┌─────────────────┐
│ PageHeader      │  ← 固定存在        │ Widget 1 (任意)  │
├─────────────────┤                    ├─────────────────┤
│ ToolBar         │  ← config 开关     │ Widget 2 (任意)  │
├─────────────────┤                    ├─────────────────┤
│ FilterSection   │  ← config 开关     │ Widget 3 (任意)  │
├─────────────────┤                    ├────────┬────────┤
│ KpiSection      │  ← config 开关     │ W4     │ W5     │  ← 可并排
├─────────────────┤                    ├────────┴────────┤
│ TableSection    │  ← config 开关     │ Widget 6 (任意)  │
├─────────────────┤                    └─────────────────┘
│ DrilldownLayer  │  ← 按需弹出
└─────────────────┘
```

## 2. 核心概念：Widget 模型

### 2.1 什么是 Widget

Widget 是页面上的一个独立数据展示单元。每个 Widget 有：
- **类型（type）**：决定渲染器（表格 / 图表 / KPI 卡片 / 筛选器 / 自定义 HTML）
- **数据源（data_source）**：从哪拿数据（endpoint / json path / 内联）
- **配置（config）**：该类型特有的渲染参数
- **布局（layout）**：在页面上的位置和尺寸

### 2.2 Widget 类型注册表

```typescript
// types/widget-registry.ts

/** 所有可用的 widget 类型 */
type WidgetType =
  // 信息展示
  | 'page_header'        // 页面标题区（meta.name / subtitle / description）
  | 'kpi_cards'          // KPI 卡片组（分组 / 平铺）
  | 'metric_card'        // 单个指标卡（大号数字 + 趋势）
  // 图表
  | 'chart_bar'          // 柱状图
  | 'chart_line'         // 折线图（趋势图的通用化）
  | 'chart_donut'        // 环形图
  | 'chart_radar'        // 雷达图
  | 'chart_heatmap'      // 热力图
  | 'chart_stacked'      // 堆叠图
  | 'chart_gauge'        // 仪表盘
  | 'chart_distribution' // 分布图
  // 表格
  | 'data_table'         // 通用数据表（含多级表头、tab、分页）
  | 'pivot_table'        // 交叉表 / 透视表
  // 交互控件
  | 'filter_bar'         // 筛选条（横向排列多个 filter）
  | 'toolbar'            // 工具条（刷新/导出/对比等）
  // 容器
  | 'tab_group'          // Tab 容器，内含多个 widget
  | 'collapse_group'     // 折叠面板容器
  // 扩展
  | 'iframe'             // 嵌入外部页面
  | 'markdown'           // 富文本说明
  | 'custom';            // 自定义组件（指定 component name）

/** Widget 定义（出现在 page config 中） */
interface WidgetDef {
  id: string;              // 页面内唯一 ID
  type: WidgetType;
  title?: string;          // widget 标题（可选，部分类型自带）
  layout: WidgetLayout;    // 位置和尺寸
  data_source?: WidgetDataSource;  // 数据来源
  config: Record<string, unknown>; // 类型特有配置
  visible?: boolean;       // 默认 true，可配置隐藏
  collapse?: boolean;      // 默认展开，可折叠
}

/** 布局描述 */
interface WidgetLayout {
  /** 12 栏网格中占几列（1-12） */
  col_span: number;
  /** 行内排序（同一行的 widget 按 order 排列，col_span 总和超 12 自动换行） */
  order: number;
  /** 最小高度（px 或 auto） */
  min_height?: string;
}

/** 数据来源描述 */
interface WidgetDataSource {
  /** 数据获取模式 */
  mode: 'endpoint' | 'json_path' | 'inline' | 'shared';
  /** API 端点（mode=endpoint 时） */
  endpoint?: string;
  method?: 'GET' | 'POST';
  /** JSON mock 路径（mode=json_path 时） */
  json_path?: string;
  /** 内联数据（mode=inline 时，小数据直接放 config） */
  inline_data?: unknown;
  /** 引用页面级共享数据（mode=shared 时，如 "kpi" / "tabs.industry-detail"） */
  shared_key?: string;
  /** 是否跟随页面筛选器联动 */
  filter_bound?: boolean;
  /** 数据刷新间隔（秒，0=不自动刷新） */
  refresh_interval?: number;
}
```

### 2.3 页面配置演进：从固定模块到 Widget 列表

**当前 V2 config.json**（6 个固定模块）：
```jsonc
{
  "meta": { ... },
  "toolbar": { ... },
  "filters": [ ... ],
  "kpi": { ... },
  "primary_view": { ... },
  "drilldowns": { ... }
}
```

**V3 config.json**（Widget 列表，向后兼容 V2）：
```jsonc
{
  "meta": {
    "report_type": "industry",
    "name": "产业落地进展",
    "version": 3,
    "layout_version": "v3"     // ← 标记使用 widget 模式
  },

  // V3：widget 列表替代固定模块
  "widgets": [
    {
      "id": "header",
      "type": "page_header",
      "layout": { "col_span": 12, "order": 0 },
      "config": {
        "show_subtitle": true,
        "show_description": true
      }
    },
    {
      "id": "toolbar",
      "type": "toolbar",
      "layout": { "col_span": 12, "order": 1 },
      "config": {
        "show_refresh": true,
        "show_export": true,
        "show_compare": false
      }
    },
    {
      "id": "filters",
      "type": "filter_bar",
      "layout": { "col_span": 12, "order": 2 },
      "config": {
        "filters": [
          { "code": "business_date", "kind": "date_range", "required": true },
          { "code": "department", "kind": "hierarchy_dropdown" }
        ]
      }
    },
    {
      "id": "kpi-user",
      "type": "kpi_cards",
      "layout": { "col_span": 6, "order": 3 },      // ← 占半宽
      "data_source": {
        "mode": "endpoint",
        "endpoint": "/api/reports/industry/kpi?group=user",
        "filter_bound": true
      },
      "config": {
        "group_label": "用户指标",
        "items": [
          { "key": "ai-user-count", "label": "AI用户数", "unit": "人" }
        ]
      }
    },
    {
      "id": "kpi-business",
      "type": "kpi_cards",
      "layout": { "col_span": 6, "order": 4 },      // ← 与 kpi-user 并排
      "data_source": {
        "mode": "endpoint",
        "endpoint": "/api/reports/industry/kpi?group=business",
        "filter_bound": true
      },
      "config": {
        "group_label": "业务指标",
        "items": [
          { "key": "design-coverage", "label": "AI测试设计覆盖率", "unit": "%" }
        ]
      }
    },
    {
      "id": "trend-chart",
      "type": "chart_line",
      "layout": { "col_span": 12, "order": 5 },
      "data_source": {
        "mode": "endpoint",
        "endpoint": "/api/reports/industry/trend",
        "filter_bound": true
      },
      "config": {
        "x_field": "date",
        "y_fields": ["ai_user_count", "design_coverage"],
        "y_labels": ["AI用户数", "设计覆盖率"]
      }
    },
    {
      "id": "detail-table",
      "type": "data_table",
      "layout": { "col_span": 12, "order": 6 },
      "data_source": {
        "mode": "endpoint",
        "endpoint": "/api/reports/industry/summary",
        "filter_bound": true
      },
      "config": {
        "tabs": [ ... ],
        "paging": { "enabled": true, "default_page_size": 10 },
        "row_favorite": { "enabled": true }
      }
    }
  ],

  // drilldowns 保留（被 widget 内的 drilldown_ref 引用）
  "drilldowns": { ... }
}
```

## 3. 渲染引擎设计

### 3.1 WidgetRenderer — 总调度器

```
┌─ PageShell ─────────────────────────────────────┐
│                                                  │
│  config.meta.layout_version === 'v3'             │
│    ? <WidgetGrid :widgets="config.widgets" />    │
│    : <LegacyReportPage :config="config" />       │  ← 向后兼容 V2
│                                                  │
└──────────────────────────────────────────────────┘
```

```vue
<!-- components/widget/WidgetGrid.vue -->
<template>
  <div class="grid grid-cols-12 gap-4">
    <template v-for="w in sortedWidgets" :key="w.id">
      <div :class="`col-span-${w.layout.col_span}`">
        <WidgetRenderer :def="w" :filter-state="filterState" />
      </div>
    </template>
  </div>
</template>
```

```vue
<!-- components/widget/WidgetRenderer.vue -->
<template>
  <component
    :is="resolveWidget(def.type)"
    :config="def.config"
    :data-source="def.data_source"
    :title="def.title"
  />
</template>

<script setup lang="ts">
// 按 type 查 widget 注册表，返回对应组件
function resolveWidget(type: WidgetType): Component {
  return widgetRegistry[type] ?? WidgetNotFound;
}
</script>
```

### 3.2 Widget 注册表（前端实现）

```typescript
// composables/use-widget-registry.ts

import type { Component } from 'vue';

const widgetRegistry: Record<string, Component> = {
  // 复用现有组件（零迁移成本）
  page_header:  () => import('~/components/report/PageHeader.vue'),
  toolbar:      () => import('~/components/report/ToolBar.vue'),
  filter_bar:   () => import('~/components/report/FilterSection.vue'),
  kpi_cards:    () => import('~/components/report/KpiSection.vue'),
  data_table:   () => import('~/components/report/TableSection.vue'),

  // 复用现有图表
  chart_bar:          () => import('~/components/dashboard/charts/ChartBar.vue'),
  chart_line:         () => import('~/components/dashboard/charts/ChartTrend.vue'),
  chart_donut:        () => import('~/components/dashboard/charts/ChartDonut.vue'),
  chart_radar:        () => import('~/components/dashboard/charts/ChartRadar.vue'),
  chart_heatmap:      () => import('~/components/dashboard/charts/ChartHeatmap.vue'),
  chart_stacked:      () => import('~/components/dashboard/charts/ChartStacked.vue'),
  chart_gauge:        () => import('~/components/dashboard/charts/ChartGauge.vue'),
  chart_distribution: () => import('~/components/dashboard/charts/ChartDistribution.vue'),

  // 新增
  metric_card:     () => import('~/components/widget/MetricCardWidget.vue'),
  pivot_table:     () => import('~/components/widget/PivotTableWidget.vue'),
  tab_group:       () => import('~/components/widget/TabGroupWidget.vue'),
  collapse_group:  () => import('~/components/widget/CollapseGroupWidget.vue'),
  iframe:          () => import('~/components/widget/IframeWidget.vue'),
  markdown:        () => import('~/components/widget/MarkdownWidget.vue'),
};

/** 注册自定义 widget（运行时扩展） */
export function registerWidget(type: string, component: Component): void {
  widgetRegistry[type] = component;
}
```

### 3.3 数据获取层：WidgetDataLoader

每个 Widget 独立管理自己的数据生命周期：

```typescript
// composables/use-widget-data.ts

export function useWidgetData(
  source: WidgetDataSource,
  filterState: Ref<Record<string, unknown>>,
) {
  // mode=endpoint → useDataSource 走 api/json 双模
  // mode=json_path → 直接 $fetch(mockBase + path)
  // mode=inline → 直接返回 inline_data
  // mode=shared → 从页面级数据 provide/inject 取切片

  // filter_bound=true → watch filterState 自动 re-fetch
  // refresh_interval > 0 → setInterval 定时刷新
}
```

## 4. 标题层级组合方案

### 4.1 问题

「标题层级组合可定义」意味着用户可以控制：
- 页面标题用 H1 / H2 / H3 中的哪个
- 副标题是否显示，用什么级别
- 描述文字的位置（标题下 / 侧边 / 隐藏）
- 装饰元素（分割线、图标、背景色）

### 4.2 方案：PageHeader Widget 的 config 扩展

```jsonc
{
  "id": "header",
  "type": "page_header",
  "config": {
    "title_level": "h1",              // h1 / h2 / h3 / h4
    "subtitle_level": "h3",           // h2 / h3 / h4 / span
    "show_subtitle": true,
    "show_description": true,
    "description_position": "below",  // below / side / tooltip
    "decoration": "underline",        // none / underline / border-left / gradient-bg
    "icon": "chart-bar",              // 可选图标（来自图标库）
    "layout": "stacked"               // stacked / inline / centered
  }
}
```

**渲染映射**：

```vue
<!-- components/widget/PageHeaderWidget.vue -->
<template>
  <div :class="layoutClass">
    <component :is="titleTag" class="...">
      <NavIcon v-if="config.icon" :name="config.icon" />
      {{ meta.name }}
    </component>
    <component v-if="config.show_subtitle" :is="subtitleTag" class="...">
      {{ meta.subtitle }}
    </component>
    <p v-if="config.show_description" :class="descriptionClass">
      {{ meta.description }}
    </p>
    <div v-if="config.decoration === 'underline'" class="h-0.5 bg-brand-500 mt-2" />
  </div>
</template>
```

## 5. 向后兼容策略

**核心原则**：V2 config 无需修改即可继续工作。

```typescript
// utils/config-compat.ts

/** 将 V2 config 自动转换为 V3 widget 列表 */
export function v2ToWidgets(config: ReportConfig): WidgetDef[] {
  const widgets: WidgetDef[] = [];
  let order = 0;

  // meta → page_header widget
  widgets.push({
    id: 'header', type: 'page_header',
    layout: { col_span: 12, order: order++ },
    config: { show_subtitle: config.meta.show_subtitle ?? false },
  });

  // toolbar → toolbar widget
  if (config.toolbar) {
    widgets.push({
      id: 'toolbar', type: 'toolbar',
      layout: { col_span: 12, order: order++ },
      config: config.toolbar,
    });
  }

  // filters → filter_bar widget
  if (config.filters?.length) {
    widgets.push({
      id: 'filters', type: 'filter_bar',
      layout: { col_span: 12, order: order++ },
      config: { filters: config.filters },
    });
  }

  // kpi → kpi_cards widget
  if (config.kpi?.enabled) {
    widgets.push({
      id: 'kpi', type: 'kpi_cards',
      layout: { col_span: 12, order: order++ },
      data_source: config.kpi.data_endpoint
        ? { mode: 'endpoint', endpoint: config.kpi.data_endpoint, filter_bound: true }
        : { mode: 'shared', shared_key: 'kpi' },
      config: config.kpi,
    });
  }

  // primary_view → data_table widget
  if (config.primary_view?.enabled) {
    widgets.push({
      id: 'table', type: 'data_table',
      layout: { col_span: 12, order: order++ },
      data_source: config.primary_view.endpoint
        ? { mode: 'endpoint', endpoint: config.primary_view.endpoint, filter_bound: true }
        : { mode: 'shared', shared_key: 'tabs' },
      config: config.primary_view,
    });
  }

  return widgets;
}
```

## 6. 页面布局编辑器（远期）

当 Widget 模型稳定后，可提供可视化布局编辑器：

```
┌─ 页面布局编辑器 ────────────────────────────────┐
│                                                  │
│  ┌─ Widget 面板 ─┐  ┌─ 画布（12 列网格）────┐   │
│  │ + KPI 卡片    │  │ ┌────────────────────┐ │   │
│  │ + 柱状图      │  │ │  page_header (12)  │ │   │
│  │ + 折线图      │  │ ├─────────┬──────────┤ │   │
│  │ + 数据表      │  │ │ kpi (6) │chart (6) │ │   │
│  │ + 筛选器      │  │ ├─────────┴──────────┤ │   │
│  │ + 雷达图      │  │ │  data_table (12)   │ │   │
│  │ + 嵌入页面    │  │ └────────────────────┘ │   │
│  │ + ...         │  │                        │   │
│  └───────────────┘  └────────────────────────┘   │
│                                                  │
│  拖拽 widget 到画布 → 调整 col_span → 保存 config │
└──────────────────────────────────────────────────┘
```

实现技术：
- 拖拽：`@vueuse/core` 的 `useDraggable` 或 `vue-draggable-plus`
- 网格：CSS Grid + 12 列系统
- 保存：生成 widget 列表 JSON → POST /api/admin/page-layouts/{type}

## 7. 展示模型选择器

用户可以选择"这组数据用什么形式展示"：

```
数据集: 产业月度趋势
  ├─ [折线图] ← 默认
  ├─ [柱状图]
  ├─ [数据表格]
  └─ [堆叠面积图]

用户点击切换 → 同一 data_source，只换 widget type
→ 前端通过 widgetRegistry 动态替换渲染器
```

实现方式：在 WidgetRenderer 上加一个 type 切换下拉：

```jsonc
{
  "id": "trend",
  "type": "chart_line",
  "config": {
    "switchable_types": ["chart_line", "chart_bar", "chart_stacked", "data_table"],
    // ↑ 用户可在这些类型间切换
  }
}
```

## 8. 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 新增 | `types/widget.ts` | WidgetDef / WidgetType / WidgetLayout / WidgetDataSource |
| 新增 | `composables/use-widget-registry.ts` | Widget 注册表 + 动态加载 |
| 新增 | `composables/use-widget-data.ts` | Widget 级数据获取 |
| 新增 | `components/widget/WidgetGrid.vue` | 12 列网格布局容器 |
| 新增 | `components/widget/WidgetRenderer.vue` | 按 type 分发到具体 widget |
| 新增 | `components/widget/WidgetSwitcher.vue` | 展示模型切换下拉 |
| 新增 | `utils/config-compat.ts` | V2 → V3 自动转换 |
| 修改 | `components/report/ReportPage.vue` | 检测 layout_version 分流 |
| 修改 | `types/report-config.ts` | 增加 widgets 字段 |
| 远期 | `components/admin/PageLayoutEditor.vue` | 可视化布局编辑器 |
