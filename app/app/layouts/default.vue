<script setup lang="ts">
const { branding } = await useBranding();
const { items, activeTop, activeTopKey, showSidebar } = await useNav();
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- 顶部一直在 -->
    <ClientOnly>
      <AppTopBar
        :items="items"
        :active-key="activeTopKey"
        :brand="branding"
      />
      <template #fallback>
        <div class="h-16 shrink-0 border-b border-ink-200/80 bg-surface/95" />
      </template>
    </ClientOnly>

    <div class="flex flex-1 min-h-0">
      <!-- 侧栏：当前一级是 single（首页）时不显示 -->
      <ClientOnly>
        <AppSidebar v-if="showSidebar && activeTop" :section="activeTop" />
      </ClientOnly>

      <main class="flex-1 overflow-y-auto">
        <div
          :class="[
            'mx-auto px-8 py-8',
            showSidebar ? 'max-w-[1400px]' : 'max-w-5xl',
          ]"
        >
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
