import type { Branding, BrandingResponse } from '~/framework/types/nav';

/**
 * 左侧顶部"运营看板"大标题 + LOGO + 版本号。
 * 后端切换时：把 jsonPath 切成实际接口路径，按需补 transform。
 */
export async function useBranding(params?: { tenantId?: string }): Promise<{
  branding: ComputedRef<Branding | null>;
  raw: Ref<BrandingResponse | null>;
  error: Ref<unknown>;
  pending: Ref<boolean>;
  refresh: () => Promise<void>;
}> {
  const ds = await useDataSource<BrandingResponse, Branding>({
    key: 'branding',
    jsonPath: '/branding.json',
    apiPath: '/api/branding',
    params,
    // 当前 JSON 形状即领域形状 —— 后端字段不一致时改这里。
    // 例如后端返回 { code, data: { name, ... } } 时：
    //   transform: (raw: any) => ({ title: raw.data.name, subtitle: raw.data.desc, ... })
    transform: (raw): Branding => ({
      title: raw.title,
      subtitle: raw.subtitle,
      shortName: raw.shortName,
      logo: raw.logo,
      version: raw.version,
    }),
  });

  return {
    branding: ds.data,
    raw: ds.raw,
    error: ds.error,
    pending: ds.pending,
    refresh: ds.refresh,
  };
}
