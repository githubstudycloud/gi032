<script setup lang="ts">
import type { PilotTable, TableColumn } from '~/types/overview-summary';

const props = defineProps<{
  data: PilotTable;
}>();

defineEmits<{
  detail: [row: Record<string, unknown>];
}>();

/** 顶层列：rowspan=2 的叶子 + colspan=N 的分组父 */
const topCols = computed<TableColumn[]>(() => props.data.columns);

/** 全部叶子列（按从左到右顺序），用来逐行渲染 td */
const leaves = computed<TableColumn[]>(() => {
  const result: TableColumn[] = [];
  for (const c of topCols.value) {
    if (c.children?.length) result.push(...c.children);
    else result.push(c);
  }
  return result;
});

const totalPages = computed<number>(() => {
  const { total, pageSize } = props.data.pagination;
  return Math.max(1, Math.ceil(total / pageSize));
});
</script>

<template>
  <div class="rounded-xl border border-ink-200/70 bg-surface overflow-hidden shadow-[var(--shadow-card)]">
    <div class="overflow-x-auto">
      <table class="text-[13px] border-collapse" style="width: max-content; min-width: 100%">
        <thead class="bg-ink-50/70 text-ink-700">
          <!-- 第一行：顶层 -->
          <tr>
            <th
              v-for="c in topCols"
              :key="c.key"
              :rowspan="c.children ? 1 : (c.rowspan ?? 2)"
              :colspan="c.children?.length"
              :style="{ width: c.width }"
              class="px-3 py-2.5 text-[12px] font-semibold text-left whitespace-nowrap border-b border-r border-ink-200/60 last:border-r-0 align-middle"
            >
              {{ c.label }}
            </th>
          </tr>
          <!-- 第二行：children 子列（顶层叶子用 rowspan 已经跨过这一行） -->
          <tr>
            <template v-for="c in topCols" :key="c.key">
              <th
                v-for="child in c.children"
                :key="child.key"
                class="px-3 py-2 text-[11px] font-normal text-left text-ink-600 whitespace-nowrap border-b border-r border-ink-200/40 last:border-r-0 bg-ink-100/30"
              >
                {{ child.label }}
              </th>
            </template>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(row, i) in data.rows"
            :key="i"
            class="border-b border-ink-100 last:border-b-0 hover:bg-ink-50/40 transition-colors"
          >
            <td
              v-for="leaf in leaves"
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
            <td :colspan="leaves.length" class="text-center py-10 text-ink-500 text-[13px]">
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
