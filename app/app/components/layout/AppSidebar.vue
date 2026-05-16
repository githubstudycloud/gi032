<script setup lang="ts">
import type { NavItem } from '~/types/nav';

defineProps<{
  section: NavItem;
}>();
</script>

<template>
  <aside class="w-[260px] shrink-0 border-r border-ink-200/80 bg-surface flex flex-col">
    <!-- 侧栏头：当前一级菜单 -->
    <div class="h-14 shrink-0 px-5 flex items-center border-b border-ink-200/60">
      <div class="flex items-center gap-2 min-w-0">
        <div class="w-1 h-5 rounded-full bg-brand-500" />
        <h2 class="font-display text-[15px] font-semibold text-ink-900 tracking-tight truncate">
          {{ section.label }}
        </h2>
      </div>
    </div>

    <!-- 子菜单：2-3 层递归 -->
    <nav class="flex-1 overflow-y-auto px-2 py-3 space-y-px">
      <AppSidebarItem
        v-for="child in section.children"
        :key="child.key"
        :item="child"
        :depth="0"
      />
    </nav>

    <!-- 侧栏底：留白 -->
    <div class="px-5 py-3 border-t border-ink-200/60 text-[11px] text-ink-500">
      © 2026 · 运营平台
    </div>
  </aside>
</template>
