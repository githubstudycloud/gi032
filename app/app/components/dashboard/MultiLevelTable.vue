<script setup lang="ts">
import type { PilotTable, TableColumn, TableRow } from '~/types/overview-summary';
import { parseNumeric, thresholdClass } from '~/utils/threshold';

const props = defineProps<{
  data: PilotTable;
}>();

defineEmits<{
  detail: [row: Record<string, unknown>];
}>();

/* —— 通用 N 层表头算法 —— */

function depthOf(c: TableColumn): number {
  if (!c.children?.length) return 1;
  return 1 + Math.max(...c.children.map(depthOf));
}

function leavesOf(c: TableColumn): TableColumn[] {
  if (!c.children?.length) return [c];
  return c.children.flatMap(leavesOf);
}

const maxDepth = computed<number>(() =>
  Math.max(1, ...props.data.columns.map(depthOf)),
);

const allLeaves = computed<TableColumn[]>(() =>
  props.data.columns.flatMap(leavesOf),
);

interface ThCell {
  col: TableColumn;
  rowspan: number;
  colspan: number;
  isLeaf: boolean;
}

function thRowCells(cols: TableColumn[], target: number, current = 1): ThCell[] {
  const out: ThCell[] = [];
  for (const c of cols) {
    if (current === target) {
      if (c.children?.length) {
        out.push({ col: c, rowspan: 1, colspan: leavesOf(c).length, isLeaf: false });
      } else {
        out.push({ col: c, rowspan: maxDepth.value - current + 1, colspan: 1, isLeaf: true });
      }
    } else if (current < target && c.children?.length) {
      out.push(...thRowCells(c.children, target, current + 1));
    }
  }
  return out;
}

const thRows = computed<ThCell[][]>(() => {
  const rows: ThCell[][] = [];
  for (let level = 1; level <= maxDepth.value; level++) {
    rows.push(thRowCells(props.data.columns, level));
  }
  return rows;
});

/* —— 排序 —— */
type SortDir = 'asc' | 'desc' | null;
const sortKey = ref<string | null>(null);
const sortDir = ref<SortDir>(null);

function toggleSort(col: TableColumn): void {
  if (!col.sortable) return;
  if (sortKey.value !== col.key) {
    sortKey.value = col.key;
    sortDir.value = 'asc';
  } else if (sortDir.value === 'asc') {
    sortDir.value = 'desc';
  } else {
    sortKey.value = null;
    sortDir.value = null;
  }
}

/* —— 列筛选 —— */
const filterOpen = ref<string | null>(null);
const selectedFilters = ref<Record<string, Set<string>>>({});

function uniqueValues(key: string): string[] {
  const set = new Set<string>();
  for (const r of props.data.rows) {
    const v = r[key];
    if (v !== undefined && v !== null) set.add(String(v));
  }
  return Array.from(set).sort();
}

function isFilterActive(key: string): boolean {
  const s = selectedFilters.value[key];
  return !!s && s.size > 0;
}

function toggleFilterValue(key: string, v: string): void {
  const cur = new Set(selectedFilters.value[key] ?? []);
  if (cur.has(v)) cur.delete(v); else cur.add(v);
  selectedFilters.value = { ...selectedFilters.value, [key]: cur };
}

function clearFilter(key: string): void {
  const next = { ...selectedFilters.value };
  delete next[key];
  selectedFilters.value = next;
}

/* —— 派生 rows —— */
const displayRows = computed<TableRow[]>(() => {
  let rows = props.data.rows.slice();

  for (const [k, set] of Object.entries(selectedFilters.value)) {
    if (!set.size) continue;
    rows = rows.filter(r => set.has(String(r[k])));
  }

  if (sortKey.value && sortDir.value) {
    const k = sortKey.value;
    const dir = sortDir.value === 'asc' ? 1 : -1;
    rows = rows.slice().sort((a, b) => {
      const na = parseNumeric(a[k]);
      const nb = parseNumeric(b[k]);
      if (na !== null && nb !== null) return (na - nb) * dir;
      return String(a[k] ?? '').localeCompare(String(b[k] ?? '')) * dir;
    });
  }

  return rows;
});

/* —— 列样式工具 —— */
function alignClass(col: TableColumn): string {
  const a = col.align ?? 'center';
  return a === 'left' ? 'text-left' : a === 'right' ? 'text-right' : 'text-center';
}

function highlightCellClass(col: TableColumn): string {
  return col.highlight ? 'bg-brand-50/60' : '';
}

function highlightHeadClass(col: TableColumn): string {
  return col.highlight ? 'bg-brand-100/70 text-brand-800' : '';
}

const totalPages = computed<number>(() => {
  const { total, pageSize } = props.data.pagination;
  return Math.max(1, Math.ceil(total / pageSize));
});
</script>

