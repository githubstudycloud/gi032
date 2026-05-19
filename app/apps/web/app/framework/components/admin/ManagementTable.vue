<script setup lang="ts">
/**
 * 通用「列表 + 筛选 + 新增/编辑/删除」管理表格。
 *
 * 配置驱动：传一个 `ManagementPageConfig` + 列表数据，组件自己渲染顶部筛选条 / 表格 / 弹窗表单。
 * 真后端时：分别打 list_endpoint / create_endpoint / ... 这几个 URL；mock 时父组件本地维护数据数组。
 *
 * 不支持的（保持简单）：
 *   - 多级表头（管理后台基本用单层；要多级请用 MultiLevelTable）
 *   - 排序 / 列筛选 / 行收藏（管理后台需求场景少；按需再加）
 *   - 服务端分页（mock 阶段用本地切片；接 API 时再做）
 */
import type {
  ManagementPageConfig, ManagementColumn, FormField,
} from '~/framework/types/management';

const { t } = useI18n();

type Row = Record<string, unknown>;

const props = defineProps<{
  config: ManagementPageConfig;
  /** 当前列表数据；父组件维护增删改的同步 */
  items: Row[];
  /** 真要打接口时由父组件实现；mock 时父组件改 items */
  loading?: boolean;
}>();

const emit = defineEmits<{
  create: [row: Row];
  update: [id: string, patch: Row];
  delete: [id: string];
  /** 筛选 / 翻页变化，父组件需要时可用 */
  query: [params: { filter: Row; page: number; page_size: number }];
}>();

/* —— 筛选状态 —— */
const filterState = ref<Row>({});
function setFilter(code: string, value: unknown): void {
  filterState.value = { ...filterState.value, [code]: value };
}

/* —— 本地筛选 + 分页（mock 阶段；接 API 后这层在父组件之外） —— */
const PAGE_SIZE = 10;
const currentPage = ref<number>(1);
watch(filterState, () => {
  currentPage.value = 1;
}, { deep: true });

const filteredRows = computed<Row[]>(() => {
  const q = (filterState.value.q as string | undefined)?.trim().toLowerCase();
  return props.items.filter((r) => {
    for (const f of props.config.filters) {
      const v = filterState.value[f.code];
      if (v === undefined || v === '' || v === null) continue;
      if (Array.isArray(v) && v.length === 0) continue;
      if (f.code === 'q' && q) {
        // q：搜 id + name + description
        const blob = [r.id, r.name, r.description].filter(Boolean).join(' ').toLowerCase();
        if (!blob.includes(q)) return false;
      }
      else if (Array.isArray(v)) {
        if (!v.includes(String(r[f.code]))) return false;
      }
      else if (String(r[f.code]) !== String(v)) {
        return false;
      }
    }
    return true;
  });
});
const totalPages = computed<number>(
  () => Math.max(1, Math.ceil(filteredRows.value.length / PAGE_SIZE)),
);
const pagedRows = computed<Row[]>(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return filteredRows.value.slice(start, start + PAGE_SIZE);
});
function goPrev(): void {
  if (currentPage.value > 1) currentPage.value -= 1;
}
function goNext(): void {
  if (currentPage.value < totalPages.value) currentPage.value += 1;
}

/* —— 弹窗（新增 / 编辑） —— */
const formOpen = ref<boolean>(false);
const formMode = ref<'create' | 'edit'>('create');
const formData = ref<Row>({});
const formError = ref<string>('');

function defaultFor(field: FormField): unknown {
  if (field.default !== undefined) return field.default;
  if (field.kind === 'text' || field.kind === 'textarea') return '';
  if (field.kind === 'number') return 0;
  if (field.kind === 'enum_chips') return [];
  return field.options?.[0]?.value ?? '';
}

function openCreate(): void {
  formMode.value = 'create';
  formData.value = Object.fromEntries(props.config.form_fields.map(f => [f.code, defaultFor(f)]));
  formError.value = '';
  formOpen.value = true;
}
function openEdit(row: Row): void {
  formMode.value = 'edit';
  formData.value = { ...row };
  formError.value = '';
  formOpen.value = true;
}

function isFieldVisible(field: FormField): boolean {
  if (!field.visible_if) return true;
  for (const [k, expect] of Object.entries(field.visible_if)) {
    if (formData.value[k] !== expect) return false;
  }
  return true;
}

