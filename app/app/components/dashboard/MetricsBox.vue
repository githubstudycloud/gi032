<script setup lang="ts">
import type { OverviewMetrics } from '~/types/overview-summary';

const props = defineProps<{
  metrics: OverviewMetrics | null;
  title?: string;
}>();

defineEmits<{
  drill: [metricKey: string];
}>();

type ViewMode = 'grouped' | 'flat';
const viewMode = ref<ViewMode>('grouped');
const allMetrics = computed(() => props.metrics?.groups.flatMap(g => g.items) ?? []);
</script>

<template>
  <section class="rounded-xl border border-ink-200/70 bg-surface px-5 py-5 shadow-[var(--shadow-card)]">
    <header class="flex items-center gap-2 mb-4">
      <span class="w-1 h-4 rounded-full bg-brand-500" />
      <h2 class="font-display text-[15px] font-semibold text-ink-900 tracking-tight">
        {{ title || '核心指标' }}
      </h2>
      <div class="flex-1" />
      <div
        role="tablist"
        aria-label="核心指标视图"
        class="inline-flex items-center rounded-md border border-ink-200 bg-ink-50/60 p-0.5 text-[12px]"
      >
        <button
          type="button"
          role="tab"
          :aria-selected="viewMode === 'grouped'"
          :class="[
            'h-7 px-3 rounded transition-colors',
            viewMode === 'grouped'
              ? 'bg-surface text-ink-900 shadow-[var(--shadow-card)] font-medium'
              : 'text-ink-600 hover:text-ink-900',
          ]"
          @click="viewMode = 'grouped'"
        >分组</button>
        <button
          type="button"
          role="tab"
          :aria-selected="viewMode === 'flat'"
          :class="[
            'h-7 px-3 rounded transition-colors',
            viewMode === 'flat'
              ? 'bg-surface text-ink-900 shadow-[var(--shadow-card)] font-medium'
              : 'text-ink-600 hover:text-ink-900',
          ]"
          @click="viewMode = 'flat'"
        >平铺</button>
      </div>
    </header>

    <div v-if="viewMode === 'grouped'" class="space-y-6">
      <section v-for="g in metrics?.groups ?? []" :key="g.key">
        <h3 class="text-[12px] text-ink-500 mb-2.5 flex items-center gap-2">
          <span class="inline-block w-1 h-3 rounded-full bg-brand-300" />
          {{ g.label }}
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <MetricCard
            v-for="m in g.items"
            :key="m.key"
            :metric="m"
            @drill="$emit('drill', $event)"
          />
        </div>
      </section>
    </div>

    <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <MetricCard
        v-for="m in allMetrics"
        :key="m.key"
        :metric="m"
        @drill="$emit('drill', $event)"
      />
    </div>

    <p
      v-if="metrics?.footnote"
      class="mt-5 pt-4 border-t border-ink-100 text-[12px] text-ink-500"
    >
      {{ metrics.footnote }}
    </p>
  </section>
</template>
