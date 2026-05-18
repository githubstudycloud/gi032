import tailwindcss from '@tailwindcss/vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  modules: [
    '@vueuse/nuxt',
    '@nuxt/eslint',
    '@nuxtjs/i18n',
    // @pinia/nuxt 暂未启用 —— 当前还没用到 Pinia；0.6.1 跟 Pinia 3 不兼容，
    // SSR payload plugin 会炸 obj.hasOwnProperty。等真用 store 再升级到 0.11+ 再加回。
  ],

  // 让 components/layout/AppTopBar.vue 直接以 <AppTopBar /> 引用，
  // 默认 Nuxt 4 会带目录前缀（LayoutAppTopBar），我们用扁平命名。
  components: [
    { path: '~/components', pathPrefix: false },
  ],

  devtools: { enabled: true },

  app: {
    head: {
      title: '运营看板',
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        // SEO baseline。Lighthouse "Document does not have a meta description" fix。
        { name: 'description', content: '运营看板：聚合 AI 测试运营全链路指标（核心指标 / 产业 / 领域 / 设计 / 代码生成），统一可下钻、可对比、可配置的内部看板。' },
        { name: 'theme-color', content: '#0066cc' },
      ],
      // FOUC 防护：HTML 解析阶段就把 theme + font class 同时设好，避免刷新闪默认样式。
      // 两个 localStorage 都存的是完整 htmlClass 字符串（'' / 'theme-business' / 'font-noto' 等），
      // 在这里直接拼接成 className（零映射，跟 use-theme.ts / use-font.ts 的写入对齐）。
      script: [
        {
          tagPosition: 'head',
          innerHTML:
            '(function(){try{' +
            'var t=localStorage.getItem("ops-dashboard:theme")||"";' +
            'var f=localStorage.getItem("ops-dashboard:font")||"";' +
            'var cls=[t,f].filter(Boolean).join(" ");' +
            'if(cls)document.documentElement.className=cls;' +
            '}catch(e){}})();',
        },
      ],
      // Critical baseline CSS：
      // Nuxt 4 + Vite 7 + Windows 在 dev 下会把 main.css 注入两次（一份 /_nuxt/assets/css，
      // 一份 Windows 绝对路径 URL），Edge 偶发会出现首屏空白（两份都没及时加载）。
      // 这里给一个最小兜底：字体栈、背景色、文字色，让 main.css 哪怕慢也不会"完全失样式"。
      // main.css 加载完后由它接管（同名 var 后定义覆盖）。
      style: [
        {
          innerHTML:
            // color-scheme 告诉浏览器我们自己控制深/浅，禁掉 Chrome auto-dark 把白色强转
            'html{color-scheme:light}' +
            'html.theme-dark-ops{color-scheme:dark}' +
            '*,*::before,*::after{box-sizing:border-box}' +
            'html,body{margin:0;padding:0}' +
            'body{font-family:"Noto Sans SC","PingFang SC","HarmonyOS Sans SC","Microsoft YaHei",system-ui,sans-serif;' +
            '-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;' +
            'background:#f5f7fa;color:#1a2030;min-height:100vh}' +
            // dark-ops 主题下 baseline 直接给深底，避免 FOUC 闪一下白
            'html.theme-dark-ops body{background:#14181f;color:#f2f4f7}',
        },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  // 三块导航数据 + 未来的业务数据，统一通过 useDataSource 读取。
  // 切后端时改 dataSourceMode=api、设置 apiBase 即可，业务代码不动。
  runtimeConfig: {
    public: {
      dataSourceMode: 'json' as 'json' | 'api',
      apiBase: '',
      mockBase: '/mock',
      // 用户自定义覆盖层：JSON 模式下 useDataSource 会先试 ${userDataBase}${path}，
      // 404 才回落到 ${mockBase}${path}。用户把同名 JSON 放进 public/user-data/ 即可生效。
      // 详见 apps/web/public/user-data/README.md。
      userDataBase: '/user-data',
    },
  },

  // 通用安全 headers：所有 HTML 路由都加。
  // CSP 没开 —— 当前 main.css 里有 inline style、FOUC 脚本是 inline script，强 CSP 会全部砍掉。
  // 等真上线再用 nuxt-security 或者自己生成 nonce。
  // X-Frame-Options DENY：本应用不允许被嵌入到外部站点；如果将来要做嵌入 widget，改 SAMEORIGIN。
  routeRules: {
    '/**': {
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        // Permissions-Policy：默认禁掉一堆敏感能力，再开放确实需要的（目前都不需要）
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
      },
    },
  },

  // 数据获取统一走客户端（useDataSource 内部 useAsyncData({ server: false })）：
  // 1) 避开 Nitro dev worker 在 Windows + Node 24 上的 OOM；
  // 2) 跟"未来直接 fetch 后端接口、CORS 由后端配"的产品形态对齐。
  // SSR 本身仍保留，渲染外壳更快，hydration 后再补数据。

  devServer: {
    // 0.0.0.0 = 监听所有 IPv4 网卡（含 loopback + 局域网），
    // 同 WiFi/办公网的同事用 http://<本机 IP>:3000 直接访问。
    // 也修了之前 nuxt dev 默认只绑 IPv6 ::1 导致 localhost 连不上的问题。
    // 备注：如果不想外部访问，改回 '127.0.0.1' 即可。
    host: '0.0.0.0',
    port: 3000,
  },
  compatibilityDate: '2026-05-01',

  vite: {
    plugins: [tailwindcss()],
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  eslint: {
    // 用 stylistic 风格规则（缩进 / 引号 / 分号统一）；checker 集成到 Vite 里实时报错。
    config: {
      stylistic: { indent: 2, quotes: 'single', semi: true },
    },
  },

  i18n: {
    // 文件型懒加载：~/i18n/locales/{zh-CN,en-US}.json
    locales: [
      { code: 'zh-CN', name: '简体中文', file: 'zh-CN.json' },
      { code: 'en-US', name: 'English', file: 'en-US.json' },
    ],
    defaultLocale: 'zh-CN',
    strategy: 'no_prefix', // URL 不带语言前缀，靠 cookie + localStorage 切换
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'ops-dashboard:locale',
      redirectOn: 'root',
    },
  },
});
