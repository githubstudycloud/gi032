<script setup lang="ts">
import type { Metric } from '~/types/overview-summary';

defineProps<{
  metric: Metric;
}>();

defineEmits<{
  drill: [metricKey: string];
}>();
</script>

<template>
  <button
    type="button"
    class="group text-left rounded-xl border border-ink-200/70 bg-surface px-4 py-3.5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] hover:border-brand-300 transition-all focus:outline-none focus:ring-2 focus:ring-brand-200"
    @click="$emit('drill', metric.key)"
  >
    <!-- 顶：label 左、? 右 -->
    <div class="flex items-start justify-between gap-2 min-h-[34px]">
      <span class="text-[12px] text-ink-600 leading-snug line-clamp-2">
        {{ metric.label }}
      </span>
      <span
        class="shrink-0 w-4 h-4 rounded-full bg-ink-100 text-ink-500 text-[10px] flex items-center justify-center font-medium cursor-help group-hover:bg-ink-200 transition-colors"
        :title="metric.description"
        aria-hidden="true"
      >?</span>
    </div>

    <!-- 中偏左：值 -->
    <div class="mt-2 font-display text-[24px] font-semibold text-ink-900 leading-none tabular-nums">
      {{ metric.value }}<span
        v-if="metric.unit"
        class="ml-1 text-[13px] font-normal text-ink-500"
      >{{ metric.unit }}</span>
    </div>

    <!-- 中偏下：环比 -->
    <div
      :class="[
        'mt-2 text-[11px] flex items-center gap-1',
        metric.trend === 'up'   ? 'text-emerald-600' :
        metric.trend === 'down' ? 'text-rose-600'    : 'text-ink-500',
      ]"
    >
      <span aria-hidden="true">
        {{ metric.trend === 'up' ? '▲' : metric.trend === 'down' ? '▼' : '●' }}
      </span>
      <span>环比 {{ metric.mom }}</span>
    </div>
  </button>
</template>
