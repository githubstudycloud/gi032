/**
 * 后端统一信封 { code, message, trace_id, data }。
 *
 * unwrapEnvelope —— 在 api 模式拿到响应后调一次，自动把 data 抽出来。
 * 检测策略：响应是 plain object 且同时有 `code` 和 `data` 字段就当 envelope。
 * 反之（数组 / 原始 JSON / 缺关键字段）原样返回。
 *
 * 这样后端切 json fixture 走另一份代码路径时不会被误判。
 */

export interface Envelope<T = unknown> {
  code: number;
  message?: string;
  trace_id?: string;
  data?: T;
}

export function isEnvelope(x: unknown): x is Envelope {
  return !!x
    && typeof x === 'object'
    && !Array.isArray(x)
    && 'code' in (x as Record<string, unknown>)
    && 'data' in (x as Record<string, unknown>);
}

/**
 * 解包 envelope；非 envelope 原样返回。
 * envelope.code !== 0 抛 Error，由上层 useAsyncData / Vue Suspense 兜底。
 */
export function unwrapEnvelope<T>(resp: unknown): T {
  if (!isEnvelope(resp)) return resp as T;
  if (resp.code !== 0) {
    throw new Error(`api error ${resp.code}: ${resp.message ?? ''}`);
  }
  return resp.data as T;
}
