import type { ReportData } from '~/types/report-config';

/**
 * 读报表数据（rows + KPI values + drilldown rows）。
 *
 * mock 模式：整页拉一份 `/mock/reports/<type>/data.json`，前端按段切片。
 * api  模式：每段独立 endpoint（kpi / summary?tab=<key> / detail），由调用方按需触发。
 *
 * 本函数当前实现 mock 路径；api 路径在 dataSourceMode='api' 时再扩。
 * 切换时 useDataSource 会自己走 apiPath；这里继续暴露同样的 data ref。
 */
export async function useReportData(reportType: string): Promise<{
  data: ComputedRef<ReportData | null>;
  error: Ref<unknown>;
  pending: Ref<boolean>;
  refresh: () => Promise<void>;
}> {
  const ds = await useDataSource<unknown, ReportData>({
    key: `report-data:${reportType}`,
    jsonPath: `/reports/${reportType}/data.json`,
    apiPath: `/api/reports/${reportType}/data`, // api 阶段可以保留一个汇聚端点，或拆 kpi/summary/...
    transform: (raw): ReportData => raw as ReportData,
  });
  return {
    data: ds.data,
    error: ds.error,
    pending: ds.pending,
    refresh: ds.refresh,
  };
}
