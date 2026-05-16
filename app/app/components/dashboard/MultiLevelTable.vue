<script setup lang="ts">
import type { PilotTable, TableColumn, TableRow } from '~/types/overview-summary';
import { parseNumeric, thresholdPillClass } from '~/utils/threshold';

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

function isSortable(col: TableColumn): boolean {
  if (col.key === 'actions') return false;
  return col.sortable !== false;
}

function isFilterable(col: TableColumn): boolean {
  if (col.key === 'actions') return false;
  return col.filterable !== false;
}

function toggleSort(col: TableColumn): void {
  if (!isSortable(col)) return;
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
const filterSearch = ref<string>('');
const selectedFilters = ref<Record<string, Set<string>>>({});

function uniqueValues(key: string): string[] {
  const set = new Set<string>();
  for (const r of props.data.rows) {
    const v = r[key];
    if (v !== undefined && v !== null && v !== '') set.add(String(v));
  }
  return Array.from(set).sort((a, b) => {
    const na = parseNumeric(a);
    const nb = parseNumeric(b);
    if (na !== null && nb !== null) return na - nb;
    return a.localeCompare(b, 'zh-Hans-CN');
  });
}

function filteredValues(key: string): string[] {
  const q = filterSearch.value.trim().toLowerCase();
  const all = uniqueValues(key);
  if (!q) return all;
  return all.filter(v => v.toLowerCase().includes(q));
}

function isFilterActive(key: string): boolean {
  const s = selectedFilters.value[key];
  return !!s && s.size > 0;
}

function activeFilterCount(key: string): number {
  return selectedFilters.value[key]?.size ?? 0;
}

function toggleFilterValue(key: string, v: string): void {
  const cur = new Set(selectedFilters.value[key] ?? []);
  if (cur.has(v)) cur.delete(v); else cur.add(v);
  selectedFilters.value = { ...selectedFilters.value, [key]: cur };
}

function selectAllFilter(key: string): void {
  selectedFilters.value = {
    ...selectedFilters.value,
    [key]: new Set(filteredValues(key)),
  };
}

function invertFilter(key: string): void {
  const all = filteredValues(key);
  const cur = selectedFilters.value[key] ?? new Set<string>();
  const next = new Set<string>();
  for (const v of all) if (!cur.has(v)) next.add(v);
  selectedFilters.value = { ...selectedFilters.value, [key]: next };
}

function clearFilter(key: string): void {
  const next = { ...selectedFilters.value };
  delete next[key];
  selectedFilters.value = next;
}

function openFilter(key: string): void {
  filterOpen.value = filterOpen.value === key ? null : key;
  filterSearch.value = '';
}

/* —— tab / data 切换时重置本表所有筛选与排序，防止跨表残留 —— */
watch(
  () => props.data.key,
  () => {
    sortKey.value = null;
    sortDir.value = null;
    filterOpen.value = null;
    filterSearch.value = '';
    selectedFilters.value = {};
  },
);

/* —— 点击表格外关闭筛选下拉 —— */
const rootEl = ref<HTMLElement | null>(null);
function onDocClick(e: MouseEvent): void {
  if (!filterOpen.value) return;
  const t = e.target as Node | null;
  if (rootEl.value && t && !rootEl.value.contains(t)) {
    filterOpen.value = null;
  }
}
function onEsc(e: KeyboardEvent): void {
  if (e.key === 'Escape' && filterOpen.value) {
    filterOpen.value = null;
  }
}
onMounted(() => {
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onEsc);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onEsc);
});

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
  return col.highlight ? 'bg-brand-50/50' : '';
}

const totalPages = computed<number>(() => {
  const { total, pageSize } = props.data.pagination;
  return Math.max(1, Math.ceil(total / pageSize));
});
</script>