<template>
  <div class="rounded-xl border border-ink-200/70 bg-surface overflow-hidden shadow-[var(--shadow-card)]">
    <div class="overflow-x-auto overflow-y-visible">
      <table
        class="text-[14px] border-collapse"
        style="width: max-content; min-width: 100%"
      >
        <thead class="bg-ink-50/70 text-ink-700">
          <tr v-for="(row, ri) in thRows" :key="ri">
            <th
              v-for="c in row"
              :key="c.col.key"
              :rowspan="c.rowspan === 1 ? undefined : c.rowspan"
              :colspan="c.colspan === 1 ? undefined : c.colspan"
              :style="{ width: c.col.width }"
              :class="[
                'relative px-3 whitespace-nowrap border-b border-r border-ink-200/40 last:border-r-0 align-middle',
                alignClass(c.col),
                highlightHeadClass(c.col),
                ri === 0
                  ? 'py-2.5 text-[13px] font-semibold'
                  : 'py-2 text-[12px] font-normal text-ink-600',
                !c.col.highlight && ri > 0 ? 'bg-ink-100/30' : '',
              ]"
            >
              <div
                :class="[
                  'inline-flex items-center justify-center gap-1 select-none',
                  c.col.sortable && c.isLeaf ? 'cursor-pointer hover:text-brand-700' : '',
                ]"
                @click="c.isLeaf && toggleSort(c.col)"
              >
                <span>{{ c.col.label }}</span>
                <span
                  v-if="c.col.sortable && c.isLeaf"
                  class="text-[10px] leading-none"
                  :class="sortKey === c.col.key ? 'text-brand-700' : 'text-ink-400'"
                  aria-hidden="true"
                >
                  {{ sortKey === c.col.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅' }}
                </span>
                <button
                  v-if="c.col.filterable && c.isLeaf"
                  type="button"
                  class="ml-0.5 w-4 h-4 inline-flex items-center justify-center rounded hover:bg-ink-200/60 text-[11px] leading-none"
                  :class="isFilterActive(c.col.key) ? 'text-brand-700' : 'text-ink-400'"
                  :aria-label="`筛选 ${c.col.label}`"
                  @click.stop="filterOpen = filterOpen === c.col.key ? null : c.col.key"
                >▾</button>
              </div>

              <div
                v-if="filterOpen === c.col.key"
                class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-20 min-w-[140px] max-h-[240px] overflow-auto rounded-md border border-ink-200 bg-surface shadow-lg text-left p-1.5"
                @click.stop
              >
                <div class="flex items-center justify-between px-1.5 py-1 text-[11px] text-ink-500">
                  <span>筛选</span>
                  <button
                    type="button"
                    class="text-brand-700 hover:underline"
                    @click="clearFilter(c.col.key); filterOpen = null"
                  >清空</button>
                </div>
                <label
                  v-for="v in uniqueValues(c.col.key)"
                  :key="v"
                  class="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-ink-50 cursor-pointer text-[12px] text-ink-800"
                >
                  <input
                    type="checkbox"
                    :checked="selectedFilters[c.col.key]?.has(v) ?? false"
                    class="accent-brand-600"
                    @change="toggleFilterValue(c.col.key, v)"
                  >
                  <span class="truncate">{{ v }}</span>
                </label>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in displayRows"
            :key="i"
            class="border-b border-ink-100 last:border-b-0 hover:bg-ink-50/40 transition-colors"
          >
            <td
              v-for="leaf in allLeaves"
              :key="leaf.key"
              :class="[
                'px-3 py-2.5 whitespace-nowrap text-ink-900 tabular-nums',
                alignClass(leaf),
                highlightCellClass(leaf),
                thresholdClass(row[leaf.key], leaf.threshold),
              ]"
            >
              <template v-if="leaf.key === 'actions'">
                <button
                  v-if="String(row[leaf.key]) === '详情'"
                  type="button"
                  class="text-brand-700 hover:underline text-[13px]"
                  @click="$emit('detail', row)"
                >
                  详情
                </button>
                <span v-else class="text-ink-400 text-[12px]">{{ row[leaf.key] }}</span>
              </template>
              <template v-else>
                <span :class="String(row[leaf.key]) === '—' ? 'text-ink-400' : ''">
                  {{ row[leaf.key] ?? '—' }}
                </span>
              </template>
            </td>
          </tr>
          <tr v-if="!displayRows.length">
            <td :colspan="allLeaves.length" class="text-center py-10 text-ink-500 text-[13px]">
              暂无数据
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer
      v-if="data.pagination"
      class="border-t border-ink-100 px-4 py-2.5 flex items-center justify-end gap-3 text-[12px] text-ink-600"
    >
      <span>共 {{ displayRows.length }} / {{ data.pagination.total }} 条</span>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="h-7 w-7 rounded border border-ink-200 bg-surface hover:bg-ink-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          :disabled="data.pagination.page <= 1"
          aria-label="上一页"
        >‹</button>
        <span class="px-2">{{ data.pagination.page }} / {{ totalPages }}</span>
        <button
          type="button"
          class="h-7 w-7 rounded border border-ink-200 bg-surface hover:bg-ink-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          :disabled="data.pagination.page >= totalPages"
          aria-label="下一页"
        >›</button>
      </div>
    </footer>
  </div>
</template>
