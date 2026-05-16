<script setup lang="ts">
import type { SidebarMenuItem } from '~/types/nav';

const props = defineProps<{
  item: SidebarMenuItem;
  depth: number;
}>();

const route = useRoute();
const expanded = ref(false);

const hasChildren = computed<boolean>(
  () => Array.isArray(props.item.children) && props.item.children.length > 0,
);

function pathHits(path: string | undefined): boolean {
  if (!path) return false;
  if (path === '/') return route.path === '/';
  return route.path === path || route.path.startsWith(path + '/');
}

function descendantActive(items: SidebarMenuItem[]): boolean {
  for (const it of items) {
    if (pathHits(it.path)) return true;
    if (it.children && descendantActive(it.children)) return true;
  }
  return false;
}

const isLeafActive       = computed<boolean>(() => pathHits(props.item.path));
const hasActiveChild     = computed<boolean>(() =>
  hasChildren.value ? descendantActive(props.item.children!) : false,
);

watchEffect(() => {
  if (hasActiveChild.value) expanded.value = true;
});

function toggle(): void {
  if (hasChildren.value) expanded.value = !expanded.value;
}

const padLeftPx = computed<string>(() => `${props.depth * 14 + 12}px`);
</script>

<template>
  <div>
    <!-- 叶子：直接是链接 -->
    <NuxtLink
      v-if="!hasChildren && item.path"
      :to="item.path"
      :class="[
        'flex items-center h-9 rounded-md text-[13px] transition-colors pr-3',
        isLeafActive
          ? 'bg-brand-50 text-brand-700 font-medium'
          : 'text-ink-700 hover:bg-ink-100',
      ]"
      :style="{ paddingLeft: padLeftPx }"
    >
      <span class="truncate flex-1">{{ item.label }}</span>
      <span v-if="item.badge != null" class="text-[10px] px-1.5 rounded-full bg-ink-200 text-ink-700">
        {{ item.badge }}
      </span>
    </NuxtLink>

    <!-- 带子项：可展开按钮 -->
    <button
      v-else
      type="button"
      :class="[
        'w-full flex items-center h-9 rounded-md text-[13px] transition-colors pr-3',
        hasActiveChild ? 'text-ink-900 font-medium' : 'text-ink-700',
        'hover:bg-ink-100',
      ]"
      :style="{ paddingLeft: padLeftPx }"
      @click="toggle"
    >
      <span class="truncate flex-1 text-left">{{ item.label }}</span>
      <svg
        v-if="hasChildren"
        :class="['w-3.5 h-3.5 transition-transform shrink-0', expanded ? 'rotate-90' : '']"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M7 5l6 5-6 5V5z" />
      </svg>
    </button>

    <!-- 递归子菜单 -->
    <div v-if="hasChildren && expanded" class="mt-0.5 space-y-0.5">
      <AppSidebarItem
        v-for="child in item.children"
        :key="child.key"
        :item="child"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>
