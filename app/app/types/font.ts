/**
 * 字体预设。
 *
 * - `key`：内部标识符（'system' / 'noto' / 'lxgw' / 'playfair'）
 * - `htmlClass`：挂在 <html> 上触发 main.css 里 `html.font-xxx` 块的 CSS 覆盖；
 *   默认（system）走空字符串，跟 theme 的 htmlClass 用法一致
 * - `body` / `display` / `mono`：实际 font-family 栈，仅用于"预览态"展示卡片，
 *   真正生效的是 main.css 里 `html.font-xxx { --font-body: ... }` 的 token 覆盖
 * - `stylesheets`：可选，需要从 Google Fonts / jsdelivr 等 CDN 加载的 <link rel="stylesheet"> URL；
 *   `useHead` 会在切到该 preset 时动态注入；系统字体预设不需要
 */
export interface FontPreset {
  key: string;
  label: string;
  subtitle?: string;
  htmlClass: string;
  /** 卡片预览字（"运营看板"等） */
  preview: string;
  /** 仅供切换器卡片预览用 —— 实际生效用 CSS token */
  body: string;
  display: string;
  mono: string;
  stylesheets?: string[];
}

export interface FontsResponse {
  default: string;
  items: FontPreset[];
}
