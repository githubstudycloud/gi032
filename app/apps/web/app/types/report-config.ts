/**
 * 报表平台 v2 协议类型 —— 与 docs/report-platform-v2.md 对应。
 *
 * config.json 形状（静态：标题/筛选/列/行为/KPI 定义/下钻配置）
 * data.json 形状（动态：rows + totals + kpi values）
 *
 * 跟 overview-summary.ts 的差别：那个是 v0 老形状，本文件是 v2 新形状。
 * 迁移过程中两者并存；新页用 v2，老页继续 v0。
 */
import type { TableColumn, MetricDetail } from './overview-summary';

/* —— Meta —— */

export interface ReportMeta {
  report_type: string;
  name: string;
  subtitle?: string;
  /** 是否展示 subtitle（默认 false 隐藏）。要露出副标题在 config.json 里显式置 true */
  show_subtitle?: boolean;
  description?: string;
  version: number;
  user_pref_endpoint?: string;
}

/* —— Toolbar 开关 —— */

export interface ToolbarSpec {
  show_refresh?: boolean;
  show_paging_mode?: boolean;
  show_compare?: boolean;
  show_column_customizer?: boolean;
  show_export?: boolean;
}

/* —— Filters（v2 沿用 gi031 协议，比看板老形状更结构化） —— */

export type FilterKind =
  | 'date_single' | 'date_range'
  | 'flat_dropdown' | 'hierarchy_dropdown' | 'search_dropdown'
  | 'multi_select' | 'multi_search'
  | 'text' | 'number_range' | 'boolean'
  | 'enum_radio' | 'enum_chips';

export interface FilterSourceSpec {
  endpoint: string;
  method?: 'GET' | 'POST';
  paging?: { enabled: boolean; page_size: number };
  sortable_by?: string[];
  default_sort?: { field: string; dir: 'asc' | 'desc' }[];
  supports_favorite?: boolean;
  supports_filter?: boolean;
  params_in?: string[];
  max_levels?: number;
  select_at_any_depth?: boolean;
  max_picks?: number;
  min_chars?: number;
  debounce_ms?: number;
}

export interface FilterSpec {
  code: string;
  label: string;
  kind: FilterKind;
  required?: boolean;
  default?: unknown;
  param: Record<string, string>;
  depends_on?: string[];
  source?: FilterSourceSpec;
  options?: { value: string; label: string }[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  multi?: boolean;
}

/* —— KPI（与 Metric 同义，但作为「定义」） —— */

export type Threshold = {
  min?: number;
  max?: number;
  goodColor?: string;
  badColor?: string;
};

export interface KpiItemDef {
  key: string;
  label: string;
  unit?: string;
  data_type?: 'int' | 'decimal' | 'percent' | 'string';
  description?: string;
  threshold?: Threshold;
  detail_ref?: string; // 引用 drilldowns（v2 推荐路径）
  detail?: MetricDetail; // inline charts —— summary 页旧形状沿用
}

export interface KpiGroupDef {
  key: string;
  label: string;
  items: KpiItemDef[];
}

export interface KpiSpec {
  enabled: boolean;
  title?: string;
  data_endpoint?: string;
  layout_mode_default?: 'grouped' | 'flat';
  footnote?: string;
  groups: KpiGroupDef[];
}

/* —— Primary view —— */

export interface PrimaryViewTab {
  key: string;
  label: string;
  data_endpoint?: string;
  header_tree_endpoint?: string | null;
  header_tree?: TableColumn[]; // 复用 overview-summary 的 TableColumn（已有 N 级支持）
}

export interface PagingSpec {
  enabled?: boolean;
  default_mode?: 'server' | 'client' | 'none';
  default_page_size?: number;
}

export interface RowFavoriteSpec {
  enabled: boolean;
  toggle_endpoint?: string;
  sort_on_top?: boolean;
}

export interface PrimaryView {
  enabled: boolean;
  title?: string;
  endpoint?: string;
  method?: 'GET' | 'POST';
  paging?: PagingSpec;
  row_dim_options?: { code: string; label: string; row_count_hint?: number }[];
  row_dim_default?: string;
  row_favorite?: RowFavoriteSpec;
  tabs: PrimaryViewTab[];
}

/* —— Drilldowns —— */

export interface DrilldownDef {
  title: string;
  endpoint: string;
  method?: 'GET' | 'POST';
  param_mapping: Record<string, string>;
  paging?: PagingSpec;
  header_tree_endpoint?: string | null;
  header_tree?: TableColumn[] | null;
}

/* —— Full config —— */

export interface ReportConfig {
  meta: ReportMeta;
  toolbar?: ToolbarSpec;
  filters: FilterSpec[];
  kpi?: KpiSpec;
  primary_view?: PrimaryView;
  drilldowns?: Record<string, DrilldownDef>;
}

/* —— Data（与 config 拆开） —— */

export interface KpiItemValue {
  key: string;
  value: string;
  mom?: string;
  trend?: 'up' | 'down' | 'flat';
}

export interface KpiData {
  groups: { key: string; items: KpiItemValue[] }[];
}

export type Row = Record<string, unknown>;

export interface TabData {
  items: Row[];
  page?: number;
  page_size?: number;
  total?: number;
  has_more?: boolean;
  extras?: { totals?: Record<string, unknown> };
}

export interface ReportData {
  kpi?: KpiData;
  tabs: Record<string, TabData>;
  drilldowns?: Record<string, { default: TabData }>;
}
