import type {
  OverviewSummaryResponse,
  OverviewFilters,
  OverviewMetrics,
  OverviewPilots,
} from '~/types/overview-summary';

/**
 * "领域落地进展"页（/ai-test/overview/domain）。
 * 复用 OverviewSummaryResponse：filter + 核心指标 + 单 tab 的 2 层表头明细。
 */
export async function useDomainLanding(params?: {
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
    key: 'domain-landing',
    jsonPath: '/pages/ai-test-overview-domain.json',
    apiPath: '/api/pages/ai-test/overview/domain',
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
