---
name: component-spec
description: |
  Universal "write the spec table before writing the component" skill.
  Works for both Vue SFC and React TSX projects. Forces the AI to commit to
  props, emits/events, data dependencies, internal state, edge cases, and
  accessibility before producing any code.
  Use when the user asks to "make a component", "create XYZ", "write a Form/Table/Card",
  or to plan any non-trivial UI element.
user-invocable: true
---

# 组件规约（写代码前的契约）— 通用版

> Vue 项目用 Vue 那套术语（props / emits / slots），React 项目用 React 那套（props / 事件回调）。
> 本 Skill 是"无栈无关"的元模板，自动识别项目栈后切换。

## 输出格式（必须 100% 一致）

```markdown
### 组件 `<ComponentName>` 规约

**1. 一句话职责**
做什么 + 不做什么。

**2. 所属层 / 路径**
- [ ] pages（路由）
- [ ] layouts（布局）
- [ ] components/ui（设计系统）
- [ ] components/feature（业务）
- [ ] components/composite（多个 ui 组合）

完整路径：`<path>`

**3. Client/Server（React 项目）**
- [ ] Server Component（默认）
- [ ] Client Component — 理由：<useState / useEffect / 浏览器 API / 事件>

**4. Props（外部输入）**
| 名称 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|

**5. 事件输出**
Vue 项目用 emits / React 项目用回调 props。
| 事件 | payload 类型 | 触发时机 |
|------|------|------|

**6. Slots（Vue）/ children（React）**
| 名称 | 作用 | scope props |
|------|------|------|

**7. 数据依赖**
- TanStack Query / `useQuery(...)`
- Pinia / Zustand store
- Server Action / Composables
- I18n（必须）

**8. 内部状态**
| 名称 | 类型 | 用途 |
|------|------|------|

**9. 关键交互流程**
1. 用户做什么 → 组件如何响应（带"快乐路径"+"反路径"）
2. ...

**10. 边界 case**
- 数据为空：<空状态组件>
- 加载中：<Skeleton>
- 错误状态：<ErrorState>
- 网络断开：...
- 用户无权限：...
- 禁用 / 只读：...

**11. 无障碍要点**
- 键盘可达：Tab / Enter / Esc 行为
- 语义 HTML：button / link / form / nav
- ARIA：用了哪些 Radix / Reka 原语（自带 ARIA）
- 焦点管理：弹出时聚焦到哪、关闭后回到哪
- prefers-reduced-motion：是否影响动画

**12. 样式方向**
- 用到的 design tokens（brand / accent / neutral）
- 关键 Tailwind utility
- 是否需要 dark variant
- 是否走"先做审美决策"（调用 frontend-design skill）

**13. 测试关注点**
- 渲染 props 正确
- 事件触发正确
- 边界 case 渲染对应组件
- a11y 自动测试（jsx-a11y / axe）

**14. 与其它组件 / 模块的关系**
- 父：<被哪些组件用>
- 子：<会用到哪些子组件>
- 同级：<风格/行为同步的兄弟组件>
```

## 规则

- ✅ 永远先输出规约，等用户回 "ok" / "改 X 处" / 同意后再写代码
- ✅ 找不到对应字段就写"无 / N/A"，不要省略
- ✅ 如果检测到要画 UI（不仅是逻辑），**同时调用 `frontend-design` skill** 输出设计决策

## 例外（可以跳过）

- 改 1-3 行
- 删除组件
- 重命名（不改实现）
- bug 修复（不改 API）

## 后续动作（输出代码之后）

跑这些命令告诉用户：

```bash
# 测试
pnpm test <ComponentName>

# 视觉
pnpm storybook

# 无障碍
/a11y-check <ComponentName>

# 性能（如果是页面级）
/perf-budget <route>
```
