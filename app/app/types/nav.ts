/**
 * 三块导航数据的领域类型。
 * 后端字段如果对不上，请在对应 composable 的 transform 里映射，而不是改这里。
 */

export interface Branding {
  title: string;
  subtitle?: string;
  shortName?: string;
  logo?: string;
  version?: string;
}

export interface BrandingResponse {
  title: string;
  subtitle?: string;
  shortName?: string;
  logo?: string;
  version?: string;
}

export interface TopMenuItem {
  key: string;
  label: string;
  path?: string;
  badge?: string | number;
  disabled?: boolean;
}

export interface TopMenuResponse {
  items: TopMenuItem[];
}

export interface SidebarMenuItem {
  key: string;
  label: string;
  icon?: string;
  path?: string;
  badge?: string | number;
  single?: boolean;
  disabled?: boolean;
  children?: SidebarMenuItem[];
}

export interface SidebarMenuResponse {
  items: SidebarMenuItem[];
}
