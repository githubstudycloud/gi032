import type {
  OverviewSummaryResponse,
  OverviewFilters,
  OverviewMetrics,
  OverviewPilots,
} from '~/types/overview-summary';
import { OverviewSummaryResponseSchema } from '~/types/schemas';

/**
 * 总览页的整页数据。
 *
 * transform 里走 Zod 校验：JSON / 后端返回的形状对不上会直接抛错（带 path），
 * UI 层拿到 error 后渲染错误卡 + 重试按钮。
 *
 * 后端切换时三个 endpoint 怎么对应都行：
 *   - 一次返回整页 → 直接走当前 apiPath；
 *   - 拆三个 endpoint → 在这里改成 Promise.all([...]) 拼装；
 *   - 字段名对不上 → transform 里在 schema.parse 之前先映射。
 */
export async function useOverviewSummary(params?: {
  department?: string;
  /** 后续可加 dateRange 等 */
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
    key: 'overview-summary',
    jsonPath: '/pages/ai-test-overview-summary.json',
    apiPath: '/api/pages/ai-test/overview/summary',
    params,
    transform: (raw): OverviewSummaryResponse =>
      OverviewSummaryResponseSchema.parse(raw) as OverviewSummaryResponse,
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
