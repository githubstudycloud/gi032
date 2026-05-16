<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';

const { locale, locales, setLocale, t } = useI18n();
const open = ref(false);
const rootEl = ref<HTMLElement | null>(null);
onClickOutside(rootEl, () => { open.value = false; });

const available = computed(() =>
  (locales.value as { code: string; name?: string }[]).map(l => ({
    code: l.code,
    name: l.name ?? l.code,
  })),
);

function pick(code: string): void {
  if (code !== locale.value) {
    void setLocale(code as 'zh-CN' | 'en-US');
  }
  open.value = false;
}

function shortLabel(code: string): string {
  // 顶部按钮显示语言短码：zh / EN
  return code.split('-')[0]?.toUpperCase() ?? code;
}
</script>

<template>
  <div ref="rootEl" class="relative">
    <button
      type="button"
      :class="[
        'h-9 px-2.5 inline-flex items-center gap-1.5 rounded-md border transition-colors text-[12.5px] font-medium',
        open
          ? 'bg-ink-100 border-ink-200 text-ink-900'
          : 'bg-surface/0 border-transparent text-ink-700 hover:bg-ink-100 hover:text-ink-900',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
      ]"
      :aria-haspopup="true"
      :aria-expanded="open"
      :aria-label="t('topbar.switchLocale')"
      :title="t('topbar.switchLocale')"
      @click="open = !open"
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" class="w-3.5 h-3.5" aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" />
        <path d="M3 10h14M10 3a11 11 0 0 1 0 14M10 3a11 11 0 0 0 0 14" stroke-linecap="round" />
      </svg>
      <span class="font-mono">{{ shortLabel(locale) }}</span>
      <svg
        :class="['w-3 h-3 text-ink-500 transition-transform', open ? 'rotate-180' : '']"
        viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
      >
        <path d="M5 7l5 6 5-6H5z" />
      </svg>
    </button>

    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="open"
        role="menu"
        :aria-label="t('topbar.switchLocale')"
        class="absolute right-0 top-[calc(100%+4px)] w-[180px] rounded-lg border border-ink-200 bg-surface shadow-[var(--shadow-hover)] p-1.5 z-50"
      >
        <button
          v-for="l in available"
          :key="l.code"
          type="button"
          role="menuitemradio"
          :aria-checked="locale === l.code"
          :class="[
            'w-full px-3 py-2 rounded-md text-left flex items-center gap-2 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
            locale === l.code
              ? 'bg-brand-50 text-brand-700 font-medium'
              : 'text-ink-800 hover:bg-ink-100',
          ]"
          @click="pick(l.code)"
        >
          <span class="font-mono text-[11px] text-ink-500 w-7 shrink-0">{{ shortLabel(l.code) }}</span>
          <span class="flex-1 truncate">{{ l.name }}</span>
          <svg
            v-if="locale === l.code"
            class="w-4 h-4 text-brand-600 shrink-0"
            viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
          >
            <path d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.1l6.3-6.4a1 1 0 011.4 0z" />
          </svg>
        </button>
      </div>
    </Transition>
  </div>
</template>
