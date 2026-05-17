<script setup lang="ts">
/**
 * 下钻弹窗层。父组件用 ref 拿到 open(ref, row, cell) 接口；
 * 内部按 drilldowns[ref] 拼参数 + 拉数据 + 渲染弹窗。
 *
 * 列定义：
 *   - drilldowns[ref].header_tree 不空 → 直接用
 *   - 否则 drilldowns[ref].header_tree_endpoint 不空 → 拉一次拿到列定义
 *   - mock 阶段：列定义都内嵌；endpoint 路径走 useReportData 的 drilldowns[ref].default
 */
import type { DrilldownDef, ReportData } from '~/types/report-config';
import type { PilotTable, TableColumn, TableRow } from '~/types/overview-summary';

const props = defineProps<{
  drilldowns?: Record<string, DrilldownDef>;
  data?: ReportData;
}>();

interface DrilldownContext {
  ref: string;
  row: Record<string, unknown>;
  cell?: { column?: string; value?: unknown };
  filter?: Record<string, unknown>;
}

const ctx = ref<DrilldownContext | null>(null);

function open(c: DrilldownContext): void {
  ctx.value = c;
}
function close(): void {
  ctx.value = null;
}
defineExpose({ open, close });

const def = computed<DrilldownDef | null>(() => {
  if (!ctx.value) return null;
  return props.drilldowns?.[ctx.value.ref] ?? null;
});

function applyTemplate(tpl: string, c: DrilldownContext): string {
  return tpl.replace(/\{(row|filter|cell)\.([\w.]+)\}/g, (_m, src, path) => {
    const root: Record<string, unknown> | undefined
      = src === 'row'
        ? c.row
        : src === 'filter'
          ? c.filter
          : src === 'cell'
            ? c.cell as Record<string, unknown>
            : undefined;
    if (!root) return '';
    const v = path.split('.').reduce<unknown>(
      (acc: unknown, key: string) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined),
      root,
    );
    return v == null ? '' : String(v);
  });
}

const title = computed<string>(() => {
  if (!def.value || !ctx.value) return '';
  return applyTemplate(def.value.title, ctx.value);
});

const table = computed<PilotTable | null>(() => {
  if (!def.value || !ctx.value) return null;
  const data = props.data?.drilldowns?.[ctx.value.ref]?.default;
  if (!data) return null;
  const columns = (def.value.header_tree ?? []) as TableColumn[];
  return {
    key: ctx.value.ref,
    label: title.value,
    columns,
    rows: (data.items ?? []) as TableRow[],
    pagination: {
      page: data.page ?? 1,
      pageSize: data.page_size ?? def.value.paging?.default_page_size ?? 50,
      total: data.total ?? (data.items?.length ?? 0),
    },
  };
});

function onEsc(e: KeyboardEvent): void {
  if (e.key === 'Escape' && ctx.value) close();
}
onMounted(() => {
  if (import.meta.client) document.addEventListener('keydown', onEsc);
});
onBeforeUnmount(() => {
  if (import.meta.client) document.removeEventListener('keydown', onEsc);
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="ctx && def"
        class="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        @click.self="close"
      >
        <div class="bg-surface rounded-xl border border-ink-200 shadow-2xl w-[960px] max-w-[95vw] max-h-[85vh] flex flex-col overflow-hidden">
          <header class="px-5 py-3 border-b border-ink-100 flex items-center gap-2">
            <span class="w-1 h-4 rounded-full bg-brand-500" />
            <h2 class="font-display text-[15px] font-semibold text-ink-900 truncate">
              {{ title }}
            </h2>
            <div class="flex-1" />
            <button
              type="button"
              :aria-label="$t('common.close')"
              class="w-7 h-7 inline-flex items-center justify-center rounded text-ink-500 hover:text-ink-900 hover:bg-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              @click="close"
            >
              ×
            </button>
          </header>
          <div class="flex-1 overflow-y-auto p-4">
            <MultiLevelTable v-if="table" :key="table.key" :data="table" />
            <p v-else class="text-center text-ink-500 py-12 text-[13px]">
              {{ $t('common.noData') }}
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
