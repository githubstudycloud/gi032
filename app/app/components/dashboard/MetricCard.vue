<script setup lang="ts">
import type { Metric } from '~/types/overview-summary';
import { thresholdClass } from '~/utils/threshold';

const props = defineProps<{
  metric: Metric;
}>();

defineEmits<{
  drill: [metricKey: string];
}>();

const valueThresholdClass = computed<string>(() =>
  thresholdClass(props.metric.value, props.metric.threshold),
);
</script>

<template>
  <button
    type="button"
    class="group text-left rounded-xl border border-ink-200/70 bg-surface px-4 py-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] hover:border-brand-300 transition-all focus:outline-none focus:ring-2 focus:ring-brand-200 flex flex-col gap-2"
    @click="$emit('drill', metric.key)"
  >
    <!-- 标签：完整换行，不再被截断 -->
    <div class="flex items-start justify-between gap-2">
      <span class="text-[13px] text-ink-600 leading-snug break-words">
        {{ metric.label }}
      </span>
      <span
        class="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-ink-100 text-ink-500 text-[10px] flex items-center justify-center font-medium cursor-help group-hover:bg-ink-200 transition-colors"
        :title="metric.description"
        aria-hidden="true"
      >?</span>
    </div>

    <!-- 数值：单独成行，不会被标签覆盖；阈值套色 -->
    <div
      :class="[
        'font-display text-[28px] font-semibold leading-tight tabular-nums break-all',
        valueThresholdClass || 'text-ink-900',
      ]"
    >
      {{ metric.value }}<span
        v-if="metric.unit"
        class="ml-1 text-[14px] font-normal text-ink-500"
      >{{ metric.unit }}</span>
    </div>

    <div
      :class="[
        'text-[12px] flex items-center gap-1',
        metric.trend === 'up'   ? 'text-emerald-600' :
        metric.trend === 'down' ? 'text-rose-600'    : 'text-ink-500',
      ]"
    >
      <span aria-hidden="true">{{ metric.trend === 'up' ? '▲' : metric.trend === 'down' ? '▼' : '●' }}</span>
      <span>环比 {{ metric.mom }}</span>
    </div>
  </button>
</template>
