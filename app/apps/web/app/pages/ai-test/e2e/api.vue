<script setup lang="ts">
import { flattenNav } from '~/utils/nav-flat';

const route = useRoute();
const { items: navItems } = await useNav();
const flat = computed(() => flattenNav(navItems.value));
const current = computed(() => flat.value.find(i => i.path === route.path));
useHead({ title: () => current.value?.label ?? 'API E2E测试' });
</script>

<template>
  <ReportPage report-type="e2e-api" />
</template>
