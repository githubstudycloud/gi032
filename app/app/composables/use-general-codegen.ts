import type {
  OverviewSummaryResponse,
  OverviewFilters,
  OverviewMetrics,
  OverviewPilots,
} from '~/types/overview-summary';

/**
 * "AI辅助测试代码生成"页（/ai-test/general/codegen）。
 * 复用 OverviewSummaryResponse：filter + 核心指标 + 2 tabs（总览页同款 2 层表头）。
 */
export async function useGeneralCodegen(params?: {
  timeRange?: string;
  department?: string;
}): Promise<{
  data: ComputedRef<OverviewSummaryResponse | null>;
  filters: ComputedRef<OverviewFilters | null>;
  metrics: ComputedRef<OverviewMetrics | null>;
  pilots: ComputedRef<OverviewPilots | null>;
  error: Ref<unknown>;
  pending: Ref<boolean>;
  refresh: () => Promise<void>;
}> {
  const ds = await useDataSource<OverviewSummaryResponse, OverviewSummaryResponse>({
    key: 'general-codegen',
    jsonPath: '/pages/ai-test-general-codegen.json',
    apiPath: '/api/pages/ai-test/general/codegen',
    params,
    transform: (raw): OverviewSummaryResponse => raw,
  });

  return {
    data:    ds.data,
    filters: computed(() => ds.data.value?.filters ?? null),
    metrics: computed(() => ds.data.value?.metrics ?? null),
    pilots:  computed(() => ds.data.value?.pilots ?? null),
    error:   ds.error,
    pending: ds.pending,
    refresh: ds.refresh,
  };
}
