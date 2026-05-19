<script setup lang="ts">
/**
 * 产业落地进展 —— 已迁到通用 ReportPage。
 * 业务定义全部在 `/mock/reports/industry/{config,data}.json`。
 * 本文件保留是为了维持 URL `/ai-test/overview/industry`；菜单链接不动。
 */
import { flattenNav } from '~/framework/utils/nav-flat';

const route = useRoute();
const { items: navItems } = await useNav();
const flat = computed(() => flattenNav(navItems.value));
const current = computed(() => flat.value.find(i => i.path === route.path));
useHead({ title: () => current.value?.label ?? '产业落地进展' });
</script>

<template>
  <ReportPage report-type="industry" />
</template>
