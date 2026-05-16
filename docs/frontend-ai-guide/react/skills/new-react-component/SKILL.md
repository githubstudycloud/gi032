---
name: new-react-component
description: |
  Scaffold a new React component following project conventions:
  shadcn/ui primitives, Tailwind v4, Server/Client boundary aware,
  Vitest spec, Storybook story.
  Use when the user asks to "create a new component", "make a Xxx component",
  "scaffold a Button/Form/Card", or adds interactive UI to a React page.
argument-hint: "<ComponentName> [feature-folder]"
arguments: [name, folder]
disable-model-invocation: false
allowed-tools: Read Write Edit Bash(pnpm *) Bash(npx *)
---

# 创建新 React 组件

为组件 `$name` 在 `components/$folder/` 创建（`$folder` 默认 `feature/`）：

## 1. 组件文件 `$name/$name.tsx`

```tsx
// 仅在需要 useState / useEffect / 浏览器 API / 事件处理时加 'use client'
// 'use client'

import type { /* types */ } from '@/types'
import { cn } from '@/lib/utils'

interface $nameProps {
  // ...
  className?: string
}

export function $name({ /* ... */, className }: $nameProps) {
  return (
    <div className={cn(/* ... */, className)}>
      ...
    </div>
  )
}
```

要求：
- 默认 Server Component；只在必要时 `'use client'`
- 用 shadcn/ui 的 `Button` / `Input` / `Card` 等已有组件
- props 用 `interface $nameProps`，**不要 `React.FC<Props>`**
- 不要 default export（除非框架强制）
- 不要手动 `useMemo` / `useCallback`（React Compiler 处理）

## 2. 测试 `$name/$name.test.tsx`

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { $name } from './$name'

describe('$name', () => {
  it('renders correctly', () => {
    render(<$name {...defaultProps} />)
    expect(screen.getByRole('button', { name: /xxx/i })).toBeInTheDocument()
  })

  it('handles click', async () => {
    const onClick = vi.fn()
    render(<$name onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
```

## 3. Storybook `$name/$name.stories.tsx`

```tsx
import type { Meta, StoryObj } from '@storybook/react'
import { $name } from './$name'

const meta: Meta<typeof $name> = {
  title: 'Feature/$name',
  component: $name,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
}
export default meta

export const Default: StoryObj<typeof $name> = { args: {} }
export const Loading: StoryObj<typeof $name> = { args: {} }
export const Error: StoryObj<typeof $name> = { args: {} }
```

## 4. 在 `components/index.ts` 追加

```ts
export { $name } from './$folder/$name/$name'
```

## 输出顺序（必须）

**第一步：规约表**

```
| 字段 | 类型 | 必填 | 说明 |
|------|------|-----|-----|
| props.xxx | string | ✓ | ... |

数据依赖：useQuery(usersQueries.byId(id))
状态：useState / useReducer 哪些
边界 case：empty / loading / error
'use client' 必要性：是 / 否（理由）
```

**第二步**：用户确认后生成 4 个文件。

**第三步**：完成后建议
- `pnpm test $name`
- `pnpm storybook`
- `/a11y-react $name/$name.tsx`
