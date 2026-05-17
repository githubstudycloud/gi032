<script setup lang="ts">
/**
 * 指标管理（一份 ManagementTable + mock 数据；接 API 时把 fetch 换成对应 endpoint 即可）。
 */
import { flattenNav } from '~/utils/nav-flat';
import type { ManagementPageConfig } from '~/types/management';

interface MetricsMock {
  page_config: ManagementPageConfig;
  data: { items: Record<string, unknown>[]; total: number; page: number; page_size: number };
}

const route = useRoute();
const { items: navItems } = await useNav();
const flat = computed(() => flattenNav(navItems.value));
const current = computed(() => flat.value.find(i => i.path === route.path));
useHead({ title: () => current.value?.label ?? '指标管理' });

const ds = await useDataSource<MetricsMock, MetricsMock>({
  key: 'admin-metrics',
  jsonPath: '/admin/metrics.json',
  apiPath: '/admin/metrics',
  transform: (raw): MetricsMock => raw,
});

const pageConfig = computed<ManagementPageConfig | null>(() => ds.data.value?.page_config ?? null);
const rows = ref<Record<string, unknown>[]>([]);

watch(ds.data, (d) => {
  rows.value = (d?.data.items ?? []).slice();
}, { immediate: true });

function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function onCreate(row: Record<string, unknown>): void {
  // 重复 ID 检查
  if (rows.value.some(r => String(r.id) === String(row.id))) {
    // 简单实现：忽略；ManagementTable 自带必填校验，重复用 alert 兜底
    if (typeof window !== 'undefined') window.alert('该指标 ID 已存在');
    return;
  }
  rows.value = [{ ...row, updated_at: nowStamp() }, ...rows.value];
}
function onUpdate(id: string, patch: Record<string, unknown>): void {
  rows.value = rows.value.map(r =>
    String(r.id) === id ? { ...r, ...patch, updated_at: nowStamp() } : r,
  );
}
function onDelete(id: string): void {
  rows.value = rows.value.filter(r => String(r.id) !== id);
}
</script>

<template>
  <div>
    <ClientOnly>
      <ErrorPanel v-if="ds.error.value" :error="ds.error.value" @retry="ds.refresh" />

      <ManagementTable
        v-else-if="pageConfig"
        :config="pageConfig"
        :items="rows"
        @create="onCreate"
        @update="onUpdate"
        @delete="onDelete"
      />

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
