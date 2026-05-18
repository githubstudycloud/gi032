# apps/web 审查

> 范围：Nuxt 4 前端（72 个 TS/Vue 文件，5 个 vitest spec）。
> 工具：vitest 5 个 spec 全过；ESLint 配置存在但 type-check 关闭。

## 🔴 必须修 (Blocking)

- [apps/web/app/pages/index.vue:8-152](../../../apps/web/app/pages/index.vue#L8-L152) 整页 hero / 关键指标 / 模块入口 / 最近动态全部用硬编码中文字面量（`'今日新增用例'`、`'同步聚合 AI 测试...'`、`'进入模块'`、`'最近动态'`、`' 个分组'`、`'查看详情'` 等），完全绕开 `useI18n()`。CLAUDE.md 明确要求"用户可见文本走 i18n"。en-US.json 在该页里实际无作用。
- [apps/web/app/components/dashboard/MetricDetailPanel.vue:89-91](../../../apps/web/app/components/dashboard/MetricDetailPanel.vue#L89-L91) `thresholdChip` 返回硬编码 `'阈值 {min} ~ {max}'`，应该走 i18n。en-US 切换后该徽章仍是中文。
- [apps/web/app/components/dashboard/charts/ChartGauge.vue:63-65](../../../apps/web/app/components/dashboard/charts/ChartGauge.vue#L63-L65)、[ChartDonut.vue:51](../../../apps/web/app/components/dashboard/charts/ChartDonut.vue#L51)、[ChartTrend.vue:100](../../../apps/web/app/components/dashboard/charts/ChartTrend.vue#L100)、[ChartBar.vue:68](../../../apps/web/app/components/dashboard/charts/ChartBar.vue#L68)、[ChartDistribution.vue:27](../../../apps/web/app/components/dashboard/charts/ChartDistribution.vue#L27)、[ChartHeatmap.vue:54](../../../apps/web/app/components/dashboard/charts/ChartHeatmap.vue#L54)、[ChartRadar.vue:106](../../../apps/web/app/components/dashboard/charts/ChartRadar.vue#L106)、[ChartStacked.vue:54](../../../apps/web/app/components/dashboard/charts/ChartStacked.vue#L54) 全部 8 个 chart SFC 在空态打印硬编码 `'暂无数据'`；Gauge 还有 `'目标'`、`'已达成'`、`'未达'`；Donut 有 `'合计'`。i18n locale 里 `common.noData` 已存在但未被使用。
- [apps/web/app/components/dashboard/MultiLevelTable.vue:14-16](../../../apps/web/app/components/dashboard/MultiLevelTable.vue#L14-L16) `asActionCell` 把字符串 `'详情'` 既当 i18n 文案又当 type discriminator —— `s === '详情'` 在英文 locale 下永远不命中，整列退化为 N/A 灰文字。CLAUDE.md 注释里也提到"i18n 后端给即可"，但该判定逻辑就是反例。
- [apps/web/app/components/dashboard/MultiLevelTable.vue:284-295](../../../apps/web/app/components/dashboard/MultiLevelTable.vue#L284-L295)、[MetricCard.vue:96-103](../../../apps/web/app/components/dashboard/MetricCard.vue#L96-L103) 全局 `document.addEventListener` / `window.addEventListener('scroll', …, true)` 在 `onMounted` 注册，`onBeforeUnmount` 配套移除 —— OK；**但** MetricCard.vue:98 是把 `onBeforeUnmount` 嵌进 `onMounted` 里注册的，Vue 文档明确说"侦听器只能在 setup 同步调用期间登记"，这里在 mounted 异步钩子里再调 `onBeforeUnmount` 会绑到下一个组件 instance 或丢失。需要把 `onBeforeUnmount` 移出 `onMounted`。
- [apps/web/app/composables/use-report.ts:74-75](../../../apps/web/app/composables/use-report.ts#L74-L75) `error as unknown as Ref<unknown>` / `pending as unknown as Ref<boolean>` —— 把 `ComputedRef` 强转成 `Ref` 隐藏类型错误。函数签名也写错（声明 `Ref<unknown>` 但实际返回 `ComputedRef`）。属于"逃出 ts 检查"的典型 anti-pattern；CLAUDE.md 明确禁止 `any` 类的 escape hatch。
- [apps/web/CLAUDE.md:11](../../../apps/web/CLAUDE.md#L11)、[AGENTS.md:11](../../../apps/web/AGENTS.md#L11) CLAUDE.md / AGENTS.md 双宣称"UI：shadcn-vue（源码在 `app/components/ui/`）+ Reka UI primitives"，但 `app/components/ui/` 目录**不存在**，`package.json` 里既无 shadcn-vue、reka-ui、radix-vue，也无 motion-v / vee-validate。所有 UI 都是手撸 native `<select>` / `<input>` / `<button>`（FilterSection.vue、ManagementTable.vue、LocaleSwitcher 等）。规则与实现完全脱节，文档需要更新，或代码补全 shadcn。

## 🟡 建议 (Should-fix)

- [apps/web/app/composables/use-data-source.ts:110](../../../apps/web/app/composables/use-data-source.ts#L110) `raw as unknown as T` —— 当 `transform` 未提供时盲转，配合 [use-report-config.ts:21](../../../apps/web/app/composables/use-report-config.ts#L21) 的 `(raw): ReportConfig => raw as ReportConfig` 注释里挂的 `TODO: 接 Zod ReportConfigSchema.parse 之后这里换成 .parse(raw)` 还没做。Zod schema 在 `types/schemas.ts` 仅写到 Overview，没写 ReportConfig/ReportData。
- [apps/web/app/composables/use-data-source.ts:11](../../../apps/web/app/composables/use-data-source.ts#L11) `missingUserPaths = new Set<string>()` 模块级全局；提供了 `_clearUserDataMissCache`。Pinia 已经引在 deps 里但没用 —— 这种"跨组件共享、需要测试可清零"的状态正是 Pinia setup store 的用武之地。当前 `app/stores/` 目录甚至不存在；CLAUDE.md 强调"Pinia 3 setup store"。
- [apps/web/app/composables/use-font.ts:31](../../../apps/web/app/composables/use-font.ts#L31)、[use-theme.ts:31](../../../apps/web/app/composables/use-theme.ts#L31)、[components/common/NavIcon.vue:15](../../../apps/web/app/components/common/NavIcon.vue#L15) 三处用 `useState<...>('active-...', …)` —— 在 SSR 关闭、`server: false` 的客户端跑场景，这其实就是模块单例 ref。可考虑统一收敛到 Pinia store；当前 useState 混用方式属于"按一根线穿过多个组件"的轻量替代，但少了 devtools/persist 支持。
- [apps/web/app/composables/use-report.ts:42-62](../../../apps/web/app/composables/use-report.ts#L42-L62) `watch(cfgDs.data, ..., { immediate: true })` 每次 config 变化都用 `for (const f of cfg.filters ?? [])` 重建 filterState；ReportPage.vue:20-35 的 `resetFilters` 把同样的逻辑又复制了一遍。应抽成纯函数（已有 utils 目录）。
- [apps/web/app/components/report/FilterSection.vue:31-71](../../../apps/web/app/components/report/FilterSection.vue#L31-L71) `ensureOptions` 没有 abort signal、没有 loading 状态对外暴露、没有错误反馈 UI（catch 后只设 []）。下拉空了不会告诉用户为啥空。`onMounted` 里并发 `void ensureOptions(f)`，如果 props.filters 后续变化（异步 config）也不会 re-load —— FilterSection 假设 filters 静态。
- [apps/web/app/components/report/ReportPage.vue:37](../../../apps/web/app/components/report/ReportPage.vue#L37) `drilldownLayer = ref<{ open: (c: {...}) => void } | null>(null)` —— 手写出 DrilldownLayer 的 `defineExpose` 接口的类型签名，没有从 DrilldownLayer 反向导出。一旦改动签名漂移，编译期不报错。
- [apps/web/app/components/report/ReportPage.vue:42](../../../apps/web/app/components/report/ReportPage.vue#L42) `onDetail` 永远拿 `Object.keys(drilldowns)[0]`，注释也说"真实应用里应该按被点列的 drilldown.ref 走" —— 这是已知 TODO。
- [apps/web/app/components/dashboard/MultiLevelTable.vue:298-318](../../../apps/web/app/components/dashboard/MultiLevelTable.vue#L298-L318) 排序比较里调 `localeCompare` 没传 `'zh-Hans-CN'`（uniqueValues 那处传了），同一份代码两种 locale —— 排序结果不稳定。
- [apps/web/app/components/dashboard/MultiLevelTable.vue:120-137](../../../apps/web/app/components/dashboard/MultiLevelTable.vue#L120-L137) `uniqueValuesByKey` 是个 O(rows × leaves) 的全表 computed；行数大 + 列多时（看板有 4 级表头 + 几十列）reactivity 触发会重新计算整张表。建议拆成 `shallowRef` cache 或按 column 懒构造。
- [apps/web/app/components/dashboard/charts/*.vue](../../../apps/web/app/components/dashboard/charts/) 8 个 chart 模板 / SVG 都是 inline 加载，没有 `defineAsyncComponent`；MetricDetailPanel.vue:167-175 直接 8 个 `<ChartXxx v-if>` 串联 —— 即使一个面板只用 trend，所有 chart 仍打到主 bundle。考虑 dynamic import 拆 chunk。
- [apps/web/app/components/dashboard/MetricCard.vue:60-64](../../../apps/web/app/components/dashboard/MetricCard.vue#L60-L64) `document.querySelector('aside')` 在 tooltip 重排里硬选 DOM。若未来侧栏不渲染 `<aside>` 或换成 nav，定位逻辑会静默失效。
- [apps/web/app/components/common/NavIcon.vue:23](../../../apps/web/app/components/common/NavIcon.vue#L23) `watchEffect` 内读 `customMissing.value`（Set，非深 reactive 跟踪 add），watchEffect 不会重新触发；当前依赖 props.name 变化路径才能刷，目前没问题，但 Set 的 reactive 行为在 useState 下需要明确。
- [apps/web/app/pages/ai-test/system/excel.vue:126-129](../../../apps/web/app/pages/ai-test/system/excel.vue#L126-L129) `console.log('drill:', key)` / `console.log('row detail:', row)` 留在生产代码里。CLAUDE.md 后端段说"禁止 print 做调试"，前端虽未明文，但 PR 不该带 stray console。
- [apps/web/app/pages/ai-test/system/excel.vue:43](../../../apps/web/app/pages/ai-test/system/excel.vue#L43) `window.alert('该指标 ID 已存在')` —— 与 [pages/ai-test/system/metrics.vue:43](../../../apps/web/app/pages/ai-test/system/metrics.vue#L43) 同样的非 i18n alert，应走 ErrorPanel / Toast。
- [apps/web/app/components/common/NavIcon.vue:52](../../../apps/web/app/components/common/NavIcon.vue#L52) `<img>` 的 `alt=""` 已显式空；但是 `aria-hidden="true"` + `alt=""` 是冗余的，OK。注意 nav-icons/custom 不存在时会触发一次 404 请求 → 报错日志在控制台。可以在 nuxt static / runtime 阶段预检。
- [apps/web/i18n/locales/zh-CN.json:1-126](../../../apps/web/i18n/locales/zh-CN.json#L1-L126) 缺失 key（已在硬编码里出现但未登记）：`metric.chartEmpty`、`metric.chartGoalLabel`、`metric.gaugeReached`、`metric.gaugeMissed`、`chart.totalLabel`、`metric.thresholdLabel`、`landing.hero.kicker/title/intro`、`landing.stats.*`、`landing.entries.subgroup`、`landing.updates.title` 等。
- [apps/web/eslint.config.mjs:7-15](../../../apps/web/eslint.config.mjs#L7-L15) 关掉了 `vue/max-attributes-per-line` 与 `vue/html-self-closing`、`@stylistic/operator-linebreak`、`@stylistic/quote-props`。`html-self-closing` 关掉后模板里 `<input>` / `<br>` 形式不再一致；`max-attributes-per-line` 也是 a11y 审查友好的规则。可保留至少 `vue/max-attributes-per-line`。
- [apps/web/nuxt.config.ts:75-85](../../../apps/web/nuxt.config.ts#L75-L85) `runtimeConfig.public.dataSourceMode` 用泛型 cast `'json' as 'json' | 'api'` —— 应该用 typed `defineNuxtConfig` 的 RuntimeConfig 类型扩展。

## 🟢 备注 (Nice-to-know)

- Composition API + `<script setup lang="ts">` 一致性 OK：grep 没发现 Options API 或 `script setup` 漏 `lang="ts"`。
- 没有 `tailwind.config.{js,ts}`，主题靠 `@theme`，符合 v4 规范。CSS 用 OKLCH 也符合 CLAUDE.md。
- 没有禁用字体（Inter / Roboto / Arial / Helvetica）的痕迹；`assets/css/main.css:38` 注释甚至明示"禁用 Inter/Roboto"。
- `dist/` 目录在 repo 根存在但 `app/.gitignore`（继承根 .gitignore）已忽略，未跟踪。git status 中显示是 untracked screenshot 与 build artifacts，无误。
- `dist/` 与 `.output/` 共存有点冗余 —— Nuxt 4 默认产物在 `.output/`，`dist/` 可能是 `nuxt generate` 的旧产物或自定义；建议清理。
- 三份 Dockerfile（`Dockerfile`、`Dockerfile.intranet`、`Dockerfile.offline`）有大量重复（pnpm 安装、ARG、ENV、generate）。可抽公共部分到 `Dockerfile.base` 后用 `--target` 派生，否则一次依赖升级要改三处。当前差异只是基础镜像 + `MODE` + nginx conf 文件。
- `SETUP-LOG.md` 已严重过时：第 9-14 行画的目录结构是 `20260515/app/` 单 Vue 项目，没反映 #14 提交的 monorepo 拆分。建议要么删除，要么追加"自 2026-05-18 起项目已迁至 monorepo"注释。
- `AGENTS.md:52` 还在写 `tests/{unit,e2e}` 目录约定，但实际 `tests/` 下只有平铺 `.spec.ts`，无 unit/e2e 子目录。
- `AGENTS.md:74` 引用 `app/components/ui/` 同 CLAUDE.md，同样不存在。
- ESLint 配置 typecheck 是 `typescript.typeCheck: false`（nuxt.config.ts:124），CLAUDE.md `pnpm typecheck` 项目自检里要求过；`vue-tsc` 在 devDeps，但没把它纳入提交前 hook。
- `MetricCard.vue` & `MultiLevelTable.vue` 自己 reimplement onClickOutside / IntersectionObserver / ResizeObserver；VueUse 早已提供 `onClickOutside` / `useIntersectionObserver` / `useResizeObserver` —— ThemeSwitcher 用了，dashboard 这俩没用。
- AppSidebar.vue:23 `© 2026 · 运营平台` 硬编码版权 / 平台名，未走 i18n。

## 测试覆盖盘点

### 已覆盖

- `utils/threshold.ts` — `parseNumeric` + `thresholdClass` + `thresholdPillClass` 6 个 case
- `utils/envelope.ts` — `isEnvelope` + `unwrapEnvelope` 共 13 个 case，含基本 boundary
- `utils/csv-page-parser.ts` — 9 个 case，覆盖 BOM / parent 链 / 多级嵌套 / 数字解析
- `composables/use-data-source.ts` — 只覆盖到抽出来的纯函数 `looksLikeOverlayJson`（4 个 case）；HTML fallback 误识别这一具体 bug 回归到位
- `tests/mock-fixtures.spec.ts` — 所有 `reports/<type>/{config,data}.json` 形状 + nav.json 通过 Zod + admin/metrics.json 顶层校验
- `tests/user-data-overlay.spec.ts` — examples 与 mock 顶层字段对齐

### 缺口（与 commit b7dde38 的"覆盖加回归"声明仍有 gap）

- `composables/use-data-source.ts` 主体逻辑无单测：JSON 模式下的 user-data → mock 回落顺序、`missingUserPaths` 缓存命中行为、`mode='api'` 时调 `unwrapEnvelope` 的路径、`refresh` 行为 —— 都没有。`_clearUserDataMissCache` 暴露专门给测试用，但目前没人 import。
- `composables/use-report.ts` 完全无测：filter 默认初始化（date_range vs 标量 vs `{value}` 三种 default 形态分支），pagingMode 默认从 config 推断。这是页面里最容易回归的逻辑。
- `composables/use-report-config.ts` / `use-report-data.ts` 单文件无测，但其实只是薄包装。
- `composables/use-nav.ts` 的 `localizedLabel` / `firstLeafPath` / `isPathUnderItem` 三个纯函数，未在 spec 里覆盖。`firstLeafPath` 行为（disabled / single / 递归回退）边界 case 不少。
- `composables/use-theme.ts` / `use-font.ts` 中 watch 校验回退到 default 的逻辑（"localStorage 旧 key 自愈"）。
- `utils/nav-flat.ts` 的 `flattenNav` 没测；它在多级菜单 breadcrumb 中扮演核心角色。
- `utils/envelope.ts` 的 `unwrapEnvelope` envelope.code !== 0 时抛 Error 已测；但缺少与 `useDataSource` 联动的 envelope 解包路径测试。
- SFC 测试为 0 —— `MultiLevelTable.vue` 的多级表头算法（depthOf / leavesOf / thRowCells 的 rowspan/colspan 计算）是这套表格的灵魂逻辑，靠浏览器看截图；可以提取为纯函数单测（vitest.config.ts:5 注释里也提到"未来要测 SFC 再加 @vue/test-utils"）。
- 5 个 spec 对 72 个源文件（含 30+ SFC、8 个 composable、4 个 util、8 个 chart）整体覆盖率偏低；mock-fixtures 与 user-data-overlay 测的是 JSON fixture 本身，不算运行时代码覆盖。
