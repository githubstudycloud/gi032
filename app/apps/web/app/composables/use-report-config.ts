import type { ReportConfig } from '~/types/report-config';
import { ReportConfigSchema } from '~/types/report-schemas';
import { getDefaultConfig } from '~/business/reports/registry';
import { mergeAll } from '~/utils/deep-merge';
import { looksLikeOverlayJson } from '~/composables/use-data-source';
import { unwrapEnvelope } from '~/utils/envelope';

/**
 * 安全 fetch —— Nuxt dev server 对不存在的静态文件返回 SPA fallback HTML 而非 404，
 * 所以用 `looksLikeOverlayJson` 判定真正的 JSON 响应，其它一律视为缺失。
 */
async function tryFetch(url: string): Promise<unknown | null> {
  try {
    const resp = await $fetch<unknown>(url);
    return looksLikeOverlayJson(resp) ? resp : null;
  }
  catch {
    return null;
  }
}

/**
 * 三层 config 合并读报表配置：default → user → api (右侧优先)。
 *
 * - **Layer 1 Default**（前端内置）：`~/business/reports/<type>/default-config.ts`
 *   通过 `getDefaultConfig(reportType)` 注册。未注册的 type 退化为两层。
 * - **Layer 2 User**（用户覆盖）：`/user-data/reports/<type>/config.json` 存在则
 *   字段级覆盖 default。详见 `apps/web/public/user-data/README.md`。
 * - **Layer 3 API**（接口权威，生产环境）：JSON 模式读 `/mock/reports/<type>/config.json`，
 *   API 模式读 `/api/reports/<type>/config`（envelope 自动 unwrap）。覆盖前两层。
 *
 * 调试切到 user 优先（覆盖 API）请用 URL 参数 `?config_override=user`（待 Phase 5.5 实现）。
 *
 * 合并完成后走 `ReportConfigSchema.parse()` 做 Zod 严格校验；
 * 任何字段漂移会进入 `error` 状态，避免坏数据传到 UI。
 */
export async function useReportConfig(reportType: string): Promise<{
  config: ComputedRef<ReportConfig | null>;
  error: Ref<unknown>;
  pending: Ref<boolean>;
  refresh: () => Promise<void>;
}> {
  const cfg = useRuntimeConfig();
  const mode = (cfg.public.dataSourceMode as 'json' | 'api') ?? 'json';
  const apiBase = (cfg.public.apiBase as string) ?? '';
  const mockBase = (cfg.public.mockBase as string) ?? '/mock';
  const userDataBase = (cfg.public.userDataBase as string) ?? '/user-data';

  const apiOrMockUrl = mode === 'api'
    ? `${apiBase}/api/reports/${reportType}/config`
    : `${mockBase}/reports/${reportType}/config.json`;
  const userUrl = `${userDataBase}/reports/${reportType}/config.json`;

  // Layer 1：default 同步导入，不进 useAsyncData
  const defaultLayer = getDefaultConfig(reportType);

  const { data, error, pending, refresh } = await useAsyncData<ReportConfig>(
    `report-config:${reportType}`,
    async () => {
      // Layer 2：可选
      const userLayer = await tryFetch(userUrl);

      // Layer 3：API 模式 unwrap envelope，JSON 模式直接是 config
      const apiRaw = await tryFetch(apiOrMockUrl);
      const apiLayer = apiRaw != null && mode === 'api'
        ? unwrapEnvelope<unknown>(apiRaw)
        : apiRaw;

      // 三层依次合并（右侧覆盖左侧）
      const merged = mergeAll(defaultLayer, userLayer, apiLayer);

      // Zod 严格校验 —— 协议漂移在这里立即抛错
      return ReportConfigSchema.parse(merged) as ReportConfig;
    },
    { server: false, immediate: true },
  );

  const config = computed<ReportConfig | null>(() => data.value ?? null);

  return {
    config,
    error: error as Ref<unknown>,
    pending,
    refresh: async (): Promise<void> => {
      await refresh();
    },
  };
}
