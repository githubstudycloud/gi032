<script setup lang="ts">
/**
 * 报表页工具栏：分页模式 / 对比 / 刷新 / 列定制 / 导出。
 * 每个按钮按 config.toolbar.* 开关显隐；都关 = 整条不显示。
 */
import type { ToolbarSpec } from '~/types/report-config';

const props = defineProps<{
  spec?: ToolbarSpec;
  pagingMode?: 'server' | 'client' | 'none';
  compare?: 'none' | 'prev_period' | 'prev_year';
}>();

const emit = defineEmits<{
  refresh: [];
  'update:pagingMode': [v: 'server' | 'client' | 'none'];
  'update:compare': [v: 'none' | 'prev_period' | 'prev_year'];
  'open-columns': [];
  export: [];
}>();

const show = computed(() => ({
  refresh: props.spec?.show_refresh ?? false,
  pagingMode: props.spec?.show_paging_mode ?? false,
  compare: props.spec?.show_compare ?? false,
  columns: props.spec?.show_column_customizer ?? false,
  exportBtn: props.spec?.show_export ?? false,
}));

const anyVisible = computed(() => Object.values(show.value).some(Boolean));
</script>

<template>
  <div v-if="anyVisible" class="flex items-center gap-2 text-[12.5px]">
    <!-- 分页模式 segmented control -->
    <div
      v-if="show.pagingMode"
      role="group"
      :aria-label="$t('toolbar.pagingMode')"
      class="inline-flex items-center rounded-md border border-ink-200 bg-ink-50/60 p-0.5"
    >
      <button
        v-for="mode in (['server', 'client', 'none'] as const)"
        :key="mode"
        type="button"
        :aria-pressed="pagingMode === mode"
        :class="[
          'h-6 px-2 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
          pagingMode === mode
            ? 'bg-surface text-ink-900 shadow-[var(--shadow-card)] font-medium'
            : 'text-ink-600 hover:text-ink-900',
        ]"
        @click="emit('update:pagingMode', mode)"
      >
        {{ $t(`toolbar.paging${mode.charAt(0).toUpperCase() + mode.slice(1)}`) }}
      </button>
    </div>

    <!-- 对比 segmented control -->
    <div
      v-if="show.compare"
      role="group"
      :aria-label="$t('toolbar.compare')"
      class="inline-flex items-center rounded-md border border-ink-200 bg-ink-50/60 p-0.5"
    >
      <button
        v-for="opt in (['none', 'prev_period', 'prev_year'] as const)"
        :key="opt"
        type="button"
        :aria-pressed="compare === opt"
        :class="[
          'h-6 px-2 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
          compare === opt
            ? 'bg-surface text-ink-900 shadow-[var(--shadow-card)] font-medium'
            : 'text-ink-600 hover:text-ink-900',
        ]"
        @click="emit('update:compare', opt)"
      >
        {{ opt === 'none' ? $t('toolbar.compareNone')
          : opt === 'prev_period' ? $t('toolbar.comparePrev')
            : $t('toolbar.compareYear') }}
      </button>
    </div>

    <button
      v-if="show.columns"
      type="button"
      class="h-7 px-2.5 rounded-md border border-ink-200 bg-surface text-ink-700 hover:bg-ink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      @click="emit('open-columns')"
    >
      {{ $t('toolbar.columns') }}
    </button>

    <button
      v-if="show.exportBtn"
      type="button"
      class="h-7 px-2.5 rounded-md border border-ink-200 bg-surface text-ink-700 hover:bg-ink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      @click="emit('export')"
    >
      {{ $t('toolbar.export') }}
    </button>

    <button
      v-if="show.refresh"
      type="button"
      :aria-label="$t('toolbar.refresh')"
      class="h-7 w-7 rounded-md border border-ink-200 bg-surface text-ink-700 hover:bg-ink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 inline-flex items-center justify-center"
      @click="emit('refresh')"
    >
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 4v6h6M21 20v-6h-6" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M20 9a8 8 0 0 0-14.93-2L3 10M4 15a8 8 0 0 0 14.93 2L21 14" />
      </svg>
    </button>
  </div>
</template>
