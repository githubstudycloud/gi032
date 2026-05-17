<script setup lang="ts">
/**
 * 通用 tab 切换条：可访问性 + 键盘左右切换 + 自动激活下划线。
 *
 * 用法：
 *   <TabStrip
 *     v-model="activeKey"
 *     :tabs="pilots.tabs"           // 任何 { key, label } 形状
 *     :aria-label="'明细分组'"
 *   />
 *   <div :id="`panel-${activeKey}`" role="tabpanel" :aria-labelledby="`tab-${activeKey}`">
 *     ...内容...
 *   </div>
 */
interface TabLike {
  key: string;
  label: string;
}

const props = defineProps<{
  modelValue: string;
  tabs: TabLike[];
  ariaLabel?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [v: string];
}>();

const tabBtns = ref<HTMLButtonElement[]>([]);

function select(key: string): void {
  if (key !== props.modelValue) emit('update:modelValue', key);
}

function onKeydown(e: KeyboardEvent, idx: number): void {
  const last = props.tabs.length - 1;
  let nextIdx = idx;
  if (e.key === 'ArrowRight') nextIdx = idx === last ? 0 : idx + 1;
  else if (e.key === 'ArrowLeft') nextIdx = idx === 0 ? last : idx - 1;
  else if (e.key === 'Home') nextIdx = 0;
  else if (e.key === 'End') nextIdx = last;
  else return;
  e.preventDefault();
  const next = props.tabs[nextIdx];
  if (next) {
    select(next.key);
    nextTick(() => tabBtns.value[nextIdx]?.focus());
  }
}
</script>

<template>
  <div
    role="tablist"
    :aria-label="ariaLabel"
    class="flex items-center gap-1 border-b border-ink-200/60"
  >
    <button
      v-for="(t, i) in tabs"
      :id="`tab-${t.key}`"
      :key="t.key"
      :ref="(el) => { if (el) tabBtns[i] = el as HTMLButtonElement }"
      type="button"
      role="tab"
      :aria-selected="modelValue === t.key"
      :aria-controls="`panel-${t.key}`"
      :tabindex="modelValue === t.key ? 0 : -1"
      :class="[
        'relative h-9 px-4 inline-flex items-center text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 rounded-t',
        modelValue === t.key ? 'text-brand-700' : 'text-ink-600 hover:text-ink-900',
      ]"
      @click="select(t.key)"
      @keydown="(e) => onKeydown(e, i)"
    >
      {{ t.label }}
      <span
        v-if="modelValue === t.key"
        class="absolute left-3 right-3 -bottom-px h-[2.5px] bg-brand-600 rounded-t-full"
        aria-hidden="true"
      />
    </button>
  </div>
</template>
