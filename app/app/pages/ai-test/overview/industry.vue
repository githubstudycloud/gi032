<script setup lang="ts">
import { flattenNav } from '~/utils/nav-flat';

const route = useRoute();
const { items: navItems } = await useNav();
const { filters, metrics, pilots } = await useIndustryLanding();

/* —— 面包屑 —— */
const flat = computed(() => flattenNav(navItems.value));
const current = computed(() => flat.value.find(i => i.path === route.path));
useHead({ title: () => current.value?.label ?? '产业落地进展' });

/* —— 筛选 —— */
const timeRange = ref<string>('7d');
const department = ref<string>('all');
function onSearch(): void {
  // TODO: 接入后端 refresh({ timeRange, department })
}
function onReset(): void {
  timeRange.value = '7d';
  department.value = 'all';
}

/* —— Tabs —— */
const activeTabKey = ref<string>('industry-detail');
const activeTab = computed(() =>
  pilots.value?.tabs.find(t => t.key === activeTabKey.value) ?? pilots.value?.tabs[0] ?? null,
);

function onDrill(metricKey: string): void {
  console.log('drill:', metricKey);
}
function onRowDetail(row: Record<string, unknown>): void {
  console.log('row detail:', row);
}
</script>

<template>
  <div>
    <ClientOnly>
      <!-- Div 1: 产业落地进展筛选 -->
      <section class="rounded-xl border border-ink-200/70 bg-surface px-5 py-4 shadow-[var(--shadow-card)]">
        <header class="flex items-center gap-2 mb-3">
          <span class="w-1 h-4 rounded-full bg-brand-500" />
          <h2 class="font-display text-[15px] font-semibold text-ink-900 tracking-tight">
            产业落地进展筛选
          </h2>
        </header>

        <div class="flex flex-wrap items-end gap-4">
          <label class="block text-sm flex-1 min-w-[180px] max-w-[260px]">
            <span class="block text-ink-600 mb-1.5 text-[11px] font-medium tracking-wide uppercase">
              时间范围
            </span>
            <select
              v-model="timeRange"
              class="w-full h-9 rounded-md border border-ink-200 px-3 text-[13px] bg-surface text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option
                v-for="opt in filters?.timeRanges ?? []"
                :key="opt.key"
                :value="opt.key"
              >{{ opt.label }}</option>
            </select>
          </label>

          <label class="block text-sm flex-1 min-w-[180px] max-w-[280px]">
            <span class="block text-ink-600 mb-1.5 text-[11px] font-medium tracking-wide uppercase">
              部门
            </span>
            <select
              v-model="department"
              class="w-full h-9 rounded-md border border-ink-200 px-3 text-[13px] bg-surface text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option
                v-for="opt in filters?.departments ?? []"
                :key="opt.key"
                :value="opt.key"
              >{{ opt.label }}</option>
            </select>
          </label>

          <div class="flex gap-2">
            <button
              type="button"
              class="h-9 px-4 rounded-md bg-brand-600 text-white text-[13px] font-medium hover:bg-brand-700 active:bg-brand-800 transition-colors shadow-[0_2px_6px_-1px_oklch(0.62_0.14_235/0.35)]"
              @click="onSearch"
            >查询</button>
            <button
              type="button"
              class="h-9 px-4 rounded-md border border-ink-200 bg-surface text-[13px] text-ink-700 hover:bg-ink-100 transition-colors"
              @click="onReset"
            >重置</button>
          </div>
        </div>
      </section>

      <!-- Div 2: 核心指标（复用 MetricsBox） -->
      <div class="mt-6">
        <MetricsBox :metrics="metrics" @drill="onDrill" />
      </div>

      <!-- Div 3: tabs 表格 -->
      <section class="mt-6">
        <div class="flex items-center gap-2 mb-4">
          <span class="w-1 h-4 rounded-full bg-brand-500" />
          <h2 class="font-display text-[15px] font-semibold text-ink-900 tracking-tight">
            {{ activeTab?.label ?? '试点进展' }}
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
          <div class="h-20 rounded-xl border border-ink-200/70 bg-surface" />
          <div class="h-80 rounded-xl border border-ink-200/70 bg-surface" />
          <div class="h-96 rounded-xl border border-ink-200/70 bg-surface" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
