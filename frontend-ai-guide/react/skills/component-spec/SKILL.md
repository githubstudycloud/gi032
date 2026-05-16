---
name: component-spec
description: |
  Output a structured component specification table before writing any React TSX code.
  Use whenever the user asks to "write a component", "create XYZ", "make a form",
  or when planning a non-trivial UI element. Forces design-up-front instead of code-first.
user-invocable: true
---

# React 组件规约（写代码之前的契约）

任何新组件，**先输出本规约表，等用户确认再写代码**。

## 规约表模板

```markdown
### 组件 `<ComponentName>` 规约

**职责一句话**：<做什么 + 不做什么>

**所属层**
- [ ] app/(routes)
- [ ] components/ui
- [ ] components/feature
- [ ] components/layout

**'use client' 是否需要**
- [ ] 是 — 理由：<useState / useEffect / 浏览器 API / 事件>
- [ ] 否 — 默认 Server Component

**Props**
| 名称 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|

**数据依赖**
- TanStack Query: useQuery(usersQueries.byId(id))
- Zustand: useUserStore(s => s.profile)
- Server Action: createUser

**内部状态**
| 名称 | 类型 | 用途 |
|------|------|------|

**关键交互**
1. 用户点击 → 触发 X
2. 输入变化 → ...

**边界 case**
- 数据为空：<空状态组件>
- 加载中：<Skeleton>
- 错误状态：<ErrorState>
- 禁用 / 只读：<视觉差异 + aria-disabled>

**无障碍要点**
- 键盘可达：Tab / Enter / Esc 行为
- 用了哪些 Radix 原语（自动 ARIA）
- 焦点管理：弹出时 / 关闭后

**样式方向**
- 使用的 design tokens（brand / accent / neutral）
- 关键 Tailwind v4 utility
- 是否需要 dark variant
```

## 何时跳过规约

- 改 1-3 行
- 删组件
- 重命名

其它一律走规约。

## 与其它 Skill 的关系

- 规约通过后 → `/new-react-component <Name>` 生成骨架
- 表单时 → 参考 shadcn/ui Form 组件 + TanStack Form
- 表格时 → 参考 shadcn/ui DataTable + TanStack Table
- 数据 → 走 `/tanstack-query` skill 标准模板
