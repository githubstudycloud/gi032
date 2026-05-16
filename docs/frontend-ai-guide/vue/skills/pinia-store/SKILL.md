---
name: pinia-store
description: |
  Create a new Pinia 3 setup store with proper TypeScript types, getters as computed,
  actions as functions, optional persistence. Use when the user asks to "add a store",
  "create state for X", "share data between components" in a Vue project.
argument-hint: "<StoreName>"
arguments: [name]
allowed-tools: Read Write Edit
---

# 创建 Pinia 3 setup store

为 `$name` 创建 `app/stores/$name.ts`：

```ts
import { defineStore } from 'pinia'

export interface $nameState {
  // 描述这个 store 主要管什么
}

export const use$nameStore = defineStore('$name', () => {
  // ===== state =====
  const items = ref<$nameState[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ===== getters (computed) =====
  const count = computed(() => items.value.length)
  const hasItems = computed(() => count.value > 0)

  // ===== actions =====
  async function fetchAll(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      items.value = await $fetch('/api/$names')
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      isLoading.value = false
    }
  }

  function reset(): void {
    items.value = []
    error.value = null
  }

  return {
    // state
    items, isLoading, error,
    // getters
    count, hasItems,
    // actions
    fetchAll, reset,
  }
}, {
  // 如果需要持久化（看具体业务）
  // persist: true,
})
```

## 规则

- ✅ setup 函数式写法（return 一个对象）
- ✅ state 用 `ref` / `reactive`
- ✅ getters 用 `computed`
- ✅ actions 是普通函数（async 或 sync）
- ❌ 不要写 `mutations` 概念 — Pinia 没有
- ❌ 不要 options store 对象语法

## store 之间互相调用

```ts
export const useCartStore = defineStore('cart', () => {
  const user = useUserStore()  // 直接调
  // ...
})
```

注意循环依赖 — 如果 A 用 B、B 又用 A，需要把共用逻辑抽到 composable。

## 持久化

- 用 `pinia-plugin-persistedstate`
- 在 `nuxt.config.ts` 配 `@pinia-plugin-persistedstate/nuxt`
- store 里加 `persist: true` 或细颗粒度 `persist: { paths: ['profile'] }`

## 调试

在组件里：
```ts
const store = use$nameStore()
console.log(store.$state)        // 当前完整状态
store.$subscribe((m, s) => {...})// 订阅变化
store.$reset()                   // 重置（仅 options store 支持，setup 要自己写 reset）
```
