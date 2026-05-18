<script setup lang="ts">
import type { Branding, NavItem } from '~/types/nav';

defineProps<{
  items: NavItem[];
  activeKey: string | null;
  brand: Branding | null;
}>();

const { locale } = useI18n();

/** 顶部菜单点击 → 跳第一个可用叶子；single/叶子保留自身 path */
function targetPath(item: NavItem): string {
  return firstLeafPath(item) ?? item.path ?? '#';
}
function label(item: NavItem): string {
  return localizedLabel(item, locale.value);
}</script>

<template>
  <header class="h-16 shrink-0 bg-surface/95 backdrop-blur-sm border-b border-ink-200/80 sticky top-0 z-20">
    <!-- max-w 跟主内容区一致，宽屏不再留几百像素空白；mx-auto 居中 -->
    <div class="h-full max-w-[1680px] mx-auto flex items-center px-4 gap-3">
      <!-- 左：LOGO + 标题 -->
      <NuxtLink to="/" class="flex items-center gap-3 shrink-0 -my-1 px-2 py-1 rounded-lg hover:bg-ink-100/60 transition-colors">
        <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-display text-base font-semibold shadow-[0_4px_10px_-2px_oklch(0.62_0.14_235/0.35)]">
          {{ brand?.shortName || '运' }}
        </div>
        <div class="leading-none flex flex-col gap-1">
          <span class="font-display text-[18px] font-semibold text-ink-900 tracking-tight">
            {{ brand?.title || '运营看板' }}
          </span>
          <span v-if="brand?.subtitle" class="text-[11px] text-ink-500 uppercase tracking-[0.18em] font-mono">
            {{ brand.subtitle }}
          </span>
        </div>
      </NuxtLink>

      <!-- 中：一级菜单。flex-1 撑开占据可用空间，菜单项居中显示，让左中右视觉间距均衡。窄屏可横向滚动 -->
      <nav class="flex-1 flex items-center justify-center h-full min-w-0 overflow-x-auto scrollbar-none">
        <NuxtLink
          v-for="item in items"
          :key="item.key"
          :to="targetPath(item)"
          :class="[
            'relative h-full px-3 inline-flex items-center text-[14px] font-medium transition-colors whitespace-nowrap',
            activeKey === item.key
              ? 'text-brand-700'
              : 'text-ink-700 hover:text-ink-900',
            item.disabled ? 'opacity-40 pointer-events-none' : '',
          ]"
        >
          <span class="relative">
            {{ label(item) }}
            <span v-if="item.badge != null" class="absolute -top-1 -right-3 text-[10px] px-1 rounded-full bg-brand-500 text-white leading-tight">
              {{ item.badge }}
            </span>
          </span>
          <!-- 活动项底部蓝条 -->
          <span
            v-if="activeKey === item.key"
            class="absolute left-2 right-2 bottom-0 h-[2.5px] bg-brand-600 rounded-t-full"
          />
        </NuxtLink>
      </nav>

      <!-- 右：语言 / 字体 / 主题 / 版本 -->
      <div class="flex items-center gap-2 shrink-0">
        <ClientOnly>
          <LocaleSwitcher />
          <template #fallback>
            <div class="h-9 w-[68px] rounded-md bg-ink-100" />
          </template>
        </ClientOnly>
        <ClientOnly>
          <FontSwitcher />
          <template #fallback>
            <div class="h-9 w-[60px] rounded-md bg-ink-100" />
          </template>
        </ClientOnly>
        <ClientOnly>
          <ThemeSwitcher />
          <template #fallback>
            <div class="h-9 w-[68px] rounded-md bg-ink-100" />
          </template>
        </ClientOnly>
        <div class="hidden md:flex items-center gap-2 ml-1 text-xs text-ink-500">
          <span class="font-mono">{{ brand?.version || 'v0.1.0' }}</span>
          <span class="text-ink-300">·</span>
          <span>{{ $t('common.internalPreview') }}</span>
        </div>
      </div>
    </div>
  </header>
</template>
