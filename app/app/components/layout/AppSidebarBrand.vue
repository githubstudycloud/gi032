<script setup lang="ts">
import type { Branding } from '~/types/nav';

defineProps<{
  brand: Branding | null;
}>();
</script>

<template>
  <div class="h-14 shrink-0 border-b border-ink-200 px-4 flex items-center gap-3">
    <div class="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center font-semibold">
      {{ brand?.shortName || brand?.title?.slice(0, 1) || '运' }}
    </div>
    <div class="flex-1 min-w-0">
      <div class="text-[15px] font-semibold text-ink-900 leading-tight truncate">
        {{ brand?.title || '运营看板' }}
      </div>
      <div v-if="brand?.subtitle" class="text-[11px] text-ink-500 truncate leading-tight mt-0.5">
        {{ brand.subtitle }}
      </div>
    </div>
  </div>
</template>
