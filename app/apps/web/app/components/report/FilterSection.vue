<script setup lang="ts">
/**
 * 筛选区：按 filter.kind 派发到具体子件。
 * 当前实装的 kind：date_range / flat_dropdown / text；其它 kind 占位（未来按需补）。
 * 通用：v-model 整个 filterState；查询 / 重置统一在底部。
 */
import type { FilterSpec } from '~/types/report-config';

const props = defineProps<{
  filters: FilterSpec[];
  modelValue: Record<string, unknown>;
}>();

const emit = defineEmits<{
  'update:modelValue': [v: Record<string, unknown>];
  search: [];
  reset: [];
}>();

function setValue(code: string, value: unknown): void {
  emit('update:modelValue', { ...props.modelValue, [code]: value });
}

/* —— 下拉选项的本地缓存（每个 filter 一份 source 数据） —— */
type OptionList = { value: string; label: string }[];
const dropdownOptions = reactive<Record<string, OptionList>>({});
const dropdownLoading = reactive<Record<string, boolean>>({});

async function ensureOptions(f: FilterSpec): Promise<void> {
  if (!f.source?.endpoint) return;
  if (dropdownOptions[f.code]) return;
  dropdownLoading[f.code] = true;
  try {
    // mock 路径或 api 路径自动切换
    const cfg = useRuntimeConfig();
    const mode = cfg.public.dataSourceMode;
    const base = mode === 'api' ? (cfg.public.apiBase as string) : (cfg.public.mockBase as string);
    // config.json 里 endpoint 形如 '/dropdowns/time-ranges'：
    //   json 模式 → 加 .json 后缀，base=mockBase（/mock）
    //   api  模式 → 加 /api 前缀（如果还没有），base=apiBase
    let ep = f.source.endpoint;
    if (mode === 'api' && !ep.startsWith('/api/')) ep = `/api${ep}`;
    const url = mode === 'json' && !ep.endsWith('.json') ? `${base}${ep}.json` : `${base}${ep}`;
    type EnvelopeShape = { code?: number; data?: { items?: OptionList } | OptionList };
    type RawShape = { items?: OptionList } | OptionList | EnvelopeShape;
    const raw = await $fetch<RawShape>(url).catch(() => null);
    let list: OptionList = [];
    if (Array.isArray(raw)) {
      list = raw;
    }
    else if (raw && typeof raw === 'object') {
      // 后端 envelope: { code, data: { items: [...] } | [...] }
      const envData = (raw as EnvelopeShape).data;
      if (envData !== undefined) {
        list = Array.isArray(envData) ? envData : (envData?.items ?? []);
      }
      else {
        list = (raw as { items?: OptionList }).items ?? [];
      }
    }
    dropdownOptions[f.code] = list;
  }
  catch {
    dropdownOptions[f.code] = [];
  }
  finally {
    dropdownLoading[f.code] = false;
  }
}

onMounted(() => {
  for (const f of props.filters) {
    if (f.kind === 'flat_dropdown' || f.kind === 'search_dropdown' || f.kind === 'multi_select') {
      void ensureOptions(f);
    }
  }
});

/* —— 取 v-model 的标量值（filterState[code] 是 unknown） —— */
function strVal(code: string): string {
  const v = props.modelValue[code];
  if (v && typeof v === 'object' && 'value' in v) return String((v as { value: unknown }).value ?? '');
  return v == null ? '' : String(v);
}
function setStrVal(code: string, v: string): void {
  // 跟 useReport 里 buildQueryParams 一致：标量直接存
  setValue(code, v);
}

function dateRangeFrom(code: string): string {
  const v = props.modelValue[code] as { from?: string; to?: string } | undefined;
  return v?.from ?? '';
}
function dateRangeTo(code: string): string {
  const v = props.modelValue[code] as { from?: string; to?: string } | undefined;
  return v?.to ?? '';
}
function setDateRange(code: string, key: 'from' | 'to', value: string): void {
  const cur = (props.modelValue[code] as { from?: string; to?: string } | undefined) ?? {};
  setValue(code, { ...cur, [key]: value });
}
</script>

