<script setup lang="ts">
/**
 * 数据加载失败的兜底面板。
 * Zod 校验失败 / 网络错 / 后端 500 → 都通过这个组件向用户展示。
 *
 * 用法：
 *   const { data, error, pending, refresh } = useOverviewSummary();
 *   <ErrorPanel v-if="error" :error="error" @retry="refresh" />
 */
import { z } from 'zod';

const props = defineProps<{
  error: unknown;
  /** 自定义标题；默认 '数据加载失败' */
  title?: string;
}>();

defineEmits<{
  retry: [];
}>();

/* 把 ZodError / Error / 任意东西拆成可读的标题 + 详细列表 */
const detail = computed<{ summary: string; lines: string[] }>(() => {
  const e = props.error;
  if (e instanceof z.ZodError) {
    const lines = e.issues.slice(0, 8).map((i) => {
      const path = i.path.length ? i.path.join('.') : '(root)';
      return `${path}: ${i.message}`;
    });
    if (e.issues.length > 8) lines.push(`...等共 ${e.issues.length} 项校验失败`);
    return { summary: '后端返回的数据形状跟约定不一致', lines };
  }
  if (e instanceof Error) {
    return { summary: e.message, lines: e.stack ? [e.stack.split('\n').slice(1, 4).join('\n')] : [] };
  }
  return { summary: String(e ?? '未知错误'), lines: [] };
});
</script>

<template>
  <section
    class="rounded-xl border border-rose-200/80 bg-rose-50/40 px-5 py-4 shadow-[var(--shadow-card)]"
    role="alert"
    aria-live="polite"
  >
    <header class="flex items-start gap-3 mb-2">
      <div class="shrink-0 inline-flex w-8 h-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="w-4 h-4" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07" />
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="font-display text-[14px] font-semibold text-rose-900">
          {{ title ?? '数据加载失败' }}
        </h3>
        <p class="mt-1 text-[12.5px] text-rose-800 leading-snug break-words">
          {{ detail.summary }}
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 h-8 px-3 rounded-md bg-rose-600 text-white text-[12.5px] font-medium hover:bg-rose-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
        @click="$emit('retry')"
      >
        重试
      </button>
    </header>

    <details v-if="detail.lines.length" class="mt-2">
      <summary class="text-[11.5px] text-rose-700 cursor-pointer hover:underline">
        查看详细 ({{ detail.lines.length }} 条)
      </summary>
      <pre class="mt-2 text-[11px] leading-relaxed text-rose-800/90 whitespace-pre-wrap font-mono bg-surface/60 border border-rose-200/60 rounded-md p-3 overflow-auto max-h-48">{{ detail.lines.join('\n') }}</pre>
    </details>
  </section>
</template>
