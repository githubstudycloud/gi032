import type { FontPreset, FontsResponse } from '~/framework/types/font';

const STORAGE_KEY = 'ops-dashboard:font';

/**
 * 字体切换 composable —— 跟 useTheme 同形，但和 theme 是正交的：
 * theme 控制颜色 / 阴影 / 圆角 token，font 控制 --font-body / --font-display / --font-mono token。
 *
 * localStorage 存的是 **完整 htmlClass 字符串**（'' / 'font-noto' / 'font-lxgw' / ...），
 * FOUC inline script 直接读出来挂到 <html>，零拼接。
 *
 * 切到非 system 预设时，通过 useHead 注入 <link rel="stylesheet">（Google Fonts / jsdelivr CDN），
 * 用 `font-display: swap` 保证不阻塞首屏；切回 system 时由 useHead 反向移除。
 */
export async function useFont(): Promise<{
  fonts: ComputedRef<FontPreset[]>;
  activeKey: ComputedRef<string>;
  activeFont: ComputedRef<FontPreset | null>;
  setFont: (key: string) => void;
}> {
  const ds = await useDataSource<FontsResponse, FontsResponse>({
    key: 'fonts',
    jsonPath: '/fonts.json',
    apiPath: '/api/fonts',
    transform: (raw): FontsResponse => raw,
  });

  const fonts = computed<FontPreset[]>(() => ds.data.value?.items ?? []);
  const defaultKey = computed<string>(() => ds.data.value?.default ?? 'system');

  const activeCls = useState<string>('active-font-cls', () => {
    if (import.meta.server) return '';
    try {
      return localStorage.getItem(STORAGE_KEY) ?? '';
    }
    catch {
      return '';
    }
  });

  const activeFont = computed<FontPreset | null>(
    () => fonts.value.find(f => f.htmlClass === activeCls.value) ?? null,
  );

  const activeKey = computed<string>(() => activeFont.value?.key ?? defaultKey.value);

  function setFont(key: string): void {
    const font = fonts.value.find(f => f.key === key);
    const cls = font?.htmlClass ?? '';
    activeCls.value = cls;
    if (!import.meta.client) return;

    const html = document.documentElement;
    Array.from(html.classList).forEach((c) => {
      if (c.startsWith('font-')) html.classList.remove(c);
    });
    if (cls) html.classList.add(cls);
    try {
      localStorage.setItem(STORAGE_KEY, cls);
    }
    catch {
      // localStorage 可能被禁
    }
  }

  // 切回到 default 时清掉外链 stylesheet；切到 web font preset 时注入。
  // useHead 是响应式的：当 activeFont 变化时会自动 diff。
  useHead(computed(() => {
    const stylesheets = activeFont.value?.stylesheets ?? [];
    return {
      link: [
        ...(stylesheets.length
          ? [
              { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
              { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' as const },
              { rel: 'preconnect', href: 'https://cdn.jsdelivr.net', crossorigin: 'anonymous' as const },
            ]
          : []),
        ...stylesheets.map(href => ({ rel: 'stylesheet', href })),
      ],
    };
  }));

  // 校验：localStorage 里存的 cls 不在 preset 里（被删了 / 旧 key），回退到 default
  watch([fonts, activeCls], ([list, cls]) => {
    if (!list.length) return;
    if (cls === '') return;
    if (!list.find(f => f.htmlClass === cls)) {
      setFont(defaultKey.value);
    }
  }, { immediate: true });

  return {
    fonts,
    activeKey,
    activeFont,
    setFont,
  };
}
