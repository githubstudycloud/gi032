/**
 * 颜色 token → Tailwind 文本类（用于 SVG currentColor 着色）
 * 与项目主题 OKLCH 色阶保持一致。
 */
export const CHART_COLORS = {
  brand:   'text-brand-500',
  emerald: 'text-emerald-500',
  amber:   'text-amber-500',
  rose:    'text-rose-500',
  violet:  'text-violet-500',
  sky:     'text-sky-500',
  pink:    'text-pink-500',
  slate:   'text-slate-500',
} as const;

export type ChartColorToken = keyof typeof CHART_COLORS;

/** 按索引循环取调色板（无 color 字段时兜底） */
export const PALETTE: ChartColorToken[] = [
  'brand', 'emerald', 'amber', 'violet', 'sky', 'rose', 'pink', 'slate',
];

export function colorClass(token: string | undefined, fallbackIndex = 0): string {
  if (token && token in CHART_COLORS) return CHART_COLORS[token as ChartColorToken];
  return CHART_COLORS[PALETTE[fallbackIndex % PALETTE.length]!];
}

/** 把 hex/oklch 直接返回；不在已知 token 表里则原样返回，让 SVG fill 直接吃 */
export function rawColorOrCurrent(token: string | undefined): string | null {
  if (!token) return null;
  if (token in CHART_COLORS) return null; // 走 currentColor
  // 形如 '#abc' / 'oklch(...)' / 'rgb(...)' 直接当 CSS 颜色
  return token;
}
