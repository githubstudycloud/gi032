/**
 * Zod 运行时 schema —— 跟 `app/types/report-config.ts` 的 TS 类型一一对应，
 * 与后端 `services/report-query/app/schemas.py` 的 Pydantic 协议同源。
 *
 * 协议 source of truth = 后端 Pydantic。前端 Zod 是镜像；任一字段改动两边同步改。
 *
 * 用法：
 *   const cfg = ReportConfigSchema.parse(rawFromApiOrMock);
 * Zod 解析失败会抛 ZodError，包含详细路径，让漂移在 UI 之前就抛出来。
 *
 * 设计：
 *   - StrictModel：所有 object 默认 .strict()，多余字段直接报错（与后端 extra="forbid" 一致）。
 *   - 大量 .optional() —— 协议字段普遍可选，保持与 v2 文档一致。
 *   - goodColor / badColor / cellType 三个 camelCase 字段直接用同名（不做 snake 转换）。
 */
import { z } from 'zod';

/* —— Meta —— */

export const ReportMetaSchema = z.object({
  report_type: z.string(),
  name: z.string(),
  subtitle: z.string().optional(),
  show_subtitle: z.boolean().optional(),
  description: z.string().optional(),
  version: z.number().int(),
  user_pref_endpoint: z.string().optional(),
}).strict();

/* —— Toolbar —— */

export const ToolbarSpecSchema = z.object({
  show_refresh: z.boolean().optional(),
  show_paging_mode: z.boolean().optional(),
  show_compare: z.boolean().optional(),
  show_column_customizer: z.boolean().optional(),
  show_export: z.boolean().optional(),
}).strict();

/* —— Filters —— */

export const FilterKindSchema = z.enum([
  'date_single', 'date_range',
  'flat_dropdown', 'hierarchy_dropdown', 'search_dropdown',
  'multi_select', 'multi_search',
  'text', 'number_range', 'boolean',
  'enum_radio', 'enum_chips',
]);

export const FilterSortSpecSchema = z.object({
  field: z.string(),
  dir: z.enum(['asc', 'desc']),
}).strict();

export const FilterPagingSchema = z.object({
  enabled: z.boolean(),
  page_size: z.number().int(),
}).strict();

export const FilterSourceSchema = z.object({
  endpoint: z.string(),
  method: z.enum(['GET', 'POST']).optional(),
  paging: FilterPagingSchema.optional(),
  sortable_by: z.array(z.string()).optional(),
  default_sort: z.array(FilterSortSpecSchema).optional(),
  supports_favorite: z.boolean().optional(),
  supports_filter: z.boolean().optional(),
  params_in: z.array(z.string()).optional(),
  max_levels: z.number().int().optional(),
  select_at_any_depth: z.boolean().optional(),
  max_picks: z.number().int().optional(),
  min_chars: z.number().int().optional(),
  debounce_ms: z.number().int().optional(),
}).strict();

export const FilterOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
}).strict();

export const FilterSpecSchema = z.object({
  code: z.string(),
  label: z.string(),
  kind: FilterKindSchema,
  required: z.boolean().optional(),
  default: z.unknown().optional(),
  param: z.record(z.string(), z.string()),
  depends_on: z.array(z.string()).optional(),
  source: FilterSourceSchema.optional(),
  options: z.array(FilterOptionSchema).optional(),
  placeholder: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  unit: z.string().optional(),
  multi: z.boolean().optional(),
}).strict();

/* —— Threshold （视觉阈值；camelCase 与 mock / TS 保持一致） —— */

export const ReportThresholdSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  goodColor: z.string().optional(),
  badColor: z.string().optional(),
}).strict();

/* —— TableColumn 递归 —— */

export interface ReportTableColumnZ {
  key: string;
  label: string;
  rowspan?: 1 | 2;
  width?: string;
  children?: ReportTableColumnZ[];
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  highlight?: boolean;
  threshold?: z.infer<typeof ReportThresholdSchema>;
  cellType?: 'value' | 'action';
}

export const ReportTableColumnSchema: z.ZodType<ReportTableColumnZ> = z.lazy(() =>
  z.object({
    key: z.string(),
    label: z.string(),
    rowspan: z.union([z.literal(1), z.literal(2)]).optional(),
    width: z.string().optional(),
    children: z.array(ReportTableColumnSchema).optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
    sortable: z.boolean().optional(),
    filterable: z.boolean().optional(),
    highlight: z.boolean().optional(),
    threshold: ReportThresholdSchema.optional(),
    cellType: z.enum(['value', 'action']).optional(),
  }).strict(),
);

