# 03 — 数据层：JSON / API 切换增强

> 愿景：「数据格式根据后端接口定义或者json模拟数据可切换，可以默认，可以根据不同json变化，可以根据api变化」

## 1. 现状盘点

### 已实现

`useDataSource` composable 提供了完整的双模数据切换：

```
全局 mode（nuxt.config.ts → runtimeConfig.public.dataSourceMode）
  ├─ 'json' → 读 /mock/**/*.json（+ /user-data/ 覆盖层）
  └─ 'api'  → 读 /api/**（+ envelope 自动解包）
```

**优点**：
- 全局一键切换，代码零改动
- user-data 覆盖层可让用户不改源码就替换 mock 数据
- transform 函数统一字段映射

**不足**：
- 切换粒度只到全局，不能某些数据走 API、某些走 JSON
- 无法表达"优先 API，API 失败回落 JSON"
- 无缓存层，每次切页都重新请求
- Widget 模型下每个 widget 需要独立数据源，当前 useReport 是整页加载

## 2. 方案设计

### 2.1 三级数据源优先级

```
优先级（从高到低）：
  1. Widget 级 override — widget.data_source.mode 明确指定
  2. 页面级 override  — config.meta.data_source_mode 指定
  3. 全局默认         — runtimeConfig.public.dataSourceMode
```

```typescript
// composables/use-data-source.ts 增强

function resolveMode(
  widgetMode?: DataSourceMode,
  pageMode?: DataSourceMode,
  globalMode?: DataSourceMode,
): DataSourceMode {
  return widgetMode ?? pageMode ?? globalMode ?? 'json';
}
```

### 2.2 混合模式

一个页面内可以同时存在不同数据源模式的 widget：

```jsonc
// 场景：大部分数据走 API，但有一个 widget 用本地 JSON（比如还没开发后端接口）
{
  "meta": {
    "report_type": "industry",
    "data_source_mode": "api"            // 页面级默认走 API
  },
  "widgets": [
    {
      "id": "kpi",
      "type": "kpi_cards",
      "data_source": {
        "mode": "endpoint",              // 跟随页面级 → 走 API
        "endpoint": "/api/reports/industry/kpi"
      }
    },
    {
      "id": "new-chart",
      "type": "chart_line",
      "data_source": {
        "mode": "json_path",             // 强制走 JSON（接口还没写）
        "json_path": "/reports/industry/trend-draft.json"
      }
    }
  ]
}
```

### 2.3 API 优先 + JSON 兜底模式

```
mode = 'api_with_fallback'

流程：
  1. 请求 API endpoint
  2. 成功 → 使用 API 数据
  3. 失败（网络错误 / 5xx / 超时）→ 回落到 JSON mock
  4. 前端显示一个小提示："数据来自缓存/模拟，非实时"
```

```typescript
// composables/use-data-source.ts 增强

async function fetchWithFallback<T>(
  apiUrl: string,
  jsonUrl: string,
  params?: Record<string, unknown>,
): Promise<{ data: T; source: 'api' | 'json_fallback' }> {
  try {
    const resp = await $fetch<unknown>(apiUrl, {
      query: params,
      timeout: 10_000,
    });
    return { data: unwrapEnvelope<T>(resp), source: 'api' };
  }
  catch {
    const fallback = await $fetch<T>(jsonUrl);
    return { data: fallback, source: 'json_fallback' };
  }
}
```

### 2.4 数据缓存层

```
┌─ Widget ─────────────────────────────────────┐
│  useWidgetData(source, filterState)           │
│    └─ DataCache.get(cacheKey)                 │
│         ├─ hit + fresh → 返回缓存             │
│         ├─ hit + stale → 返回缓存 + 后台刷新  │  ← stale-while-revalidate
│         └─ miss → fetch + 写缓存              │
└──────────────────────────────────────────────┘
```

```typescript
// utils/data-cache.ts

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;        // 毫秒
}

class DataCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): { data: T; fresh: boolean } | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    const fresh = Date.now() - entry.timestamp < entry.ttl;
    return { data: entry.data as T, fresh };
  }

  set<T>(key: string, data: T, ttl: number = 60_000): void {
    this.store.set(key, { data, timestamp: Date.now(), ttl });
  }

  invalidate(pattern: string | RegExp): void {
    for (const key of this.store.keys()) {
      if (typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key)) {
        this.store.delete(key);
      }
    }
  }
}

export const dataCache = new DataCache();
```

### 2.5 数据适配器模式

