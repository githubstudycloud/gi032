import type { ReportConfig } from '~/types/report-config';

/**
 * 读报表配置（标题/筛选/列/KPI 定义/下钻定义）—— 一次性，按 version 缓存。
 *
 * mock 模式：`/mock/reports/<type>/config.json`
 * api  模式：`/api/reports/<type>/config`
 *
 * 切换由 runtimeConfig.public.dataSourceMode 控制；业务页不感知。
 */
export async function useReportConfig(reportType: string): Promise<{
  config: ComputedRef<ReportConfig | null>;
  error: Ref<unknown>;
  pending: Ref<boolean>;
  refresh: () => Promise<void>;
}> {
  const ds = await useDataSource<unknown, ReportConfig>({
    key: `report-config:${reportType}`,
    jsonPath: `/reports/${reportType}/config.json`,
    apiPath: `/api/reports/${reportType}/config`,
    transform: (raw): ReportConfig => raw as ReportConfig,
    // TODO: 接 Zod ReportConfigSchema.parse 之后这里换成 .parse(raw)
  });
  return {
    config: ds.data,
    error: ds.error,
    pending: ds.pending,
    refresh: ds.refresh,
  };
}
