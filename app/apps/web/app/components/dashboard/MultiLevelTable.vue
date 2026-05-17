<script setup lang="ts">
import type { ActionCell, PilotTable, TableColumn, TableRow } from '~/types/overview-summary';
import { parseNumeric, thresholdPillClass } from '~/utils/threshold';

const { t } = useI18n();

/* —— action 列归一化：兼容老的 "详情" / "不涉及" 字符串 + 新的 ActionCell 对象 —— */
function asActionCell(v: unknown): ActionCell {
  if (v && typeof v === 'object' && 'kind' in (v as Record<string, unknown>)) {
    const o = v as ActionCell;
    return { kind: o.kind, label: o.label };
  }
  const s = v == null ? '' : String(v);
  // 中文老格式：'详情' 之外都是 N/A 标签
  return s === '详情'
    ? { kind: 'detail', label: '详情' }
    : { kind: 'na', label: s || '—' };
}

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
      }
      else {
        out.push({ col: c, rowspan: maxDepth.value - current + 1, colspan: 1, isLeaf: true });
      }
    }
    else if (current < target && c.children?.length) {
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
  }
  else if (sortDir.value === 'asc') {
    sortDir.value = 'desc';
  }
  else {
    sortKey.value = null;
    sortDir.value = null;
  }
}

/* —— 列筛选 —— */
const filterOpen = ref<string | null>(null);
const filterSearch = ref<string>('');
const selectedFilters = ref<Record<string, Set<string>>>({});

/**
 * 每列的全部枚举值，按列 key 缓存；data.rows 变才重算。
 * 行数大、列数多时比每次按下按键都全表扫快得多。
 */
const uniqueValuesByKey = computed<Record<string, string[]>>(() => {
  const out: Record<string, string[]> = {};
  for (const leaf of allLeaves.value) {
    if (leaf.cellType === 'action' || leaf.key === 'actions') continue;
    const set = new Set<string>();
    for (const r of props.data.rows) {
      const v = r[leaf.key];
      if (v !== undefined && v !== null && v !== '') set.add(String(v));
    }
    out[leaf.key] = Array.from(set).sort((a, b) => {
      const na = parseNumeric(a);
      const nb = parseNumeric(b);
      if (na !== null && nb !== null) return na - nb;
      return a.localeCompare(b, 'zh-Hans-CN');
    });
  }
  return out;
});

function uniqueValues(key: string): string[] {
  return uniqueValuesByKey.value[key] ?? [];
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
  if (cur.has(v)) cur.delete(v);
  else cur.add(v);
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
  const { [key]: _omit, ...rest } = selectedFilters.value;
  void _omit;
  selectedFilters.value = rest;
}

function openFilter(key: string): void {
  filterOpen.value = filterOpen.value === key ? null : key;
  filterSearch.value = '';
}

/* —— 弹层定位（Teleport 到 body，避免被表格 overflow-hidden 裁剪 / 遮住列表） —— */
const triggerEls = new Map<string, HTMLElement>();
function setTriggerEl(key: string, el: Element | null): void {
  if (el instanceof HTMLElement) triggerEls.set(key, el);
  else triggerEls.delete(key);
}

const POPOVER_WIDTH = 260;
const POPOVER_MAX_H = 320;
const popoverStyle = ref<Record<string, string>>({ left: '0px', top: '0px', width: `${POPOVER_WIDTH}px` });

function recomputePopoverPos(): void {
  if (!filterOpen.value) return;
  const trigger = triggerEls.get(filterOpen.value);
  if (!trigger) return;
  const rect = trigger.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
  left = Math.max(8, Math.min(left, vw - POPOVER_WIDTH - 8));

  const spaceBelow = vh - rect.bottom - 8;
  const spaceAbove = rect.top - 8;
  const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;

  const style: Record<string, string> = {
    left: `${left}px`,
    width: `${POPOVER_WIDTH}px`,
  };
  if (openUp) {
    // 用 bottom 锚定到触发按钮上方 8px：popover 紧贴上沿，不会留多余空隙
    style.bottom = `${vh - rect.top + 8}px`;
    style.maxHeight = `${Math.min(spaceAbove, POPOVER_MAX_H)}px`;
  }
  else {
    style.top = `${rect.bottom + 8}px`;
    style.maxHeight = `${Math.min(spaceBelow, POPOVER_MAX_H)}px`;
  }
  popoverStyle.value = style;
}

