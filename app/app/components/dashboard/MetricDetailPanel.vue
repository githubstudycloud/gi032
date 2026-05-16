<script setup lang="ts">
/**
 * 指标明细面板（点击卡片下钻）
 * - 渲染若干 `MetricChart`（trend 折线 / distribution 横向柱）
 * - 右侧可选筛选条：部门 / 角色 / 人 等多维度
 * - 纯 SVG 实现，零图表库依赖
 */
import type { Metric, MetricChart, MetricFilterDim, TrendPoint, DistributionItem } from '~/types/overview-summary';

const props = defineProps<{
  metric: Metric;
}>();

const emit = defineEmits<{
  close: [];
  filterChange: [filters: Record<string, string>];
}>();

const detail = computed(() => props.metric.detail);

/* —— 筛选状态 —— */
const filterState = ref<Record<string, string>>({});
watch(
  () => detail.value?.filters,
  (dims) => {
    const next: Record<string, string> = {};
    for (const d of dims ?? []) {
      next[d.key] = d.defaultKey ?? d.options[0]?.key ?? '';
    }
    filterState.value = next;
  },
  { immediate: true },
);

function onFilterChange(dim: MetricFilterDim, value: string): void {
  filterState.value = { ...filterState.value, [dim.key]: value };
  emit('filterChange', { ...filterState.value });
}

/* —— 趋势折线坐标计算 —— */
const TREND_W = 520;
const TREND_H = 140;
const PAD = { top: 12, right: 8, bottom: 22, left: 32 };

function trendGeo(chart: MetricChart): {
  linePath: string;
  areaPath: string;
  points: { x: number; y: number; raw: TrendPoint }[];
  yTicks: { y: number; label: string }[];
  xLabels: { x: number; label: string }[];
  thresholdY: number | null;
} {
  const pts = chart.points ?? [];
  if (pts.length === 0) {
    return { linePath: '', areaPath: '', points: [], yTicks: [], xLabels: [], thresholdY: null };
  }
  const ys = pts.map(p => p.y);
  const minY = Math.min(...ys, chart.threshold?.min ?? Infinity);
  const maxY = Math.max(...ys, chart.threshold?.max ?? -Infinity);
  const lo = Number.isFinite(minY) ? minY : Math.min(...ys);
  const hi = Number.isFinite(maxY) ? maxY : Math.max(...ys);
  const span = hi - lo || 1;
  const yLo = lo - span * 0.1;
  const yHi = hi + span * 0.1;

  const innerW = TREND_W - PAD.left - PAD.right;
  const innerH = TREND_H - PAD.top - PAD.bottom;

  const xAt = (i: number): number => {
    if (pts.length === 1) return PAD.left + innerW / 2;
    return PAD.left + (i / (pts.length - 1)) * innerW;
  };
  const yAt = (v: number): number => PAD.top + (1 - (v - yLo) / (yHi - yLo)) * innerH;

  const mapped = pts.map((p, i) => ({ x: xAt(i), y: yAt(p.y), raw: p }));
  const linePath = mapped.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath =
    `${linePath} L ${mapped[mapped.length - 1]!.x.toFixed(1)} ${(PAD.top + innerH).toFixed(1)} ` +
    `L ${mapped[0]!.x.toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`;

  const yTicks = [0, 0.5, 1].map(t => ({
    y: PAD.top + t * innerH,
    label: (yHi - t * (yHi - yLo)).toFixed(yHi - yLo < 10 ? 1 : 0),
  }));

  // 最多取 6 个 x 标签
  const step = Math.max(1, Math.ceil(pts.length / 6));
  const xLabels = mapped
    .map((p, i) => ({ x: p.x, label: p.raw.x, i }))
    .filter(p => p.i % step === 0 || p.i === pts.length - 1)
    .map(p => ({ x: p.x, label: p.label }));

  const thresholdY = chart.threshold?.min !== undefined ? yAt(chart.threshold.min) : null;

  return { linePath, areaPath, points: mapped, yTicks, xLabels, thresholdY };
}

/* —— 分布横向柱 —— */
function distMax(items: DistributionItem[]): number {
  return Math.max(1, ...items.map(i => i.value));
}

/* —— 悬停点状态 —— */
const hoverPoint = ref<{ chartKey: string; index: number } | null>(null);
</script>

