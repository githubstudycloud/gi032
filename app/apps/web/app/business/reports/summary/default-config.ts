/**
 * summary 报表 —— 内置默认配置（Layer 1 of 3）。详见 `industry/default-config.ts` 说明。
 */
import type { ReportConfig } from '~/types/report-config';

export const defaultConfig: Partial<ReportConfig> = {
  meta: {
    report_type: 'summary',
    name: '总览',
    version: 1,
  },
  toolbar: {
    show_refresh: true,
  },
  filters: [],
};