const openCol = computed<TableColumn | null>(() => {
  if (!filterOpen.value) return null;
  function find(cols: TableColumn[]): TableColumn | null {
    for (const c of cols) {
      if (c.key === filterOpen.value && !c.children?.length) return c;
      if (c.children?.length) {
        const f = find(c.children);
        if (f) return f;
      }
    }
    return null;
  }
  return find(props.data.columns);
});

watch(filterOpen, async (k) => {
  if (k) {
    await nextTick();
    recomputePopoverPos();
  }
});

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
function onScrollOrResize(): void {
  recomputePopoverPos();
}
onMounted(() => {
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onEsc);
  window.addEventListener('resize', onScrollOrResize);
  window.addEventListener('scroll', onScrollOrResize, true);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onEsc);
  window.removeEventListener('resize', onScrollOrResize);
  window.removeEventListener('scroll', onScrollOrResize, true);
});

/* —— 派生 rows：先筛选 → 再排序 → 最后切分页 —— */
const filteredAndSortedRows = computed<TableRow[]>(() => {
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

/* —— 本地分页：以筛选+排序后的行数为准 —— */
const currentPage = ref<number>(1);
const pageSize = computed<number>(() => Math.max(1, props.data.pagination?.pageSize ?? 10));
const totalRows = computed<number>(() => filteredAndSortedRows.value.length);
const totalPages = computed<number>(() => Math.max(1, Math.ceil(totalRows.value / pageSize.value)));

watch([() => props.data.key, totalPages], () => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value;
  if (currentPage.value < 1) currentPage.value = 1;
});

function goPrev(): void {
  if (currentPage.value > 1) currentPage.value -= 1;
}
function goNext(): void {
  if (currentPage.value < totalPages.value) currentPage.value += 1;
}

const displayRows = computed<TableRow[]>(() => {
  const all = filteredAndSortedRows.value;
  const start = (currentPage.value - 1) * pageSize.value;
  return all.slice(start, start + pageSize.value);
});

/* —— 列样式工具 —— */
function alignClass(col: TableColumn): string {
  const a = col.align ?? 'center';
  return a === 'left' ? 'text-left' : a === 'right' ? 'text-right' : 'text-center';
}

function highlightCellClass(col: TableColumn): string {
  return col.highlight ? 'bg-brand-50/50' : '';
}

/* —— 滚动 / 视口跟随 ——
   1. window scroll(capture=true) 已经能捕获嵌套滚动；
   2. 给表格容器再单独加一份保险，触发按钮被横向滚动后弹层位置实时跟随；
   3. ResizeObserver 处理浏览器窗口 / 侧栏宽度变化；
   4. IntersectionObserver：当触发按钮被滚出视口时，关闭弹层（避免悬空指向不存在的列） */
const scrollEl = ref<HTMLElement | null>(null);
let visObserver: IntersectionObserver | null = null;
let sizeObserver: ResizeObserver | null = null;

function onTableScroll(): void {
  if (filterOpen.value) recomputePopoverPos();
}

watch(filterOpen, async (k) => {
  visObserver?.disconnect();
  if (!k) return;
  await nextTick();
  const trigger = triggerEls.get(k);
  if (!trigger || typeof IntersectionObserver === 'undefined') return;
  visObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry && !entry.isIntersecting && filterOpen.value === k) {
        filterOpen.value = null;
      }
    },
    { threshold: 0.01 },
  );
  visObserver.observe(trigger);
});

onMounted(() => {
  if (typeof ResizeObserver === 'undefined') return;
  sizeObserver = new ResizeObserver(() => onScrollOrResize());
  if (rootEl.value) sizeObserver.observe(rootEl.value);
});
onBeforeUnmount(() => {
  visObserver?.disconnect();
  sizeObserver?.disconnect();
});
</script>

