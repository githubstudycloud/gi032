<script setup lang="ts">
import { flattenSidebarMenu } from '~/utils/nav-flat';

const route = useRoute();
const { items } = await useSidebarMenu();

const currentPath = computed<string>(() => {
  const slug = route.params.slug;
  const joined = Array.isArray(slug) ? slug.join('/') : (slug ?? '');
  return '/' + joined;
});

const flat = computed(() => flattenSidebarMenu(items.value));
const current = computed(() => flat.value.find(i => i.path === currentPath.value));

useHead({
  title: () => current.value?.label ?? '页面',
});
</script>

<template>
  <div>
    <PageHeader
      :title="current?.label ?? '未配置页面'"
      :subtitle="current ? undefined : `路径 ${currentPath} 未在 nav-sidebar.json 中配置`"
      :breadcrumb="current?.breadcrumb"
    />

    <FilterBar />
    <DataTablePlaceholder />
  </div>
</template>
