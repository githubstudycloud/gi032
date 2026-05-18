<script setup lang="ts">
/**
 * 左侧菜单图标。
 *
 * 加载顺序（同一 name 只尝试一次 custom，缓存到模块级 Set）：
 *   1. /nav-icons/custom/<name>.svg   ← 业务方放自定义图标
 *   2. /nav-icons/default/<name>.svg  ← 仓库内置默认图标
 *   3. 兜底小圆点
 *
 * 详细约定见 apps/web/public/nav-icons/README.md。
 */
const props = defineProps<{ name?: string }>();

/** 模块级缓存：已确认 custom/<name>.svg 不存在的，不再请求 */
const customMissing = useState<Set<string>>('nav-icon-custom-missing', () => new Set<string>());

const customPath = (n: string): string => `/nav-icons/custom/${n}.svg`;
const defaultPath = (n: string): string => `/nav-icons/default/${n}.svg`;

const src = ref<string>('');
const broken = ref<boolean>(false);

watchEffect(() => {
  const n = props.name;
  broken.value = false;
  if (!n) {
    src.value = '';
    return;
  }
  src.value = customMissing.value.has(n) ? defaultPath(n) : customPath(n);
});

function onError(): void {
  const n = props.name;
  if (!n) {
    broken.value = true;
    return;
  }
  if (src.value === customPath(n)) {
    // custom 不存在 → 缓存 + 回落到 default
    customMissing.value.add(n);
    src.value = defaultPath(n);
  }
  else {
    // default 也加载失败 → 兜底
    broken.value = true;
  }
}
</script>

<template>
  <img
    v-if="name && !broken"
    :src="src"
    alt=""
    class="w-3.5 h-3.5 shrink-0 select-none"
    draggable="false"
    aria-hidden="true"
    @error="onError"
  >
  <span
    v-else
    class="w-3.5 h-3.5 shrink-0 inline-flex items-center justify-center"
    aria-hidden="true"
  >
    <span class="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
  </span>
</template>