<template>
  <div
    ref="rootEl"
    class="rounded-xl border border-ink-200/70 bg-surface overflow-hidden shadow-[var(--shadow-card)]"
  >
    <div
      ref="scrollEl"
      class="overflow-x-auto overflow-y-visible"
      @scroll="onTableScroll"
    >
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
              :aria-sort="c.isLeaf && isSortable(c.col)
                ? (sortKey === c.col.key
                  ? (sortDir === 'asc' ? 'ascending' : sortDir === 'desc' ? 'descending' : 'none')
                  : 'none')
                : undefined"
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
                ]"
              >
                <!-- 排序触发：可排序时是真按钮；否则普通 span。
                     避免 button 嵌 button —— 筛选按钮作为兄弟节点存在。 -->
                <button
                  v-if="c.isLeaf && isSortable(c.col)"
                  type="button"
                  class="inline-flex items-center gap-0.5 rounded text-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 hover:text-brand-700 transition-colors cursor-pointer group/sort"
                  :aria-label="t('table.sortColumn', { label: c.col.label }) + ' · ' + (sortKey === c.col.key && sortDir === 'asc' ? t('table.ascending') : sortKey === c.col.key && sortDir === 'desc' ? t('table.descending') : t('table.unsorted'))"
                  @click="toggleSort(c.col)"
                  @keydown.enter.prevent="toggleSort(c.col)"
                  @keydown.space.prevent="toggleSort(c.col)"
                >
                  <span>{{ c.col.label }}</span>
                  <span
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
                </button>
                <span v-else>{{ c.col.label }}</span>

                <button
                  v-if="c.isLeaf && isFilterable(c.col)"
                  :ref="(el) => setTriggerEl(c.col.key, el as Element | null)"
                  type="button"
                  class="ml-1 h-5 px-1 inline-flex items-center justify-center rounded-md text-[10px] leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                  :class="[
                    isFilterActive(c.col.key)
                      ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-700'
                      : 'text-ink-400 hover:text-brand-700 hover:bg-ink-200/60',
                  ]"
                  :aria-label="t('table.filterColumn', { label: c.col.label })"
                  :aria-haspopup="'dialog'"
                  :aria-expanded="filterOpen === c.col.key"
                  @click.stop="openFilter(c.col.key)"
                >
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M1.5 2.5A1 1 0 0 1 2.5 1.5h11a1 1 0 0 1 .8 1.6l-4.3 5.5v4.4a1 1 0 0 1-.45.83l-2 1.3A1 1 0 0 1 6 14.3V8.6L1.7 3.1a1 1 0 0 1-.2-.6z" />
                  </svg>
                  <span v-if="isFilterActive(c.col.key)" class="ml-0.5 font-semibold">{{ activeFilterCount(c.col.key) }}</span>
                </button>
              </div>
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
              <template v-if="leaf.cellType === 'action' || leaf.key === 'actions'">
                <template v-if="asActionCell(row[leaf.key]).kind === 'detail'">
                  <button
                    type="button"
                    class="inline-flex items-center px-2 py-0.5 rounded-md text-brand-700 hover:bg-brand-50 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                    @click="$emit('detail', row)"
                  >
                    {{ asActionCell(row[leaf.key]).label }} <span aria-hidden="true" class="ml-0.5">→</span>
                  </button>
                </template>
                <span v-else class="text-ink-400 text-[12px]">{{ asActionCell(row[leaf.key]).label }}</span>
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
            <td :colspan="allLeaves.length" class="text-center py-12 text-ink-500 text-[13px]">
              <div class="inline-flex flex-col items-center gap-1.5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" class="text-ink-300">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M3 9h18M9 4v16" />
                </svg>
                <span>{{ $t('table.noMatchData') }}</span>
                <button
                  v-if="Object.keys(selectedFilters).length"
                  type="button"
                  class="text-[12px] text-brand-700 hover:underline"
                  @click="selectedFilters = {}"
                >
                  {{ $t('table.clearFilterShort') }}
                </button>
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
      <span>{{ $t('table.total', { total: totalRows, pageSize }) }}</span>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="h-7 w-7 rounded border border-ink-200 bg-surface hover:bg-ink-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          :disabled="currentPage <= 1"
          :aria-label="$t('table.pagePrev')"
          @click="goPrev"
        >
          ‹
        </button>
        <span class="px-2 tabular-nums">{{ currentPage }} / {{ totalPages }}</span>
        <button
          type="button"
          class="h-7 w-7 rounded border border-ink-200 bg-surface hover:bg-ink-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          :disabled="currentPage >= totalPages"
          :aria-label="$t('table.pageNext')"
          @click="goNext"
        >
          ›
        </button>
      </div>
    </footer>
  </div>

  <!-- 筛选下拉：Teleport 到 body，position:fixed，不被表格容器 overflow 裁剪也不会被列表盖住 -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="openCol"
        role="dialog"
        aria-modal="false"
        :aria-label="t('table.filterColumn', { label: openCol.label })"
        class="fixed z-[60] flex flex-col rounded-xl border border-ink-200 bg-surface shadow-2xl ring-1 ring-ink-900/10 text-left origin-top overflow-hidden"
        :style="popoverStyle"
        @click.stop
      >
        <div class="flex items-center justify-between px-3 py-2 bg-ink-50/80 border-b border-ink-200/60 shrink-0">
          <span class="text-[12px] font-semibold text-ink-700">{{ t('filters.title') }} · {{ openCol.label }}</span>
          <button
            type="button"
            class="w-5 h-5 inline-flex items-center justify-center rounded text-ink-400 hover:text-ink-700 hover:bg-ink-200/60 text-[14px] leading-none"
            :aria-label="t('common.close')"
            @click="filterOpen = null"
          >
            ×
          </button>
        </div>

        <div class="px-2.5 pt-2 pb-1.5 shrink-0">
          <div class="relative">
            <input
              v-model="filterSearch"
              type="text"
              :placeholder="t('table.search')"
              class="w-full h-7 pl-7 pr-2 text-[12px] rounded-md border border-ink-200 bg-surface placeholder:text-ink-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            >
            <svg class="absolute left-2 top-1/2 -translate-y-1/2 text-ink-400" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
              <circle cx="7" cy="7" r="4.5" />
              <path d="m13.5 13.5-3-3" />
            </svg>
          </div>
        </div>

        <div class="flex items-center gap-2 px-3 pb-1.5 text-[11px] shrink-0">
          <button type="button" class="text-brand-700 hover:underline" @click="selectAllFilter(openCol.key)">
            {{ t('table.selectAll') }}
          </button>
          <button type="button" class="text-ink-600 hover:underline" @click="invertFilter(openCol.key)">
            {{ t('table.invert') }}
          </button>
          <button type="button" class="text-ink-500 hover:underline" @click="clearFilter(openCol.key)">
            {{ t('table.clear') }}
          </button>
          <span class="ml-auto text-ink-500">{{ t('table.selected', { count: activeFilterCount(openCol.key), total: uniqueValues(openCol.key).length }) }}</span>
        </div>

        <div class="flex-1 min-h-0 overflow-auto px-1.5 pb-1.5">
          <label
            v-for="v in filteredValues(openCol.key)"
            :key="v"
            class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-brand-50/60 cursor-pointer text-[12.5px] text-ink-800"
          >
            <input
              type="checkbox"
              :checked="selectedFilters[openCol.key]?.has(v) ?? false"
              class="w-3.5 h-3.5 accent-brand-600 cursor-pointer"
              @change="toggleFilterValue(openCol.key, v)"
            >
            <span class="truncate flex-1">{{ v }}</span>
          </label>
          <div v-if="!filteredValues(openCol.key).length" class="px-2 py-3 text-center text-[12px] text-ink-500">
            {{ t('table.noMatchItems') }}
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
