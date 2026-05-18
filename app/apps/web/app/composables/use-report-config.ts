import type { ReportConfig } from '~/types/report-config';
import { ReportConfigSchema } from '~/types/report-schemas';

/**
 * 读报表配置（标题/筛选/列/KPI 定义/下钻定义）—— 一次性，按 version 缓存。
 *
 * mock 模式：`/mock/reports/<type>/config.json`
 * api  模式：`/api/reports/<type>/config`
 *
 * 切换由 runtimeConfig.public.dataSourceMode 控制；业务页不感知。
 *
 * 协议校验：transform 走 Zod 强校验，schema 漂移 / 字段缺失会立即抛 ZodError
 * （由 use-data-source 的 useAsyncData 进入 error 状态，UI 显示 ErrorPanel），
 * 避免坏数据传到下游组件造成静默渲染异常。
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
    transform: (raw): ReportConfig => ReportConfigSchema.parse(raw) as ReportConfig,
  });
  return {
    config: ds.data,
    error: ds.error,
    pending: ds.pending,
    refresh: ds.refresh,
  };
}
