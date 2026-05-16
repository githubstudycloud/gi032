---
name: server-actions
description: |
  Create a Next.js Server Action with Zod validation, proper auth check, error shape, and
  cache revalidation. Use when the user asks to "create / update / delete" data from a form,
  "make a server action for X", or replace a fetch POST with an action.
argument-hint: "<actionName>"
arguments: [name]
allowed-tools: Read Write Edit
---

# Next.js Server Action — 标准模板

## 文件位置

约定放在 `lib/actions/<resource>.ts`（按资源聚合），或 `app/<route>/actions.ts`（co-locate）。

## 模板

```ts
'use server'

import { z } from 'zod'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireAuth } from '@/lib/auth'

const $nameInput = z.object({
  // 字段
})

type $nameResult =
  | { ok: true; data: SomeType }
  | { ok: false; error: string; code: string; issues?: z.ZodIssue[] }

export async function $name(input: z.infer<typeof $nameInput>): Promise<$nameResult> {
  // 1) 鉴权
  const session = await requireAuth()
  if (!session) {
    return { ok: false, error: 'UNAUTHORIZED', code: 'UNAUTHORIZED' }
  }

  // 2) 校验
  const parsed = $nameInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'INVALID_INPUT', code: 'INVALID_INPUT', issues: parsed.error.issues }
  }

  // 3) 业务
  try {
    const result = await db.something.create({
      data: { ...parsed.data, userId: session.user.id /* 从 session 派生 */ },
    })

    // 4) 重新校验缓存
    revalidatePath('/dashboard')
    revalidateTag('user-data')

    return { ok: true, data: result }
  } catch (e) {
    console.error('[$name] DB error', e)
    return { ok: false, error: '操作失败', code: 'DB_ERROR' }
  }
}
```

## 在 Client Component 里调用

```tsx
'use client'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { $name } from '@/lib/actions/$resource'

export function MyForm() {
  const [pending, startTransition] = useTransition()

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await $name({ /* ... */ })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('成功')
    })
  }

  return <form action={onSubmit}>...</form>
}
```

## 与 TanStack Query mutation 配合

```ts
const mutation = useMutation({
  mutationFn: async (input: z.infer<typeof $nameInput>) => {
    const res = await $name(input)
    if (!res.ok) throw new Error(res.error)
    return res.data
  },
  onSuccess: () => qc.invalidateQueries({ queryKey: ['xxx'] }),
})
```

## 关键规则
- ✅ 顶部 `'use server'`
- ✅ Zod 校验输入
- ✅ `requireAuth` 在前
- ✅ 用户 ID **从 session 派生**，不信任 input 里的 userId
- ✅ 修改数据后 `revalidatePath` / `revalidateTag`
- ✅ 返回值是判别联合 `{ ok: true/false, ... }`
- ❌ 不要 `throw new Error()` 暴露给客户端（包成结构化错误）
- ❌ 不要直接 import db 到 Client Component
