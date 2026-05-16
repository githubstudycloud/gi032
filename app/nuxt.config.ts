import tailwindcss from '@tailwindcss/vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-05-01',

  modules: [
    '@vueuse/nuxt',
    '@pinia/nuxt',
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
