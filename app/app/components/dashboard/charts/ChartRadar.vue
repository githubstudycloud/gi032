<script setup lang="ts">
/** 雷达图：多维能力对比 */
import type { MetricChart } from '~/types/overview-summary';
import { colorClass } from './chart-colors';

const props = defineProps<{ chart: MetricChart }>();
const data = computed(() => props.chart.radar);

const W = 260;
const H = 180;
const CX = W / 2;
const CY = H / 2 + 4;
const R = 72;

const axesGeo = computed(() => {
  if (!data.value) return [];
  const n = data.value.axes.length;
  return data.value.axes.map((ax, i) => {
    const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return {
      ...ax,
      i,
      cos: Math.cos(ang),
      sin: Math.sin(ang),
      x: CX + R * Math.cos(ang),
      y: CY + R * Math.sin(ang),
      // 标签位置略向外
      lx: CX + (R + 12) * Math.cos(ang),
      ly: CY + (R + 12) * Math.sin(ang),
    };
  });
});

const rings = [0.25, 0.5, 0.75, 1];
const ringPaths = computed(() => {
  if (!axesGeo.value.length) return [];
  return rings.map(r =>
    axesGeo.value
      .map((a, i) => `${i === 0 ? 'M' : 'L'} ${(CX + R * r * a.cos).toFixed(1)} ${(CY + R * r * a.sin).toFixed(1)}`)
      .join(' ') + ' Z',
  );
});

/** 每轴最大值（series 在该轴上的最大值，或显式 max） */
function axisMax(axKey: string): number {
  if (!data.value) return 1;
  const ax = data.value.axes.find(a => a.key === axKey);
  if (ax?.max !== undefined) return ax.max;
  return Math.max(1, ...data.value.series.map(s => s.values[axKey] ?? 0));
}

const seriesPaths = computed(() => {
  if (!data.value || !axesGeo.value.length) return [];
  return data.value.series.map((ser, idx) => ({
    ...ser,
    idx,
    path:
      axesGeo.value
        .map((a, i) => {
          const v = ser.values[a.key] ?? 0;
          const r = (v / axisMax(a.key)) * R;
          return `${i === 0 ? 'M' : 'L'} ${(CX + r * a.cos).toFixed(1)} ${(CY + r * a.sin).toFixed(1)}`;
        })
        .join(' ') + ' Z',
  }));
});
</script>

<template>
  <div v-if="data" class="flex flex-col h-full">
    <svg :viewBox="`0 0 ${W} ${H}`" class="flex-1 w-full">
      <!-- 同心环 -->
      <path
        v-for="(p, i) in ringPaths" :key="`r-${i}`"
        :d="p" fill="none" stroke="currentColor" class="text-ink-200"
        :stroke-dasharray="i === ringPaths.length - 1 ? undefined : '2 3'"
      />
      <!-- 轴线 -->
      <line
        v-for="a in axesGeo" :key="`ax-${a.key}`"
        :x1="CX" :y1="CY" :x2="a.x" :y2="a.y"
        stroke="currentColor" class="text-ink-200"
      />
      <!-- series 填充 -->
      <path
        v-for="ser in seriesPaths" :key="ser.key"
        :d="ser.path" :class="colorClass(ser.color, ser.idx)"
        fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.4"
      />
      <!-- 轴标签 -->
      <text
        v-for="a in axesGeo" :key="`l-${a.key}`"
        :x="a.lx" :y="a.ly + 3" text-anchor="middle"
        class="text-ink-600" fill="currentColor" style="font-size: 9.5px;"
      >{{ a.label }}</text>
    </svg>
    <!-- 图例 -->
    <div v-if="data.series.length > 1" class="flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] mt-1">
      <span v-for="(s, i) in data.series" :key="s.key" class="inline-flex items-center gap-1">
        <span :class="['inline-block w-2 h-2 rounded-sm', colorClass(s.color, i)]" style="background-color: currentColor;" />
        <span class="text-ink-600">{{ s.label }}</span>
      </span>
    </div>
  </div>
  <p v-else class="text-[11px] text-ink-500 py-6 text-center">
    暂无数据
  </p>
</template>
