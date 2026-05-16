<script setup lang="ts">
useHead({
  titleTemplate: (titleChunk?: string) =>
    titleChunk ? `${titleChunk} · 运营看板` : '运营看板',
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
