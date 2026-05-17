<script setup lang="ts">
/** 堆叠水平条（按行，跨多个 series） */
import type { MetricChart } from '~/types/overview-summary';
import { colorClass } from './chart-colors';

const props = defineProps<{ chart: MetricChart }>();
const data = computed(() => props.chart.stacked);

const rowsView = computed(() => {
  if (!data.value) return [];
  return data.value.rows.map((row) => {
    const total = data.value!.series.reduce((s, ser) => s + (row.values[ser.key] ?? 0), 0) || 1;
    const segs = data.value!.series.map((ser, idx) => ({
      key: ser.key,
      label: ser.label,
      idx,
      color: ser.color,
      value: row.values[ser.key] ?? 0,
      pct: ((row.values[ser.key] ?? 0) / total) * 100,
    }));
    return { label: row.label, total, segs };
  });
});
</script>

<template>
  <div v-if="data" class="flex flex-col h-full">
    <!-- 图例 -->
    <div class="flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] mb-2">
      <span v-for="(ser, i) in data.series" :key="ser.key" class="inline-flex items-center gap-1">
        <span :class="['inline-block w-2 h-2 rounded-sm', colorClass(ser.color, i)]" style="background-color: currentColor;" />
        <span class="text-ink-600">{{ ser.label }}</span>
      </span>
    </div>
    <!-- 行 -->
    <div class="flex-1 space-y-1.5">
      <div v-for="row in rowsView" :key="row.label" class="flex items-center gap-2 text-[11px]">
        <span class="w-14 shrink-0 truncate text-ink-700" :title="row.label">{{ row.label }}</span>
        <div class="flex-1 h-4 rounded overflow-hidden flex bg-ink-100">
          <div
            v-for="seg in row.segs" :key="seg.key"
            :class="colorClass(seg.color, seg.idx)"
            :style="{ width: `${seg.pct}%`, backgroundColor: 'currentColor' }"
            class="h-full first:rounded-l last:rounded-r transition-all"
          >
            <title>{{ seg.label }}: {{ seg.value }}</title>
          </div>
        </div>
        <span class="w-10 shrink-0 text-right tabular-nums text-ink-700 font-medium">{{ row.total }}</span>
      </div>
    </div>
  </div>
  <p v-else class="text-[11px] text-ink-500 py-6 text-center">
    暂无数据
  </p>
</template>
