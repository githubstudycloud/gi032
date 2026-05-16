import tailwindcss from '@tailwindcss/vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-05-01',

  // 数据获取统一走客户端（useDataSource 内部 useAsyncData({ server: false })）：
  // 1) 避开 Nitro dev worker 在 Windows + Node 24 上的 OOM；
  // 2) 跟"未来直接 fetch 后端接口、CORS 由后端配"的产品形态对齐。
  // SSR 本身仍保留，渲染外壳更快，hydration 后再补数据。

  devServer: {
    // Node 24 默认偏好 IPv6，nuxt dev 只绑 ::1 会导致 Windows 的 localhost(IPv4) 连不上。
    host: '127.0.0.1',
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
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  devtools: { enabled: true },
});
