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

useHead({
  title: () => current.value?.label ?? '页面',
});
</script>

<template>
  <div>
    <ClientOnly>
      <PageHeader
        :title="current?.label ?? '未配置页面'"
        :subtitle="current ? undefined : `路径 ${currentPath} 未在 nav.json 中配置`"
        :breadcrumb="current?.breadcrumb"
      />
      <!-- 有 embed = 渲染 iframe；否则 = 占位（筛选 + 表格） -->
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
        <div class="pb-5 border-b border-ink-200/70">
          <div class="h-4 w-32 rounded bg-ink-150" />
          <div class="mt-3 h-7 w-48 rounded bg-ink-150" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
