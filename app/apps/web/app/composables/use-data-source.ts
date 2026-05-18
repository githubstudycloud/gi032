import type { DataSourceMode, DataSourceOptions } from '~/types/data-source';
import { unwrapEnvelope } from '~/utils/envelope';

/**
 * 用户覆盖路径的会话级"已确认缺失"集合：第一次试探 /user-data/<path> 返回 404 后记一笔，
 * 同会话里同一路径不再重复试探。详见 README：apps/web/public/user-data/README.md。
 */
const missingUserPaths = new Set<string>();

/**
 * 统一数据入口：现在读 public/mock 下的 JSON，未来切到后端只需改 runtimeConfig.public.dataSourceMode。
 *
 * JSON 模式下增加"用户自定义层"：先试 `${userDataBase}${jsonPath}`，404 则回落到 `${mockBase}${jsonPath}`。
 * 用户在 public/user-data/ 里放同名文件即可整文件替换，不动项目源 mock。
 *
 * 设计要点：
 * 1. params 始终保留 —— JSON 模式下不消费，仅在 API 模式下作为 query 透传，保证签名一致；
 * 2. transform 始终保留 —— 后端字段如果包含但形状对不上（包了 data/code、字段重命名等），
 *    在调用方写一个 transform 即可，业务代码不动；
 * 3. 返回的 data 是 transform 之后的内部模型；raw 是原始响应，调试用。
 */
export async function useDataSource<TRaw = unknown, T = TRaw>(
  opts: DataSourceOptions<TRaw, T>,
): Promise<{
  data: ComputedRef<T | null>;
  raw: Ref<TRaw | null>;
  error: Ref<unknown>;
  pending: Ref<boolean>;
  refresh: () => Promise<void>;
  mode: DataSourceMode;
  url: string;
}> {
  const cfg = useRuntimeConfig();
  const mode: DataSourceMode = opts.mode
    ?? (cfg.public.dataSourceMode as DataSourceMode)
    ?? 'json';

  const apiBase = (cfg.public.apiBase as string) ?? '';
  const mockBase = (cfg.public.mockBase as string) ?? '/mock';
  const userDataBase = (cfg.public.userDataBase as string) ?? '/user-data';

  const url = mode === 'api'
    ? `${apiBase}${opts.apiPath}`
    : `${mockBase}${opts.jsonPath}`;

  const { data, error, pending, refresh } = await useAsyncData<TRaw>(
    opts.key,
    async () => {
      if (mode === 'api') {
        const resp = await $fetch<unknown>(
          url,
          opts.params ? { query: opts.params } : undefined,
        );
        return unwrapEnvelope<TRaw>(resp);
      }

      // JSON 模式：先试 user-data，落空再读 mock。
      // 坑：Nuxt dev server 对不存在的静态文件不返回 404，而是返回 SPA fallback HTML 200。
      // 所以这里既要 catch 错误，也要校验响应形状（必须是 object/array），HTML 字符串视为缺失。
      const userUrl = `${userDataBase}${opts.jsonPath}`;
      if (!missingUserPaths.has(userUrl)) {
        try {
          const resp = await $fetch<unknown>(userUrl);
          if (resp && typeof resp === 'object') {
            return resp as TRaw;
          }
          // 拿到的不是 JSON 对象（多半是 SPA fallback HTML）→ 当缺失
          missingUserPaths.add(userUrl);
        }
        catch {
          // 标记为缺失，避免本会话内重复探测（user-data 文件用户也很少在运行时新增）
          missingUserPaths.add(userUrl);
        }
      }
      return (await $fetch<unknown>(`${mockBase}${opts.jsonPath}`)) as TRaw;
    },
    {
      immediate: opts.immediate ?? true,
      // 故意只在客户端拉：
      // - 避开 Nitro dev worker 在 Windows + Node 24 上的 OOM；
      // - 跟生产 CORS 模型一致（浏览器直连后端）。
      server: false,
    },
  );

  const transformed = computed<T | null>(() => {
    if (data.value == null) return null;
    const raw = data.value as TRaw;
    return opts.transform ? opts.transform(raw) : (raw as unknown as T);
  });

  return {
    data: transformed,
    raw: data as Ref<TRaw | null>,
    error: error as Ref<unknown>,
    pending,
    refresh: async (): Promise<void> => {
      await refresh();
    },
    mode,
    url,
  };
}
