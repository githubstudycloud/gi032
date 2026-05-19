/**
 * ManagementTable 通用 CRUD 后台的类型契约。
 * 任何「列表 + 顶部筛选 + 新增/编辑/删除」的管理页都用这一组类型。
 *
 * 跟 overview-summary.ts（看板用）独立 —— 业务模型不同：
 *   - 看板：N 级表头 / KPI / 下钻
 *   - 管理：单层表头 / 行操作（编辑、删除）/ 表单 / 弹窗
 */

/* —— 列定义 —— */

export type ColumnDisplay =
  | { kind: 'text' }
  | { kind: 'number'; precision?: number; thousand?: boolean; unit?: string }
  | { kind: 'percent'; precision?: number }
  | { kind: 'datetime'; format?: string }
  | { kind: 'badge'; color_map?: Record<string, string> };

export interface ManagementColumn {
  /** 数据 key */
  code: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  /** 'row_actions' 时按 `actions` 渲染按钮，否则按 display 渲染单元格 */
  cellType?: 'value' | 'row_actions';
  /** cellType=row_actions 时支持的动作（edit / delete / view ...） */
  actions?: ('edit' | 'delete' | 'view')[];
  display?: ColumnDisplay;
  sortable?: boolean;
}

/* —— 筛选定义（管理后台用简版，不复用看板的 FilterSpec） —— */

export type ManagementFilterKind = 'text' | 'enum_chips' | 'enum_radio' | 'date_range';

export interface ManagementFilter {
  code: string;
  label: string;
  kind: ManagementFilterKind;
  placeholder?: string;
  options?: { value: string; label: string }[];
  default?: unknown;
}

/* —— 表单字段定义 —— */

export type FormFieldKind = 'text' | 'textarea' | 'enum_radio' | 'enum_chips' | 'number';

export interface FormField {
  code: string;
  label: string;
  kind: FormFieldKind;
  required?: boolean;
  readonly_on_edit?: boolean;
  placeholder?: string;
  help?: string;
  default?: unknown;
  options?: { value: string; label: string }[];
  rows?: number;
  /** 仅在某字段为特定值时显示。例如 visible_if: { aggregation: 'computed' } */
  visible_if?: Record<string, unknown>;
}

/* —— 页面 config —— */

export interface ManagementPageConfig {
  title: string;
  subtitle?: string;
  list_endpoint: string;
  create_endpoint: string;
  update_endpoint: string; // 含 {id} 占位
  delete_endpoint: string; // 含 {id} 占位
  primary_key: string; // 通常 'id'
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  filters: ManagementFilter[];
  columns: ManagementColumn[];
  form_fields: FormField[];
}

/* —— 列表响应 —— */

export interface ManagementListResponse {
  items: Record<string, unknown>[];
  total: number;
  page: number;
  page_size: number;
}
