<script setup lang="ts">
/**
 * iframe sandbox 默认白名单：
 *   - allow-scripts：允许执行 JS（嵌入页一般需要，不允许会直接白屏）
 *   - allow-forms：允许表单提交（搜索框 / 登录页 需要）
 *   - allow-popups：允许 target=_blank 弹出（"在新窗口打开"）
 * 默认 **不** 给 allow-same-origin，避免嵌入页访问主站 cookie / localStorage / IndexedDB。
 * 若要嵌入需要 cookie 的内部系统，在 nav.json 里加 `embedSandbox: ['allow-scripts','allow-same-origin', ...]`。
 * 完全不要 sandbox（仅信任内部系统）：传 sandbox=false。
 */
const DEFAULT_SANDBOX = ['allow-scripts', 'allow-forms', 'allow-popups'] as const;

const props = withDefaults(
  defineProps<{
    src: string;
    title?: string;
    /**
     * panel = 带边框 / URL header / 警示条的卡片式（用在 section 子页里，比如系统管理-搜索页面）
     * full  = 铺满父容器的 iframe（用在顶部一级 single+embed 页，比如"首页1"）
     */
    variant?: 'panel' | 'full';
    /**
     * sandbox 配置：
     *   - undefined → 用 DEFAULT_SANDBOX
     *   - string[]  → 用提供的 token 数组（空数组 = 最严格的 sandbox=""）
     *   - false     → 不加 sandbox 属性（**只用于完全信任的内部系统**）
     */
    sandbox?: string[] | false;
  }>(),
  { variant: 'panel' },
);

const sandboxAttr = computed<string | undefined>(() => {
  if (props.sandbox === false) return undefined;
  const tokens = props.sandbox ?? [...DEFAULT_SANDBOX];
  // 空数组就给空字符串 → sandbox="" 是最严格的（不允许任何能力）
  return tokens.join(' ');
});

const { t } = useI18n();
</script>

<template>
  <!-- panel 变体：带边框 + URL 显示 + 警示条 -->
  <section
    v-if="variant === 'panel'"
    class="mt-6 rounded-xl border border-ink-200/70 bg-surface overflow-hidden shadow-[var(--shadow-card)]"
  >
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
        {{ t('embed.openInNewTab') }} ↗
      </a>
    </header>

    <div class="px-4 py-2 bg-amber-50 text-amber-800 text-[12px] border-b border-amber-200/60 flex items-start gap-2">
      <span class="shrink-0 mt-0.5">⚠</span>
      <span>{{ t('embed.blockedHint') }}</span>
    </div>

    <div class="relative w-full bg-ink-50" style="height: calc(100vh - 280px); min-height: 480px;">
      <iframe
        :src="src"
        :title="title || t('embed.iframeTitle')"
        :sandbox="sandboxAttr"
        class="absolute inset-0 w-full h-full border-0"
        referrerpolicy="no-referrer-when-downgrade"
        loading="lazy"
      />
    </div>
  </section>

  <!-- full 变体：iframe 铺满父容器，右上角浮动「新窗口打开」 -->
  <div v-else class="relative w-full h-full bg-ink-50">
    <iframe
      :src="src"
      :title="title || t('embed.iframeTitle')"
      class="absolute inset-0 w-full h-full border-0"
      referrerpolicy="no-referrer-when-downgrade"
      loading="lazy"
    />
    <a
      :href="src"
      target="_blank"
      rel="noopener noreferrer"
      class="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 h-7 px-3 rounded-md bg-surface/90 backdrop-blur-sm border border-ink-200 text-[12px] text-ink-700 hover:text-brand-700 hover:border-brand-300 shadow-[var(--shadow-card)] transition-colors"
      :title="src"
    >
      {{ t('embed.openInNewTab') }} <span aria-hidden="true">↗</span>
    </a>
  </div>
</template>
