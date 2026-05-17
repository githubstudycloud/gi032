<script setup lang="ts">
/**
 * 指标明细面板（点击卡片下钻）
 *
 * 设计：
 * - 头部：标题 + 顶部横向筛选条（部门/角色/接口人…）+ 关闭按钮
 * - 内容：3 列网格的图表卡片（lg 屏 3 / md 屏 2 / 移动端 1）
 * - 单卡：标题 + 副标题 + 图表本体 + 阈值 chip
 * - 图表种类：trend / distribution / donut / bar / gauge / stacked / heatmap / radar
 *   （所有图表都是独立 SFC，纯 SVG，零外部依赖）
 *
 * 复用：任意 `Metric` 加 `detail: { charts, filters? }` 即可启用。
 */
import type { Metric, MetricChart, MetricFilterDim } from '~/types/overview-summary';

const { t } = useI18n();

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

/* —— variant 解析：按维度签名命中 chart.variants 的覆盖，未命中回退 base —— */
function resolveChart(chart: MetricChart): MetricChart {
  if (!chart.variants) return chart;
  const dims = detail.value?.filters ?? [];
  const values = dims.map(d => filterState.value[d.key] || 'all');
  // 从最具体的签名往回回退到 all|all|...
  for (let i = values.length; i >= 0; i--) {
    const sig = [
      ...values.slice(0, i),
      ...Array(values.length - i).fill('all'),
    ].join('|');
    const override = chart.variants[sig];
    if (override) {
      return { ...chart, ...override };
    }
  }
  return chart;
}

const resolvedCharts = computed<MetricChart[]>(() =>
  (detail.value?.charts ?? []).map(resolveChart),
);

/** 图表卡片背景的轻微强调色（按 kind 微调） */
function cardAccent(kind: MetricChart['kind']): string {
  switch (kind) {
    case 'trend': return 'from-brand-50/50 to-surface';
    case 'distribution': return 'from-sky-50/50 to-surface';
    case 'donut': return 'from-violet-50/50 to-surface';
    case 'bar': return 'from-emerald-50/40 to-surface';
    case 'gauge': return 'from-amber-50/40 to-surface';
    case 'stacked': return 'from-pink-50/30 to-surface';
    case 'heatmap': return 'from-sky-50/40 to-surface';
    case 'radar': return 'from-violet-50/40 to-surface';
    default: return 'from-ink-50/40 to-surface';
  }
}

function thresholdChip(chart: MetricChart): string | null {
  const t = chart.threshold;
  if (!t) return null;
  if (t.min !== undefined && t.max !== undefined) return `阈值 ${t.min} ~ ${t.max}`;
  if (t.min !== undefined) return `≥ ${t.min}${chart.unit ?? ''}`;
  if (t.max !== undefined) return `≤ ${t.max}${chart.unit ?? ''}`;
  return null;
}
</script>

<template>
  <div
    v-if="detail"
    class="rounded-lg border border-brand-200/70 bg-gradient-to-br from-brand-50/40 to-surface shadow-[var(--shadow-card)] overflow-hidden"
  >
    <!-- 头部：标题 + 横向筛选 + 关闭 -->
    <header class="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 border-b border-ink-100 bg-surface/85 backdrop-blur">
      <div class="flex items-center gap-2 min-w-0">
        <span class="inline-block w-1 h-3.5 rounded-full bg-brand-500" />
        <h3 class="font-display text-[13px] font-semibold text-ink-900 tracking-tight truncate">
          {{ metric.label }} · {{ t('common.detail') }}
        </h3>
        <span class="text-[10.5px] text-ink-500 font-mono">{{ metric.key }}</span>
      </div>

      <!-- 横向筛选条 -->
      <div v-if="detail.filters?.length" class="flex flex-wrap items-center gap-x-3 gap-y-1.5 ml-auto">
        <div v-for="dim in detail.filters" :key="dim.key" class="inline-flex items-center gap-1.5">
          <label :for="`mdp-${metric.key}-${dim.key}`" class="text-[11px] text-ink-500">
            {{ dim.label }}
          </label>
          <select
            :id="`mdp-${metric.key}-${dim.key}`"
            :value="filterState[dim.key]"
            class="h-6 px-2 pr-6 text-[11.5px] rounded border border-ink-200 bg-surface text-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-colors"
            @change="onFilterChange(dim, ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="opt in dim.options" :key="opt.key" :value="opt.key">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>

      <button
        type="button"
        :aria-label="t('metric.closeDetail')"
        :class="['h-6 w-6 inline-flex items-center justify-center rounded text-ink-500 hover:text-ink-900 hover:bg-ink-100 transition-colors', detail.filters?.length ? '' : 'ml-auto']"
        @click="emit('close')"
      >
        <svg viewBox="0 0 16 16" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.6">
          <path d="M3 3l10 10M13 3L3 13" stroke-linecap="round" />
        </svg>
      </button>
    </header>

    <!-- 3 列图表网格 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 px-4 py-3.5">
      <section
        v-for="chart in resolvedCharts"
        :key="chart.key"
        :class="[
          'rounded-md border border-ink-200/60 bg-gradient-to-br shadow-[var(--shadow-card)] overflow-hidden flex flex-col',
          cardAccent(chart.kind),
        ]"
      >
        <header class="px-3 pt-2.5 pb-2 flex items-start gap-2">
          <div class="min-w-0 flex-1">
            <h4 class="text-[12px] font-semibold text-ink-900 leading-tight truncate">
              {{ chart.title }}
            </h4>
            <p v-if="chart.subtitle" class="text-[10.5px] text-ink-500 mt-0.5 leading-snug line-clamp-2">
              {{ chart.subtitle }}
            </p>
          </div>
          <span
            v-if="thresholdChip(chart)"
            class="shrink-0 inline-flex items-center px-1.5 h-4 rounded text-[9.5px] font-medium bg-amber-100/70 text-amber-700 ring-1 ring-amber-200/70"
          >{{ thresholdChip(chart) }}</span>
        </header>
        <div class="flex-1 px-3 pb-2.5 min-h-[156px] flex">
          <div class="w-full self-stretch flex items-stretch">
            <ChartTrend v-if="chart.kind === 'trend'" :chart="chart" class="w-full" />
            <ChartDistribution v-else-if="chart.kind === 'distribution'" :chart="chart" class="w-full self-center" />
            <ChartDonut v-else-if="chart.kind === 'donut'" :chart="chart" class="w-full" />
            <ChartBar v-else-if="chart.kind === 'bar'" :chart="chart" class="w-full" />
            <ChartGauge v-else-if="chart.kind === 'gauge'" :chart="chart" class="w-full" />
            <ChartStacked v-else-if="chart.kind === 'stacked'" :chart="chart" class="w-full" />
            <ChartHeatmap v-else-if="chart.kind === 'heatmap'" :chart="chart" class="w-full" />
            <ChartRadar v-else-if="chart.kind === 'radar'" :chart="chart" class="w-full" />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