function submitForm(): void {
  // 必填校验
  for (const f of props.config.form_fields) {
    if (!isFieldVisible(f)) continue;
    if (f.required && (formData.value[f.code] === '' || formData.value[f.code] == null)) {
      formError.value = t('management.requiredError', { field: f.label });
      return;
    }
  }
  if (formMode.value === 'create') {
    emit('create', { ...formData.value });
  }
  else {
    const id = String(formData.value[props.config.primary_key]);
    emit('update', id, { ...formData.value });
  }
  formOpen.value = false;
}

/* —— 删除确认 —— */
const confirmDelete = ref<Row | null>(null);
function askDelete(row: Row): void {
  confirmDelete.value = row;
}
function doDelete(): void {
  if (!confirmDelete.value) return;
  emit('delete', String(confirmDelete.value[props.config.primary_key]));
  confirmDelete.value = null;
}

/* —— 单元格渲染辅助 —— */
function badgeClass(col: ManagementColumn, value: unknown): string {
  if (col.display?.kind !== 'badge') return '';
  const c = col.display.color_map?.[String(value)] ?? 'ink';
  const map: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
    brand: 'bg-brand-50   text-brand-700   ring-brand-200/60',
    amber: 'bg-amber-50   text-amber-700   ring-amber-200/60',
    rose: 'bg-rose-50    text-rose-700    ring-rose-200/60',
    sky: 'bg-sky-50     text-sky-700     ring-sky-200/60',
    violet: 'bg-violet-50  text-violet-700  ring-violet-200/60',
    ink: 'bg-ink-100    text-ink-700     ring-ink-200/60',
  };
  return map[c] ?? map.ink!;
}

function formatDatetime(v: unknown): string {
  if (!v) return '—';
  return String(v).slice(0, 16);
}
</script>

