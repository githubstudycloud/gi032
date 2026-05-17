<script setup lang="ts">
/**
 * KPI 区：把 v2 config.kpi（定义）+ data.kpi（数值）merge 成现有 `OverviewMetrics` 形状，
 * 再喂给 MetricsBox 渲染。
 *
 * config.kpi.groups[*].items[*]  =  KpiItemDef（key / label / description / threshold / unit / detail_ref）
 * data.kpi.groups[*].items[*]    =  KpiItemValue（key / value / mom / trend）
 *
 * MetricsBox 期望的 Metric 形状：{ key, label, value, mom, trend, description, threshold, detail }
 *   - 合并规则：定义为骨架，数值按 key 覆盖；缺数值的卡显示 "—"。
 */
import type { KpiSpec, KpiData } from '~/types/report-config';
import type { OverviewMetrics, Metric } from '~/types/overview-summary';

const props = defineProps<{
  spec?: KpiSpec;
  data?: KpiData;
}>();

const emit = defineEmits<{
  drill: [key: string];
}>();

const valuesByKey = computed<Record<string, { value?: string; mom?: string; trend?: 'up' | 'down' | 'flat' }>>(() => {
  const out: Record<string, { value?: string; mom?: string; trend?: 'up' | 'down' | 'flat' }> = {};
  for (const g of props.data?.groups ?? []) {
    for (const it of g.items) out[it.key] = { value: it.value, mom: it.mom, trend: it.trend };
  }
  return out;
});

const merged = computed<OverviewMetrics | null>(() => {
  if (!props.spec || props.spec.enabled === false) return null;
  const groups = props.spec.groups.map(g => ({
    key: g.key,
    label: g.label,
    items: g.items.map((it): Metric => {
      const v = valuesByKey.value[it.key];
      return {
        key: it.key,
        label: it.label,
        value: v?.value ?? '—',
        unit: it.unit,
        mom: v?.mom ?? '',
        trend: v?.trend ?? 'flat',
        description: it.description ?? '',
        threshold: it.threshold,
        detail: it.detail,
      };
    }),
  }));
  return { groups, footnote: props.spec.footnote ?? '' };
});

const enabled = computed(() => merged.value !== null);
</script>

<template>
  <MetricsBox
    v-if="enabled"
    :metrics="merged"
    :title="spec?.title ?? $t('metric.title')"
    @drill="emit('drill', $event)"
  />
</template>
