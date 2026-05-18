<script setup lang="ts">
const { locale } = useI18n();

useHead({ title: '简介示例' });

const { items } = await useNav();

/* 把所有非 single 的一级菜单做成入口卡片；卡片跳第一个可用叶子，避免落到无页面的中转路径 */
const entries = computed(() =>
  items.value
    .filter(i => !i.single && (i.path || i.children?.length))
    .map((i) => {
      const target = firstLeafPath(i) ?? i.path ?? '/';
      return {
        key: i.key,
        label: localizedLabel(i, locale.value),
        path: target,
        sub: i.children?.length ? `${i.children.length} 个分组` : '查看详情',
      };
    }),
);

interface Stat {
  key: string;
  label: string;
  value: string;
  hint: string;
  trend?: 'up' | 'down' | 'flat';
}

const stats: Stat[] = [
  { key: 'cases', label: '今日新增用例', value: '128', hint: '同比 +12%', trend: 'up' },
  { key: 'feedback', label: '待处理反馈', value: '7', hint: '24h 内回复', trend: 'flat' },
  { key: 'alerts', label: '运维告警', value: '0', hint: '系统状态正常', trend: 'down' },
  { key: 'users', label: '活跃用户', value: '1,284', hint: '同比 +3.2%', trend: 'up' },
];

const updates = [
  { time: '10:24', title: 'AI 测试用例自动生成跑批完成（128 条）', module: 'AI辅助测试运营' },
  { time: '09:51', title: '收到 3 条高优先级反馈待处理', module: '用户反馈' },
  { time: '09:00', title: '昨日服务健康度报告已生成', module: '后台运维' },
];
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative overflow-hidden rounded-2xl border border-ink-200/60 bg-gradient-to-br from-white via-brand-50/30 to-white px-10 py-12">
      <div class="absolute top-0 right-0 w-72 h-72 -mt-20 -mr-20 rounded-full bg-brand-100/40 blur-3xl pointer-events-none" />
      <div class="relative">
        <p class="text-[11px] font-mono uppercase tracking-[0.22em] text-brand-700">
          Operations Dashboard · v0.1.0
        </p>
        <h1 class="mt-3 font-display text-[40px] leading-[1.15] font-semibold text-ink-900 tracking-tight">
          运营看板
        </h1>
        <p class="mt-4 text-[15px] text-ink-600 leading-relaxed">
          统一聚合 AI 测试 / 用户反馈 / 后台运维 / 系统设置 四条线，给到一线运营与决策层一个可下钻、可比对的实时视图。
          导航与数据均由 JSON 驱动，后续切到后端接口只需改 <code class="font-mono text-[13px] text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">runtimeConfig</code>。
        </p>
      </div>
    </section>

    <!-- 关键指标 -->
    <section class="mt-8">
      <h2 class="font-display text-[15px] font-semibold text-ink-900 tracking-tight flex items-center gap-2">
        <span class="w-1 h-4 rounded-full bg-brand-500" />
        关键指标
      </h2>
      <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="stat in stats"
          :key="stat.key"
          class="rounded-xl border border-ink-200/70 bg-surface p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-shadow"
        >
          <div class="text-[12px] text-ink-500">
            {{ stat.label }}
          </div>
          <div class="mt-2 font-display text-[28px] font-semibold text-ink-900 leading-none">
            {{ stat.value }}
          </div>
          <div
            :class="[
              'mt-2 text-[11px] flex items-center gap-1',
              stat.trend === 'up' ? 'text-emerald-600'
              : stat.trend === 'down' ? 'text-rose-600' : 'text-ink-500',
            ]"
          >
            <span v-if="stat.trend === 'up'">▲</span>
            <span v-else-if="stat.trend === 'down'">▼</span>
            <span v-else>●</span>
            <span>{{ stat.hint }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 模块入口（entries 派生自客户端 useNav，所以整段包 ClientOnly） -->
    <section class="mt-10">
      <h2 class="font-display text-[15px] font-semibold text-ink-900 tracking-tight flex items-center gap-2">
        <span class="w-1 h-4 rounded-full bg-brand-500" />
        进入模块
      </h2>
      <ClientOnly>
        <div class="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <NuxtLink
            v-for="entry in entries"
            :key="entry.key"
            :to="entry.path"
            class="group rounded-xl border border-ink-200/70 bg-surface p-5 hover:border-brand-300 hover:shadow-[var(--shadow-hover)] transition-all"
          >
            <div class="flex items-start justify-between">
              <div class="font-display text-[16px] font-semibold text-ink-900 tracking-tight">
                {{ entry.label }}
              </div>
              <svg class="w-4 h-4 text-ink-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 5l6 5-6 5V5z" />
              </svg>
            </div>
            <div class="mt-2 text-[12px] text-ink-500">{{ entry.sub }}</div>
          </NuxtLink>
        </div>
        <template #fallback>
          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div v-for="i in 4" :key="i" class="h-[88px] rounded-xl border border-ink-200/70 bg-surface" />
          </div>
        </template>
      </ClientOnly>
    </section>

    <!-- 最近动态 -->
    <section class="mt-10">
      <h2 class="font-display text-[15px] font-semibold text-ink-900 tracking-tight flex items-center gap-2">
        <span class="w-1 h-4 rounded-full bg-brand-500" />
        最近动态
      </h2>
      <ul class="mt-4 rounded-xl border border-ink-200/70 bg-surface divide-y divide-ink-100">
        <li v-for="u in updates" :key="u.time" class="px-5 py-4 flex items-center gap-4">
          <div class="font-mono text-[12px] text-ink-500 shrink-0 w-12">
            {{ u.time }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-[14px] text-ink-900 truncate">
              {{ u.title }}
            </div>
          </div>
          <div class="text-[11px] text-ink-500 shrink-0 px-2 py-0.5 rounded-full bg-ink-100">
            {{ u.module }}
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
