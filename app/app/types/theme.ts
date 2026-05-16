/**
 * 主题 preset。
 * 切换 = 把 `<html class>` 换成 htmlClass，CSS @theme 变量重新解析。
 */
export interface Theme {
  /** 唯一 ID，写到 localStorage 的也是它 */
  key: string;
  /** 下拉里显示的名称 */
  label: string;
  /** 风格出处 / 一句话补充 */
  subtitle?: string;
  /** 下拉里渲染的 3 色 swatch（CSS 颜色字符串，hex / oklch 都行） */
  swatch: string[];
  /** 应用到 `<html>` 上的 class；'' = 默认主题 */
  htmlClass: string;
}

export interface ThemesResponse {
  default: string;
  items: Theme[];
}
