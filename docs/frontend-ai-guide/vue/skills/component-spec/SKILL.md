---
name: component-spec
description: |
  Output a structured component specification table before writing any Vue SFC code.
  Use whenever the user asks to "write a component", "create XYZ", "make a form",
  or when planning a non-trivial UI element. Forces design-up-front instead of code-first.
user-invocable: true
---

# 组件规约（写代码之前的契约）

任何新组件，**先输出本规约表，等用户确认再写代码**。

## 规约表模板

```markdown
### 组件 `<ComponentName>` 规约

**职责一句话**：<这个组件干什么、不干什么>

**所属层**：[ ] pages / [ ] layouts / [ ] components/ui / [ ] components/feature

**Props**
| 名称 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|------|------|
| | | | | |

**Emits**
| 事件名 | payload 类型 | 触发时机 |
|--------|-----|---|
| | | |

**Slots**
| 名称 | 作用 | scope props |
|------|------|------|
| default | | |

**外部依赖**
- composable: `useXxx()`、`useI18n()`
- store: `useXxxStore()`
- shadcn-vue 原语: Button / Input / Dialog …

**内部状态**
| 名称 | 类型 | 用途 |
|------|------|------|
| | | |

**关键交互**
1. 用户做什么 → 组件如何响应
2. ...

**边界 case**
- 数据为空：...
- 加载中：...
- 错误状态：...
- 禁用 / 只读：...

**无障碍要点**
- 键盘可达：Tab / Enter / Esc 行为
- 屏幕阅读：使用了哪些 Reka UI 原语（自动带 ARIA）
- 焦点管理：弹出时聚焦到哪、关闭后回到哪

**样式方向**
- 在 design-token 的哪一层（brand color / accent / neutral）
- Tailwind v4 主要用到的 utility 类别
```

## 何时跳过规约

只有这种情况可以直接写代码：
- 改 1-3 行的极小调整
- 删除组件
- 重命名

其它一律走规约。

## 与其它 Skill 的关系

- 规约通过后，调用 `/new-vue-component <Name>` 生成文件骨架
- 涉及表单时，参考 `app/components/ui/form/` 已有结构
- 涉及表格时，参考 shadcn-vue 的 `<DataTable>` 模式
