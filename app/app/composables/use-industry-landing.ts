import type {
  OverviewSummaryResponse,
  OverviewFilters,
  OverviewMetrics,
  OverviewPilots,
} from '~/types/overview-summary';
import { OverviewSummaryResponseSchema } from '~/types/schemas';

/**
 * "产业落地进展"页（/ai-test/overview/industry）。
 * 结构跟"总览页"基本一致，复用同一组类型；
 * filters 多一个 timeRanges 字段，OverviewFilters 已经 optional 加上。
 */
export async function useIndustryLanding(params?: {
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
  const ds = await useDataSource<unknown, OverviewSummaryResponse>({
    key: 'industry-landing',
    jsonPath: '/pages/ai-test-overview-industry.json',
    apiPath: '/api/pages/ai-test/overview/industry',
    params,
    transform: (raw): OverviewSummaryResponse =>
      OverviewSummaryResponseSchema.parse(raw) as OverviewSummaryResponse,
  });

  return {
    data: ds.data,
    filters: computed(() => ds.data.value?.filters ?? null),
    metrics: computed(() => ds.data.value?.metrics ?? null),
    pilots: computed(() => ds.data.value?.pilots ?? null),
    error: ds.error,
    pending: ds.pending,
    refresh: ds.refresh,
  };
}
