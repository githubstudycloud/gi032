<script setup lang="ts">
/** 横向柱：按类别比例 */
import type { MetricChart } from '~/types/overview-summary';
import { colorClass } from './chart-colors';

const props = defineProps<{ chart: MetricChart }>();
const items = computed(() => props.chart.items ?? []);
const max = computed<number>(() => Math.max(1, ...items.value.map(i => i.value)));
</script>

<template>
  <ul v-if="items.length" class="space-y-1.5 py-1">
    <li v-for="(item, idx) in items" :key="item.key" class="flex items-center gap-2 text-[11.5px]">
      <span class="w-16 shrink-0 text-ink-700 truncate" :title="item.label">{{ item.label }}</span>
      <div class="flex-1 h-3.5 rounded bg-ink-100 overflow-hidden">
        <div
          :class="['h-full rounded transition-all', colorClass(item.color, idx)]"
          :style="{ width: `${(item.value / max) * 100}%`, backgroundColor: 'currentColor' }"
        />
      </div>
      <span class="w-12 shrink-0 text-right tabular-nums text-ink-800 font-medium">
        {{ item.display ?? item.value }}{{ item.display ? '' : (chart.unit ?? '') }}
      </span>
    </li>
  </ul>
  <p v-else class="text-[11px] text-ink-500 py-6 text-center">暂无数据</p>
</template>
