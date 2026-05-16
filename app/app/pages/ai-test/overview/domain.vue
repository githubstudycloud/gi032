<script setup lang="ts">
import { flattenNav } from '~/utils/nav-flat';

const route = useRoute();
const { items: navItems } = await useNav();
const { filters, metrics, pilots } = await useDomainLanding();

/* —— 面包屑 —— */
const flat = computed(() => flattenNav(navItems.value));
const current = computed(() => flat.value.find(i => i.path === route.path));
useHead({ title: () => current.value?.label ?? '领域落地进展' });

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

/* —— 单 tab 的明细 —— */
const detailTab = computed(() => pilots.value?.tabs[0] ?? null);

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
      <PageHeader :title="current?.label ?? '领域落地进展'" :breadcrumb="current?.breadcrumb" />
      <template #fallback>
        <div class="pb-5 border-b border-ink-200/70">
          <div class="h-4 w-32 rounded bg-ink-150" />
          <div class="mt-3 h-7 w-32 rounded bg-ink-150" />
        </div>
      </template>
    </ClientOnly>

    <ClientOnly>
      <!-- Div 1: 领域落地进展筛选 -->
      <section class="mt-6 rounded-xl border border-ink-200/70 bg-surface px-5 py-4 shadow-[var(--shadow-card)]">
        <header class="flex items-center gap-2 mb-3">
          <span class="w-1 h-4 rounded-full bg-brand-500" />
          <h2 class="font-display text-[15px] font-semibold text-ink-900 tracking-tight">
            领域落地进展筛选
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

      <!-- Div 2: 核心指标 -->
      <div class="mt-6">
        <MetricsBox :metrics="metrics" @drill="onDrill" />
      </div>

      <!-- Div 3: 领域落地进展明细 -->
      <section class="mt-6">
        <div class="flex items-center gap-2 mb-4">
          <span class="w-1 h-4 rounded-full bg-brand-500" />
          <h2 class="font-display text-[15px] font-semibold text-ink-900 tracking-tight">
            {{ detailTab?.label ?? '领域落地进展明细' }}
          </h2>
        </div>

        <MultiLevelTable v-if="detailTab" :data="detailTab" @detail="onRowDetail" />
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
