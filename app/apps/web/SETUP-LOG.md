# Vue 项目 — Claude Code 配置记录（操作流水账）

> 给新手看的"我做了什么 / 为什么这么做 / 出问题怎么排查"。
> 时间：2026-05-16
> 用户：John（vickroytoshiko@gmail.com）

## 一、项目目录现状

```
20260515/                    ← git 仓库根
├── .git/
├── .gitignore
├── README.md                ← 仓库总入口
├── docs/                    ← 教程参考资料（之前写的那本 frontend-ai-guide）
│   └── frontend-ai-guide/
└── app/                     ← 👈 这里是 Vue 项目（你日常工作的目录）
    ├── CLAUDE.md            ← Claude Code 的"入职手册"
    ├── AGENTS.md            ← Codex/OpenCode 用的同款规则（保留以备多工具）
    ├── SETUP-LOG.md         ← 本文件
    ├── .cursor/
    │   └── rules/           ← Cursor 用的 MDC 规则（即便不用 Cursor 也保留）
    ├── .claude/
    │   └── skills/          ← Claude Code 启动后自动加载的 Skill 包
    └── scripts/
        └── check-setup.mjs  ← 自检脚本（验证配置是否就绪）
```

## 二、为什么这么设计（给新手讲清楚）

### Q：为什么 Vue 项目放 `app/` 子目录而不是仓库根？

A：因为 git root 下还有 `docs/` 教程作为参考材料。这样：
- 你在 `app/` 目录写代码、跑 `claude` 命令
- 同时仓库里还保留着完整教程，可以随时回去查"为什么要这样写规则"

如果以后想拆掉教程，只要 `git rm -r docs/` 即可。

### Q：CLAUDE.md 为什么不放仓库根？

A：Claude Code 启动时会从你的 cwd（当前工作目录）向上一路找 CLAUDE.md，每一层都会合并。
- 把 CLAUDE.md 放 `app/`，你在 `app/` 启动 `claude` 时它一定能被加载
- 仓库根没有 CLAUDE.md → 不污染其它子目录（万一以后 `docs/` 也变成项目）

如果你以后开第二个 Vue 子项目，可以在仓库根加一份共通的 CLAUDE.md，两个项目都共享。

### Q：现在装了哪些 Skill？

共 **9 个**。前 8 个是我们自己写的（"教程内置款"），第 9 个是社区主流第三方款（vendor 进来）：

| Skill | 作用 | 来源 |
|---|---|---|
| **new-vue-component** | `/new-vue-component LoginForm` 一键脚手架 SFC + 测试 + Storybook | 自有 |
| **component-spec** | 写组件前先输出"规约表"（强制设计在前） | 自有 |
| **pinia-store** | Pinia 3 setup store 标准模板 | 自有 |
| **composable-spec** | composable 命名 / 返回值 / 清理 规范 | 自有 |
| **a11y-vue** | Vue SFC 的无障碍检查（图片 alt、标题层级、ARIA） | 自有 |
| **frontend-design** | 强制做出审美选择（5 选 1）、禁用 Inter/紫粉渐变 | 自有（通用） |
| **a11y-check** | 通用无障碍审计（兼容 Vue / React） | 自有（通用） |
| **perf-budget** | 性能预算守门人（Web Vitals + bundle + 图片 + 字体） | 自有（通用） |
| **vue-best-practices** | Vue 3 + Composition API + `<script setup>` + TS 五步工作流 + 23 个 reference 文件 | 第三方（hyf0/vue-skills @ c9d355f） |

**没拷的**：通用版 `component-spec` 与 Vue 版同名，Vue 项目用 Vue 版即可。

### Q：vue-best-practices 是 Vue 官方的吗？

**不完全是**。

