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
    <!-- 标题 / 面包屑依赖客户端取的 nav，需要 ClientOnly 包 -->
    <ClientOnly>
      <PageHeader
        :title="current?.label ?? '未配置页面'"
        :subtitle="current ? undefined : `路径 ${currentPath} 未在 nav.json 中配置`"
        :breadcrumb="current?.breadcrumb"
      />
      <template #fallback>
        <div class="pb-5 border-b border-ink-200/70">
          <div class="h-4 w-32 rounded bg-ink-150" />
          <div class="mt-3 h-7 w-48 rounded bg-ink-150" />
        </div>
      </template>
    </ClientOnly>
    <FilterBar />
    <DataTablePlaceholder />
  </div>
</template>
