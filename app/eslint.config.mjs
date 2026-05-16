// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt(
  {
    // 项目级覆盖：禁掉一些跟现状不匹配的规则
    rules: {
      // 多个属性挤在一个 attribute 里时允许（v-bind:class 数组等情况）
      'vue/max-attributes-per-line': 'off',
      // SFC 里中文标签 + 长属性需要一些灵活度
      'vue/html-self-closing': 'off',
      // 一些样式选项与项目习惯冲突
      '@stylistic/operator-linebreak': 'off',
      '@stylistic/quote-props': 'off',
    },
    ignores: [
      '.nuxt/**',
      '.output/**',
      'dist/**',
      'node_modules/**',
      'public/**',
    ],
  },
);
