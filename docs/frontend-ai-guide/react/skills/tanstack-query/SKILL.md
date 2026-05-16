---
name: tanstack-query
description: |
  Create a TanStack Query hook (useQuery / useMutation) using the queryOptions() factory pattern
  with optimistic updates and proper cache invalidation. Use when the user asks to "fetch data",
  "load X", "create a hook for API call", or to manage server state in React.
argument-hint: "<ResourceName>"
arguments: [resource]
allowed-tools: Read Write Edit
---

# TanStack Query — 标准模板

## 1. Query 工厂（lib/queries/$resource.ts）

```ts
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

type $resource = { id: string; /* ... */ }

async function fetchList(): Promise<$resource[]> {
  const res = await fetch('/api/$resources')
  if (!res.ok) throw new Error('FETCH_FAILED')
  return res.json()
}

async function fetchById(id: string): Promise<$resource> {
  const res = await fetch(`/api/$resources/${id}`)
  if (!res.ok) throw new Error('FETCH_FAILED')
  return res.json()
}

export const $resourceQueries = {
  all: () => queryOptions({
    queryKey: ['$resources'],
    queryFn: fetchList,
    staleTime: 60_000,
  }),
  byId: (id: string) => queryOptions({
    queryKey: ['$resources', id],
    queryFn: () => fetchById(id),
    enabled: !!id,
  }),
}
```

## 2. 在组件里用

```tsx
'use client'
import { useQuery } from '@tanstack/react-query'
import { $resourceQueries } from '@/lib/queries/$resource'

export function $resourceList() {
  const { data, isLoading, error } = useQuery($resourceQueries.all())

  if (isLoading) return <Skeleton />
  if (error) return <ErrorState message={error.message} />
  if (!data?.length) return <EmptyState />

  return data.map(item => <Card key={item.id}>...</Card>)
}
```

## 3. Mutation + Optimistic Update

```ts
// hooks/use-create-$resource.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useCreate$resource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: New$resource): Promise<$resource> => {
      const res = await fetch('/api/$resources', { method: 'POST', body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('CREATE_FAILED')
      return res.json()
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ['$resources'] })
      const previous = qc.getQueryData<$resource[]>(['$resources'])
      const tempId = `temp-${Date.now()}`
      qc.setQueryData<$resource[]>(['$resources'], old =>
        [...(old ?? []), { id: tempId, ...payload }],
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(['$resources'], ctx.previous)
      toast.error('创建失败')
    },
    onSuccess: () => toast.success('创建成功'),
    onSettled: () => qc.invalidateQueries({ queryKey: ['$resources'] }),
  })
}
```

## 4. SSR 预取（Next App Router）

```tsx
// app/$resources/page.tsx — Server Component
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { $resourceQueries } from '@/lib/queries/$resource'
import { $resourceList } from '@/components/feature/$resource/$resource-list'

export default async function Page() {
  const qc = new QueryClient()
  await qc.prefetchQuery($resourceQueries.all())
  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <$resourceList />
    </HydrationBoundary>
  )
}
```

## 规则总结
- 所有 queryKey 走 `xxxQueries.all/byId/...` 工厂，不要散字符串
- mutation 默认实现 optimistic update（除非数据强一致性需求）
- 错误用 sonner toast 提示
- 在新建文件后写一行 unit test（mock fetch + waitFor）
