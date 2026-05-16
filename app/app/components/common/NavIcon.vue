<script setup lang="ts">
/**
 * 内联 SVG 图标集 —— 给左侧二级菜单组用。
 * 风格统一: stroke 1.75 / round caps / 24×24 viewBox / w-4 h-4。
 * 取自 lucide-style，单一文件维护，没引图标库。
 */
defineProps<{ name?: string }>();
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="w-3.5 h-3.5 shrink-0"
    aria-hidden="true"
  >
    <!-- overview / bar-chart -->
    <g v-if="name === 'overview'">
      <path d="M3 3v18h18" />
      <path d="M7 14v4" /><path d="M11 10v8" /><path d="M15 6v12" /><path d="M19 12v6" />
    </g>
    <!-- agent / cpu -->
    <g v-else-if="name === 'agent'">
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
    </g>
    <!-- flow / e2e -->
    <g v-else-if="name === 'flow'">
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="15" y="15" width="6" height="6" rx="1" />
      <path d="M9 6h6a3 3 0 013 3v3a3 3 0 003 3" />
    </g>
    <!-- target -->
    <g v-else-if="name === 'target'">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </g>
    <!-- tools / wrench -->
    <g v-else-if="name === 'tools'">
      <path d="M14.7 6.3a4 4 0 1 0 5 5l-3 3 2 2-3 3-2-2-3 3a4 4 0 1 1-5-5l3-3-2-2 3-3 2 2z" />
    </g>
    <!-- settings / sliders -->
    <g v-else-if="name === 'settings'">
      <path d="M4 6h10M18 6h2" /><circle cx="16" cy="6" r="2" />
      <path d="M4 12h2M10 12h10" /><circle cx="8" cy="12" r="2" />
      <path d="M4 18h12M20 18h0" /><circle cx="18" cy="18" r="2" />
    </g>
    <!-- inbox -->
    <g v-else-if="name === 'inbox'">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
    </g>
    <!-- monitor / pulse -->
    <g v-else-if="name === 'monitor'">
      <path d="M3 12h4l3 9 6-18 3 9h2" />
    </g>
    <!-- log / file-text -->
    <g v-else-if="name === 'log'">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </g>
    <!-- users -->
    <g v-else-if="name === 'users'">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M17 3.13a4 4 0 0 1 0 7.75" />
    </g>
    <!-- task / calendar-check -->
    <g v-else-if="name === 'task'">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="m9 16 2 2 4-4" />
    </g>
    <!-- rules / scale -->
    <g v-else-if="name === 'rules'">
      <path d="M16 16.5 21 11l-5-5.5M8 7.5 3 13l5 5.5M12 4l-2 16" />
    </g>
    <!-- knowledge / book -->
    <g v-else-if="name === 'book'">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5V4.5A2.5 2.5 0 0 1 6.5 2Z" />
    </g>
    <!-- 兜底：小圆点 -->
    <circle v-else cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
  </svg>
</template>
