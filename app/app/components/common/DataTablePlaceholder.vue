<script setup lang="ts">
const columns = [
  { key: 'id',        label: 'ID' },
  { key: 'name',      label: '名称' },
  { key: 'owner',     label: '负责人' },
  { key: 'status',    label: '状态' },
  { key: 'updatedAt', label: '更新时间' },
  { key: 'actions',   label: '操作' },
];

interface Row {
  id: string;
  name: string;
  owner: string;
  status: '进行中' | '待处理' | '已完成';
  updatedAt: string;
}

const rows: Row[] = Array.from({ length: 6 }, (_, i) => {
  const states: Row['status'][] = ['进行中', '待处理', '已完成'];
  return {
    id: `EX-${(i + 1).toString().padStart(4, '0')}`,
    name: `示例数据 ${i + 1}`,
    owner: ['张三', '李四', '王五'][i % 3]!,
    status: states[i % 3]!,
    updatedAt: '2026-05-16 10:00',
  };
});

function statusClass(s: Row['status']): string {
  switch (s) {
    case '进行中': return 'bg-brand-50 text-brand-700';
    case '待处理': return 'bg-amber-50 text-amber-700';
    case '已完成': return 'bg-emerald-50 text-emerald-700';
  }
}
</script>

<template>
  <section class="mt-4 rounded-lg border border-ink-200 bg-white overflow-hidden">
    <div class="px-4 py-3 border-b border-ink-200 flex items-center">
      <h2 class="text-sm font-medium text-ink-900">数据列表</h2>
      <span class="ml-2 text-xs text-ink-500">共 {{ rows.length }} 条 · 占位数据</span>
      <div class="flex-1" />
      <button class="h-8 px-3 rounded-md border border-ink-200 text-xs text-ink-700 hover:bg-ink-100 transition-colors">
        导出
      </button>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-ink-50 text-ink-700">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              class="text-left font-medium px-4 py-2.5 text-xs uppercase tracking-wide"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.id"
            class="border-t border-ink-100 hover:bg-ink-50/60 transition-colors"
          >
            <td class="px-4 py-3 font-mono text-xs text-ink-700">{{ row.id }}</td>
            <td class="px-4 py-3 text-ink-900">{{ row.name }}</td>
            <td class="px-4 py-3 text-ink-700">{{ row.owner }}</td>
            <td class="px-4 py-3">
              <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs', statusClass(row.status)]">
                {{ row.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-ink-500 text-xs">{{ row.updatedAt }}</td>
            <td class="px-4 py-3 text-sm">
              <button class="text-brand-700 hover:underline">查看</button>
              <button class="ml-3 text-ink-700 hover:underline">编辑</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="px-4 py-3 border-t border-ink-100 text-[11px] text-ink-500 text-center">
      占位表格 — 接入接口后展示真实数据
    </div>
  </section>
</template>
