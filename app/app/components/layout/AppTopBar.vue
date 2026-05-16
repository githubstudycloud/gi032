<script setup lang="ts">
import type { TopMenuItem } from '~/types/nav';

const props = defineProps<{
  items: TopMenuItem[];
  pending?: boolean;
  brandTitle?: string;
}>();

const route = useRoute();

function isActive(item: TopMenuItem): boolean {
  if (!item.path) return false;
  if (item.path === '/') return route.path === '/';
  return route.path === item.path || route.path.startsWith(item.path + '/');
}
</script>

<template>
  <header class="h-14 shrink-0 border-b border-ink-200 bg-white">
    <div class="h-full flex items-center px-6 gap-8">
      <div class="flex items-center gap-2 text-ink-900">
        <div class="w-7 h-7 rounded-md bg-brand-600 text-white flex items-center justify-center text-xs font-semibold">
          运
        </div>
        <span class="font-display text-base font-semibold tracking-tight">
          {{ props.brandTitle || '运营看板' }}
        </span>
      </div>

      <nav v-if="pending" class="text-sm text-ink-500">加载中…</nav>
      <nav v-else class="flex items-center gap-1">
        <NuxtLink
          v-for="item in items"
          :key="item.key"
          :to="item.path || '#'"
          :class="[
            'px-3 h-9 inline-flex items-center rounded-md text-sm transition-colors',
            isActive(item)
              ? 'bg-ink-900 text-white'
              : 'text-ink-700 hover:bg-ink-100 hover:text-ink-900',
            item.disabled ? 'opacity-50 pointer-events-none' : '',
          ]"
        >
          {{ item.label }}
          <span v-if="item.badge != null" class="ml-1.5 text-[10px] px-1 rounded bg-brand-500 text-white">
            {{ item.badge }}
          </span>
        </NuxtLink>
      </nav>

      <div class="flex-1" />

      <div class="text-xs text-ink-500">v0.1.0 · 内部预览</div>
    </div>
  </header>
</template>