/* —— KPI —— */

export const KpiItemDefSchema = z.object({
  key: z.string(),
  label: z.string(),
  unit: z.string().optional(),
  data_type: z.enum(['int', 'decimal', 'percent', 'string']).optional(),
  description: z.string().optional(),
  threshold: ReportThresholdSchema.optional(),
  detail_ref: z.string().optional(),
  detail: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const KpiGroupDefSchema = z.object({
  key: z.string(),
  label: z.string(),
  items: z.array(KpiItemDefSchema),
}).strict();

export const KpiSpecSchema = z.object({
  enabled: z.boolean(),
  title: z.string().optional(),
  data_endpoint: z.string().optional(),
  layout_mode_default: z.enum(['grouped', 'flat']).optional(),
  footnote: z.string().optional(),
  groups: z.array(KpiGroupDefSchema),
}).strict();

/* —— Primary View —— */

export const PagingSpecSchema = z.object({
  enabled: z.boolean().optional(),
  default_mode: z.enum(['server', 'client', 'none']).optional(),
  default_page_size: z.number().int().optional(),
}).strict();

export const PrimaryViewTabSchema = z.object({
  key: z.string(),
  label: z.string(),
  data_endpoint: z.string().optional(),
  header_tree_endpoint: z.string().nullable().optional(),
  header_tree: z.array(ReportTableColumnSchema).optional(),
}).strict();

export const RowDimOptionSchema = z.object({
  code: z.string(),
  label: z.string(),
  row_count_hint: z.number().int().optional(),
}).strict();

export const RowFavoriteSpecSchema = z.object({
  enabled: z.boolean(),
  toggle_endpoint: z.string().optional(),
  sort_on_top: z.boolean().optional(),
}).strict();

export const PrimaryViewSchema = z.object({
  enabled: z.boolean(),
  title: z.string().optional(),
  endpoint: z.string().optional(),
  method: z.enum(['GET', 'POST']).optional(),
  paging: PagingSpecSchema.optional(),
  row_dim_options: z.array(RowDimOptionSchema).optional(),
  row_dim_default: z.string().optional(),
  row_favorite: RowFavoriteSpecSchema.optional(),
  tabs: z.array(PrimaryViewTabSchema),
}).strict();

/* —— Drilldown —— */

export const DrilldownDefSchema = z.object({
  title: z.string(),
  endpoint: z.string(),
  method: z.enum(['GET', 'POST']).optional(),
  param_mapping: z.record(z.string(), z.string()),
  paging: PagingSpecSchema.optional(),
  header_tree_endpoint: z.string().nullable().optional(),
  header_tree: z.array(ReportTableColumnSchema).nullable().optional(),
}).strict();

/* —— Full ReportConfig —— */

export const ReportConfigSchema = z.object({
  meta: ReportMetaSchema,
  toolbar: ToolbarSpecSchema.optional(),
  filters: z.array(FilterSpecSchema).default([]),
  kpi: KpiSpecSchema.optional(),
  primary_view: PrimaryViewSchema.optional(),
  drilldowns: z.record(z.string(), DrilldownDefSchema).optional(),
}).strict();

/* —— Data —— */

export const KpiItemValueSchema = z.object({
  key: z.string(),
  value: z.union([z.string(), z.number(), z.null()]).optional(),
  mom: z.string().optional(),
  trend: z.enum(['up', 'down', 'flat']).optional(),
}).strict();

export const KpiGroupDataSchema = z.object({
  key: z.string(),
  items: z.array(KpiItemValueSchema),
}).strict();

export const KpiDataSchema = z.object({
  groups: z.array(KpiGroupDataSchema),
}).strict();

export const TabDataSchema = z.object({
  items: z.array(z.record(z.string(), z.unknown())),
  page: z.number().int().optional(),
  page_size: z.number().int().optional(),
  total: z.number().int().optional(),
  has_more: z.boolean().optional(),
  extras: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const DrilldownDataSchema = z.object({
  default: TabDataSchema,
}).strict();

export const ReportDataSchema = z.object({
  kpi: KpiDataSchema.optional(),
  tabs: z.record(z.string(), TabDataSchema),
  drilldowns: z.record(z.string(), DrilldownDataSchema).optional(),
}).strict();

/* —— 推断类型（与 report-config.ts 的 TS interface 形状对得上） —— */

export type ReportConfigFromSchema = z.infer<typeof ReportConfigSchema>;
export type ReportDataFromSchema = z.infer<typeof ReportDataSchema>;
