import tailwindcss from '@tailwindcss/vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-05-01',

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

  modules: [
    '@vueuse/nuxt',
    // @pinia/nuxt 暂未启用 —— 当前还没用到 Pinia；0.6.1 跟 Pinia 3 不兼容，
    // SSR payload plugin 会炸 obj.hasOwnProperty。等真用 store 再升级到 0.11+ 再加回。
  ],

  // 让 components/layout/AppTopBar.vue 直接以 <AppTopBar /> 引用，
  // 默认 Nuxt 4 会带目录前缀（LayoutAppTopBar），我们用扁平命名。
  components: [
    { path: '~/components', pathPrefix: false },
  ],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  // 三块导航数据 + 未来的业务数据，统一通过 useDataSource 读取。
  // 切后端时改 dataSourceMode=api、设置 apiBase 即可，业务代码不动。
  runtimeConfig: {
    public: {
      dataSourceMode: 'json' as 'json' | 'api',
      apiBase: '',
      mockBase: '/mock',
    },
  },

  app: {
    head: {
      title: '运营看板',
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      // FOUC 防护：HTML 解析阶段就把主题 class 设好，避免主题切换后刷新一闪默认主题。
      // localStorage 里存的就是 htmlClass 完整字符串（'' / 'theme-business' / 'theme-ant'），
      // 跟 app/composables/use-theme.ts 的写入对齐，零拼接、零映射。
      script: [
        {
          tagPosition: 'head',
          innerHTML:
            '(function(){try{' +
              'var c=localStorage.getItem("ops-dashboard:theme");' +
              'if(c)document.documentElement.className=c;' +
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

  typescript: {
    strict: true,
    typeCheck: false,
  },

  devtools: { enabled: true },
});
