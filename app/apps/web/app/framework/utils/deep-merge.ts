/**
 * deepMerge —— 三层 config 合并的基础工具。
 *
 * 设计：
 * - 对象递归合并（右侧覆盖左侧）
 * - 数组按 stable key 合并（`code` / `key` / `field` 三选一）；元素都带 key 时按 key 字段级合并，否则整数组替换
 * - 标量 / null / undefined 直接覆盖
 *
 * 用法：`mergeAll(default, user, api)` —— 越靠右优先级越高（rightmost wins）。
 *
 * 边界：
 * - 合并两个数组，元素含同一 key → key 内部继续 deepMerge
 * - 同一 key 多次出现（数组里）：后者覆盖前者
 * - 元素无任何 stable key → 整数组替换（保守，避免按 index 合并导致错位）
 */

const KEY_FIELDS = ['code', 'key', 'field'] as const;

function keyOf(item: unknown): string | null {
  if (item == null || typeof item !== 'object') return null;
  const obj = item as Record<string, unknown>;
  for (const k of KEY_FIELDS) {
    const v = obj[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return null;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function mergeArrays(base: unknown[], overlay: unknown[]): unknown[] {
  const baseKeys = base.map(keyOf);
  const overlayKeys = overlay.map(keyOf);
  const allKeyed = baseKeys.every(k => k != null) && overlayKeys.every(k => k != null);

  if (!allKeyed) {
    // 没法稳定标识 → 整数组替换（更安全，避免按 index 错位）
    return [...overlay];
  }

  const out: unknown[] = [];
  const seen = new Set<string>();

  // 保留 base 顺序，命中 overlay 时字段级合并
  for (let i = 0; i < base.length; i++) {
    const k = baseKeys[i]!;
    const overlayIdx = overlayKeys.indexOf(k);
    if (overlayIdx >= 0) {
      out.push(deepMerge(base[i], overlay[overlayIdx]));
    }
    else {
      out.push(base[i]);
    }
    seen.add(k);
  }
  // overlay 独有的项追加在末尾
  for (let i = 0; i < overlay.length; i++) {
    const k = overlayKeys[i]!;
    if (!seen.has(k)) out.push(overlay[i]);
  }
  return out;
}

export function deepMerge(base: unknown, overlay: unknown): unknown {
  // overlay 为 undefined → 保留 base（user 层完全缺失时常见）
  if (overlay === undefined) return base;
  // overlay 显式 null → 用 null 覆盖（让上层能"清除"某字段）
  if (overlay === null) return null;
  if (base === undefined || base === null) return overlay;

  if (Array.isArray(base) && Array.isArray(overlay)) {
    return mergeArrays(base, overlay);
  }
  if (isPlainObject(base) && isPlainObject(overlay)) {
    const out: Record<string, unknown> = { ...base };
    for (const k of Object.keys(overlay)) {
      out[k] = deepMerge(base[k], overlay[k]);
    }
    return out;
  }
  // 类型不一致或都是标量 → overlay 覆盖
  return overlay;
}

/** 多层依次合并，越靠右优先级越高。null/undefined 层会被跳过。 */
export function mergeAll(...layers: unknown[]): unknown {
  return layers.reduce<unknown>((acc, layer) => {
    if (layer == null) return acc;
    if (acc == null) return layer;
    return deepMerge(acc, layer);
  }, undefined);
}
