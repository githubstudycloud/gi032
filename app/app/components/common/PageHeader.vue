<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
  breadcrumb?: { key: string; label: string }[];
}>();
</script>

<template>
  <header class="pb-5 border-b border-ink-200/70">
    <nav v-if="breadcrumb?.length" aria-label="breadcrumb" class="flex items-center gap-1.5 text-[12px] text-ink-500 mb-3">
      <template v-for="(node, i) in breadcrumb" :key="node.key">
        <span :class="i === breadcrumb.length - 1 ? 'text-ink-700' : ''">{{ node.label }}</span>
        <svg v-if="i < breadcrumb.length - 1" class="w-3 h-3 text-ink-300" viewBox="0 0 20 20" fill="currentColor">
          <path d="M7 5l6 5-6 5V5z" />
        </svg>
      </template>
    </nav>
    <div class="flex items-end justify-between gap-6">
      <div class="min-w-0">
        <h1 class="font-display text-[26px] font-semibold text-ink-900 tracking-tight leading-tight">
          {{ title }}
        </h1>
        <p v-if="subtitle" class="mt-1.5 text-[13px] text-ink-500">{{ subtitle }}</p>
      </div>
    </div>
  </header>
</template>
