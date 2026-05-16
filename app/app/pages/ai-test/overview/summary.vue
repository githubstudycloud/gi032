<script setup lang="ts">
import { flattenNav } from '~/utils/nav-flat';

const route = useRoute();
const { items: navItems } = await useNav();
const { metrics, pilots } = await useOverviewSummary();

/* —— 面包屑 —— */
const flat = computed(() => flattenNav(navItems.value));
const current = computed(() => flat.value.find(i => i.path === route.path));
useHead({ title: () => current.value?.label ?? '总览' });

/* —— 核心指标视图：分组 / 平铺 —— */
type MetricViewMode = 'grouped' | 'flat';
const metricViewMode = ref<MetricViewMode>('grouped');
const allMetrics = computed(() =>
  metrics.value?.groups.flatMap(g => g.items) ?? [],
);

/* —— Tabs —— */
const activeTabKey = ref<string>('industry');
const activeTab = computed(() =>
  pilots.value?.tabs.find(t => t.key === activeTabKey.value) ?? pilots.value?.tabs[0] ?? null,
);

/* —— 卡片下钻 占位 —— */
function onDrill(metricKey: string): void {
  // TODO: 跳明细页或弹明细弹窗
  console.log('drill:', metricKey);
}
function onRowDetail(row: Record<string, unknown>): void {
  console.log('row detail:', row);
}
</script>

<template>
  <div>
    <ClientOnly>
      <PageHeader
        :title="current?.label ?? '总览'"
        :breadcrumb="current?.breadcrumb"
      />
      <template #fallback>
        <div class="pb-5 border-b border-ink-200/70">
          <div class="h-4 w-32 rounded bg-ink-150" />
          <div class="mt-3 h-7 w-32 rounded bg-ink-150" />
        </div>
      </template>
    </ClientOnly>

    <ClientOnly>
      <!-- ============ Div 1：核心指标 ============ -->
      <section class="mt-6 rounded-xl border border-ink-200/70 bg-surface px-5 py-5 shadow-[var(--shadow-card)]">
        <header class="flex items-center gap-2 mb-4">
          <span class="w-1 h-4 rounded-full bg-brand-500" />
          <h2 class="font-display text-[15px] font-semibold text-ink-900 tracking-tight">
            核心指标
          </h2>
          <div class="flex-1" />
          <!-- 视图切换：分组 / 平铺 -->
          <div
            role="tablist"
            aria-label="核心指标视图"
            class="inline-flex items-center rounded-md border border-ink-200 bg-ink-50/60 p-0.5 text-[12px]"
          >
            <button
              type="button"
              role="tab"
              :aria-selected="metricViewMode === 'grouped'"
              :class="[
                'h-7 px-3 rounded transition-colors',
                metricViewMode === 'grouped'
                  ? 'bg-surface text-ink-900 shadow-[var(--shadow-card)] font-medium'
                  : 'text-ink-600 hover:text-ink-900',
              ]"
              @click="metricViewMode = 'grouped'"
            >
              分组
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="metricViewMode === 'flat'"
              :class="[
                'h-7 px-3 rounded transition-colors',
                metricViewMode === 'flat'
                  ? 'bg-surface text-ink-900 shadow-[var(--shadow-card)] font-medium'
                  : 'text-ink-600 hover:text-ink-900',
              ]"
              @click="metricViewMode = 'flat'"
            >
              平铺
            </button>
          </div>
        </header>

        <!-- 分组模式：每组一个 section 带小标题 -->
        <div v-if="metricViewMode === 'grouped'" class="space-y-6">
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
                @drill="onDrill"
              />
            </div>
          </section>
        </div>

        <!-- 平铺模式：所有卡放在一个网格，不展示分类 -->
        <div
          v-else
          class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
        >
          <MetricCard
            v-for="m in allMetrics"
            :key="m.key"
            :metric="m"
            @drill="onDrill"
          />
        </div>

        <p
          v-if="metrics?.footnote"
          class="mt-5 pt-4 border-t border-ink-100 text-[12px] text-ink-500"
        >
          {{ metrics.footnote }}
        </p>
      </section>

      <!-- ============ Div 2：试点进展明细（标题跟随当前 tab） ============ -->
      <section class="mt-6">
        <div class="flex items-center gap-2 mb-4">
          <span class="w-1 h-4 rounded-full bg-brand-500" />
          <h2 class="font-display text-[15px] font-semibold text-ink-900 tracking-tight">
            {{ activeTab?.label ?? '试点进展明细' }}
          </h2>
        </div>

        <!-- Tabs -->
        <div
          role="tablist"
          class="flex items-center gap-1 border-b border-ink-200/60 mb-4"
        >
          <button
            v-for="t in pilots?.tabs ?? []"
            :key="t.key"
            type="button"
            role="tab"
            :aria-selected="activeTabKey === t.key"
            :class="[
              'relative h-9 px-4 inline-flex items-center text-[13px] font-medium transition-colors',
              activeTabKey === t.key
                ? 'text-brand-700'
                : 'text-ink-600 hover:text-ink-900',
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

        <!-- Active tab table -->
        <MultiLevelTable
          v-if="activeTab"
          :data="activeTab"
          @detail="onRowDetail"
        />
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
