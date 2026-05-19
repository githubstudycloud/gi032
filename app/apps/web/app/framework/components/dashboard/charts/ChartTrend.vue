<script setup lang="ts">
/** 趋势折线 + 面积 + 阈值参考线 */
import type { MetricChart } from '~/framework/types/overview-summary';

const props = defineProps<{ chart: MetricChart; width?: number; height?: number }>();

const W = computed<number>(() => props.width ?? 280);
const H = computed<number>(() => props.height ?? 140);
const PAD = { top: 8, right: 6, bottom: 18, left: 26 };

const geo = computed(() => {
  const pts = props.chart.points ?? [];
  if (!pts.length) return null;
  const ys = pts.map(p => p.y);
  const thMin = props.chart.threshold?.min;
  const thMax = props.chart.threshold?.max;
  const lo = Math.min(...ys, ...(thMin !== undefined ? [thMin] : []));
  const hi = Math.max(...ys, ...(thMax !== undefined ? [thMax] : []));
  const span = hi - lo || 1;
  const yLo = lo - span * 0.12;
  const yHi = hi + span * 0.12;
  const innerW = W.value - PAD.left - PAD.right;
  const innerH = H.value - PAD.top - PAD.bottom;
  const xAt = (i: number): number => pts.length === 1
    ? PAD.left + innerW / 2
    : PAD.left + (i / (pts.length - 1)) * innerW;
  const yAt = (v: number): number => PAD.top + (1 - (v - yLo) / (yHi - yLo)) * innerH;
  const mapped = pts.map((p, i) => ({ x: xAt(i), y: yAt(p.y), raw: p }));
  const linePath = mapped.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath =
    `${linePath} L ${mapped[mapped.length - 1]!.x.toFixed(1)} ${(PAD.top + innerH).toFixed(1)} ` +
    `L ${mapped[0]!.x.toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`;
  const yTicks = [0, 0.5, 1].map(t => ({
    y: PAD.top + t * innerH,
    label: (yHi - t * (yHi - yLo)).toFixed(yHi - yLo < 10 ? 1 : 0),
  }));
  const step = Math.max(1, Math.ceil(pts.length / 5));
  const xLabels = mapped
    .map((p, i) => ({ x: p.x, label: p.raw.x, i }))
    .filter(p => p.i % step === 0 || p.i === pts.length - 1)
    .map(p => ({ x: p.x, label: p.label }));
  const thresholdY = thMin !== undefined ? yAt(thMin) : null;
  const gradId = `trend-grad-${props.chart.key}`;
  return { linePath, areaPath, mapped, yTicks, xLabels, thresholdY, gradId };
});

const hoverIdx = ref<number | null>(null);
</script>

<template>
  <svg v-if="geo" :viewBox="`0 0 ${W} ${H}`" class="w-full h-full" preserveAspectRatio="none">
    <g>
      <line
        v-for="(t, i) in geo.yTicks" :key="`g-${i}`"
        :x1="PAD.left" :x2="W - PAD.right" :y1="t.y" :y2="t.y"
        stroke="currentColor" class="text-ink-200" stroke-dasharray="2 3"
      />
    </g>
    <line
      v-if="geo.thresholdY !== null"
      :x1="PAD.left" :x2="W - PAD.right" :y1="geo.thresholdY" :y2="geo.thresholdY"
      stroke="currentColor" class="text-amber-500" stroke-dasharray="4 4" stroke-width="1"
    />
    <path :d="geo.areaPath" :fill="`url(#${geo.gradId})`" opacity="0.5" />
    <path
      :d="geo.linePath" fill="none" stroke="currentColor"
      class="text-brand-600" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"
    />
    <g>
      <circle
        v-for="(p, i) in geo.mapped" :key="`pt-${i}`"
        :cx="p.x" :cy="p.y"
        :r="hoverIdx === i ? 4 : 2.5"
        fill="currentColor" class="text-brand-600 cursor-pointer transition-all"
        @mouseenter="hoverIdx = i" @mouseleave="hoverIdx = null"
      >
        <title>{{ p.raw.x }}: {{ p.raw.y }}{{ chart.unit ?? '' }}</title>
      </circle>
    </g>
    <g class="text-ink-500" style="font-size: 9px;">
      <text
        v-for="(t, i) in geo.yTicks" :key="`yt-${i}`"
        :x="PAD.left - 4" :y="t.y + 3" text-anchor="end" fill="currentColor"
      >{{ t.label }}</text>
    </g>
    <g class="text-ink-500" style="font-size: 9px;">
      <text
        v-for="(t, i) in geo.xLabels" :key="`xt-${i}`"
        :x="t.x" :y="H - 5" text-anchor="middle" fill="currentColor"
      >{{ t.label }}</text>
    </g>
    <defs>
      <linearGradient :id="geo.gradId" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="currentColor" class="text-brand-400" stop-opacity="0.55" />
        <stop offset="100%" stop-color="currentColor" class="text-brand-400" stop-opacity="0" />
      </linearGradient>
    </defs>
  </svg>
  <p v-else class="text-[11px] text-ink-500 py-6 text-center">
    暂无数据
  </p>
</template>
