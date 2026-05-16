<script setup lang="ts">
import { flattenNav } from '~/utils/nav-flat';
import type { NavItem } from '~/types/nav';

const route = useRoute();
const { items } = await useNav();

const currentPath = computed<string>(() => {
  const slug = route.params.slug;
  const joined = Array.isArray(slug) ? slug.join('/') : (slug ?? '');
  return '/' + joined;
});

const flat = computed(() => flattenNav(items.value));
const current = computed(() => flat.value.find(i => i.path === currentPath.value));

/** 父级菜单 path（找当前路径所属的一级 section 顶层），用于"返回上一级"按钮 */
const fallback = computed<{ path: string; label: string } | null>(() => {
  function findTop(list: NavItem[]): NavItem | null {
    for (const top of list) {
      if (top.path && currentPath.value.startsWith(top.path + '/')) return top;
    }
    return null;
  }
  const top = findTop(items.value);
  return top && top.path ? { path: top.path, label: top.label } : null;
});

/** 顶部 single + embed 的页：铺满 iframe，不要标题/面包屑/边框 */
const isFullEmbed = computed<boolean>(() =>
  !!(current.value?.single && current.value?.embed),
);

useHead({
  title: () => current.value?.label ?? '页面',
});
</script>

<template>
  <!-- 顶部 single+embed：直接铺满 iframe -->
  <EmbedFrame
    v-if="isFullEmbed && current?.embed"
    variant="full"
    :src="current.embed"
    :title="current.label"
    :sandbox="current.embedSandbox"
  />

  <!-- 其它（侧栏 section 子页 + section-内 embed + 未实现路由） -->
  <div v-else>
    <ClientOnly>
      <EmbedFrame
        v-if="current?.embed"
        :src="current.embed"
        :title="current.label"
        :sandbox="current.embedSandbox"
      />
      <!-- 路由在 nav 里登记了但没专属 page：显示"未实现"占位 —— 不再 fake 表格 -->
      <NotImplemented
        v-else
        :page-label="current?.label"
        :path="currentPath"
        :fallback-path="fallback?.path"
        :fallback-label="fallback?.label"
      />
      <template #fallback>
        <div class="space-y-3">
          <div class="h-4 w-32 rounded bg-ink-150" />
          <div class="h-7 w-48 rounded bg-ink-150" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
