<script setup lang="ts">
import type { Metric } from '~/types/overview-summary';
import { thresholdClass } from '~/utils/threshold';

const props = defineProps<{
  metric: Metric;
  /** 是否处于「展开明细」激活态（由父组件 MetricsBox 控制） */
  active?: boolean;
}>();

defineEmits<{
  drill: [metricKey: string];
}>();

const valueThresholdClass = computed<string>(() =>
  thresholdClass(props.metric.value, props.metric.threshold),
);

const hasDetail = computed<boolean>(() => Boolean(props.metric.detail));

const hovered = ref(false);
const focused = ref(false);
const tipOpen = computed<boolean>(() => hovered.value || focused.value);

/** 描述按 \n 或 段落分行；前端额外把 "。" 后接换行的句子合理拆开（仅当原文没有 \n） */
const descLines = computed<string[]>(() => {
  const raw = props.metric.description ?? '';
  if (raw.includes('\n')) {
    return raw.split('\n').map(s => s.trim()).filter(Boolean);
  }
  return [raw];
});

const trendLabel = computed<string>(() =>
  props.metric.trend === 'up'
    ? '上升' :
    props.metric.trend === 'down' ? '下降' : '持平',
);
</script>

<template>
  <div
    class="group relative"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <button
      type="button"
      :class="[
        'w-full text-left rounded-lg border px-3 py-2.5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-all focus:outline-none focus:ring-2 focus:ring-brand-200 flex flex-col gap-1',
        active
          ? 'border-brand-400 bg-brand-50/60 ring-2 ring-brand-200/60'
          : 'border-ink-200/70 bg-surface hover:border-brand-300',
      ]"
      :aria-describedby="`metric-tip-${metric.key}`"
      :aria-expanded="hasDetail ? active : undefined"
      @focus="focused = true"
      @blur="focused = false"
      @click="$emit('drill', metric.key)"
    >
      <span
        class="text-[12px] text-ink-600 leading-snug break-words decoration-dotted decoration-ink-300 underline-offset-4 group-hover:underline group-hover:decoration-brand-400 line-clamp-2"
      >
        {{ metric.label }}
      </span>

      <div class="flex items-baseline gap-2 flex-wrap">
        <div
          :class="[
            'font-display text-[20px] font-semibold leading-tight tabular-nums break-all',
            valueThresholdClass || 'text-ink-900',
          ]"
        >
          {{ metric.value }}<span
            v-if="metric.unit"
            class="ml-0.5 text-[12px] font-normal text-ink-500"
          >{{ metric.unit }}</span>
        </div>

        <div
          :class="[
            'text-[11px] inline-flex items-baseline gap-0.5 leading-none whitespace-nowrap',
            metric.trend === 'up' ? 'text-emerald-600'
            : metric.trend === 'down' ? 'text-rose-600' : 'text-ink-500',
          ]"
        >
          <span aria-hidden="true" class="text-[9px] translate-y-[-1px]">{{ metric.trend === 'up' ? '▲' : metric.trend === 'down' ? '▼' : '●' }}</span>
          <span class="tabular-nums"><span class="text-ink-400 mr-0.5">环比</span>{{ metric.mom }}</span>
        </div>

        <span v-if="hasDetail" class="flex-1" />
        <span
          v-if="hasDetail"
          aria-hidden="true"
          :class="[
            'inline-flex items-center justify-center text-[10px] transition-transform self-center',
            active ? 'rotate-180 text-brand-600' : 'text-ink-400',
          ]"
        >▾</span>
      </div>
    </button>

    <!-- Editorial 风格悬浮释义卡：v-show 让 tooltip 只 mount 一次，悬浮反复触发只是切 class，
         避免每张卡每次 hover 都 mount/unmount 整片 DOM。 -->
    <div
      v-show="tipOpen"
      :id="`metric-tip-${metric.key}`"
      role="tooltip"
      :class="[
        'absolute left-1/2 -translate-x-1/2 top-[calc(100%+10px)] z-30 w-[280px] origin-top pointer-events-none transition duration-150 ease-out',
        tipOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-[0.98]',
      ]"
    >
      <!-- 卡片 -->
      <div
        class="relative rounded-lg border border-ink-200/80 bg-surface shadow-[0_12px_32px_-12px_oklch(0.2_0.02_240/0.25),0_4px_12px_-4px_oklch(0.2_0.02_240/0.12)] overflow-hidden"
      >
        <!-- 左侧色条 -->
        <span
          class="absolute left-0 top-0 bottom-0 w-1"
          :class="
            metric.trend === 'up' ? 'bg-emerald-500'
            : metric.trend === 'down' ? 'bg-rose-500' : 'bg-brand-500'
          "
        />
        <div class="pl-4 pr-3.5 py-3 space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] tracking-[0.14em] uppercase font-medium text-brand-700">
              指标释义
            </span>
            <span class="text-[10px] text-ink-400 font-mono">{{ metric.key }}</span>
          </div>

          <div class="font-display text-[14px] font-semibold text-ink-900 leading-snug">
            {{ metric.label }}
          </div>

          <p
            v-for="(line, i) in descLines"
            :key="i"
            class="text-[12.5px] leading-relaxed text-ink-700 whitespace-pre-line"
          >
            {{ line }}
          </p>

          <div class="pt-1.5 mt-1 border-t border-dashed border-ink-200 grid grid-cols-2 gap-x-3 gap-y-1 text-[11.5px]">
            <div class="flex items-center justify-between">
              <span class="text-ink-500">当前</span>
              <span class="font-medium text-ink-900 tabular-nums">{{ metric.value }}{{ metric.unit ?? '' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-ink-500">环比</span>
              <span
                class="font-medium tabular-nums"
                :class="
                  metric.trend === 'up' ? 'text-emerald-600'
                  : metric.trend === 'down' ? 'text-rose-600' : 'text-ink-700'
                "
              >{{ metric.mom }} <span class="text-ink-400 font-normal">/ {{ trendLabel }}</span></span>
            </div>
            <template v-if="metric.threshold">
              <div class="flex items-center justify-between col-span-2">
                <span class="text-ink-500">阈值</span>
                <span class="text-ink-700 tabular-nums">
                  <template v-if="metric.threshold.min !== undefined && metric.threshold.max !== undefined">
                    {{ metric.threshold.min }} ~ {{ metric.threshold.max }}
                  </template>
                  <template v-else-if="metric.threshold.min !== undefined">
                    ≥ {{ metric.threshold.min }}
                  </template>
                  <template v-else-if="metric.threshold.max !== undefined">
                    ≤ {{ metric.threshold.max }}
                  </template>
                </span>
              </div>
            </template>
          </div>
        </div>

        <!-- 顶部小箭头 -->
        <span
          class="absolute -top-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-surface border-l border-t border-ink-200/80"
          aria-hidden="true"
        />
      </div>
    </div>
  </div>
</template>
