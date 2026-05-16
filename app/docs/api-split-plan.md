# API 拆分方案 — 表头 / 数据 / 配置如何接后端

> 当前所有页面数据都走 `public/mock/pages/*.json`，等接入后端后用什么 endpoint、怎么拆，本文一次性约定清楚。

## 1. 数据源切换的总入口

`runtimeConfig.public.dataSourceMode`：
- `'json'`（默认）：所有 `useDataSource` 读 `/mock/<jsonPath>`
- `'api'`：所有 `useDataSource` 读 `${apiBase}<apiPath>`，并把 `params` 作为 query 透传

切换方式：
```bash
# 开发：
NUXT_PUBLIC_DATA_SOURCE_MODE=api NUXT_PUBLIC_API_BASE=https://api.example.com pnpm dev

# 生产 .env：
NUXT_PUBLIC_DATA_SOURCE_MODE=api
NUXT_PUBLIC_API_BASE=https://api.your-domain.com
```

业务代码 0 改动。

## 2. 表头 / 数据 / 配置应该一起返还是分开返？

**结论：默认整页一次返。**

每个 page 数据 JSON 的结构（以 `ai-test-overview-summary.json` 为例）：

```jsonc
{
  "filters": {  /* 部门 / 时间范围下拉 */ },
  "metrics": {  /* 核心指标卡 + 明细面板配置 */ },
  "pilots":  {  /* tab + 多级表头 + 行数据 + 分页 */ }
}
```

`filters` / `metrics.groups` / `pilots.tabs[].columns` 都是**配置**，`pilots.tabs[].rows` 是**数据**。这两部分一起返的好处：

1. **表头跟随业务**：列定义会变（加列 / 改列名 / 改阈值），如果分两个 endpoint，前端需要同时刷两份才一致；
2. **少一次 round-trip**：dashboard 一开屏 14 个 metric + 13 列 × 6 行，并不大；
3. **Zod 校验集中**：在 `transform` 里 `OverviewSummaryResponseSchema.parse(raw)` 一次到位。

**但**：行数据很多 / 用户切筛选频繁刷的场景，可以单独把 rows 拆出来。

### 推荐拆法

| Endpoint | 缓存策略 | 何时调用 |
|---|---|---|
| `GET /api/pages/<slug>/config` | 强缓存（页面级别更新少） | 首次进入页面 + 后台改了配置 |
| `GET /api/pages/<slug>/data?<filters>` | 短缓存 / 不缓存 | 首次 + 切筛选 + 用户点刷新 |

但**当前阶段不要拆**：mock JSON 阶段配置和数据一起出，行数也不大。

## 3. 后端字段映射约定（命名差异时怎么处理）

后端字段如果跟内部领域模型对不上，**只能在 composable 的 transform 里映射**，不能改 `app/types/*` 也不能改组件。

```ts
// app/composables/use-overview-summary.ts 示例
transform: (raw): OverviewSummaryResponse => {
  // 1. 后端字段名映射：data.tabs[0].header → columns
  const remapped = {
    filters: raw.filterMeta,
    metrics: { groups: raw.kpiGroups, footnote: raw.footnoteText ?? '' },
    pilots:  {
      tabs: raw.pilots.map(t => ({
        key: t.tabId,
        label: t.tabName,
        columns: t.header,
        rows: t.dataRows,
        pagination: t.page ?? { page: 1, pageSize: 10, total: t.dataRows.length },
      })),
    },
  };

  // 2. Zod 校验最终形状（出错就抛，UI 显示错误卡）
  return OverviewSummaryResponseSchema.parse(remapped) as OverviewSummaryResponse;
},
```

## 4. 多级表头怎么传

`columns` 是 `TableColumn[]`，每个节点递归带 `children`，无层级上限。

后端有两种常见 shape，都建议在 transform 里规整到 `children`：

**A. 后端返扁平 + parent 列**（跟 CSV 导入模板一样）：
```json
[
  { "key": "design", "label": "测试设计阶段" },
  { "key": "design-cov", "label": "覆盖人数", "parent": "design" },
  { "key": "design-adopt", "label": "采纳率", "parent": "design" }
]
```
transform 里挂回 children 树（参考 `app/utils/csv-page-parser.ts` 的 COLUMNS 段处理）。

**B. 后端直接返树**：
```json
[{
  "key": "design",
  "label": "测试设计阶段",
  "children": [
    { "key": "design-cov",   "label": "覆盖人数" },
    { "key": "design-adopt", "label": "采纳率"   }
  ]
}]
```
直接 `parse` 即可。

## 5. 行数据键名约定

`rows[i][columnKey]` 必须跟 `columns` 的**叶子列 key** 对得上。多级表头时，单元格永远挂在叶子列下，不挂在父列上（前端渲染按叶子列展开 `<td>`）。

例：
```json
{
  "columns": [
    { "key": "design", "label": "测试设计", "children": [
      { "key": "design-cov", "label": "覆盖人数" }
    ]}
  ],
  "rows": [
    { "design-cov": 42 }   // ✅ 用叶子 key
    // { "design": { ... } }   ❌ 不要嵌套
  ]
}
```

## 6. 单元格类型约定

| 类型 | JSON | 渲染 |
|---|---|---|
| 数字 / 文本 | `"design-cov": 42` 或 `"覆盖率": "62.4%"` | 直接显示，可配 threshold 套色 |
| 缺失 | 字段不存在 / `null` / `""` | 显示 `—`（灰色） |
| 操作 | `"actions": { "kind": "detail", "label": "详情" }` | 渲染按钮，触发 `@detail` |
| 操作（兼容老格式） | `"actions": "详情"` / `"actions": "不涉及"` | 同上（按字符串识别） |

新代码请用 ActionCell 对象格式，避免 i18n 后用文案做判定。

## 7. 错误处理 / 回退

- `useDataSource` 暴露 `error` ref（Zod parse 失败 / 网络错误都会进这里）；
- 页面用 `<ErrorPanel :error="error" @retry="refresh" />`（见 `app/components/common/ErrorPanel.vue`）兜底；
- 同步 mock 阶段不会触发，接 API 后必跑通这条路径。

## 8. 测试约定

- **后端字段变动**：先改一份 mock JSON 模拟新字段 → transform 适配 → 业务跑通 → 再切 API 模式
- Zod schema 在 `app/types/schemas.ts`，每加 / 改一个字段同步更新
- `pnpm test`（Vitest）下会跑 `schemas.spec.ts` 验证 mock JSON 仍合法

## 9. 不接入后端时也要保持的纪律

mock JSON 任何修改都先用 Zod parse 过 schema —— 用 `pnpm test` 会捕捉到（test fixture 用所有 `public/mock/pages/*.json`）。
