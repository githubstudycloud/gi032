---
name: composable-spec
description: |
  Design and create a Vue 3 composable (use-xxx) with proper naming, single responsibility,
  proper cleanup, and TypeScript types. Use when the user asks to "share logic across components",
  "extract this into a composable", or "make a useXxx".
  Before writing custom composables, check if VueUse already has one.
argument-hint: "<useFoo>"
arguments: [name]
allowed-tools: Read Write Edit WebFetch
---

# 创建 Composable

## 第一步：先 grep VueUse

VueUse 有 200+ 个 composable。**99% 你想写的它已经有了**：
- `useFetch` / `useAsyncState`
- `useLocalStorage` / `useSessionStorage`
- `useDebounce` / `useThrottle`
- `useEventListener` / `useIntersectionObserver`
- `useClipboard` / `useFullscreen` / `useDark`
- `useMagicKeys` / `useScroll` / `useElementVisibility`

如果用户想要的功能 VueUse 已经有，**直接告诉用户用哪个，不要造轮子**。

如果确实没有，再进入下一步。

## 第二步：规约

```markdown
### Composable `$name` 规约

**职责**：<一句话>

**输入参数**
| 名称 | 类型 | 必填 | 默认 |
|------|------|------|------|

**返回**
| 字段 | 类型 | 是否响应式 | 说明 |
|------|------|------|------|

**副作用**：监听器 / 定时器 / 网络请求 / 等

**清理**：onScopeDispose / onBeforeUnmount 怎么处理
```

## 第三步：实现模板

```ts
// app/composables/$name.ts
import { ref, computed, onScopeDispose, type MaybeRefOrGetter, toValue } from 'vue'

export interface $nameOptions {
  // 选项类型
}

export interface $nameReturn {
  // 返回类型
}

export function $name(
  source: MaybeRefOrGetter<string>,
  options: $nameOptions = {}
): $nameReturn {
  // 1) state
  const data = ref<unknown>(null)
  const isLoading = ref(false)

  // 2) 副作用
  const stopWatcher = watch(() => toValue(source), async (val) => {
    isLoading.value = true
    try {
      // ...
    } finally {
      isLoading.value = false
    }
  }, { immediate: true })

  // 3) 清理
  onScopeDispose(() => {
    stopWatcher()
  })

  return { data, isLoading }
}
```

## 命名规则

- 函数名 `useXxx`，camelCase
- 文件名 `$name.ts`（不带 `use` 前缀？看团队约定。Nuxt 项目惯例 use 前缀也可）
- 返回 `{ }` 而不是 数组 — 便于解构改名

## 接受响应式入参

用 `MaybeRefOrGetter<T>` + `toValue()`，让调用方可以传：
- 原始值：`useFoo('hi')`
- ref：`useFoo(name)`
- getter：`useFoo(() => props.id)`

## 清理是必须的

任何 `setInterval` / `addEventListener` / WebSocket / IntersectionObserver 都必须在 `onScopeDispose` 里清掉。
否则页面切换时会泄漏。

## 测试

```ts
// app/composables/$name.test.ts
import { describe, it, expect } from 'vitest'
import { effectScope } from 'vue'
import { $name } from './$name'

describe('$name', () => {
  it('returns expected shape', () => {
    const scope = effectScope()
    scope.run(() => {
      const result = $name('input')
      expect(result.isLoading.value).toBe(false)
    })
    scope.stop()
  })
})
```
