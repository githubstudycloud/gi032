import type { NavItem, NavResponse } from '~/types/nav';

/**
 * 整棵菜单树 + 当前激活的一级菜单派生量。
 * 顶部菜单 = items；左侧侧栏 = activeTop.children；面包屑 / 高亮 = 用 route.path 反查。
 *
 * 后端切换时只改 jsonPath/apiPath 即可；如果字段对不上在 transform 里映射。
 */
export async function useNav(params?: { tenantId?: string; role?: string }): Promise<{
  items: ComputedRef<NavItem[]>;
  activeTop: ComputedRef<NavItem | null>;
  activeTopKey: ComputedRef<string | null>;
  showSidebar: ComputedRef<boolean>;
  raw: Ref<NavResponse | null>;
  error: Ref<unknown>;
  pending: Ref<boolean>;
  refresh: () => Promise<void>;
}> {
  // 先拿 route —— 一定要在任何 await 之前调，否则 Nuxt 上下文已经丢
  const route = useRoute();

  const ds = await useDataSource<NavResponse, NavItem[]>({
    key: 'nav',
    jsonPath: '/nav.json',
    apiPath: '/api/nav',
    params,
    transform: (raw): NavItem[] => raw?.items ?? [],
  });

  const items = computed<NavItem[]>(() => ds.data.value ?? []);

  const activeTop = computed<NavItem | null>(() => {
    const path = route.path;
    for (const top of items.value) {
      if (isPathUnderItem(path, top)) return top;
    }
    return null;
  });

  const activeTopKey = computed<string | null>(() => activeTop.value?.key ?? null);
  const showSidebar = computed<boolean>(
    () => !!activeTop.value && !activeTop.value.single,
  );

  return {
    items,
    activeTop,
    activeTopKey,
    showSidebar,
    raw: ds.raw,
    error: ds.error,
    pending: ds.pending,
    refresh: ds.refresh,
  };
}

/* —— 工具：判断当前路由是否落在某一级菜单下（自身或后代） —— */

function pathHits(currentPath: string, itemPath: string | undefined): boolean {
  if (!itemPath) return false;
  if (itemPath === '/') return currentPath === '/';
  return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
}

function isPathUnderItem(currentPath: string, item: NavItem): boolean {
  if (pathHits(currentPath, item.path)) return true;
  if (item.children?.length) {
    for (const c of item.children) {
      if (isPathUnderItem(currentPath, c)) return true;
    }
  }
  return false;
}
