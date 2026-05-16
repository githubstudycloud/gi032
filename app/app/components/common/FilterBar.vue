<script setup lang="ts">
const keyword = ref('');
const status = ref('all');
const dateRange = ref('7d');

function onSearch(): void {
  // 占位 —— 接入数据后改为触发查询
}

function onReset(): void {
  keyword.value = '';
  status.value = 'all';
  dateRange.value = '7d';
}
</script>

<template>
  <section class="mt-6 rounded-xl border border-ink-200/70 bg-white px-5 py-4 shadow-[var(--shadow-card)]">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
      <label class="block text-sm">
        <span class="block text-ink-600 mb-1.5 text-[11px] font-medium tracking-wide uppercase">关键字</span>
        <input
          v-model="keyword"
          type="search"
          placeholder="搜索名称 / ID…"
          class="w-full h-9 rounded-md border border-ink-200 px-3 text-[13px] bg-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </label>

      <label class="block text-sm">
        <span class="block text-ink-600 mb-1.5 text-[11px] font-medium tracking-wide uppercase">状态</span>
        <select
          v-model="status"
          class="w-full h-9 rounded-md border border-ink-200 px-3 text-[13px] bg-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          <option value="all">全部</option>
          <option value="active">进行中</option>
          <option value="pending">待处理</option>
          <option value="done">已完成</option>
        </select>
      </label>

      <label class="block text-sm">
        <span class="block text-ink-600 mb-1.5 text-[11px] font-medium tracking-wide uppercase">时间范围</span>
        <select
          v-model="dateRange"
          class="w-full h-9 rounded-md border border-ink-200 px-3 text-[13px] bg-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          <option value="1d">最近 1 天</option>
          <option value="7d">最近 7 天</option>
          <option value="30d">最近 30 天</option>
          <option value="all">全部</option>
        </select>
      </label>

      <div class="flex gap-2">
        <button
          type="button"
          class="h-9 px-4 rounded-md bg-brand-600 text-white text-[13px] font-medium hover:bg-brand-700 active:bg-brand-800 transition-colors shadow-[0_2px_6px_-1px_oklch(0.62_0.14_235/0.35)]"
          @click="onSearch"
        >
          查询
        </button>
        <button
          type="button"
          class="h-9 px-4 rounded-md border border-ink-200 bg-white text-[13px] text-ink-700 hover:bg-ink-100 transition-colors"
          @click="onReset"
        >
          重置
        </button>
      </div>
    </div>
  </section>
</template>
