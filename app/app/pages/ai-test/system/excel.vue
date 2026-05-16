<script setup lang="ts">
import { flattenNav } from '~/utils/nav-flat';
import { parsePageCsv, SAMPLE_CSV, type ImportedPage, type ParseIssue } from '~/utils/csv-page-parser';

const route = useRoute();
const { items: navItems } = await useNav();
const flat = computed(() => flattenNav(navItems.value));
const current = computed(() => flat.value.find(i => i.path === route.path));
useHead({ title: () => current.value?.label ?? 'Excel 看板' });

/* —— 状态 —— */
const fileName = ref<string>('');
const rawText = ref<string>('');
const imported = ref<ImportedPage | null>(null);
const issues = ref<ParseIssue[]>([]);
const errorMsg = ref<string>('');
const dragging = ref<boolean>(false);

const hasResult = computed<boolean>(() => imported.value != null);

/* —— 模板下载 —— */
function downloadTemplate(filename = 'page-template.csv'): void {
  // 加 UTF-8 BOM，Excel 双击直接识别中文
  const blob = new Blob(['\uFEFF', SAMPLE_CSV], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function loadSample(): void {
  fileName.value = 'page-template.csv（内置示例）';
  rawText.value = SAMPLE_CSV;
  doParse(SAMPLE_CSV);
}

/* —— 解析 —— */
function doParse(text: string): void {
  errorMsg.value = '';
  try {
    const r = parsePageCsv(text);
    issues.value = r.issues;
    imported.value = r.data;
    if (!r.data || (r.data.metrics.groups.length === 0 && r.data.pilots.tabs.length === 0)) {
      errorMsg.value = '解析未得到任何数据，请检查文件段头（##METRICS / ##COLUMNS / ##ROWS）';
    }
  } catch (e) {
    imported.value = null;
    errorMsg.value = e instanceof Error ? e.message : String(e);
  }
}

async function onFile(file: File): Promise<void> {
  fileName.value = file.name;
  const isExcel = /\.xlsx?$/i.test(file.name);
  if (isExcel) {
    errorMsg.value = '检测到 Excel 文件：请在 Excel 中"另存为 CSV UTF-8 (.csv)"后再导入（当前内置解析器仅支持 CSV）';
    imported.value = null;
    return;
  }
  const text = await file.text();
  rawText.value = text;
  doParse(text);
}

function onFileInput(e: Event): void {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  if (f) void onFile(f);
}

function onDrop(e: DragEvent): void {
  e.preventDefault();
  dragging.value = false;
  const f = e.dataTransfer?.files?.[0];
  if (f) void onFile(f);
}

function onPaste(text: string): void {
  fileName.value = '（来自粘贴）';
  rawText.value = text;
  doParse(text);
}

function reset(): void {
  fileName.value = '';
  rawText.value = '';
  imported.value = null;
  issues.value = [];
  errorMsg.value = '';
}

/* —— 预览 —— */
const previewMetrics = computed(() => imported.value?.metrics ?? null);
const previewPilot = computed(() => imported.value?.pilots.tabs[0] ?? null);

function onDrill(key: string): void {
  console.log('drill:', key);
}
function onRowDetail(row: Record<string, unknown>): void {
  console.log('row detail:', row);
}
</script>

<template>
  <div>
    <ClientOnly>
      <!-- 顶部说明 + 操作 -->
      <section class="rounded-xl border border-ink-200/70 bg-surface px-5 py-4 shadow-[var(--shadow-card)]">
        <header class="flex items-center gap-2 mb-3">
          <span class="w-1 h-4 rounded-full bg-brand-500" />
          <h2 class="font-display text-[15px] font-semibold text-ink-900 tracking-tight">
            从 Excel / CSV 导入页面数据
          </h2>
          <div class="flex-1" />
          <button
            type="button"
            class="h-8 px-3 inline-flex items-center gap-1.5 rounded-md border border-brand-300 bg-brand-50 text-brand-700 text-[12px] font-medium hover:bg-brand-100 transition-colors"
            @click="downloadTemplate()"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10 3a1 1 0 0 1 1 1v8.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L9 12.586V4a1 1 0 0 1 1-1Z" />
              <path d="M3 16a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Z" />
            </svg>
            下载 CSV 模板
          </button>
          <button
            type="button"
            class="h-8 px-3 inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-surface text-ink-700 text-[12px] font-medium hover:bg-ink-50 transition-colors"
            @click="loadSample()"
          >
            载入示例
          </button>
        </header>

        <p class="text-[12.5px] text-ink-600 leading-relaxed">
          模板包含 4 段：
          <code class="px-1 py-0.5 rounded bg-ink-100 text-ink-800 text-[11.5px]">##META</code>
          <code class="ml-1 px-1 py-0.5 rounded bg-ink-100 text-ink-800 text-[11.5px]">##METRICS</code>
          <code class="ml-1 px-1 py-0.5 rounded bg-ink-100 text-ink-800 text-[11.5px]">##COLUMNS</code>
          <code class="ml-1 px-1 py-0.5 rounded bg-ink-100 text-ink-800 text-[11.5px]">##ROWS</code>
          。Excel 编辑后请用「另存为 → CSV UTF-8」保存；或直接编辑 CSV 文件后拖入下方区域。
        </p>
      </section>

      <!-- 上传区 -->
      <section class="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div
          :class="[
            'relative rounded-xl border-2 border-dashed transition-colors px-5 py-8 text-center bg-surface',
            dragging ? 'border-brand-500 bg-brand-50/60' : 'border-ink-200 hover:border-brand-300',
          ]"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop="onDrop"
        >
          <svg class="w-10 h-10 mx-auto text-brand-400 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <path d="M12 16V4M12 4l-4 4m4-4l4 4" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <p class="text-[13.5px] text-ink-800 font-medium">把 CSV 文件拖到此处</p>
          <p class="text-[12px] text-ink-500 mt-1">或点击下方按钮选择文件</p>
          <div class="mt-4 flex items-center justify-center gap-2">
            <label class="h-8 px-3 inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-surface text-ink-800 text-[12px] font-medium hover:bg-ink-50 cursor-pointer transition-colors">
              选择文件
              <input type="file" accept=".csv,.txt,text/csv" class="hidden" @change="onFileInput">
            </label>
            <button
              v-if="hasResult || rawText"
              type="button"
              class="h-8 px-3 inline-flex items-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 text-[12px] font-medium hover:bg-rose-100 transition-colors"
              @click="reset()"
            >
              清空
            </button>
          </div>
          <p v-if="fileName" class="mt-3 text-[11.5px] text-ink-500">
            当前文件：<span class="text-ink-800 font-medium">{{ fileName }}</span>
          </p>
        </div>

        <!-- 直接粘贴 -->
        <div class="rounded-xl border border-ink-200/70 bg-surface p-3 flex flex-col">
          <div class="text-[12px] text-ink-600 mb-1.5 font-medium">或粘贴 CSV 文本</div>
          <textarea
            v-model="rawText"
            placeholder="##META&#10;key,value&#10;title,我的页面&#10;&#10;##METRICS&#10;group_key,group_label,key,label,value,unit,mom,trend,description&#10;..."
            class="flex-1 min-h-[150px] w-full rounded-md border border-ink-200 px-2 py-1.5 text-[11.5px] font-mono leading-relaxed text-ink-800 bg-ink-50/40 outline-none focus:border-brand-400 focus:bg-surface resize-y"
            @blur="onPaste(rawText)"
          />
          <p class="mt-1.5 text-[10.5px] text-ink-400">粘贴后失焦自动解析</p>
        </div>
      </section>

      <!-- 错误 / Issues -->
      <section v-if="errorMsg || issues.length" class="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
        <div class="flex items-center gap-2 text-[12.5px] text-amber-800 font-medium">
          <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" />
          </svg>
          解析提示
        </div>
        <p v-if="errorMsg" class="mt-1 text-[12px] text-amber-900">{{ errorMsg }}</p>
        <ul v-if="issues.length" class="mt-1.5 space-y-1 text-[11.5px] text-amber-900 list-disc pl-5">
          <li v-for="(it, i) in issues" :key="i">
            [{{ it.section }} 第 {{ it.line }} 行] {{ it.message }}
          </li>
        </ul>
      </section>

      <!-- 预览 -->
      <section v-if="hasResult" class="mt-6">
        <div class="flex items-center gap-2 mb-3">
          <span class="w-1 h-4 rounded-full bg-emerald-500" />
          <h2 class="font-display text-[15px] font-semibold text-ink-900 tracking-tight">
            预览：{{ imported?.meta.title }}
          </h2>
          <span class="text-[11.5px] text-ink-500">
            {{ previewMetrics?.groups.length ?? 0 }} 组指标
            · {{ previewMetrics?.groups.reduce((s, g) => s + g.items.length, 0) ?? 0 }} 个卡片
            · {{ previewPilot?.rows.length ?? 0 }} 行表数据
          </span>
        </div>
        <p v-if="imported?.meta.subtitle" class="text-[12.5px] text-ink-600 mb-3">{{ imported.meta.subtitle }}</p>

        <div v-if="previewMetrics && previewMetrics.groups.length">
          <MetricsBox :metrics="previewMetrics" :title="imported?.meta.title" @drill="onDrill" />
        </div>

        <section v-if="previewPilot" class="mt-6">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-1 h-4 rounded-full bg-brand-500" />
            <h3 class="font-display text-[14px] font-semibold text-ink-900 tracking-tight">
              {{ previewPilot.label }}
            </h3>
          </div>
          <MultiLevelTable :data="previewPilot" @detail="onRowDetail" />
        </section>
      </section>

      <!-- 空态 -->
      <section v-else class="mt-6 rounded-xl border border-dashed border-ink-200 bg-ink-50/30 px-6 py-10 text-center">
        <p class="text-[13px] text-ink-500">导入或粘贴 CSV 后，此处会展示与「概览/通用 Agent」页面相同样式的预览。</p>
        <button
          type="button"
          class="mt-3 h-8 px-3 inline-flex items-center rounded-md border border-brand-300 bg-brand-50 text-brand-700 text-[12px] font-medium hover:bg-brand-100"
          @click="loadSample()"
        >
          先看一眼示例
        </button>
      </section>

      <template #fallback>
        <div class="space-y-4">
          <div class="h-32 rounded-xl border border-ink-200/70 bg-surface" />
          <div class="h-64 rounded-xl border border-ink-200/70 bg-surface" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
