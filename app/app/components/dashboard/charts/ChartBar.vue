<script setup lang="ts">
/** 垂直柱状图 */
import type { MetricChart } from '~/types/overview-summary';
import { colorClass } from './chart-colors';

const props = defineProps<{ chart: MetricChart }>();
const items = computed(() => props.chart.items ?? []);
const max = computed<number>(() => Math.max(1, ...items.value.map(i => i.value)));

const W = 280;
const H = 140;
const PAD = { top: 10, right: 6, bottom: 22, left: 6 };
const innerW = computed(() => W - PAD.left - PAD.right);
const innerH = H - PAD.top - PAD.bottom;

const bars = computed(() => {
  const n = items.value.length || 1;
  const slot = innerW.value / n;
  const barW = Math.min(28, slot * 0.6);
  return items.value.map((it, i) => {
    const cx = PAD.left + slot * i + slot / 2;
    const h = (it.value / max.value) * innerH;
    return {
      ...it,
      idx: i,
      x: cx - barW / 2,
      y: PAD.top + (innerH - h),
      w: barW,
      h,
      cx,
    };
  });
});
</script>

<template>
  <svg v-if="items.length" :viewBox="`0 0 ${W} ${H}`" class="w-full h-full" preserveAspectRatio="none">
    <line
      :x1="PAD.left" :x2="W - PAD.right" :y1="PAD.top + innerH" :y2="PAD.top + innerH"
      stroke="currentColor" class="text-ink-200"
    />
    <g>
      <rect
        v-for="b in bars" :key="b.key"
        :x="b.x" :y="b.y" :width="b.w" :height="b.h" rx="2"
        :class="colorClass(b.color, b.idx)"
        fill="currentColor" opacity="0.85"
      >
        <title>{{ b.label }}: {{ b.display ?? b.value }}{{ b.display ? '' : (chart.unit ?? '') }}</title>
      </rect>
      <text
        v-for="b in bars" :key="`v-${b.key}`"
        :x="b.cx" :y="b.y - 3" text-anchor="middle"
        class="text-ink-700" fill="currentColor" style="font-size: 9.5px; font-weight: 500;"
      >
        {{ b.display ?? b.value }}
      </text>
      <text
        v-for="b in bars" :key="`l-${b.key}`"
        :x="b.cx" :y="H - 6" text-anchor="middle"
        class="text-ink-500" fill="currentColor" style="font-size: 9.5px;"
      >
        {{ b.label }}
      </text>
    </g>
  </svg>
  <p v-else class="text-[11px] text-ink-500 py-6 text-center">
    暂无数据
  </p>
</template>
