<script setup lang="ts">
/**
 * 通用报表页 —— 只接 reportType，里面组合 5 个 PageShell 模块。
 *
 * 业务页面用法：
 *   <ReportPage report-type="industry" />
 *
 * 一切由 /reports/<type>/config.json + data.json 驱动；没有 0 行业务硬编码。
 */
const props = defineProps<{
  reportType: string;
}>();

const {
  config, data, error, refresh,
  pagingMode, compare,
} = await useReport(props.reportType);

const drilldownLayer = ref<{ open: (c: { ref: string; row: Record<string, unknown>; cell?: { column?: string; value?: unknown }; filter?: Record<string, unknown> }) => void } | null>(null);

function onDetail(row: Record<string, unknown>, _tabKey: string): void {
  // 当前表格的第一个 drilldown ref —— 真实应用里应该按被点列的 drilldown.ref 走
  const ref = Object.keys(config.value?.drilldowns ?? {})[0];
  if (!ref) return;
  drilldownLayer.value?.open({ ref, row });
}

function onDrillKpi(kpiKey: string): void {
  const ref = config.value?.kpi?.groups
    .flatMap(g => g.items).find(i => i.key === kpiKey)?.detail_ref;
  if (!ref) return;
  drilldownLayer.value?.open({ ref, row: { _kpi: kpiKey } });
}
</script>

<template>
  <div>
    <ClientOnly>
      <ErrorPanel v-if="error" :error="error" @retry="refresh" />

      <template v-else-if="config">
        <PageHeader
          :name="config.meta.name"
          :subtitle="config.meta.subtitle"
          :description="config.meta.description"
        >
          <template #right>
            <ToolBar
              :spec="config.toolbar"
              :paging-mode="pagingMode"
              :compare="compare"
              @refresh="refresh"
              @update:paging-mode="pagingMode = $event"
              @update:compare="compare = $event"
            />
          </template>
        </PageHeader>

        <div class="space-y-6">
          <FilterSection
            v-if="config.filters?.length"
            :filters="config.filters"
            @search="refresh"
            @reset="() => { /* TODO: reset to defaults; simple ref reset 留给 PageHeader 后续做 */ }"
          />

          <KpiSection
            :spec="config.kpi"
            :data="data?.kpi"
            @drill="onDrillKpi"
          />

          <TableSection
            v-if="config.primary_view?.enabled"
            :view="config.primary_view"
            :data="data ?? undefined"
            @detail="onDetail"
          />
        </div>

        <DrilldownLayer
          ref="drilldownLayer"
          :drilldowns="config.drilldowns"
          :data="data ?? undefined"
        />
      </template>

      <template #fallback>
        <div class="space-y-4">
          <div class="h-12 rounded-xl border border-ink-200/70 bg-surface" />
          <div class="h-20 rounded-xl border border-ink-200/70 bg-surface" />
          <div class="h-96 rounded-xl border border-ink-200/70 bg-surface" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
