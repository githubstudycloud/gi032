<script setup lang="ts">
/** 环形图（donut），右侧图例 */
import type { MetricChart } from '~/types/overview-summary';
import { colorClass } from './chart-colors';

const props = defineProps<{ chart: MetricChart }>();
const items = computed(() => props.chart.items ?? []);
const total = computed<number>(() => items.value.reduce((s, i) => s + i.value, 0) || 1);

const SIZE = 120;
const R = 48;
const STROKE = 14;
const CIRC = 2 * Math.PI * R;

const segments = computed(() => {
  let acc = 0;
  return items.value.map((it, idx) => {
    const frac = it.value / total.value;
    const len = frac * CIRC;
    const seg = {
      ...it,
      idx,
      offset: -acc,
      length: len,
      gap: CIRC - len,
      percent: (frac * 100).toFixed(1),
    };
    acc += len;
    return seg;
  });
});
</script>

<template>
  <div v-if="items.length" class="flex items-center gap-3 h-full">
    <div class="relative shrink-0">
      <svg :viewBox="`0 0 ${SIZE} ${SIZE}`" :width="SIZE" :height="SIZE" class="-rotate-90">
        <circle :cx="SIZE/2" :cy="SIZE/2" :r="R" fill="none" class="text-ink-100" stroke="currentColor" :stroke-width="STROKE" />
        <circle
          v-for="seg in segments" :key="seg.key"
          :cx="SIZE/2" :cy="SIZE/2" :r="R" fill="none"
          stroke="currentColor"
          :class="colorClass(seg.color, seg.idx)"
          :stroke-width="STROKE"
          :stroke-dasharray="`${seg.length} ${seg.gap}`"
          :stroke-dashoffset="seg.offset"
          stroke-linecap="butt"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="text-[10px] text-ink-500">合计</span>
        <span class="font-display text-[15px] font-semibold text-ink-900 tabular-nums leading-none">{{ total }}</span>
      </div>
    </div>
    <ul class="flex-1 min-w-0 space-y-1 text-[11px]">
      <li v-for="seg in segments" :key="seg.key" class="flex items-center gap-1.5 min-w-0">
        <span :class="['inline-block w-2 h-2 rounded-sm shrink-0', colorClass(seg.color, seg.idx)]" style="background-color: currentColor;" />
        <span class="truncate text-ink-700">{{ seg.label }}</span>
        <span class="ml-auto tabular-nums text-ink-500">{{ seg.percent }}%</span>
      </li>
    </ul>
  </div>
  <p v-else class="text-[11px] text-ink-500 py-6 text-center">
    暂无数据
  </p>
</template>
