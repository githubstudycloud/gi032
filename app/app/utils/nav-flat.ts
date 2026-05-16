import type { SidebarMenuItem } from '~/types/nav';

export interface FlatSidebarItem extends SidebarMenuItem {
  /** 从根到当前节点的路径（含自身） */
  breadcrumb: { key: string; label: string }[];
}

/**
 * 把树形菜单铺平，只保留"带 path 的叶子节点"。
 * 用于按当前路由反查标题 / 面包屑。
 */
export function flattenSidebarMenu(
  items: SidebarMenuItem[],
  trail: { key: string; label: string }[] = [],
): FlatSidebarItem[] {
  const result: FlatSidebarItem[] = [];
  for (const item of items) {
    const breadcrumb = [...trail, { key: item.key, label: item.label }];
    if (item.path) {
      result.push({ ...item, breadcrumb });
    }
    if (item.children?.length) {
      result.push(...flattenSidebarMenu(item.children, breadcrumb));
    }
  }
  return result;
}
