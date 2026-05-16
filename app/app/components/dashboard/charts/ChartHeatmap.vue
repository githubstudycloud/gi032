<script setup lang="ts">
/** 矩阵热力图（y 行 × x 列） */
import type { MetricChart } from '~/types/overview-summary';

const props = defineProps<{ chart: MetricChart }>();
const data = computed(() => props.chart.heatmap);

const stats = computed(() => {
  if (!data.value) return null;
  const all = data.value.values.flat();
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  return { lo, hi, span: hi - lo || 1 };
});

function intensity(v: number): number {
  if (!stats.value) return 0;
  return (v - stats.value.lo) / stats.value.span;
}
</script>

<template>
  <div v-if="data && stats" class="flex flex-col h-full text-[10px] leading-none">
    <!-- 顶部 x 标签 -->
    <div class="flex pl-10 mb-1">
      <span v-for="x in data.xLabels" :key="x"
        class="flex-1 text-center text-ink-500 truncate" :title="x">{{ x }}</span>
    </div>
    <!-- 行 -->
    <div class="flex-1 flex flex-col gap-[2px]">
      <div v-for="(row, yi) in data.values" :key="data.yLabels[yi] ?? yi" class="flex items-center gap-[2px]">
        <span class="w-9 shrink-0 text-right text-ink-600 pr-1 truncate" :title="data.yLabels[yi]">{{ data.yLabels[yi] }}</span>
        <div class="flex-1 flex gap-[2px]">
          <div v-for="(v, xi) in row" :key="xi"
            class="flex-1 rounded-[2px] text-ink-900 flex items-center justify-center transition-all"
            :style="{
              backgroundColor: `oklch(${0.95 - intensity(v) * 0.35} ${0.04 + intensity(v) * 0.16} 230)`,
              color: intensity(v) > 0.55 ? 'white' : 'oklch(0.3 0.02 240)',
              minHeight: '14px',
              fontSize: '9px',
            }">
            <title>{{ data.yLabels[yi] }} · {{ data.xLabels[xi] }}: {{ v }}{{ chart.unit ?? '' }}</title>
            {{ v }}
          </div>
        </div>
      </div>
    </div>
  </div>
  <p v-else class="text-[11px] text-ink-500 py-6 text-center">暂无数据</p>
</template>
