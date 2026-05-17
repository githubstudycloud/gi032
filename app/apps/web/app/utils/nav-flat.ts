import type { NavItem } from '~/types/nav';

export interface FlatNavItem extends NavItem {
  /** 从根到当前节点（含自身）的路径 */
  breadcrumb: { key: string; label: string }[];
}

/**
 * 把树形菜单铺平成"带路径的叶子节点列表"。
 * 主要用于：根据当前 route.path 反查"我现在在哪、面包屑是什么"。
 */
export function flattenNav(
  items: NavItem[],
  trail: { key: string; label: string }[] = [],
): FlatNavItem[] {
  const result: FlatNavItem[] = [];
  for (const item of items) {
    const breadcrumb = [...trail, { key: item.key, label: item.label }];
    if (item.path) {
      result.push({ ...item, breadcrumb });
    }
    if (item.children?.length) {
      result.push(...flattenNav(item.children, breadcrumb));
    }
  }
  return result;
}
