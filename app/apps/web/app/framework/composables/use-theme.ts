import type { Theme, ThemesResponse } from '~/framework/types/theme';

const STORAGE_KEY = 'ops-dashboard:theme';

/**
 * 主题切换 composable。
 *
 * localStorage 里直接存 **htmlClass 完整字符串**（'' / 'theme-business' / 'theme-ant'），
 * 而不是 key —— 这样 nuxt.config.ts 里的 FOUC inline script 可以直接赋值，
 * 不用知道 key → htmlClass 的映射规则（那是异步从 themes.json 来的）。
 *
 * 暴露 activeKey 给 UI 渲染当前选中态。
 */
export async function useTheme(): Promise<{
  themes: ComputedRef<Theme[]>;
  activeKey: ComputedRef<string>;
  activeTheme: ComputedRef<Theme | null>;
  setTheme: (key: string) => void;
}> {
  const ds = await useDataSource<ThemesResponse, ThemesResponse>({
    key: 'themes',
    jsonPath: '/themes.json',
    apiPath: '/api/themes',
    transform: (raw): ThemesResponse => raw,
  });

  const themes = computed<Theme[]>(() => ds.data.value?.items ?? []);
  const defaultKey = computed<string>(() => ds.data.value?.default ?? 'minimal');

  // 跨组件共享：当前 htmlClass（不是 key）。
  const activeCls = useState<string>('active-theme-cls', () => {
    if (import.meta.server) return '';
    try {
      return localStorage.getItem(STORAGE_KEY) ?? '';
    }
    catch {
      return '';
    }
  });

  const activeTheme = computed<Theme | null>(
    () => themes.value.find(t => t.htmlClass === activeCls.value) ?? null,
  );

  const activeKey = computed<string>(() => activeTheme.value?.key ?? defaultKey.value);

  function setTheme(key: string): void {
    const theme = themes.value.find(t => t.key === key);
    const cls = theme?.htmlClass ?? '';
    activeCls.value = cls;
    if (!import.meta.client) return;

    // 用 classList 而不是 className = 直接赋值，避免清掉 font-xxx 等其它正交类。
    const html = document.documentElement;
    Array.from(html.classList).forEach((c) => {
      if (c.startsWith('theme-')) html.classList.remove(c);
    });
    if (cls) html.classList.add(cls);
    try {
      localStorage.setItem(STORAGE_KEY, cls);
    }
    catch {
      // localStorage 可能被禁 / 配额满；切换仍生效到下次刷新
    }
  }

  // themes 加载后，如果当前 localStorage 里存的 cls 不在 preset 列表里（被删了或者旧 key），
  // 回退到 default 并把 localStorage 也修正掉。
  watch([themes, activeCls], ([list, cls]) => {
    if (!list.length) return;
    if (cls === '') return; // 默认主题，无需校验
    if (!list.find(t => t.htmlClass === cls)) {
      setTheme(defaultKey.value);
    }
  }, { immediate: true });

  return {
    themes,
    activeKey,
    activeTheme,
    setTheme,
  };
}
