# 实战示例（端到端走一遍）

本目录用 3 个完整的对话示例，演示在不同工具里"让 AI 写一个高质量组件"的全流程。

## 示例 1：Claude Code + Vue + frontend-design

```
用户：帮我做一个 PricingCard 组件，三个套餐：免费 / 专业 / 企业。

[Claude Code 自动触发 component-spec 和 frontend-design 两个 Skill]

Claude：

## 设计决策报告
方向：editorial
字体：Fraunces 700-900 标题 / Geist 400 正文 / 思源宋体配中文
配色（OKLCH）：
  - bg light: oklch(0.98 0.01 80)
  - bg dark: oklch(0.15 0 0)
  - brand: oklch(0.65 0.18 230)
  - accent: oklch(0.78 0.16 60)
渐变：同色相微渐变 + grain
动画：3 张卡片 stagger 入场（delay 0.1/0.2/0.3）+ "推荐"卡片有 hover scale 1.02
背景：subtle radial gradient

### 组件 `PricingCard` 规约
1. 一句话职责：展示单个套餐方案，支持"推荐"标记和 CTA。
2. 路径：app/components/feature/pricing/PricingCard.vue
3. Props：
   | name | type | required | default |
   | tier | 'free'\|'pro'\|'enterprise' | ✓ | - |
   | price | number\|'custom' | ✓ | - |
   | features | string[] | ✓ | - |
   | recommended | boolean | - | false |
   | ctaText | string | - | '立即开始' |
4. Emits：
   | select | (tier) => void | 用户点击 CTA |
5. 数据依赖：useI18n() 翻译，useAuthStore() 判断登录状态
6. 状态：isHovered（用于 Motion hover）
7. 边界 case：
   - tier=enterprise 时 price 显示 "联系销售"
   - 未登录 → 点击 CTA 跳 /login
   - 已登录 → 跳 /checkout?tier=xxx
8. 无障碍：button 语义、aria-label 标识"选择 X 套餐"、键盘可达

确认以上方向后我生成代码。

用户：ok，开始。

[Claude 生成 PricingCard.vue + PricingCard.test.ts + PricingCard.stories.ts]

用户：用 playwright MCP 打开 http://localhost:3000/pricing 截图给我看。

[Claude 调 playwright MCP，截图，识别 LCP 良好，但 hover 动画太突兀，建议调整 cubic-bezier]

用户：/a11y-check PricingCard.vue

[Claude 运行 a11y-check Skill，输出报告，发现 1 处警告：装饰性 SVG icon 应该加 aria-hidden]

用户：修。

[Claude patch 完成]
```

## 示例 2：Cursor + React + TanStack Query

```
用户（在 Composer Agent 模式）：
新建一个 UserList 页面，从 /api/users 拉数据，支持搜索、分页、删除。

[Cursor 自动加载 010-react-components.mdc、020-shadcn-ui.mdc、030-tanstack-query.mdc、040-server-actions.mdc]

Cursor Agent：

我会按这些步骤做：
1. 在 lib/queries/users.ts 创建 usersQueries 工厂
2. 在 lib/actions/users.ts 加 deleteUser Server Action
3. 创建 app/users/page.tsx（Server Component，预取）
4. 创建 components/feature/users/UsersList.tsx（Client，搜索 + 分页）
5. 加 tests/unit/users.test.tsx

涉及的关键决策：
- 搜索用 debouncedValue 进 queryKey，自动重 fetch
- 分页用 keepPreviousData 避免抖动
- 删除用 optimistic update
- 不用手动 useMemo（React Compiler）

要继续吗？

用户：ok

[Cursor Agent 自动创建 5 个文件]

用户：跑一下测试

[Agent 调 terminal 跑 pnpm test，全过]

用户：@.cursor/rules/100-frontend-design.mdc 让设计准则参与，重做 UsersList 的视觉

[Agent 重新出设计决策报告，调整字体 + token + 动画]
```

## 示例 3：Trae + Vue + 国产 LLM

```
用户（在 Trae Builder 模式）：
做一个表单：注册账号，邮箱 + 密码 + 确认密码 + 同意条款。

[Trae 加载 project_rules.md 和 .trae/skills/ 下所有 skill]

Trae（GPT-5.4）：

我先输出组件规约：

### `<RegisterForm>` 规约

字段：
- email: z.email()
- password: z.string().min(8).regex(/含字母数字/)
- confirmPassword: 与 password 一致
- agreeTerms: z.literal(true)

提交 → useAuthStore().register() → 成功跳 /onboarding，失败 toast。

Step 1: VeeValidate 4 + Zod 4 schema
Step 2: shadcn-vue Form / Input / Checkbox / Button
Step 3: Motion 错误提示进入动画
Step 4: 提交时 loading 状态禁用按钮

确认后生成。

用户：ok

[Trae 生成 RegisterForm.vue]

用户：用 Playwright MCP 测一遍提交流程

[Trae 自动 fillForm 测试，截图 OK]
```

## 写给新手 — 3 条最重要的"心法"

1. **任何"做组件 / 做页面 / 写 UI"的任务，先看 AI 有没有自动出规约 + 设计决策**。
   如果没有，说明 component-spec / frontend-design Skill 没装对，或者 description 没匹配上。

2. **不要急着说"开始写代码"**。先看规约表里的"边界 case"列得对不对、"无障碍要点"全不全。这个表才是组件质量的核心。

3. **改完 UI 一定让 AI 自己截图看**。用 Playwright MCP / Chrome DevTools MCP。
   AI 在文字上"以为"代码 OK，跟实际看到的常常差很多。

→ 回 [总目录](../README.md)
