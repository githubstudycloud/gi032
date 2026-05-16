<script setup lang="ts">
import { flattenNav } from '~/utils/nav-flat';

const route = useRoute();
const { items: navItems } = await useNav();
const { metrics, pilots, error, refresh } = await useOverviewSummary();

const flat = computed(() => flattenNav(navItems.value));
const current = computed(() => flat.value.find(i => i.path === route.path));
useHead({ title: () => current.value?.label ?? '总览' });

const activeTabKey = ref<string>('industry');
const activeTab = computed(() =>
  pilots.value?.tabs.find(t => t.key === activeTabKey.value) ?? pilots.value?.tabs[0] ?? null,
);

function onDrill(metricKey: string): void {
  // TODO: 跳明细页 / 弹明细弹窗
  console.log('drill:', metricKey);
}
function onRowDetail(row: Record<string, unknown>): void {
  console.log('row detail:', row);
}
</script>

<template>
  <div>
    <ClientOnly>
      <ErrorPanel v-if="error" :error="error" @retry="refresh" />

      <!-- Div 1: 核心指标 -->
      <div v-else>
        <MetricsBox :metrics="metrics" @drill="onDrill" />
      </div>

      <!-- Div 2: 试点进展明细（标题随 tab） -->
      <section class="mt-6">
        <div class="flex items-center gap-2 mb-4">
          <span class="w-1 h-4 rounded-full bg-brand-500" />
          <h2 class="font-display text-[15px] font-semibold text-ink-900 tracking-tight">
            {{ activeTab?.label ?? '试点进展明细' }}
          </h2>
        </div>

        <TabStrip
          v-model="activeTabKey"
          :tabs="pilots?.tabs ?? []"
          aria-label="试点进展明细"
          class="mb-4"
        />

        <div
          v-if="activeTab"
          :id="`panel-${activeTab.key}`"
          role="tabpanel"
          :aria-labelledby="`tab-${activeTab.key}`"
        >
          <MultiLevelTable :key="activeTab.key" :data="activeTab" @detail="onRowDetail" />
        </div>
      </section>

      <template #fallback>
        <div class="mt-6 space-y-6">
          <div class="h-80 rounded-xl border border-ink-200/70 bg-surface" />
          <div class="h-96 rounded-xl border border-ink-200/70 bg-surface" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