不同后端（Python / Java / 第三方 API）可能返回不同格式。用适配器统一：

```
┌─ 原始响应 ──────┐     ┌─ 适配器 ─┐     ┌─ 内部模型 ─┐
│ Python FastAPI   │ ──► │ envelope │ ──► │ ReportData │
│ { code, data }   │     │ unwrap   │     │            │
├──────────────────┤     ├──────────┤     │            │
│ Java Spring      │ ──► │ spring   │ ──► │            │
│ { status, body } │     │ adapter  │     │            │
├──────────────────┤     ├──────────┤     │            │
│ 第三方 API       │ ──► │ custom   │ ──► │            │
│ { result: [...] }│     │ adapter  │     │            │
└──────────────────┘     └──────────┘     └────────────┘
```

```typescript
// types/data-adapter.ts

interface DataAdapter<TRaw, TOut> {
  name: string;
  /** 判断是否匹配此适配器 */
  match: (raw: unknown) => boolean;
  /** 转换 */
  transform: (raw: TRaw) => TOut;
}

// 内置适配器
const envelopeAdapter: DataAdapter<EnvelopeResponse, unknown> = {
  name: 'envelope',
  match: (raw) => raw != null && typeof raw === 'object' && 'code' in raw && 'data' in raw,
  transform: (raw) => raw.data,
};

const springAdapter: DataAdapter<SpringResponse, unknown> = {
  name: 'spring',
  match: (raw) => raw != null && typeof raw === 'object' && 'status' in raw && 'body' in raw,
  transform: (raw) => raw.body,
};
```

### 2.6 数据源声明式配置

在 config.json 中可以声明该页面/widget 的数据适配方式：

```jsonc
{
  "data_source": {
    "mode": "endpoint",
    "endpoint": "/api/external/jira/issues",
    "adapter": "custom",                    // 指定适配器
    "adapter_config": {
      "data_path": "issues",               // 从响应中取 .issues
      "total_path": "total",               // 总数在 .total
      "transform_map": {                   // 字段映射
        "key": "issue_id",
        "summary": "title",
        "assignee.displayName": "owner"
      }
    }
  }
}
```

## 3. 数据格式根据不同 JSON 变化

思路.txt 提到"可以根据不同json变化"——即同一个 widget 可以适配不同结构的 JSON：

### 3.1 Schema 自适应

```typescript
// composables/use-adaptive-data.ts

/**
 * 自动检测 JSON 数据结构，推断出 rows / columns：
 * - 如果是数组 → rows = data, columns = Object.keys(data[0])
 * - 如果是 { items: [] } → rows = data.items
 * - 如果是 { tabs: { key: { items: [] } } } → V2 ReportData 格式
 * - 如果是 { columns: [], data: [] } → 显式列定义
 */
export function detectDataShape(raw: unknown): {
  rows: Record<string, unknown>[];
  columns?: { code: string; label: string }[];
  totals?: Record<string, unknown>;
} {
  if (Array.isArray(raw)) {
    return { rows: raw };
  }
  if (isObject(raw) && 'items' in raw && Array.isArray(raw.items)) {
    return {
      rows: raw.items,
      totals: raw.extras?.totals,
    };
  }
  if (isObject(raw) && 'columns' in raw && 'data' in raw) {
    return {
      rows: raw.data as Record<string, unknown>[],
      columns: raw.columns as { code: string; label: string }[],
    };
  }
  // ... 更多格式适配
  return { rows: [] };
}
```

### 3.2 用户上传 JSON 即渲染

结合现有的 Excel 导入页面思路，扩展为"上传任意 JSON → 自动检测格式 → 选择 widget 类型 → 渲染"：

```
用户拖入 JSON 文件
  → detectDataShape() 推断结构
  → 推荐合适的 widget 类型（表格 / 图表）
  → 用户确认或切换
  → 生成临时 page config
  → 渲染预览
  → 可保存为正式页面
```

## 4. 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | `composables/use-data-source.ts` | 增加 mode 优先级、fallback、缓存 |
| 新增 | `composables/use-widget-data.ts` | Widget 级独立数据获取 |
| 新增 | `composables/use-adaptive-data.ts` | JSON 格式自动检测 |
| 新增 | `utils/data-cache.ts` | 请求缓存（stale-while-revalidate） |
| 新增 | `types/data-adapter.ts` | 适配器接口和内置实现 |
| 修改 | `types/report-config.ts` | meta 增加 data_source_mode |
| 修改 | `types/data-source.ts` | 增加 'api_with_fallback' mode |
