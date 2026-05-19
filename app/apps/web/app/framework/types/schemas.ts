/**
 * Zod 运行时 schema —— 跟 ~/types/overview-summary.ts 的 TS 类型一一对应。
 *
 * 用法：
 *   const ds = await useDataSource<unknown, OverviewSummaryResponse>({
 *     key: 'overview-summary',
 *     jsonPath: '/pages/ai-test-overview-summary.json',
 *     apiPath: '/api/pages/ai-test/overview/summary',
 *     transform: (raw) => OverviewSummaryResponseSchema.parse(raw),
 *   });
 *
 * 当后端接入时，transform 会在 JSON 不符合形状时抛错（带详细路径），不再让坏数据传到 UI。
 *
 * 设计原则：
 *   - 一切对外形状变化在 transform 里收敛，不污染 UI 组件。
 *   - 大部分字段 .nullish() —— 后端字段缺失时回落 undefined，不会因为缺一列就整页崩。
 */
import { z } from 'zod';

/* —— 基础原子 —— */

export const FilterOptionSchema = z.object({
  key: z.string(),
  label: z.string(),
});

export const ThresholdSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  goodColor: z.string().optional(),
  badColor: z.string().optional(),
});

export const TrendDirSchema = z.enum(['up', 'down', 'flat']);

/* —— 筛选 —— */

export const OverviewFiltersSchema = z.object({
  departments: z.array(FilterOptionSchema).default([]),
  timeRanges: z.array(FilterOptionSchema).optional(),
});

/* —— 核心指标 + 明细面板 —— */

export const TrendPointSchema = z.object({
  x: z.string(),
  y: z.number(),
});

export const DistributionItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number(),
  display: z.string().optional(),
  color: z.string().optional(),
});

export const GaugeDataSchema = z.object({
  value: z.number(),
  min: z.number().optional(),
  max: z.number().optional(),
  target: z.number().optional(),
  unit: z.string().optional(),
  display: z.string().optional(),
});

export const StackedSeriesSchema = z.object({
  key: z.string(),
  label: z.string(),
  color: z.string().optional(),
});

export const StackedRowSchema = z.object({
  label: z.string(),
  values: z.record(z.string(), z.number()),
});

export const StackedDataSchema = z.object({
  series: z.array(StackedSeriesSchema),
  rows: z.array(StackedRowSchema),
});

export const HeatmapDataSchema = z.object({
  xLabels: z.array(z.string()),
  yLabels: z.array(z.string()),
  values: z.array(z.array(z.number())),
});

export const RadarAxisSchema = z.object({
  key: z.string(),
  label: z.string(),
  max: z.number().optional(),
});

export const RadarSeriesSchema = z.object({
  key: z.string(),
  label: z.string(),
  values: z.record(z.string(), z.number()),
  color: z.string().optional(),
});

export const RadarDataSchema = z.object({
  axes: z.array(RadarAxisSchema),
  series: z.array(RadarSeriesSchema),
});

export const MetricChartKindSchema = z.enum([
  'trend',
  'distribution',
  'donut',
  'bar',
  'gauge',
  'stacked',
  'heatmap',
  'radar',
]);

// MetricChart：variants 字段是 self-referential 的 Partial<MetricChart>，
// 用 z.lazy 让 Zod 推断 OK；运行时只校验出现的字段，未出现的字段不做检查。
const MetricChartBaseSchema = z.object({
  key: z.string(),
  kind: MetricChartKindSchema,
  title: z.string(),
  subtitle: z.string().optional(),
  unit: z.string().optional(),
  threshold: ThresholdSchema.optional(),
  points: z.array(TrendPointSchema).optional(),
  items: z.array(DistributionItemSchema).optional(),
  gauge: GaugeDataSchema.optional(),
  stacked: StackedDataSchema.optional(),
  heatmap: HeatmapDataSchema.optional(),
  radar: RadarDataSchema.optional(),
});

export const MetricChartSchema = MetricChartBaseSchema.extend({
  variants: z.record(z.string(), MetricChartBaseSchema.partial()).optional(),
});

export const MetricFilterDimSchema = z.object({
  key: z.string(),
  label: z.string(),
  options: z.array(FilterOptionSchema),
  defaultKey: z.string().optional(),
});

export const MetricDetailSchema = z.object({
  charts: z.array(MetricChartSchema),
  filters: z.array(MetricFilterDimSchema).optional(),
});

export const MetricSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string(),
  unit: z.string().optional(),
  mom: z.string(),
  trend: TrendDirSchema,
  description: z.string(),
  threshold: ThresholdSchema.optional(),
  detail: MetricDetailSchema.optional(),
});

export const MetricGroupSchema = z.object({
  key: z.string(),
  label: z.string(),
  items: z.array(MetricSchema),
});

export const OverviewMetricsSchema = z.object({
  groups: z.array(MetricGroupSchema),
  footnote: z.string().default(''),
});

/* —— 表格 —— */

export const ActionCellSchema = z.object({
  kind: z.enum(['detail', 'na']),
  label: z.string(),
});

// 单元格值：字符串 / 数字 / ActionCell / undefined。
export const TableCellSchema = z.union([
  z.string(),
  z.number(),
  ActionCellSchema,
  z.undefined(),
]);

// TableColumn 自引用 children
export interface TableColumnZ {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  highlight?: boolean;
  threshold?: z.infer<typeof ThresholdSchema>;
  cellType?: 'value' | 'action';
  rowspan?: 1 | 2;
  children?: TableColumnZ[];
}

export const TableColumnSchema: z.ZodType<TableColumnZ> = z.lazy(() =>
  z.object({
    key: z.string(),
    label: z.string(),
    width: z.string().optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
    sortable: z.boolean().optional(),
    filterable: z.boolean().optional(),
    highlight: z.boolean().optional(),
    threshold: ThresholdSchema.optional(),
    cellType: z.enum(['value', 'action']).optional(),
    rowspan: z.union([z.literal(1), z.literal(2)]).optional(),
    children: z.array(TableColumnSchema).optional(),
  }),
);

export const TableRowSchema = z.record(z.string(), TableCellSchema);

export const PaginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});

export const PilotTableSchema = z.object({
  key: z.string(),
  label: z.string(),
  columns: z.array(TableColumnSchema),
  rows: z.array(TableRowSchema),
  pagination: PaginationSchema,
});

export const OverviewPilotsSchema = z.object({
  tabs: z.array(PilotTableSchema),
});

/* —— 整页 —— */

export const OverviewSummaryResponseSchema = z.object({
  filters: OverviewFiltersSchema,
  metrics: OverviewMetricsSchema,
  pilots: OverviewPilotsSchema,
});

export type OverviewSummaryResponseFromSchema = z.infer<typeof OverviewSummaryResponseSchema>;

/* —— Nav & Theme —— */

export const NavItemSchema: z.ZodType<{
  key: string;
  label: string;
  path?: string;
  icon?: string;
  badge?: string | number;
  single?: boolean;
  disabled?: boolean;
  embed?: string;
  embedSandbox?: string[] | false;
  children?: unknown[];
}> = z.lazy(() =>
  z.object({
    key: z.string(),
    label: z.string(),
    path: z.string().optional(),
    icon: z.string().optional(),
    badge: z.union([z.string(), z.number()]).optional(),
    single: z.boolean().optional(),
    disabled: z.boolean().optional(),
    embed: z.string().optional(),
    embedSandbox: z.union([z.array(z.string()), z.literal(false)]).optional(),
    children: z.array(NavItemSchema).optional(),
  }),
);

export const NavResponseSchema = z.object({
  items: z.array(NavItemSchema),
});
