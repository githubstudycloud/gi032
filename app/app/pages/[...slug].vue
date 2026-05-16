<script setup lang="ts">
import { flattenNav } from '~/utils/nav-flat';

const route = useRoute();
const { items } = await useNav();

const currentPath = computed<string>(() => {
  const slug = route.params.slug;
  const joined = Array.isArray(slug) ? slug.join('/') : (slug ?? '');
  return '/' + joined;
});

const flat = computed(() => flattenNav(items.value));
const current = computed(() => flat.value.find(i => i.path === currentPath.value));

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
  />

  <!-- 其它（带侧栏的 section 子页 + 占位页 + section-内 embed）：仅渲染嵌入 / 占位内容，不再重复显示标题/面包屑 -->
  <div v-else>
    <ClientOnly>
      <EmbedFrame
        v-if="current?.embed"
        :src="current.embed"
        :title="current.label"
      />
      <template v-else>
        <FilterBar />
        <DataTablePlaceholder />
      </template>
      <template #fallback>
        <div class="space-y-3">
          <div class="h-4 w-32 rounded bg-ink-150" />
          <div class="h-7 w-48 rounded bg-ink-150" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