- 仓库：[hyf0/vue-skills](https://github.com/hyf0/vue-skills)（推广别名 `vuejs-ai/skills`）
- 状态（作者自述）："Early Experiment / Community Project"
- 但作者意图："If valuable, I plan to propose transferring this project to the Vue organization to benefit the wider community."
- 数据：2.4k Star、19.2k 安装、Vue School 在推荐、昨天还在更新
- 协议：MIT

所以是**"社区事实标准 + 即将归官方"**的状态。我们采用 **vendoring**（拷贝源码进项目）而非 npm 包，这样：
1. 跟着 git 走，团队成员 `git clone` 就有
2. 锁定到具体 commit（避免上游突然破坏性更新）
3. 升级是显式 git 操作，不会被静默改动

详细的来源、commit、升级方法见 `app/.claude/skills/vue-best-practices/NOTICE.md`。

### Q：vue-best-practices 跟我们自己的 skill 冲突吗？

不冲突，**互补**：

| 我们的 skill | vue-best-practices 怎么补充 |
|---|---|
| `component-spec` 关注"规约表"输出格式 | 关注五步工作流和核心原则（"state 一处真源"、"小而专组件"） |
| `pinia-store` 关注 setup store 模板 | references 里有 `state-management.md` 讲 Pinia 用法心法 |
| `composable-spec` 关注命名 / 返回值 | references 里有 `composables.md` 讲 composable 模式 |
| `new-vue-component` 关注脚手架文件 | 关注组件设计原则（"Props down, Events up"） |

互相加成，不冲突。

### Q：`.cursor/rules/` 在 Vue + Claude Code 项目里有用吗？

A：你现在用 Claude Code，不直接需要。但保留它的理由：
- 万一你或团队成员临时切到 Cursor，立刻能用
- 这些 `.mdc` 文件本身是不错的"规则文档"，也可以当 reference 读

不想要可以 `rm -rf .cursor`。

### Q：为什么没装 Nuxt 4 脚手架？

A：因为你还没告诉我具体业务。等你说"这是一个 X 系统，要有 Y 模块"我再 `npx nuxi@latest init .`，避免：
1. 现在下载 200MB+ 的 node_modules 占空间
2. 用错模板（比如真要做静态站可能 Astro 更合适）
3. 业务来了之后才发现要不同的依赖组合

## 三、做了哪些操作（命令清单）

```bash
# 1. 把教程移到 docs/（保留 git 历史）
git mv README.md docs/README.md
git mv frontend-ai-guide docs/frontend-ai-guide

# 2. 新建项目目录骨架
mkdir -p app/.claude/skills app/.cursor/rules app/scripts

# 3. 复制 Vue 项目的"入职手册"
cp docs/frontend-ai-guide/vue/CLAUDE.md app/CLAUDE.md
cp docs/frontend-ai-guide/vue/AGENTS.md app/AGENTS.md
cp -r docs/frontend-ai-guide/vue/.cursor/rules/. app/.cursor/rules/

# 4. 复制自有 Skills（Vue 专属 5 + 通用 3 = 8）
cp -r docs/frontend-ai-guide/vue/skills/. app/.claude/skills/
cp -r docs/frontend-ai-guide/skills/frontend-design app/.claude/skills/
cp -r docs/frontend-ai-guide/skills/a11y-check     app/.claude/skills/
cp -r docs/frontend-ai-guide/skills/perf-budget    app/.claude/skills/

# 5. Vendor 第三方 vue-best-practices（hyf0/vue-skills @ c9d355f）
git clone --depth=1 https://github.com/hyf0/vue-skills.git /tmp/vue-skills
cp -r /tmp/vue-skills/skills/vue-best-practices app/.claude/skills/
# 在 vue-best-practices/ 下放 NOTICE.md 记录来源 + 协议 + commit

# 6. 验证
node scripts/check-setup.mjs   # 期望：9 Skill / 0 问题

# 7. 提交
git add -A
git commit -m "..."
git push
```

## 四、怎么测试配置就绪？

### 方法 A：跑自检脚本（不需要装任何东西，Node 自带）

```bash
cd app
node scripts/check-setup.mjs
```

期望输出大致是：

```
== 约束文档 ==
✓ CLAUDE.md  (XXX 行)
✓ AGENTS.md  (XXX 行)

== Cursor MDC 规则 ==
✓ 001-base.mdc
✓ 010-vue-components.mdc
✓ 020-shadcn-vue.mdc
✓ 030-pinia.mdc
✓ 040-api-server.mdc
✓ 100-frontend-design.mdc

== Claude Code Skills（Claude 启动后能识别）==
✓ /a11y-check            Universal accessibility (a11y) audit ...
✓ /a11y-vue              Audit a Vue SFC for accessibility issues...
✓ /component-spec        Output a structured component specification ...
✓ /composable-spec       Design and create a Vue 3 composable...
✓ /frontend-design       Force the AI to make deliberate aesthetic choices...
✓ /new-vue-component     Scaffold a new Vue 3 component (SFC) ...
✓ /perf-budget           Performance budget guardrail ...
✓ /pinia-store           Create a new Pinia 3 setup store ...

共 8 个 Skill 可被 Claude Code 加载。
```

### 方法 B：在 Claude Code 里实测

```bash
cd app
claude
```

然后在 Claude Code 里输入：

```
What skills are available?
```

应该能看到上面 8 个 Skill 出现在列表里。

然后试触发一个：

```
我要写一个 PingButton 组件
```

如果 Claude 自动输出"规约表"（来自 component-spec skill），说明配置生效。

## 五、出问题怎么排查？

### 症状 1：Claude Code 启动后看不到 Skill

```bash
# 1. 确认你在 app/ 目录启动
pwd                          # 应该看到 .../20260515/app

# 2. 确认 .claude/skills 存在
ls -la .claude/skills

# 3. 跑自检脚本看是否有 frontmatter 解析错误
node scripts/check-setup.mjs
```

### 症状 2：写代码时 Claude 没遵守规则

可能原因 + 解决：
- CLAUDE.md 文件太大被截断 → 现在我们这份只有几百行，应该没事。如果以后膨胀，用 `@文件名` 引用拆分
- 单次任务长 + 多轮对话压缩 → 在对话里再说一次"看 CLAUDE.md 里的硬约束"
- 规则写得太抽象 → 改成"禁止 X / 必须 Y" 的明确句式

### 症状 3：误删了某个 Skill

```bash
# 从 docs/ 重新拷一份
cp -r ../docs/frontend-ai-guide/vue/skills/<name> .claude/skills/
```

## 六、下一步（等你告诉业务）

你需要告诉我：

1. **这个服务是什么**（一句话即可，比如"我要做一个个人博客 / 内部后台 / 电商前台 / 微信小程序…"）
2. **大致有哪些核心功能**（如登录、列表、表单、支付…）
3. **是否需要 SSR / SEO**（决定要不要 Nuxt 4 还是 Vite + Vue SPA）
4. **是否需要中文 / 国际化**

我接到这些信息后会：
1. `cd app && npx nuxi@latest init . --gitInit=false`（不要它再 git init）
2. 装上 shadcn-vue + Pinia + VueUse + Motion + Zod 等约束文档要求的依赖
3. 按你的业务画出第一版页面 / 路由结构
4. 跑 `pnpm dev` 验证能起来
5. 提交并推送

—— 完。
