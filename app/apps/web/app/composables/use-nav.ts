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

/**
 * 取菜单项在某 locale 下的显示文案。
 * 解析顺序：label_i18n[locale] → label_i18n["zh-CN"] → label
 *
 * 不依赖 Vue 反应性，纯函数；在模板里配合 `useI18n().locale.value` 直接调用即可。
 */
export function localizedLabel(item: { label: string; label_i18n?: Record<string, string> } | null | undefined, locale: string): string {
  if (!item) return '';
  const map = item.label_i18n;
  if (map) {
    if (map[locale]) return map[locale];
    if (map['zh-CN']) return map['zh-CN'];
  }
  return item.label;
}

/**
 * 把一个菜单节点解析为「点击它应该跳的路径」。
 * - single（顶部独立页，如首页1）：用自身 path
 * - 叶子：用自身 path
 * - 中间节点（有 children）：递归找第一个未 disabled 的叶子；找不到再回退到自身 path
 *
 * 给顶部菜单 & 侧栏二级分组用，避免出现 /ai-test 这种无页面路径。
 */
export function firstLeafPath(item: NavItem): string | null {
  if (!item) return null;
  if (item.disabled) return null;
  if (item.single && item.path) return item.path;
  if (!item.children?.length) return item.path ?? null;
  for (const c of item.children) {
    const p = firstLeafPath(c);
    if (p) return p;
  }
  return item.path ?? null;
}
