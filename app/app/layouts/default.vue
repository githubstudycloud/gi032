<script setup lang="ts">
const { branding } = await useBranding();
const { items, activeTop, activeTopKey, showSidebar } = await useNav();

/* 顶部一级 single + embed 的页（"首页1"等）需要去掉外边距 + 让 iframe 铺满。
   主区域改为 flex column + h-full，让 page 里的 EmbedFrame variant="full" 能用 h-full 撑开。 */
const isFullBleed = computed<boolean>(
  () => !!(activeTop.value?.single && activeTop.value?.embed),
);
</script>

<template>
  <div class="h-screen flex flex-col">
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
      <ClientOnly>
        <AppSidebar v-if="showSidebar && activeTop" :section="activeTop" />
      </ClientOnly>

      <main
        :class="[
          'flex-1 min-h-0',
          isFullBleed ? 'overflow-hidden flex' : 'overflow-y-auto',
        ]"
      >
        <!-- 普通页：水平居中带 padding 容器 -->
        <div
          v-if="!isFullBleed"
          :class="[
            'mx-auto px-4 lg:px-6 py-6 text-[14px]',
            showSidebar ? 'max-w-[1680px]' : 'max-w-6xl',
          ]"
        >
          <slot />
        </div>
        <!-- 全屏嵌入：直接把 slot 当 flex 子项铺满 -->
        <slot v-else />
      </main>
    </div>
  </div>
</template>
