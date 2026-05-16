<script setup lang="ts">
const { branding } = await useBranding();
const { items: topItems,     pending: topPending     } = await useTopMenu();
const { items: sidebarItems, pending: sidebarPending } = await useSidebarMenu();
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <AppTopBar
      :items="topItems"
      :pending="topPending"
      :brand-title="branding?.title ?? '运营看板'"
    />
    <div class="flex flex-1 min-h-0">
      <AppSidebar
        :brand="branding"
        :items="sidebarItems"
        :pending="sidebarPending"
      />
      <main class="flex-1 overflow-y-auto">
        <div class="max-w-[1400px] mx-auto px-6 py-6">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
