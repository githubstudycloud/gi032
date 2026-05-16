import type { SidebarMenuItem, SidebarMenuResponse } from '~/types/nav';

/**
 * 左侧 2-3 层级菜单。
 * 后端返回扁平结构（带 parentKey）时，可在 transform 里组装成树。
 */
export async function useSidebarMenu(params?: { tenantId?: string; role?: string }): Promise<{
  items: ComputedRef<SidebarMenuItem[]>;
  raw: Ref<SidebarMenuResponse | null>;
  error: Ref<unknown>;
  pending: Ref<boolean>;
  refresh: () => Promise<void>;
}> {
  const ds = await useDataSource<SidebarMenuResponse, SidebarMenuItem[]>({
    key: 'nav-sidebar',
    jsonPath: '/nav-sidebar.json',
    apiPath: '/api/nav/sidebar',
    params,
    transform: (raw): SidebarMenuItem[] => raw?.items ?? [],
  });

  const items = computed<SidebarMenuItem[]>(() => ds.data.value ?? []);

  return {
    items,
    raw: ds.raw,
    error: ds.error,
    pending: ds.pending,
    refresh: ds.refresh,
  };
}
