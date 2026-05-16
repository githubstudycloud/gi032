<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';

const { themes, activeKey, activeTheme, setTheme } = await useTheme();

const open = ref(false);
const rootEl = ref<HTMLElement | null>(null);

onClickOutside(rootEl, () => {
  open.value = false;
});

function pick(key: string): void {
  setTheme(key);
  open.value = false;
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') open.value = false;
}
</script>

<template>
  <div ref="rootEl" class="relative" @keydown="onKeydown">
    <!-- 触发按钮：3 色 swatch + 调色板 icon -->
    <button
      type="button"
      :class="[
        'h-9 px-2.5 inline-flex items-center gap-2 rounded-md border transition-colors',
        open
          ? 'bg-ink-100 border-ink-200 text-ink-900'
          : 'bg-surface/0 border-transparent text-ink-700 hover:bg-ink-100 hover:text-ink-900',
      ]"
      :aria-haspopup="true"
      :aria-expanded="open"
      aria-label="切换样式风格"
      title="切换样式风格"
      @click="open = !open"
    >
      <span class="flex gap-0.5">
        <span
          v-for="(c, i) in activeTheme?.swatch ?? ['#ccc', '#888', '#444']"
          :key="i"
          :style="{ background: c }"
          class="w-2 h-2 rounded-full ring-1 ring-black/10"
        />
      </span>
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
        aria-label="样式风格"
        class="absolute right-0 top-[calc(100%+4px)] w-[280px] rounded-lg border border-ink-200 bg-surface shadow-[var(--shadow-hover)] p-1.5 z-50"
      >
        <div class="px-3 py-2 text-[11px] uppercase tracking-wider text-ink-500 font-mono">
          样式风格
        </div>
        <button
          v-for="t in themes"
          :key="t.key"
          type="button"
          role="menuitemradio"
          :aria-checked="activeKey === t.key"
          :class="[
            'w-full px-3 py-2.5 rounded-md text-left flex items-center gap-3 transition-colors',
            activeKey === t.key
              ? 'bg-brand-50 hover:bg-brand-50'
              : 'hover:bg-ink-100',
          ]"
          @click="pick(t.key)"
        >
          <span class="flex gap-1 shrink-0">
            <span
              v-for="(c, i) in t.swatch"
              :key="i"
              :style="{ background: c }"
              class="w-3 h-3 rounded-full ring-1 ring-black/10"
            />
          </span>
          <span class="flex-1 min-w-0">
            <span
              :class="[
                'block text-[13px] font-medium',
                activeKey === t.key ? 'text-brand-700' : 'text-ink-900',
              ]"
            >
              {{ t.label }}
            </span>
            <span class="block text-[11px] text-ink-500 truncate">{{ t.subtitle }}</span>
          </span>
          <svg
            v-if="activeKey === t.key"
            class="w-4 h-4 text-brand-600 shrink-0"
            viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
          >
            <path d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.1l6.3-6.4a1 1 0 011.4 0z" />
          </svg>
        </button>
        <div class="mt-1 px-3 py-2 text-[11px] text-ink-500 border-t border-ink-100">
          切换会保存在本机 · localStorage
        </div>
      </div>
    </Transition>
  </div>
</template>
