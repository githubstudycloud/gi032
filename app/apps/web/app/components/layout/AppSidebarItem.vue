<script setup lang="ts">
import type { NavItem } from '~/types/nav';

const props = defineProps<{
  item: NavItem;
  depth: number;
}>();

const route = useRoute();
const { locale } = useI18n();
const displayLabel = computed<string>(() => localizedLabel(props.item, locale.value));

const hasChildren = computed<boolean>(
  () => Array.isArray(props.item.children) && props.item.children.length > 0,
);

function pathHits(path: string | undefined): boolean {
  if (!path) return false;
  if (path === '/') return route.path === '/';
  return route.path === path || route.path.startsWith(path + '/');
}

function descendantActive(items: NavItem[]): boolean {
  for (const it of items) {
    if (pathHits(it.path)) return true;
    if (it.children && descendantActive(it.children)) return true;
  }
  return false;
}

const isLeafActive = computed<boolean>(() => pathHits(props.item.path));
const hasActiveChild = computed<boolean>(() =>
  hasChildren.value ? descendantActive(props.item.children!) : false,
);

// 二级菜单（depth=0）默认展开；三级 default 收起，命中后代时自动展开
const expanded = ref(props.depth === 0);
watchEffect(() => {
  if (hasActiveChild.value) expanded.value = true;
});

function toggle(): void {
  if (hasChildren.value) expanded.value = !expanded.value;
}

/* 二级分组（depth=0）点击 → 跳第一个可用叶子；保持展开。
   三级及更深的中间节点（暂未出现）→ 保留 toggle 行为。 */
const groupTarget = computed<string | null>(() =>
  props.depth === 0 && hasChildren.value ? firstLeafPath(props.item) : null,
);

/* 深度 0 = 二级菜单（分组头）；深度 1+ = 三级菜单（叶子） */
const padLeftPx = computed<string>(() => {
  // 二级（depth=0）：紧贴左 + 字号略大 + 字重略重
  // 三级（depth=1）：左缩进 16px
  // 四级+（depth>=2，预留）：再叠加 14px
  if (props.depth === 0) return '12px';
  if (props.depth === 1) return '28px';
  return `${28 + (props.depth - 1) * 14}px`;
});
</script>

<template>
  <div>
    <!-- 叶子节点 = 链接 -->
    <NuxtLink
      v-if="!hasChildren && item.path"
      :to="item.path"
      :class="[
        'relative flex items-center gap-1.5 h-9 rounded-md text-[13px] pr-3 transition-colors',
        isLeafActive
          ? 'bg-brand-50 text-brand-700 font-medium'
          : 'text-ink-700 hover:bg-ink-100/80 hover:text-ink-900',
      ]"
      :style="{ paddingLeft: padLeftPx }"
    >
      <!-- 活动叶子的左侧蓝条 -->
      <span
        v-if="isLeafActive"
        class="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-brand-600"
      />
      <!-- 叶子图标（depth >= 1） -->
      <NavIcon
        v-if="item.icon"
        :name="item.icon"
        :class="isLeafActive ? 'text-brand-600' : 'text-ink-500'"
      />
      <span class="truncate flex-1">{{ displayLabel }}</span>
      <span v-if="item.badge != null" class="text-[10px] px-1.5 rounded-full bg-ink-200 text-ink-700">
        {{ item.badge }}
      </span>
    </NuxtLink>

    <!-- 二级分组（depth=0）：渲染成链接，点击跳第一个叶子，保持展开 -->
    <NuxtLink
      v-else-if="depth === 0 && groupTarget"
      :to="groupTarget"
      :class="[
        'w-full flex items-center gap-1.5 h-8 rounded-md pr-3 transition-colors mt-3 first:mt-1',
        'text-[12px] font-semibold tracking-wide',
        hasActiveChild ? 'text-ink-700' : 'text-ink-500 hover:text-ink-700',
      ]"
      :style="{ paddingLeft: padLeftPx }"
    >
      <NavIcon
        v-if="item.icon"
        :name="item.icon"
        class="text-ink-500"
      />
      <span class="truncate flex-1 text-left">{{ displayLabel }}</span>
    </NuxtLink>

    <!-- 深层中间节点（暂无；保留 toggle 行为） -->
    <button
      v-else
      type="button"
      :class="[
        'w-full flex items-center gap-1.5 h-8 rounded-md pr-3 transition-colors',
        'text-[13px] text-ink-700 hover:bg-ink-100/80 hover:text-ink-900',
        hasActiveChild ? 'text-ink-900 font-medium' : '',
      ]"
      :style="{ paddingLeft: padLeftPx }"
      @click="toggle"
    >
      <span class="truncate flex-1 text-left">{{ displayLabel }}</span>
      <svg
        v-if="hasChildren"
        :class="['w-3.5 h-3.5 transition-transform shrink-0', expanded ? 'rotate-90' : '']"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M7 5l6 5-6 5V5z" />
      </svg>
    </button>

    <!-- 子项递归 -->
    <div v-if="hasChildren && expanded" class="space-y-px">
      <AppSidebarItem
        v-for="child in item.children"
        :key="child.key"
        :item="child"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>
