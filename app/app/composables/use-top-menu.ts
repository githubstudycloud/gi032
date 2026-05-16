import type { TopMenuItem, TopMenuResponse } from '~/types/nav';

/**
 * 顶部一级菜单。
 * 后端可按 tenant / role 返回不同列表 —— params 已预留。
 */
export async function useTopMenu(params?: { tenantId?: string; role?: string }): Promise<{
  items: ComputedRef<TopMenuItem[]>;
  raw: Ref<TopMenuResponse | null>;
  error: Ref<unknown>;
  pending: Ref<boolean>;
  refresh: () => Promise<void>;
}> {
  const ds = await useDataSource<TopMenuResponse, TopMenuItem[]>({
    key: 'nav-top',
    jsonPath: '/nav-top.json',
    apiPath: '/api/nav/top',
    params,
    transform: (raw): TopMenuItem[] => raw?.items ?? [],
  });

  const items = computed<TopMenuItem[]>(() => ds.data.value ?? []);

  return {
    items,
    raw: ds.raw,
    error: ds.error,
    pending: ds.pending,
    refresh: ds.refresh,
  };
}
