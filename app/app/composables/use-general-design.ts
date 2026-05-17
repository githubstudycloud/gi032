import type {
  OverviewSummaryResponse,
  OverviewFilters,
  OverviewMetrics,
  OverviewPilots,
} from '~/types/overview-summary';
import { OverviewSummaryResponseSchema } from '~/types/schemas';

/**
 * "AI辅助测试设计"页（/ai-test/general/design）。
 * 复用 OverviewSummaryResponse：filter + 核心指标 + 单 tab 的 1 层表头明细。
 */
export async function useGeneralDesign(params?: {
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
    key: 'general-design',
    jsonPath: '/pages/ai-test-general-design.json',
    apiPath: '/api/pages/ai-test/general/design',
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