<template>
  <div
    v-if="detail"
    class="rounded-lg border border-brand-200/70 bg-gradient-to-br from-brand-50/40 to-surface shadow-[var(--shadow-card)] overflow-hidden"
  >
    <!-- 头部：标题 + 关闭 -->
    <header class="flex items-center gap-2 px-4 py-2.5 border-b border-ink-100 bg-surface/80">
      <span class="inline-block w-1 h-3.5 rounded-full bg-brand-500" />
      <h3 class="font-display text-[13px] font-semibold text-ink-900 tracking-tight">
        {{ metric.label }} · 明细
      </h3>
      <span class="text-[11px] text-ink-500 font-mono">{{ metric.key }}</span>
      <div class="flex-1" />
      <button
        type="button"
        aria-label="关闭明细"
        class="h-6 w-6 inline-flex items-center justify-center rounded text-ink-500 hover:text-ink-900 hover:bg-ink-100 transition-colors"
        @click="emit('close')"
      >
        <svg viewBox="0 0 16 16" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.6">
          <path d="M3 3l10 10M13 3L3 13" stroke-linecap="round" />
        </svg>
      </button>
    </header>

    <!-- 内容：左图表 + 右筛选 -->
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-4 px-4 py-3.5">
      <!-- 图表区 -->
      <div class="space-y-4 min-w-0">
        <section v-for="chart in detail.charts" :key="chart.key" class="rounded-md border border-ink-200/60 bg-surface p-3">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-[12px] font-medium text-ink-800">{{ chart.title }}</h4>
            <span v-if="chart.unit" class="text-[10.5px] text-ink-500">单位：{{ chart.unit }}</span>
          </div>

          <!-- 趋势折线 -->
          <template v-if="chart.kind === 'trend' && chart.points?.length">
            <div class="relative">
              <svg :viewBox="`0 0 ${TREND_W} ${TREND_H}`" class="w-full h-[140px]" preserveAspectRatio="none">
                <!-- 网格 -->
                <g>
                  <line
                    v-for="(t, i) in trendGeo(chart).yTicks"
                    :key="`g-${i}`"
                    :x1="PAD.left" :x2="TREND_W - PAD.right"
                    :y1="t.y" :y2="t.y"
                    stroke="currentColor" class="text-ink-200" stroke-dasharray="2 3"
                  />
                </g>
                <!-- 阈值线 -->
                <line
                  v-if="trendGeo(chart).thresholdY !== null"
                  :x1="PAD.left" :x2="TREND_W - PAD.right"
                  :y1="trendGeo(chart).thresholdY!" :y2="trendGeo(chart).thresholdY!"
                  stroke="currentColor" class="text-amber-500" stroke-dasharray="4 4" stroke-width="1"
                />
                <!-- 面积 -->
                <path :d="trendGeo(chart).areaPath" fill="url(#trend-grad)" opacity="0.55" />
                <!-- 折线 -->
                <path :d="trendGeo(chart).linePath" fill="none" stroke="currentColor" class="text-brand-600" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" />
                <!-- 端点 -->
                <g>
                  <circle
                    v-for="(p, i) in trendGeo(chart).points"
                    :key="`pt-${i}`"
                    :cx="p.x" :cy="p.y" :r="hoverPoint?.chartKey === chart.key && hoverPoint?.index === i ? 4 : 2.5"
                    fill="currentColor" class="text-brand-600 cursor-pointer transition-all"
                    @mouseenter="hoverPoint = { chartKey: chart.key, index: i }"
                    @mouseleave="hoverPoint = null"
                  >
                    <title>{{ p.raw.x }}: {{ p.raw.y }}{{ chart.unit ?? '' }}</title>
                  </circle>
                </g>
                <!-- Y 刻度 -->
                <g class="text-ink-500" style="font-size: 9px;">
                  <text v-for="(t, i) in trendGeo(chart).yTicks" :key="`yt-${i}`"
                    :x="PAD.left - 4" :y="t.y + 3" text-anchor="end" fill="currentColor">{{ t.label }}</text>
                </g>
                <!-- X 刻度 -->
                <g class="text-ink-500" style="font-size: 9px;">
                  <text v-for="(t, i) in trendGeo(chart).xLabels" :key="`xt-${i}`"
                    :x="t.x" :y="TREND_H - 6" text-anchor="middle" fill="currentColor">{{ t.label }}</text>
                </g>
                <defs>
                  <linearGradient id="trend-grad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="currentColor" class="text-brand-400" stop-opacity="0.45" />
                    <stop offset="100%" stop-color="currentColor" class="text-brand-400" stop-opacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </template>

          <!-- 分布横向柱 -->
          <template v-else-if="chart.kind === 'distribution' && chart.items?.length">
            <ul class="space-y-1.5">
              <li v-for="item in chart.items" :key="item.key" class="flex items-center gap-2 text-[12px]">
                <span class="w-20 shrink-0 text-ink-700 truncate" :title="item.label">{{ item.label }}</span>
                <div class="flex-1 h-4 rounded bg-ink-100 overflow-hidden relative">
                  <div
                    class="h-full bg-brand-500/85 rounded transition-all"
                    :style="{ width: `${(item.value / distMax(chart.items!)) * 100}%` }"
                  />
                </div>
                <span class="w-14 shrink-0 text-right tabular-nums text-ink-800 font-medium">
                  {{ item.display ?? item.value }}{{ item.display ? '' : (chart.unit ?? '') }}
                </span>
              </li>
            </ul>
          </template>

          <p v-else class="text-[11px] text-ink-400 py-4 text-center">暂无数据</p>
        </section>
      </div>

      <!-- 右侧筛选 -->
      <aside
        v-if="detail.filters?.length"
        class="rounded-md border border-ink-200/60 bg-surface p-3 space-y-3 self-start"
      >
        <div class="flex items-center gap-1.5">
          <svg viewBox="0 0 16 16" class="w-3.5 h-3.5 text-brand-600" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M2 3h12l-4.5 6v4l-3 1.5V9L2 3z" stroke-linejoin="round" />
          </svg>
          <span class="text-[11px] font-medium text-ink-700">筛选维度</span>
        </div>
        <div v-for="dim in detail.filters" :key="dim.key" class="space-y-1">
          <label :for="`mdp-${metric.key}-${dim.key}`" class="block text-[11px] text-ink-500">
            {{ dim.label }}
          </label>
          <select
            :id="`mdp-${metric.key}-${dim.key}`"
            :value="filterState[dim.key]"
            class="w-full h-7 px-2 text-[12px] rounded border border-ink-200 bg-surface text-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-colors"
            @change="onFilterChange(dim, ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="opt in dim.options" :key="opt.key" :value="opt.key">{{ opt.label }}</option>
          </select>
        </div>
      </aside>
    </div>
  </div>
</template>
