<script setup lang="ts">
import type { OverviewMetrics, Metric } from '~/framework/types/overview-summary';

const { t } = useI18n();

const props = defineProps<{
  metrics: OverviewMetrics | null;
  title?: string;
}>();

const emit = defineEmits<{
  drill: [metricKey: string];
  filterChange: [metricKey: string, filters: Record<string, string>];
}>();

type ViewMode = 'grouped' | 'flat';
const viewMode = ref<ViewMode>('grouped');
const allMetrics = computed<Metric[]>(() => props.metrics?.groups.flatMap(g => g.items) ?? []);

/** 当前展开明细的 metric key（同时只展开一个） */
const openKey = ref<string | null>(null);
const openMetric = computed<Metric | null>(() =>
  openKey.value ? (allMetrics.value.find(m => m.key === openKey.value) ?? null) : null,
);

function onCardClick(m: Metric): void {
  // 有 detail → 切换展开；没有 → 透传 drill 让上层处理（跳明细页等）
  if (m.detail) {
    openKey.value = openKey.value === m.key ? null : m.key;
  }
  else {
    openKey.value = null;
    emit('drill', m.key);
  }
}

/** 平铺模式下，open metric 所在的行索引（用于决定面板插入位置） */
function isOpenInGroup(groupKey: string): boolean {
  if (!openMetric.value) return false;
  return props.metrics?.groups.find(g => g.key === groupKey)?.items.some(m => m.key === openKey.value) ?? false;
}
</script>

<template>
  <section class="rounded-xl border border-ink-200/70 bg-surface px-4 py-3.5 shadow-[var(--shadow-card)]">
    <header class="flex items-center gap-2 mb-3">
      <span class="w-1 h-4 rounded-full bg-brand-500" />
      <h2 class="font-display text-[15px] font-semibold text-ink-900 tracking-tight">
        {{ title || t('metric.title') }}
      </h2>
      <div class="flex-1" />
      <div
        role="tablist"
        :aria-label="t('metric.viewSwitcher')"
        class="inline-flex items-center rounded-md border border-ink-200 bg-ink-50/60 p-0.5 text-[11px]"
      >
        <button
          type="button"
          role="tab"
          :aria-selected="viewMode === 'grouped'"
          :class="[
            'h-6 px-2.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
            viewMode === 'grouped'
              ? 'bg-surface text-ink-900 shadow-[var(--shadow-card)] font-medium'
              : 'text-ink-600 hover:text-ink-900',
          ]"
          @click="viewMode = 'grouped'"
        >
          {{ t('metric.groupedView') }}
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="viewMode === 'flat'"
          :class="[
            'h-6 px-2.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
            viewMode === 'flat'
              ? 'bg-surface text-ink-900 shadow-[var(--shadow-card)] font-medium'
              : 'text-ink-600 hover:text-ink-900',
          ]"
          @click="viewMode = 'flat'"
        >
          {{ t('metric.flatView') }}
        </button>
      </div>
    </header>

    <div v-if="viewMode === 'grouped'" class="space-y-4">
      <section v-for="g in metrics?.groups ?? []" :key="g.key">
        <h3 class="text-[11px] text-ink-500 mb-2 flex items-center gap-1.5">
          <span class="inline-block w-1 h-3 rounded-full bg-brand-300" />
          {{ g.label }}
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          <MetricCard
            v-for="m in g.items"
            :key="m.key"
            :metric="m"
            :active="openKey === m.key"
            @drill="onCardClick(g.items.find(it => it.key === $event)!)"
          />
        </div>
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div v-if="openMetric && isOpenInGroup(g.key)" class="mt-2.5">
            <MetricDetailPanel
              :metric="openMetric"
              @close="openKey = null"
              @filter-change="(f) => emit('filterChange', openMetric!.key, f)"
            />
          </div>
        </Transition>
      </section>
    </div>

    <div v-else>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        <MetricCard
          v-for="m in allMetrics"
          :key="m.key"
          :metric="m"
          :active="openKey === m.key"
          @drill="onCardClick(allMetrics.find(it => it.key === $event)!)"
        />
      </div>
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-1"
      >
        <div v-if="openMetric" class="mt-2.5">
          <MetricDetailPanel
            :metric="openMetric"
            @close="openKey = null"
            @filter-change="(f) => emit('filterChange', openMetric!.key, f)"
          />
        </div>
      </Transition>
    </div>

    <p
      v-if="metrics?.footnote"
      class="mt-4 pt-3 border-t border-ink-100 text-[11.5px] text-ink-500"
    >
      {{ metrics.footnote }}
    </p>
  </section>
</template>
