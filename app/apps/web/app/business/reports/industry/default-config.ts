/**
 * industry 报表 —— 内置默认配置（Layer 1 of 3）。
 *
 * 合并顺序：default (本文件) → user (`/user-data/reports/industry/config.json`)
 * → api (`/api/reports/industry/config`)；右侧覆盖左侧。
 *
 * 本文件只放"打不开后端 / 用户也没自定义时仍要能渲染出空壳"的最小集合：
 * - meta：标题 + 版本
 * - toolbar：基础开关
 * - filters：空数组（不强制塞默认筛选器，避免按一个不存在的下拉空 loading）
 *
 * 完整字段（kpi / primary_view / drilldowns）由 API 或 mock 提供。
 */
import type { ReportConfig } from '~/framework/types/report-config';

export const defaultConfig: Partial<ReportConfig> = {
  meta: {
    report_type: 'industry',
    name: '产业落地进展',
    version: 1,
  },
  toolbar: {
    show_refresh: true,
    show_paging_mode: false,
    show_compare: false,
    show_column_customizer: false,
    show_export: false,
  },
  filters: [],
};
