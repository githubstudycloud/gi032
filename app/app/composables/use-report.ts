import type { ReportConfig, ReportData } from '~/types/report-config';

/**
 * 通用报表 composable —— 拉 config + data，维护筛选/分页/对比/刷新等查询状态。
 *
 * 实质上是 use-report-config + use-report-data 的组装层。
 * config / data 都用 useDataSource 走 jsonPath/apiPath 切换，业务页面不感知。
 *
 * 调用方拿到 reactive 状态后直接喂给 PageShell 模块即可。
 */
export async function useReport(reportType: string): Promise<{
  config: ComputedRef<ReportConfig | null>;
  data: ComputedRef<ReportData | null>;
  error: Ref<unknown>;
  pending: Ref<boolean>;
  refresh: () => Promise<void>;
  filterState: Ref<Record<string, unknown>>;
  pagingMode: Ref<'server' | 'client' | 'none'>;
  compare: Ref<'none' | 'prev_period' | 'prev_year'>;
}> {
  // 两个 useDataSource 并行启动 —— 避免顺序 await 导致 Nuxt context 在第二次调用时丢失。
  const [cfgDs, dataDs] = await Promise.all([
    useDataSource<unknown, ReportConfig>({
      key: `report-config:${reportType}`,
      jsonPath: `/reports/${reportType}/config.json`,
      apiPath: `/api/reports/${reportType}/config`,
      transform: (raw): ReportConfig => raw as ReportConfig,
    }),
    useDataSource<unknown, ReportData>({
      key: `report-data:${reportType}`,
      jsonPath: `/reports/${reportType}/data.json`,
      apiPath: `/api/reports/${reportType}/data`,
      transform: (raw): ReportData => raw as ReportData,
    }),
  ]);

  const filterState = ref<Record<string, unknown>>({});
  const pagingMode = ref<'server' | 'client' | 'none'>('client');
  const compare = ref<'none' | 'prev_period' | 'prev_year'>('none');

  // config 加载后初始化 filterState 默认 + pagingMode 默认
  watch(cfgDs.data, (cfg) => {
    if (!cfg) return;
    const next: Record<string, unknown> = { ...filterState.value };
    for (const f of cfg.filters ?? []) {
      if (next[f.code] === undefined && f.default !== undefined) {
        // default 形态多样：{value:'7d'} / '7d' / {from,to,preset} 等；
        // 简单策略：date_range 取 default 整体；其它取 default.value || default
        if (f.kind === 'date_range') {
          next[f.code] = f.default;
        }
        else if (f.default && typeof f.default === 'object' && 'value' in (f.default as object)) {
          next[f.code] = (f.default as { value: unknown }).value;
        }
        else {
          next[f.code] = f.default;
        }
      }
    }
    filterState.value = next;
    pagingMode.value = cfg.primary_view?.paging?.default_mode ?? 'client';
  }, { immediate: true });

  async function refresh(): Promise<void> {
    await Promise.all([cfgDs.refresh(), dataDs.refresh()]);
  }

  const pending = computed<boolean>(() => cfgDs.pending.value || dataDs.pending.value);
  const error = computed<unknown>(() => cfgDs.error.value || dataDs.error.value);

  return {
    config: cfgDs.data,
    data: dataDs.data,
    error: error as unknown as Ref<unknown>,
    pending: pending as unknown as Ref<boolean>,
    refresh,
    filterState,
    pagingMode,
    compare,
  };
}
