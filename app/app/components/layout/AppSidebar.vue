<script setup lang="ts">
import type { Branding, SidebarMenuItem } from '~/types/nav';

defineProps<{
  brand: Branding | null;
  items: SidebarMenuItem[];
  pending?: boolean;
}>();
</script>

<template>
  <aside class="w-64 shrink-0 border-r border-ink-200 bg-white flex flex-col">
    <AppSidebarBrand :brand="brand" />
    <div v-if="pending" class="px-4 py-4 text-sm text-ink-500">加载中…</div>
    <nav v-else class="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
      <AppSidebarItem
        v-for="item in items"
        :key="item.key"
        :item="item"
        :depth="0"
      />
    </nav>
    <div class="px-4 py-3 border-t border-ink-200 text-[11px] text-ink-500">
      © 2026 · 运营平台
    </div>
  </aside>
</template>
