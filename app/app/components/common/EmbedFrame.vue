<script setup lang="ts">
defineProps<{
  src: string;
  title?: string;
}>();

/**
 * 跨域 iframe 嵌入。
 * 注意：目标站点设 X-Frame-Options / CSP frame-ancestors 时，浏览器会拒绝渲染，
 * 显示空白。Chrome 在这种情况下仍会触发 iframe 的 load 事件，所以无法可靠地"检测后再提示"。
 * 改为在 header 下面常驻一条说明，让用户知道空白时怎么办。
 */
</script>

<template>
  <section class="mt-6 rounded-xl border border-ink-200/70 bg-surface overflow-hidden shadow-[var(--shadow-card)]">
    <header class="px-4 py-2.5 border-b border-ink-200/60 flex items-center gap-3 text-[12px]">
      <svg class="w-3.5 h-3.5 text-ink-500 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M11 3a1 1 0 100 2h2.586L8.293 10.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
        <path d="M4 4h4v2H5v9h9v-3h2v4a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
      </svg>
      <span class="font-mono text-ink-700 truncate">{{ src }}</span>
      <div class="flex-1" />
      <a
        :href="src"
        target="_blank"
        rel="noopener noreferrer"
        class="text-brand-700 hover:underline shrink-0"
      >
        新窗口打开 ↗
      </a>
    </header>

    <!-- 常驻提示：iframe 跨域嵌入有限制，无法可靠检测；先告知用户 -->
    <div class="px-4 py-2 bg-amber-50 text-amber-800 text-[12px] border-b border-amber-200/60 flex items-start gap-2">
      <span class="shrink-0 mt-0.5">⚠</span>
      <span>
        若下方显示空白：目标站设置了
        <code class="font-mono">X-Frame-Options</code> /
        CSP <code class="font-mono">frame-ancestors</code>
        禁止跨域嵌入（Google / 百度 / 银行类页面常见）。请用上方
        <strong>"新窗口打开"</strong>，或换成允许嵌入的页面。
      </span>
    </div>

    <div class="relative w-full bg-ink-50" style="height: calc(100vh - 280px); min-height: 480px;">
      <iframe
        :src="src"
        :title="title || '嵌入页面'"
        class="absolute inset-0 w-full h-full border-0"
        referrerpolicy="no-referrer-when-downgrade"
        loading="lazy"
      />
    </div>
  </section>
</template>
