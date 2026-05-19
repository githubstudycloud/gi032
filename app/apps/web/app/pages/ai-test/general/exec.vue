<script setup lang="ts">
import { flattenNav } from '~/framework/utils/nav-flat';

const route = useRoute();
const { items: navItems } = await useNav();
const flat = computed(() => flattenNav(navItems.value));
const current = computed(() => flat.value.find(i => i.path === route.path));
useHead({ title: () => current.value?.label ?? 'AI辅助测试执行' });
</script>

<template>
  <ReportPage report-type="exec" />
</template>
