<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
  breadcrumb?: { key: string; label: string }[];
}>();
</script>

<template>
  <header class="border-b border-ink-200 pb-4">
    <div v-if="breadcrumb?.length" class="flex items-center gap-1.5 text-xs text-ink-500 mb-2">
      <template v-for="(node, i) in breadcrumb" :key="node.key">
        <span>{{ node.label }}</span>
        <span v-if="i < breadcrumb.length - 1" class="text-ink-300">/</span>
      </template>
    </div>
    <h1 class="text-xl font-semibold text-ink-900 font-display tracking-tight">
      {{ title }}
    </h1>
    <p v-if="subtitle" class="mt-1 text-sm text-ink-500">{{ subtitle }}</p>
  </header>
</template>