<template>
  <div>
    <!-- 页面标题已在左侧菜单 + 顶部 tab 显示，这里不再重复渲染；新增按钮挪到筛选条右侧。 -->

    <!-- 筛选条 -->
    <section
      v-if="config.filters.length"
      class="rounded-xl border border-ink-200/70 bg-surface px-4 py-3 mb-4 shadow-[var(--shadow-card)] flex flex-wrap items-end gap-3"
    >
      <label
        v-for="f in config.filters"
        :key="f.code"
        class="block text-sm flex-1 min-w-[180px] max-w-[280px]"
      >
        <span class="block text-ink-600 mb-1.5 text-[11px] font-medium tracking-wide uppercase">{{ f.label }}</span>

        <input
          v-if="f.kind === 'text'"
          :value="(filterState[f.code] as string) ?? ''"
          type="search"
          :placeholder="f.placeholder"
          class="w-full h-9 rounded-md border border-ink-200 px-3 text-[13px] bg-surface text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          @input="setFilter(f.code, ($event.target as HTMLInputElement).value)"
        >

        <div v-else-if="f.kind === 'enum_chips'" class="flex flex-wrap gap-1.5">
          <button
            v-for="opt in f.options"
            :key="opt.value"
            type="button"
            :class="[
              'h-7 px-2.5 rounded-md border text-[12.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
              (filterState[f.code] as string[] ?? []).includes(opt.value)
                ? 'bg-brand-50 border-brand-300 text-brand-700'
                : 'bg-surface border-ink-200 text-ink-700 hover:border-brand-300',
            ]"
            @click="() => {
              const cur = ((filterState[f.code] as string[]) ?? []).slice();
              const i = cur.indexOf(opt.value);
              if (i >= 0) cur.splice(i, 1); else cur.push(opt.value);
              setFilter(f.code, cur);
            }"
          >{{ opt.label }}</button>
        </div>
      </label>

      <div class="flex gap-2">
        <button
          v-if="Object.values(filterState).some(v => v && (!Array.isArray(v) || v.length))"
          type="button"
          class="h-9 px-3 rounded-md border border-ink-200 bg-surface text-[12.5px] text-ink-700 hover:bg-ink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          @click="filterState = {}"
        >
          {{ t('common.clearFilters') }}
        </button>
        <button
          v-if="config.can_create"
          type="button"
          class="h-9 px-4 rounded-md bg-brand-600 text-white text-[13px] font-medium hover:bg-brand-700 active:bg-brand-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          @click="openCreate"
        >
          + {{ t('common.create') }}
        </button>
      </div>
    </section>

    <!-- 表格 -->
    <section class="rounded-xl border border-ink-200/70 bg-surface overflow-hidden shadow-[var(--shadow-card)]">
      <div class="overflow-x-auto">
        <table class="text-[13px] border-collapse" style="width: max-content; min-width: 100%">
          <thead class="bg-ink-50/70 text-ink-700">
            <tr>
              <th
                v-for="col in config.columns"
                :key="col.code"
                :style="{ width: col.width }"
                :class="[
                  'px-3 py-2.5 text-[12px] font-semibold tracking-wide whitespace-nowrap border-b border-ink-200/60',
                  col.align === 'left' ? 'text-left' : col.align === 'right' ? 'text-right' : 'text-left',
                ]"
              >
                {{ col.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in pagedRows"
              :key="String(row[config.primary_key] ?? i)"
              :class="['border-b border-ink-100/80 last:border-b-0 hover:bg-brand-50/40 transition-colors', i % 2 ? 'bg-ink-50/30' : '']"
            >
              <td
                v-for="col in config.columns"
                :key="col.code"
                :class="['px-3 py-2.5 whitespace-nowrap', col.align === 'right' ? 'text-right' : 'text-left']"
              >
                <template v-if="col.cellType === 'row_actions'">
                  <button
                    v-if="config.can_edit && col.actions?.includes('edit')"
                    type="button"
                    class="inline-flex items-center px-2 py-0.5 rounded-md text-brand-700 hover:bg-brand-50 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                    @click="openEdit(row)"
                  >
                    {{ t('common.edit') }}
                  </button>
                  <button
                    v-if="config.can_delete && col.actions?.includes('delete')"
                    type="button"
                    class="ml-1 inline-flex items-center px-2 py-0.5 rounded-md text-rose-700 hover:bg-rose-50 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                    @click="askDelete(row)"
                  >
                    {{ t('common.delete') }}
                  </button>
                </template>
                <template v-else-if="col.display?.kind === 'badge'">
                  <span
                    :class="['inline-flex items-center px-2 py-0.5 rounded-md text-[11.5px] font-medium ring-1 ring-inset', badgeClass(col, row[col.code])]"
                  >{{ row[col.code] }}</span>
                </template>
                <template v-else-if="col.display?.kind === 'datetime'">
                  <span class="text-ink-700 tabular-nums">{{ formatDatetime(row[col.code]) }}</span>
                </template>
                <template v-else>
                  <span :class="row[col.code] === undefined || row[col.code] === '' ? 'text-ink-400' : 'text-ink-900'">
                    {{ row[col.code] ?? '—' }}
                  </span>
                </template>
              </td>
            </tr>
            <tr v-if="!pagedRows.length">
              <td :colspan="config.columns.length" class="text-center py-12 text-ink-500 text-[13px]">
                {{ loading ? t('common.loading') : t('table.noMatchData') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="border-t border-ink-100 px-4 py-2.5 flex items-center justify-end gap-3 text-[12px] text-ink-600">
        <span>{{ t('management.pageRangeTotal', { total: filteredRows.length, pageSize: PAGE_SIZE }) }}</span>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="h-7 w-7 rounded border border-ink-200 bg-surface hover:bg-ink-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            :disabled="currentPage <= 1"
            :aria-label="t('table.pagePrev')"
            @click="goPrev"
          >
            ‹
          </button>
          <span class="px-2 tabular-nums">{{ currentPage }} / {{ totalPages }}</span>
          <button
            type="button"
            class="h-7 w-7 rounded border border-ink-200 bg-surface hover:bg-ink-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            :disabled="currentPage >= totalPages"
            :aria-label="t('table.pageNext')"
            @click="goNext"
          >
            ›
          </button>
        </div>
      </footer>
    </section>

    <!-- 表单弹窗 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="formOpen"
          class="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          @click.self="formOpen = false"
        >
          <div class="bg-surface rounded-xl border border-ink-200 shadow-2xl w-[560px] max-w-[95vw] max-h-[85vh] flex flex-col overflow-hidden">
            <header class="px-5 py-3 border-b border-ink-100 flex items-center gap-2">
              <span class="w-1 h-4 rounded-full bg-brand-500" />
              <h2 class="font-display text-[15px] font-semibold text-ink-900">
                {{ formMode === 'create' ? t('management.createTitle', { entity: config.title }) : t('management.editTitle', { entity: config.title }) }}
              </h2>
              <div class="flex-1" />
              <button
                type="button"
                class="w-7 h-7 inline-flex items-center justify-center rounded text-ink-500 hover:text-ink-900 hover:bg-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                :aria-label="t('common.close')"
                @click="formOpen = false"
              >
                ×
              </button>
            </header>

            <div class="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <p v-if="formError" class="text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2 text-[12.5px]">
                {{ formError }}
              </p>

              <label
                v-for="f in config.form_fields.filter(isFieldVisible)"
                :key="f.code"
                class="block"
              >
                <span class="block text-[12px] font-medium text-ink-700 mb-1">
                  {{ f.label }}
                  <span v-if="f.required" class="text-rose-600">*</span>
                </span>

                <input
                  v-if="f.kind === 'text'"
                  :value="(formData[f.code] as string) ?? ''"
                  type="text"
                  :placeholder="f.placeholder"
                  :readonly="formMode === 'edit' && f.readonly_on_edit"
                  :class="[
                    'w-full h-9 rounded-md border px-3 text-[13px] bg-surface text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100',
                    formMode === 'edit' && f.readonly_on_edit ? 'border-ink-150 bg-ink-50/60 text-ink-600 cursor-not-allowed' : 'border-ink-200',
                  ]"
                  @input="formData[f.code] = ($event.target as HTMLInputElement).value"
                >

                <textarea
                  v-else-if="f.kind === 'textarea'"
                  :value="(formData[f.code] as string) ?? ''"
                  :placeholder="f.placeholder"
                  :rows="f.rows ?? 3"
                  class="w-full rounded-md border border-ink-200 px-3 py-2 text-[13px] bg-surface text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 resize-y"
                  @input="formData[f.code] = ($event.target as HTMLTextAreaElement).value"
                />

                <div v-else-if="f.kind === 'enum_radio'" class="flex flex-wrap gap-1.5">
                  <button
                    v-for="opt in f.options"
                    :key="opt.value"
                    type="button"
                    :class="[
                      'h-8 px-3 rounded-md border text-[12.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
                      formData[f.code] === opt.value
                        ? 'bg-brand-50 border-brand-300 text-brand-700 font-medium'
                        : 'bg-surface border-ink-200 text-ink-700 hover:border-brand-300',
                    ]"
                    @click="formData[f.code] = opt.value"
                  >{{ opt.label }}</button>
                </div>

                <p v-if="f.help" class="mt-1 text-[11.5px] text-ink-500">{{ f.help }}</p>
              </label>
            </div>

            <footer class="px-5 py-3 border-t border-ink-100 bg-ink-50/40 flex justify-end gap-2">
              <button
                type="button"
                class="h-9 px-4 rounded-md border border-ink-200 bg-surface text-[13px] text-ink-700 hover:bg-ink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                @click="formOpen = false"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                type="button"
                class="h-9 px-4 rounded-md bg-brand-600 text-white text-[13px] font-medium hover:bg-brand-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                @click="submitForm"
              >
                {{ t('common.save') }}
              </button>
            </footer>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 删除确认 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="confirmDelete"
          class="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          @click.self="confirmDelete = null"
        >
          <div class="bg-surface rounded-xl border border-ink-200 shadow-2xl w-[420px] max-w-[95vw] p-5">
            <h3 class="font-display text-[15px] font-semibold text-ink-900 mb-2">
              {{ t('management.confirmDelete') }}
            </h3>
            <p class="text-[13px] text-ink-700 leading-relaxed">
              {{ t('management.confirmDeleteHint', { id: String(confirmDelete[config.primary_key]) }) }}
            </p>
            <div class="mt-4 flex justify-end gap-2">
              <button
                type="button"
                class="h-9 px-4 rounded-md border border-ink-200 bg-surface text-[13px] text-ink-700 hover:bg-ink-100"
                @click="confirmDelete = null"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                type="button"
                class="h-9 px-4 rounded-md bg-rose-600 text-white text-[13px] font-medium hover:bg-rose-700"
                @click="doDelete"
              >
                {{ t('common.delete') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
