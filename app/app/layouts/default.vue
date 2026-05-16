<script setup lang="ts">
const { branding } = await useBranding();
const { items: topItems,     pending: topPending     } = await useTopMenu();
const { items: sidebarItems, pending: sidebarPending } = await useSidebarMenu();
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!--
      数据只在客户端拉，SSR 时 pending=false 而 client 初始 pending=true，
      不包 ClientOnly 会触发 hydration mismatch。SSR 输出 skeleton 占位即可。
    -->
    <ClientOnly>
      <AppTopBar
        :items="topItems"
        :pending="topPending"
        :brand-title="branding?.title ?? '运营看板'"
      />
      <template #fallback>
        <div class="h-14 shrink-0 border-b border-ink-200 bg-white" />
      </template>
    </ClientOnly>

    <div class="flex flex-1 min-h-0">
      <ClientOnly>
        <AppSidebar
          :brand="branding"
          :items="sidebarItems"
          :pending="sidebarPending"
        />
        <template #fallback>
          <aside class="w-64 shrink-0 border-r border-ink-200 bg-white" />
        </template>
      </ClientOnly>

      <main class="flex-1 overflow-y-auto">
        <div class="max-w-[1400px] mx-auto px-6 py-6">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
