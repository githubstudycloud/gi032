<script setup lang="ts">
const { t } = useI18n();

defineProps<{
  /** 显示给用户的页面名（来自菜单 label） */
  pageLabel?: string;
  /** 当前路径，用于显示和复制 */
  path: string;
  /** 父级菜单的回退路径（一般是上一级 section） */
  fallbackPath?: string;
  /** 父级菜单的回退标签 */
  fallbackLabel?: string;
}>();
</script>

<template>
  <section
    class="mt-2 rounded-xl border border-dashed border-ink-300/80 bg-surface px-6 py-10 shadow-[var(--shadow-card)]"
  >
    <div class="max-w-xl mx-auto text-center space-y-3">
      <div class="inline-flex w-12 h-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="w-6 h-6" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75M3.43 18.75h17.14a1.5 1.5 0 0 0 1.3-2.25l-8.57-14.25a1.5 1.5 0 0 0-2.6 0L2.13 16.5a1.5 1.5 0 0 0 1.3 2.25Z" />
          <path stroke-linecap="round" d="M12 16h.01" />
        </svg>
      </div>

      <h2 class="font-display text-[18px] font-semibold text-ink-900 tracking-tight">
        {{ t('notImplemented.title', { label: pageLabel ?? t('notImplemented.titleFallback') }) }}
      </h2>
      <p class="text-[13px] text-ink-600 leading-relaxed">
        {{ t('notImplemented.description') }}
      </p>

      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-ink-50/80 border border-ink-200/80 text-[12px] font-mono text-ink-700">
        <svg viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5 text-ink-400" aria-hidden="true">
          <path d="M2 4a2 2 0 0 1 2-2h4l2 2h4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4z" />
        </svg>
        <span>{{ path }}</span>
      </div>

      <div class="flex items-center justify-center gap-2 pt-2">
        <NuxtLink
          v-if="fallbackPath"
          :to="fallbackPath"
          class="h-9 px-4 rounded-md bg-brand-600 text-white text-[13px] font-medium hover:bg-brand-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 inline-flex items-center justify-center"
        >
          {{ t('notImplemented.backToParent', { label: fallbackLabel ?? t('notImplemented.backToParentFallback') }) }}
        </NuxtLink>
        <NuxtLink
          to="/"
          class="h-9 px-4 rounded-md border border-ink-200 bg-surface text-[13px] text-ink-700 hover:bg-ink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 inline-flex items-center justify-center"
        >
          {{ t('common.home') }}
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
