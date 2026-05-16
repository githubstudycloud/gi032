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
  /** 部分页有时间范围筛选；总览页可以不返回 */
  timeRanges?: FilterOption[];
}

/* —— 核心指标 —— */
export type TrendDir = 'up' | 'down' | 'flat';

/**
 * 数值阈值规则（适用于 Metric 与表格单元格）。
 * - 把字符串里的数字解析出来（"62.4%" → 62.4 / "1,284" → 1284 / "+8.1%" → 8.1）
 * - 在 [min, max] 区间内取 goodColor，否则取 badColor
 * - 颜色直接是 Tailwind 颜色类名片段（emerald/rose/amber 等）或 CSS color 字符串
 */
export interface Threshold {
  min?: number;
  max?: number;
  /** 达标颜色 token：'emerald' | 'brand' | 'amber' | 'rose' | '#xxx' / oklch(...) */
  goodColor?: string;
  /** 不达标颜色 token */
  badColor?: string;
}

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
  /** 主数值阈值（可选） */
  threshold?: Threshold;
  /** 点击卡片展开的明细面板配置（可选；无则不展开，仅触发 drill 事件） */
  detail?: MetricDetail;
}

/* —— 指标明细面板（点击卡片下钻） —— */
export type MetricChartKind = 'trend' | 'distribution';

export interface TrendPoint {
  /** 横轴标签，如 '01月' / '2026-W18' */
  x: string;
  y: number;
}

export interface DistributionItem {
  key: string;
  label: string;
  value: number;
  /** 展示用文本（如 "62.4%"），不传则用 value */
  display?: string;
}

export interface MetricChart {
  key: string;
  kind: MetricChartKind;
  title: string;
  /** 单位（趋势图 Y 轴 / 分布图末尾，可选） */
  unit?: string;
  /** 趋势图数据 */
  points?: TrendPoint[];
  /** 分布图数据 */
  items?: DistributionItem[];
  /** 阈值（视觉参考线 / 颜色判定，可选） */
  threshold?: Threshold;
}

export interface MetricFilterDim {
  /** 'department' | 'role' | 'person' 等 */
  key: string;
  label: string;
  options: FilterOption[];
  /** 默认选中的 option key，缺省 = 第一个 */
  defaultKey?: string;
}

export interface MetricDetail {
  charts: MetricChart[];
  /** 右侧筛选区（部门/角色/人 等），可选 */
  filters?: MetricFilterDim[];
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
  /** 对齐：默认 center；可显式 left / right */
  align?: 'left' | 'center' | 'right';
  /** 列是否可排序（只有叶子列生效） */
  sortable?: boolean;
  /** 列是否可在表头里筛选（只有叶子列生效；用枚举下拉） */
  filterable?: boolean;
  /** 高亮列：表头与单元格底色突出（只有叶子列生效） */
  highlight?: boolean;
  /** 数值阈值（只有叶子列生效） */
  threshold?: Threshold;
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
