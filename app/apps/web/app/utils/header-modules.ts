/**
 * header_modules → MultiLevelTable 列树转换器。
 *
 * Phase 6 设计：
 * - PrimaryViewTab 同时保留 `header_tree` 与 `header_modules`，**优先读 `header_modules`**。
 * - 每个 module 转成一个顶层 column group：`{ key: '__module__:<k>', label: <m.label>, children: m.columns }`。
 * - MultiLevelTable 的多级表头算法（depthOf / leavesOf / thRowCells）天然支持这种顶层包装。
 *
 * 后续扩展空间（不在 Phase 6 范围）：
 * - 按 module 折叠（collapsible）
 * - 按 module 切换可见列（default_visible）
 * - 按 module 关联 [data-report-scope]（style_scope）
 *
 * 为何不直接改 PrimaryViewTab.header_tree？
 * - 协议字段语义不同：header_tree 是纯渲染树，header_modules 是有语义的分组
 *   （携带 description / scope / 可见性等扩展位）
 * - 给 modules 单独命名空间便于未来 UI 区分两套数据流
 */
import type { PrimaryViewTab } from '~/types/report-config';
import type { TableColumn } from '~/types/overview-summary';

const MODULE_KEY_PREFIX = '__module__:';

/** 把 module key 包成顶层 TableColumn 的 key，避免和真正的业务列 key 撞名。 */
export function moduleColumnKey(moduleKey: string): string {
  return `${MODULE_KEY_PREFIX}${moduleKey}`;
}

export function isModuleColumnKey(key: string): boolean {
  return key.startsWith(MODULE_KEY_PREFIX);
}

/**
 * 把 tab 解析成扁平的列树：
 *   - 有 `header_modules` → 每个 module 包装成顶层 column group
 *   - 否则 fallback 到 `header_tree`
 *   - 都没有 → 空数组
 */
export function tabToColumns(tab: PrimaryViewTab): TableColumn[] {
  if (tab.header_modules?.length) {
    return tab.header_modules.map((m): TableColumn => ({
      key: moduleColumnKey(m.key),
      label: m.label,
      children: m.columns,
    }));
  }
  return (tab.header_tree ?? []) as TableColumn[];
}
