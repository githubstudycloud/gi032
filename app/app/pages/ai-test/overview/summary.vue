<script setup lang="ts">
import { flattenNav } from '~/utils/nav-flat';

const route = useRoute();
const { items: navItems } = await useNav();
const { metrics, pilots } = await useOverviewSummary();

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
      <PageHeader :title="current?.label ?? '总览'" :breadcrumb="current?.breadcrumb" />
      <template #fallback>
        <div class="pb-5 border-b border-ink-200/70">
          <div class="h-4 w-32 rounded bg-ink-150" />
          <div class="mt-3 h-7 w-32 rounded bg-ink-150" />
        </div>
      </template>
    </ClientOnly>

    <ClientOnly>
      <!-- Div 1: 核心指标 -->
      <div class="mt-6">
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

        <div role="tablist" class="flex items-center gap-1 border-b border-ink-200/60 mb-4">
          <button
            v-for="t in pilots?.tabs ?? []"
            :key="t.key"
            type="button"
            role="tab"
            :aria-selected="activeTabKey === t.key"
            :class="[
              'relative h-9 px-4 inline-flex items-center text-[13px] font-medium transition-colors',
              activeTabKey === t.key ? 'text-brand-700' : 'text-ink-600 hover:text-ink-900',
            ]"
            @click="activeTabKey = t.key"
          >
            {{ t.label }}
            <span
              v-if="activeTabKey === t.key"
              class="absolute left-3 right-3 -bottom-px h-[2.5px] bg-brand-600 rounded-t-full"
            />
          </button>
        </div>

        <MultiLevelTable v-if="activeTab" :data="activeTab" @detail="onRowDetail" />
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
