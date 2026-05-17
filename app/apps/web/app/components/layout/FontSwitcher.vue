<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';

const { t } = useI18n();
const { fonts, activeKey, setFont } = await useFont();

const open = ref(false);
const rootEl = ref<HTMLElement | null>(null);

onClickOutside(rootEl, () => {
  open.value = false;
});

function pick(key: string): void {
  setFont(key);
  open.value = false;
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') open.value = false;
}
</script>

<template>
  <div ref="rootEl" class="relative" @keydown="onKeydown">
    <!-- 触发按钮：A 字图标 + 当前字体首字 -->
    <button
      type="button"
      :class="[
        'h-9 px-2.5 inline-flex items-center gap-1.5 rounded-md border transition-colors',
        open
          ? 'bg-ink-100 border-ink-200 text-ink-900'
          : 'bg-surface/0 border-transparent text-ink-700 hover:bg-ink-100 hover:text-ink-900',
      ]"
      :aria-haspopup="true"
      :aria-expanded="open"
      :aria-label="t('topbar.switchFont')"
      :title="t('topbar.switchFont')"
      @click="open = !open"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M4 19l8-14 8 14M7 14h10" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <svg
        :class="['w-3 h-3 text-ink-500 transition-transform', open ? 'rotate-180' : '']"
        viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
      >
        <path d="M5 7l5 6 5-6H5z" />
      </svg>
    </button>

    <!-- 下拉面板 -->
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
        :aria-label="t('fontSwitcher.title')"
        class="absolute right-0 top-[calc(100%+4px)] w-[320px] rounded-lg border border-ink-200 bg-surface shadow-[var(--shadow-hover)] p-1.5 z-50"
      >
        <div class="px-3 py-2 text-[11px] uppercase tracking-wider text-ink-500 font-mono">
          {{ t('fontSwitcher.title') }}
        </div>
        <button
          v-for="f in fonts"
          :key="f.key"
          type="button"
          role="menuitemradio"
          :aria-checked="activeKey === f.key"
          :class="[
            'w-full px-3 py-2.5 rounded-md text-left flex items-center gap-3 transition-colors',
            activeKey === f.key
              ? 'bg-brand-50 hover:bg-brand-50'
              : 'hover:bg-ink-100',
          ]"
          @click="pick(f.key)"
        >
          <!-- 预览：display 字 + body 字 双行卡片 -->
          <span
            class="shrink-0 w-12 h-12 rounded-md border border-ink-200/80 bg-ink-50/60 flex flex-col items-center justify-center leading-tight"
            :title="f.label"
          >
            <span
              class="text-[15px] font-semibold text-ink-900"
              :style="{ fontFamily: f.display }"
            >Aa</span>
            <span
              class="text-[10px] text-ink-500"
              :style="{ fontFamily: f.body }"
            >运</span>
          </span>
          <span class="flex-1 min-w-0">
            <span
              :class="[
                'block text-[13px] font-medium',
                activeKey === f.key ? 'text-brand-700' : 'text-ink-900',
              ]"
            >
              {{ f.label }}
            </span>
            <span class="block text-[11px] text-ink-500 truncate">{{ f.subtitle }}</span>
          </span>
          <svg
            v-if="activeKey === f.key"
            class="w-4 h-4 text-brand-600 shrink-0"
            viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
          >
            <path d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.1l6.3-6.4a1 1 0 011.4 0z" />
          </svg>
        </button>
        <div class="mt-1 px-3 py-2 text-[11px] text-ink-500 border-t border-ink-100">
          {{ t('fontSwitcher.persistHint') }}
        </div>
      </div>
    </Transition>
  </div>
</template>
