import type { DataSourceMode, DataSourceOptions } from '~/types/data-source';

/**
 * 统一数据入口：现在读 public/mock 下的 JSON，未来切到后端只需改 runtimeConfig.public.dataSourceMode。
 *
 * 设计要点：
 * 1. params 始终保留 —— JSON 模式下不消费，仅在 API 模式下作为 query 透传，保证签名一致；
 * 2. transform 始终保留 —— 后端字段如果包含但形状对不上（包了 data/code、字段重命名等），
 *    在调用方写一个 transform 即可，业务代码不动；
 * 3. 返回的 data 是 transform 之后的内部模型；raw 是原始响应，调试用。
 */
export async function useDataSource<TRaw = unknown, T = TRaw>(
  opts: DataSourceOptions<TRaw, T>,
): Promise<{
  data: ComputedRef<T | null>;
  raw: Ref<TRaw | null>;
  error: Ref<unknown>;
  pending: Ref<boolean>;
  refresh: () => Promise<void>;
  mode: DataSourceMode;
  url: string;
}> {
  const cfg = useRuntimeConfig();
  const mode: DataSourceMode = opts.mode
    ?? (cfg.public.dataSourceMode as DataSourceMode)
    ?? 'json';

  const apiBase = (cfg.public.apiBase as string) ?? '';
  const mockBase = (cfg.public.mockBase as string) ?? '/mock';

  const url = mode === 'api'
    ? `${apiBase}${opts.apiPath}`
    : `${mockBase}${opts.jsonPath}`;

  const { data, error, pending, refresh } = await useAsyncData<TRaw>(
    opts.key,
    () => $fetch<TRaw>(url, mode === 'api' && opts.params ? { query: opts.params } : undefined),
    { immediate: opts.immediate ?? true },
  );

  const transformed = computed<T | null>(() => {
    if (data.value == null) return null;
    return opts.transform
      ? opts.transform(data.value)
      : (data.value as unknown as T);
  });

  return {
    data: transformed,
    raw: data as Ref<TRaw | null>,
    error: error as Ref<unknown>,
    pending,
    refresh: async (): Promise<void> => {
      await refresh();
    },
    mode,
    url,
  };
}
