<script setup lang="ts">
/**
 * 报表页标题区。
 * 来自 config.meta：name / subtitle / description。
 * 右侧暴露 slot 给 ToolBar 等横向控件。
 */
defineProps<{
  name: string;
  subtitle?: string;
  description?: string;
}>();
</script>

<template>
  <header class="flex items-end gap-3 mb-4">
    <div class="min-w-0">
      <h1 class="font-display text-[20px] font-semibold text-ink-900 tracking-tight">
        {{ name }}
      </h1>
      <p v-if="subtitle" class="mt-1 text-[12.5px] text-ink-600 leading-snug">
        {{ subtitle }}
      </p>
      <p v-if="description" class="mt-1 text-[11.5px] text-ink-500 leading-relaxed max-w-2xl">
        {{ description }}
      </p>
    </div>
    <div class="flex-1" />
    <slot name="right" />
  </header>
</template>
