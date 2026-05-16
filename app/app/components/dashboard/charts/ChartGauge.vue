<script setup lang="ts">
/** 半圆仪表盘，带目标刻度 */
import type { MetricChart } from '~/types/overview-summary';

const props = defineProps<{ chart: MetricChart }>();
const g = computed(() => props.chart.gauge);
const min = computed<number>(() => g.value?.min ?? 0);
const max = computed<number>(() => g.value?.max ?? 100);
const val = computed<number>(() => Math.max(min.value, Math.min(max.value, g.value?.value ?? 0)));
const pct = computed<number>(() => (val.value - min.value) / (max.value - min.value));

const W = 220;
const H = 130;
const CX = W / 2;
const CY = 100;
const R = 80;
const STROKE = 14;
const CIRC_HALF = Math.PI * R;

const colorByPct = computed<string>(() => {
  const target = g.value?.target;
  if (target === undefined) return 'text-brand-500';
  const targetPct = (target - min.value) / (max.value - min.value);
  return pct.value >= targetPct ? 'text-emerald-500' : 'text-amber-500';
});

const targetAngle = computed<{ x: number; y: number } | null>(() => {
  if (g.value?.target === undefined) return null;
  const tpct = (g.value.target - min.value) / (max.value - min.value);
  const ang = Math.PI - tpct * Math.PI;
  return { x: CX + R * Math.cos(ang), y: CY - R * Math.sin(ang) };
});
</script>

<template>
  <div v-if="g" class="flex flex-col items-center justify-center h-full">
    <svg :viewBox="`0 0 ${W} ${H}`" class="w-full max-w-[220px]">
      <!-- 背景半圆 -->
      <path
        :d="`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`"
        fill="none" stroke="currentColor" class="text-ink-100" :stroke-width="STROKE" stroke-linecap="round"
      />
      <!-- 数值弧 -->
      <path
        :d="`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`"
        fill="none" stroke="currentColor" :class="colorByPct" :stroke-width="STROKE" stroke-linecap="round"
        :stroke-dasharray="`${pct * CIRC_HALF} ${CIRC_HALF}`"
      />
      <!-- 目标刻度 -->
      <g v-if="targetAngle">
        <circle :cx="targetAngle.x" :cy="targetAngle.y" r="4" fill="currentColor" class="text-ink-900" />
        <circle :cx="targetAngle.x" :cy="targetAngle.y" r="2" fill="white" />
      </g>
      <!-- 起止刻度 -->
      <text :x="CX - R" :y="CY + 16" text-anchor="middle" class="text-ink-500" fill="currentColor" style="font-size: 9px;">{{ min }}</text>
      <text :x="CX + R" :y="CY + 16" text-anchor="middle" class="text-ink-500" fill="currentColor" style="font-size: 9px;">{{ max }}</text>
    </svg>
    <div class="-mt-8 text-center">
      <div class="font-display text-[22px] font-semibold text-ink-900 tabular-nums leading-none">
        {{ g.display ?? `${g.value}${g.unit ?? ''}` }}
      </div>
      <div v-if="g.target !== undefined" class="text-[10.5px] text-ink-500 mt-1">
        目标 <span class="font-medium text-ink-700">{{ g.target }}{{ g.unit ?? '' }}</span>
        <span :class="['ml-1', pct >= ((g.target - min) / (max - min)) ? 'text-emerald-600' : 'text-amber-600']">
          {{ pct >= ((g.target - min) / (max - min)) ? '已达成' : '未达' }}
        </span>
      </div>
    </div>
  </div>
  <p v-else class="text-[11px] text-ink-500 py-6 text-center">暂无数据</p>
</template>
