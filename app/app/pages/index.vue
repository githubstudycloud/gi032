<script setup lang="ts">
useHead({ title: '首页' });

interface Stat {
  key: string;
  label: string;
  value: string;
  hint: string;
  trend?: 'up' | 'down' | 'flat';
}

const stats: Stat[] = [
  { key: 'cases',    label: '今日新增用例', value: '128', hint: '同比 +12%',  trend: 'up' },
  { key: 'feedback', label: '待处理反馈',   value: '7',   hint: '24h 内回复', trend: 'flat' },
  { key: 'alerts',   label: '运维告警',     value: '0',   hint: '系统状态正常', trend: 'down' },
  { key: 'users',    label: '活跃用户',     value: '1,284', hint: '同比 +3.2%', trend: 'up' },
];

const updates = [
  { time: '10:24', title: '【AI 测试】用例自动生成跑批完成', module: 'AI辅助测试运营' },
  { time: '09:51', title: '【反馈】3 条高优先级反馈待处理',    module: '用户反馈' },
  { time: '09:00', title: '【运维】昨日服务健康度报告已生成',  module: '后台运维' },
];
</script>

<template>
  <div>
    <PageHeader title="首页" subtitle="运营看板总览" />

    <section class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="stat in stats"
        :key="stat.key"
        class="rounded-lg border border-ink-200 bg-white p-5"
      >
        <div class="text-xs text-ink-500">{{ stat.label }}</div>
        <div class="mt-2 text-2xl font-semibold text-ink-900 font-display">{{ stat.value }}</div>
        <div
          :class="[
            'mt-1 text-xs',
            stat.trend === 'up'   ? 'text-emerald-600' :
            stat.trend === 'down' ? 'text-rose-600'    : 'text-ink-500',
          ]"
        >
          {{ stat.hint }}
        </div>
      </div>
    </section>

    <section class="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 rounded-lg border border-ink-200 bg-white p-6">
        <h2 class="text-base font-semibold text-ink-900">框架说明</h2>
        <ul class="mt-3 space-y-2 text-sm text-ink-700 list-disc list-inside">
          <li>顶部菜单 / 左侧菜单 / 左侧大标题 全部由 <code class="font-mono text-xs bg-ink-100 px-1 rounded">public/mock/*.json</code> 驱动</li>
          <li>切换数据源：把 <code class="font-mono text-xs bg-ink-100 px-1 rounded">nuxt.config.ts → runtimeConfig.public.dataSourceMode</code> 改成 <code class="font-mono text-xs bg-ink-100 px-1 rounded">'api'</code> 并设 <code class="font-mono text-xs bg-ink-100 px-1 rounded">apiBase</code></li>
          <li>后端字段对不上：在对应 <code class="font-mono text-xs bg-ink-100 px-1 rounded">composables/use-*.ts</code> 的 <code class="font-mono text-xs bg-ink-100 px-1 rounded">transform</code> 里映射</li>
          <li>所有具体页面统一使用 <code class="font-mono text-xs bg-ink-100 px-1 rounded">pages/[...slug].vue</code> 占位渲染（标题 / 筛选 / 表格），后续按需拆出独立页</li>
        </ul>
      </div>

      <div class="rounded-lg border border-ink-200 bg-white p-6">
        <h2 class="text-base font-semibold text-ink-900">最近动态</h2>
        <ul class="mt-3 space-y-3 text-sm">
          <li v-for="u in updates" :key="u.time" class="flex gap-3">
            <span class="font-mono text-xs text-ink-500 shrink-0 mt-0.5">{{ u.time }}</span>
            <div class="min-w-0">
              <div class="text-ink-900 truncate">{{ u.title }}</div>
              <div class="text-[11px] text-ink-500 mt-0.5">{{ u.module }}</div>
            </div>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
