import type { Threshold } from '~/types/overview-summary';

/** 从 "62.4%" / "1,284" / "+8.1%" / "-0.3" 等字符串里抽出数字 */
export function parseNumeric(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/,/g, '').trim();
  const m = s.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

/** 颜色 token → Tailwind class（用于背景柔色 + 文本色） */
function colorClasses(token: string | undefined, kind: 'text' | 'bg'): string {
  if (!token) return '';
  // 内置 token
  const map: Record<string, { text: string; bg: string }> = {
    emerald: { text: 'text-emerald-600', bg: 'bg-emerald-50' },
    green:   { text: 'text-emerald-600', bg: 'bg-emerald-50' },
    brand:   { text: 'text-brand-700',   bg: 'bg-brand-50'   },
    blue:    { text: 'text-brand-700',   bg: 'bg-brand-50'   },
    amber:   { text: 'text-amber-600',   bg: 'bg-amber-50'   },
    yellow:  { text: 'text-amber-600',   bg: 'bg-amber-50'   },
    rose:    { text: 'text-rose-600',    bg: 'bg-rose-50'    },
    red:     { text: 'text-rose-600',    bg: 'bg-rose-50'    },
    ink:     { text: 'text-ink-900',     bg: 'bg-ink-50'     },
  };
  const hit = map[token];
  return hit ? hit[kind] : '';
}

/**
 * 根据阈值 + 单元格值，返回应用的 class（仅文本色变化，颜色含义：
 * 在 [min, max] 用 goodColor，否则 badColor。
 * 任一端未提供 → 该方向不约束。值非数字 → 无样式。
 */
export function thresholdClass(value: unknown, t: Threshold | undefined): string {
  if (!t) return '';
  const n = parseNumeric(value);
  if (n === null) return '';
  const okMin = t.min === undefined || n >= t.min;
  const okMax = t.max === undefined || n <= t.max;
  const good = okMin && okMax;
  return colorClasses(good ? t.goodColor : t.badColor, 'text') + ' font-medium';
}

/** 阈值"胶囊"样式：文本色 + 软背景色，用于在单元格里包一层 inline pill。 */
export function thresholdPillClass(value: unknown, t: Threshold | undefined): string {
  if (!t) return '';
  const n = parseNumeric(value);
  if (n === null) return '';
  const okMin = t.min === undefined || n >= t.min;
  const okMax = t.max === undefined || n <= t.max;
  const good = okMin && okMax;
  const token = good ? t.goodColor : t.badColor;
  const text = colorClasses(token, 'text');
  const bg = colorClasses(token, 'bg');
  return `${text} ${bg} ring-1 ring-current/10`;
}
