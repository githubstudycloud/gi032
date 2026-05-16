# Third-party skill — vue-best-practices

This skill is **not** authored by us. It is vendored from an upstream community project under the MIT License.

| 字段 | 值 |
|---|---|
| 上游仓库 | https://github.com/hyf0/vue-skills |
| 推广别名 | `vuejs-ai/skills`（marketplace 用） |
| Skill 路径 | `skills/vue-best-practices/` |
| 版本号（SKILL.md frontmatter） | 18.0.0 |
| 上游 commit | `c9d355ff23f654309dd02006be671859df0a134c`（2026-03-26） |
| 安装日期 | 2026-05-16 |
| 安装方式 | `git clone` + `cp -r`（项目级 vendoring） |
| 协议 | MIT |
| 版权声明 | Copyright (c) 2025 hyf0, SerKo |

## 为什么 vendor 而不是用 `npx skills add`？

- 跟着我们仓库走，团队成员 `git clone` 就有，无需额外命令
- 锁定到具体上游 commit，升级是显式动作
- 不依赖 `npx skills` 工具（一些环境没装 Node 包管理器）

## 升级方法

```bash
# 1. 拉新版上游
git clone --depth=1 https://github.com/hyf0/vue-skills.git /tmp/vue-skills-new

# 2. 比对差异
diff -ru app/.claude/skills/vue-best-practices /tmp/vue-skills-new/skills/vue-best-practices

# 3. 覆盖
rm -rf app/.claude/skills/vue-best-practices
cp -r /tmp/vue-skills-new/skills/vue-best-practices app/.claude/skills/

# 4. 更新本 NOTICE 里的 commit 字段
# 5. 跑自检
cd app && node scripts/check-setup.mjs

# 6. 提交
git -C ../ commit -am "chore(skills): bump vue-best-practices to <new-sha>"
```

## 关于"是否 Vue 官方"

不是。作者 hyf0 在 README 里自述：

> 🚧 Early Experiment / Community Project
> ... If valuable, I plan to propose transferring this project to the Vue organization to benefit the wider community.

含义：作者意图未来转交给 Vue 官方，但**当前是社区项目**。Vue School 在推荐它，事实上的"主流标准"。
