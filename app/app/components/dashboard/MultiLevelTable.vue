<script setup lang="ts">
import type { PilotTable, TableColumn } from '~/types/overview-summary';

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
}

/**
 * 取在指定 level（1-indexed）这一 thead 行该出现的所有 th。
 * - 当前层是 target：本节点出现 —— 有子项时 colspan=叶子数 rowspan=1，没子项时 rowspan=向下到 maxDepth 跨完
 * - 当前层 < target：本节点已经在自己层占位过了，跳过自己；如果有 children 递归
 * - 没子项的中间层不会被错误地重复加（向下没有可走）
 */
function thRowCells(cols: TableColumn[], target: number, current = 1): ThCell[] {
  const out: ThCell[] = [];
  for (const c of cols) {
    if (current === target) {
      if (c.children?.length) {
        out.push({ col: c, rowspan: 1, colspan: leavesOf(c).length });
      } else {
        out.push({ col: c, rowspan: maxDepth.value - current + 1, colspan: 1 });
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

const totalPages = computed<number>(() => {
  const { total, pageSize } = props.data.pagination;
  return Math.max(1, Math.ceil(total / pageSize));
});
</script>

<template>
  <div class="rounded-xl border border-ink-200/70 bg-surface overflow-hidden shadow-[var(--shadow-card)]">
    <div class="overflow-x-auto">
      <table
        class="text-[13px] border-collapse"
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
                'px-3 text-left whitespace-nowrap border-b border-r border-ink-200/40 last:border-r-0 align-middle',
                ri === 0
                  ? 'py-2.5 text-[12px] font-semibold'
                  : 'py-2 text-[11px] font-normal text-ink-600 bg-ink-100/30',
              ]"
            >
              {{ c.col.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in data.rows"
            :key="i"
            class="border-b border-ink-100 last:border-b-0 hover:bg-ink-50/40 transition-colors"
          >
            <td
              v-for="leaf in allLeaves"
              :key="leaf.key"
              class="px-3 py-3 whitespace-nowrap text-ink-900 tabular-nums"
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
          <tr v-if="!data.rows.length">
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
      <span>共 {{ data.pagination.total }} 条</span>
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