<template>
  <div
    ref="rootEl"
    class="rounded-xl border border-ink-200/70 bg-surface overflow-hidden shadow-[var(--shadow-card)]"
  >
    <div class="overflow-x-auto overflow-y-visible">
      <table
        class="text-[13.5px] border-collapse"
        style="width: max-content; min-width: 100%"
      >
        <thead class="text-ink-700">
          <tr v-for="(row, ri) in thRows" :key="ri">
            <th
              v-for="c in row"
              :key="c.col.key"
              :rowspan="c.rowspan === 1 ? undefined : c.rowspan"
              :colspan="c.colspan === 1 ? undefined : c.colspan"
              :style="{ width: c.col.width }"
              :class="[
                'relative px-3 whitespace-nowrap align-middle border-b border-ink-200/60 border-r border-r-ink-200/30 last:border-r-0',
                alignClass(c.col),
                ri === 0
                  ? 'py-2.5 text-[13px] font-semibold tracking-wide bg-gradient-to-b from-ink-50 to-ink-100/60'
                  : 'py-2 text-[12px] font-medium text-ink-600 bg-ink-50/60',
                c.col.highlight
                  ? 'bg-brand-100/70 text-brand-800 border-r-brand-200'
                  : '',
              ]"
            >
              <div
                :class="[
                  'inline-flex items-center gap-1 select-none',
                  alignClass(c.col) === 'text-center' ? 'justify-center' : alignClass(c.col) === 'text-right' ? 'justify-end' : 'justify-start',
                  c.isLeaf && isSortable(c.col) ? 'cursor-pointer group/sort hover:text-brand-700 transition-colors' : '',
                ]"
                @click="c.isLeaf && toggleSort(c.col)"
              >
                <span>{{ c.col.label }}</span>
                <span
                  v-if="c.isLeaf && isSortable(c.col)"
                  class="relative inline-flex flex-col w-2.5 h-3.5 ml-0.5 leading-none"
                  aria-hidden="true"
                >
                  <span
                    class="absolute top-0 left-0 text-[8px] leading-none"
                    :class="sortKey === c.col.key && sortDir === 'asc' ? 'text-brand-700' : 'text-ink-300 group-hover/sort:text-ink-500'"
                  >▲</span>
                  <span
                    class="absolute bottom-0 left-0 text-[8px] leading-none"
                    :class="sortKey === c.col.key && sortDir === 'desc' ? 'text-brand-700' : 'text-ink-300 group-hover/sort:text-ink-500'"
                  >▼</span>
                </span>
                <button
                  v-if="c.isLeaf && isFilterable(c.col)"
                  type="button"
                  class="ml-1 h-5 px-1 inline-flex items-center justify-center rounded-md text-[10px] leading-none transition-colors"
                  :class="[
                    isFilterActive(c.col.key)
                      ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-700'
                      : 'text-ink-400 hover:text-brand-700 hover:bg-ink-200/60',
                  ]"
                  :aria-label="`筛选 ${c.col.label}`"
                  @click.stop="openFilter(c.col.key)"
                >
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M1.5 2.5A1 1 0 0 1 2.5 1.5h11a1 1 0 0 1 .8 1.6l-4.3 5.5v4.4a1 1 0 0 1-.45.83l-2 1.3A1 1 0 0 1 6 14.3V8.6L1.7 3.1a1 1 0 0 1-.2-.6z"/>
                  </svg>
                  <span v-if="isFilterActive(c.col.key)" class="ml-0.5 font-semibold">{{ activeFilterCount(c.col.key) }}</span>
                </button>
              </div>

              <Transition
                enter-active-class="transition duration-150 ease-out"
                enter-from-class="opacity-0 -translate-y-1 scale-95"
                enter-to-class="opacity-100 translate-y-0 scale-100"
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
              >
                <div
                  v-if="filterOpen === c.col.key"
                  class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-30 w-[240px] rounded-xl border border-ink-200 bg-surface shadow-xl ring-1 ring-ink-900/5 text-left origin-top overflow-hidden"
                  @click.stop
                >
                  <div class="flex items-center justify-between px-3 py-2 bg-ink-50/80 border-b border-ink-200/60">
                    <span class="text-[12px] font-semibold text-ink-700">筛选 · {{ c.col.label }}</span>
                    <button
                      type="button"
                      class="w-5 h-5 inline-flex items-center justify-center rounded text-ink-400 hover:text-ink-700 hover:bg-ink-200/60 text-[14px] leading-none"
                      aria-label="关闭"
                      @click="filterOpen = null"
                    >×</button>
                  </div>

                  <div class="px-2.5 pt-2 pb-1.5">
                    <div class="relative">
                      <input
                        v-model="filterSearch"
                        type="text"
                        placeholder="搜索..."
                        class="w-full h-7 pl-7 pr-2 text-[12px] rounded-md border border-ink-200 bg-surface placeholder:text-ink-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      >
                      <svg class="absolute left-2 top-1/2 -translate-y-1/2 text-ink-400" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
                        <circle cx="7" cy="7" r="4.5"/>
                        <path d="m13.5 13.5-3-3"/>
                      </svg>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 px-3 pb-1.5 text-[11px]">
                    <button type="button" class="text-brand-700 hover:underline" @click="selectAllFilter(c.col.key)">全选</button>
                    <button type="button" class="text-ink-600 hover:underline" @click="invertFilter(c.col.key)">反选</button>
                    <button type="button" class="text-ink-500 hover:underline" @click="clearFilter(c.col.key)">清空</button>
                    <span class="ml-auto text-ink-400">已选 {{ activeFilterCount(c.col.key) }} / {{ uniqueValues(c.col.key).length }}</span>
                  </div>

                  <div class="max-h-[220px] overflow-auto px-1.5 pb-1.5">
                    <label
                      v-for="v in filteredValues(c.col.key)"
                      :key="v"
                      class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-brand-50/60 cursor-pointer text-[12.5px] text-ink-800"
                    >
                      <input
                        type="checkbox"
                        :checked="selectedFilters[c.col.key]?.has(v) ?? false"
                        class="w-3.5 h-3.5 accent-brand-600 cursor-pointer"
                        @change="toggleFilterValue(c.col.key, v)"
                      >
                      <span class="truncate flex-1">{{ v }}</span>
                    </label>
                    <div v-if="!filteredValues(c.col.key).length" class="px-2 py-3 text-center text-[12px] text-ink-400">
                      无匹配项
                    </div>
                  </div>
                </div>
              </Transition>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in displayRows"
            :key="i"
            :class="[
              'border-b border-ink-100/80 last:border-b-0 transition-colors',
              i % 2 === 1 ? 'bg-ink-50/30' : '',
              'hover:bg-brand-50/40',
            ]"
          >
            <td
              v-for="leaf in allLeaves"
              :key="leaf.key"
              :class="[
                'px-3 py-2.5 whitespace-nowrap text-ink-900 tabular-nums border-r border-ink-100/50 last:border-r-0',
                alignClass(leaf),
                highlightCellClass(leaf),
              ]"
            >
              <template v-if="leaf.key === 'actions'">
                <button
                  v-if="String(row[leaf.key]) === '详情'"
                  type="button"
                  class="inline-flex items-center px-2 py-0.5 rounded-md text-brand-700 hover:bg-brand-50 text-[13px] font-medium"
                  @click="$emit('detail', row)"
                >
                  详情 →
                </button>
                <span v-else class="text-ink-400 text-[12px]">{{ row[leaf.key] }}</span>
              </template>
              <template v-else-if="leaf.threshold && parseNumeric(row[leaf.key]) !== null">
                <span
                  :class="[
                    'inline-flex items-center justify-center min-w-[3.5rem] px-2 py-0.5 rounded-md text-[13px] font-semibold tabular-nums',
                    thresholdPillClass(row[leaf.key], leaf.threshold),
                  ]"
                >
                  {{ row[leaf.key] }}
                </span>
              </template>
              <template v-else>
                <span :class="String(row[leaf.key]) === '—' ? 'text-ink-300' : ''">
                  {{ row[leaf.key] ?? '—' }}
                </span>
              </template>
            </td>
          </tr>
          <tr v-if="!displayRows.length">
            <td :colspan="allLeaves.length" class="text-center py-12 text-ink-400 text-[13px]">
              <div class="inline-flex flex-col items-center gap-1.5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" class="text-ink-300">
                  <rect x="3" y="4" width="18" height="16" rx="2"/>
                  <path d="M3 9h18M9 4v16"/>
                </svg>
                <span>无匹配数据</span>
                <button
                  v-if="Object.keys(selectedFilters).length"
                  type="button"
                  class="text-[12px] text-brand-700 hover:underline"
                  @click="selectedFilters = {}"
                >清除所有筛选</button>
              </div>
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
