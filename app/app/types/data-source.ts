export type DataSourceMode = 'json' | 'api';

export interface DataSourceOptions<TRaw, T> {
  /** 缓存 / 去重 key（必填，建议与业务名一致） */
  key: string;
  /** JSON 模式下的相对路径（基于 runtimeConfig.public.mockBase） */
  jsonPath: string;
  /** API 模式下的相对路径（基于 runtimeConfig.public.apiBase） */
  apiPath: string;
  /** 请求参数。JSON 模式下不消费，仅作为契约预留 */
  params?: Record<string, unknown>;
  /** 适配器：把原始响应映射成内部领域模型；省略则原样透传 */
  transform?: (raw: TRaw) => T;
  /** 覆盖全局模式（默认读 runtimeConfig.public.dataSourceMode） */
  mode?: DataSourceMode;
  /** 是否立即拉取，默认 true */
  immediate?: boolean;
}