<template>
  <section
    v-if="filters.length"
    class="rounded-xl border border-ink-200/70 bg-surface px-5 py-4 shadow-[var(--shadow-card)]"
  >
    <header class="flex items-center gap-2 mb-3">
      <span class="w-1 h-4 rounded-full bg-brand-500" />
      <h2 class="font-display text-[15px] font-semibold text-ink-900 tracking-tight">
        {{ $t('filters.title') }}
      </h2>
    </header>

    <div class="flex flex-wrap items-end gap-4">
      <label
        v-for="f in filters"
        :key="f.code"
        class="block text-sm flex-1 min-w-[180px] max-w-[280px]"
      >
        <span class="block text-ink-600 mb-1.5 text-[11px] font-medium tracking-wide uppercase">
          {{ f.label }}
          <span v-if="f.required" class="text-rose-600">*</span>
        </span>

        <!-- date_range：起止两个 date -->
        <div v-if="f.kind === 'date_range'" class="flex items-center gap-1">
          <input
            type="date"
            :value="dateRangeFrom(f.code)"
            class="flex-1 h-9 rounded-md border border-ink-200 px-2 text-[12.5px] bg-surface text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            @change="setDateRange(f.code, 'from', ($event.target as HTMLInputElement).value)"
          >
          <span class="text-ink-400 text-[12px]">~</span>
          <input
            type="date"
            :value="dateRangeTo(f.code)"
            class="flex-1 h-9 rounded-md border border-ink-200 px-2 text-[12.5px] bg-surface text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            @change="setDateRange(f.code, 'to', ($event.target as HTMLInputElement).value)"
          >
        </div>

        <!-- date_single：单个 date -->
        <input
          v-else-if="f.kind === 'date_single'"
          type="date"
          :value="strVal(f.code)"
          class="w-full h-9 rounded-md border border-ink-200 px-3 text-[13px] bg-surface text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          @change="setStrVal(f.code, ($event.target as HTMLInputElement).value)"
        >

        <!-- flat_dropdown / search_dropdown：单选下拉（mock 阶段先 native select） -->
        <select
          v-else-if="f.kind === 'flat_dropdown' || f.kind === 'search_dropdown'"
          :value="strVal(f.code)"
          class="w-full h-9 rounded-md border border-ink-200 px-3 text-[13px] bg-surface text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          @change="setStrVal(f.code, ($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="opt in dropdownOptions[f.code] ?? []"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>

        <!-- text -->
        <input
          v-else-if="f.kind === 'text'"
          type="search"
          :value="strVal(f.code)"
          :placeholder="f.placeholder"
          class="w-full h-9 rounded-md border border-ink-200 px-3 text-[13px] bg-surface text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          @input="setStrVal(f.code, ($event.target as HTMLInputElement).value)"
        >

        <!-- 其它 kind 占位：尚未实装 -->
        <div
          v-else
          class="w-full h-9 rounded-md border border-dashed border-ink-200 px-3 text-[12px] text-ink-400 inline-flex items-center"
        >
          {{ f.kind }}（pending）
        </div>
      </label>

      <div class="flex gap-2">
        <button
          type="button"
          class="h-9 px-4 rounded-md bg-brand-600 text-white text-[13px] font-medium hover:bg-brand-700 active:bg-brand-800 transition-colors shadow-[0_2px_6px_-1px_oklch(0.62_0.14_235/0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          @click="emit('search')"
        >
          {{ $t('common.search') }}
        </button>
        <button
          type="button"
          class="h-9 px-4 rounded-md border border-ink-200 bg-surface text-[13px] text-ink-700 hover:bg-ink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          @click="emit('reset')"
        >
          {{ $t('common.reset') }}
        </button>
      </div>
    </div>
  </section>
</template>
