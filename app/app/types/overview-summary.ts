/**
 * 总览页（/ai-test/overview/summary）所有数据的领域模型。
 * 表头 / 文案 / 数据都来自 JSON，后端切换时 transform 里映射。
 */

/* —— 筛选 —— */
export interface FilterOption {
  key: string;
  label: string;
}
export interface OverviewFilters {
  departments: FilterOption[];
}

/* —— 核心指标 —— */
export type TrendDir = 'up' | 'down' | 'flat';

export interface Metric {
  key: string;
  label: string;
  /** 主数值（已格式化好的字符串，如 "1,284" / "62.4%" / "4.6"） */
  value: string;
  /** 单位（可选，单独显示成弱化色） */
  unit?: string;
  /** 环比值（"+12.3%" / "-1.2pp" / "+4.6" 等） */
  mom: string;
  /** 升/降 视觉指示（不一定 = 业务好坏，由后端给） */
  trend: TrendDir;
  /** 鼠标停留 ? 时显示的解释 */
  description: string;
}

export interface MetricGroup {
  key: string;
  label: string;
  items: Metric[];
}

export interface OverviewMetrics {
  groups: MetricGroup[];
  footnote: string;
}

/* —— 多级表头表格（两级 thead，最多嵌一层 children） —— */
export interface TableColumn {
  key: string;
  label: string;
  /** 顶层叶子（无 children）时给 rowspan=2 跨两行表头 */
  rowspan?: 1 | 2;
  /** 列宽，CSS 字符串（"120px" / "10%" 等） */
  width?: string;
  /** 二级表头 */
  children?: TableColumn[];
}

export interface TableRow {
  [columnKey: string]: string | number | undefined;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface PilotTable {
  /** Tab key */
  key: string;
  /** Tab 显示名 */
  label: string;
  columns: TableColumn[];
  rows: TableRow[];
  pagination: Pagination;
}

export interface OverviewPilots {
  tabs: PilotTable[];
}

/* —— 整页响应 —— */
export interface OverviewSummaryResponse {
  filters: OverviewFilters;
  metrics: OverviewMetrics;
  pilots: OverviewPilots;
}
