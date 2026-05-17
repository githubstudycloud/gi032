<script setup lang="ts">
/**
 * 主表格区：tab 切换 + MultiLevelTable。
 *
 * 单 tab 时不显 tab 条；多 tab 时用 TabStrip。
 * tab.header_tree 直接喂给 MultiLevelTable，rows 从 data.tabs[<tab.key>].items 取。
 */
import type { PrimaryView, ReportData } from '~/types/report-config';
import type { PilotTable, TableColumn, TableRow } from '~/types/overview-summary';

const props = defineProps<{
  view?: PrimaryView;
  data?: ReportData;
}>();

const emit = defineEmits<{
  detail: [row: Record<string, unknown>, tabKey: string];
}>();

const tabs = computed(() => props.view?.tabs ?? []);
const activeKey = ref<string>(tabs.value[0]?.key ?? '');

watch(tabs, (ts) => {
  if (!ts.find(t => t.key === activeKey.value)) {
    activeKey.value = ts[0]?.key ?? '';
  }
}, { immediate: true });

const activeTab = computed(() => tabs.value.find(t => t.key === activeKey.value) ?? null);

const activeTable = computed<PilotTable | null>(() => {
  const t = activeTab.value;
  if (!t) return null;
  const tabData = props.data?.tabs?.[t.key];
  return {
    key: t.key,
    label: t.label,
    columns: (t.header_tree ?? []) as TableColumn[],
    rows: (tabData?.items ?? []) as TableRow[],
    pagination: {
      page: tabData?.page ?? 1,
      pageSize: tabData?.page_size ?? props.view?.paging?.default_page_size ?? 10,
      total: tabData?.total ?? (tabData?.items?.length ?? 0),
    },
  };
});

function onRowDetail(row: Record<string, unknown>): void {
  emit('detail', row, activeKey.value);
}
</script>

<template>
  <section v-if="view?.enabled">
    <div class="flex items-center gap-2 mb-4">
      <span class="w-1 h-4 rounded-full bg-brand-500" />
      <h2 class="font-display text-[15px] font-semibold text-ink-900 tracking-tight">
        {{ activeTab?.label ?? view.title ?? $t('report.primaryViewTitle') }}
      </h2>
    </div>

    <TabStrip
      v-if="tabs.length > 1"
      v-model="activeKey"
      :tabs="tabs"
      :aria-label="$t('tabs.ariaLabel')"
      class="mb-4"
    />

    <div
      v-if="activeTable"
      :id="`panel-${activeTable.key}`"
      role="tabpanel"
      :aria-labelledby="`tab-${activeTable.key}`"
    >
      <MultiLevelTable :key="activeTable.key" :data="activeTable" @detail="onRowDetail" />
    </div>
  </section>
</template>
