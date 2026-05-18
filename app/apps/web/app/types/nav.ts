/**
 * 单一菜单树类型。
 * 顶部一级菜单 = 树的根节点。
 * 左侧侧栏 = 当前激活的根节点的 children（递归 2-3 层）。
 *
 * 后端字段对不上时，在 use-nav.ts 的 transform 里映射，而不是改这里。
 */
export interface NavItem {
  /** 唯一 key（路由匹配 + Vue key） */
  key: string;
  /** 菜单显示文案（默认中文兜底；当 locale 不在 label_i18n 时也用它） */
  label: string;
  /**
   * 各语言下的菜单文案。key 是 i18n locale 码（`zh-CN`、`en-US` 等），value 是显示文案。
   * 命中当前 locale → 用它；未命中 → 回落到 `label_i18n["zh-CN"]` → 最后回落到 `label`。
   * 见 `localizedLabel()`（composables/use-nav.ts）。
   */
  label_i18n?: Record<string, string>;
  /** 路由路径（叶子必填；非叶子可选） */
  path?: string;
  /** 图标名（预留，后期接 Iconify） */
  icon?: string;
  /** 角标 / 数字 */
  badge?: string | number;
  /** 标记为单页（顶部点了不展示侧栏） */
  single?: boolean;
  /** 禁用 */
  disabled?: boolean;
  /**
   * 第三方页面 URL（iframe 嵌入）。
   * 设了之后，访问该 path 时不渲染占位 page，而是渲染 EmbedFrame。
   * 注意：目标站点 X-Frame-Options / CSP frame-ancestors 限制无法被嵌入时会显示空白，
   * EmbedFrame 会提示用户在新窗口打开。
   */
  embed?: string;
  /**
   * iframe sandbox 白名单 token 列表（不设 = 默认 ['allow-scripts','allow-forms','allow-popups']）。
   * 完整可选 token 见 https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/iframe#sandbox
   * 设置 false 显式去除 sandbox（仅在你完全信任的内部子系统使用，例如自家 Excel 看板嵌入）。
   * 参考：README.md "如何为 iframe 嵌入加白名单"。
   */
  embedSandbox?: string[] | false;
  /** 子菜单（递归任意层） */
  children?: NavItem[];
}

export interface NavResponse {
  items: NavItem[];
}

/* 品牌信息（顶部 LOGO + 标题 + 版本号） */
export interface Branding {
  title: string;
  subtitle?: string;
  shortName?: string;
  logo?: string;
  version?: string;
}

export type BrandingResponse = Branding;
