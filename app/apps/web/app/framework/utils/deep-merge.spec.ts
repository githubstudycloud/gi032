/**
 * deepMerge / mergeAll 单元测试 ——
 *   - 标量覆盖
 *   - 对象字段级递归
 *   - 数组按 stable key（code/key/field）合并
 *   - null vs undefined 行为不同：undefined 跳过，null 显式置空
 *   - 三层 mergeAll 优先级（rightmost wins）
 */
import { describe, it, expect } from 'vitest';
import { deepMerge, mergeAll } from './deep-merge';

describe('deepMerge', () => {
  it('overlay undefined → 保留 base', () => {
    expect(deepMerge('hello', undefined)).toBe('hello');
    expect(deepMerge({ a: 1 }, undefined)).toEqual({ a: 1 });
  });

  it('overlay null → 显式覆盖为 null（让上层能"清字段"）', () => {
    expect(deepMerge('hello', null)).toBeNull();
    expect(deepMerge({ a: 1 }, null)).toBeNull();
  });

  it('base 缺失 → 用 overlay', () => {
    expect(deepMerge(undefined, 'x')).toBe('x');
    expect(deepMerge(null, { a: 1 })).toEqual({ a: 1 });
  });

  it('标量 overlay 覆盖标量 base', () => {
    expect(deepMerge(1, 2)).toBe(2);
    expect(deepMerge('a', 'b')).toBe('b');
  });

  it('对象按字段递归合并', () => {
    expect(deepMerge(
      { a: 1, b: { x: 1, y: 2 } },
      { b: { y: 99, z: 3 }, c: 'new' },
    )).toEqual({ a: 1, b: { x: 1, y: 99, z: 3 }, c: 'new' });
  });

  it('类型不一致 → overlay 覆盖（object → 标量）', () => {
    expect(deepMerge({ a: 1 }, 'replaced')).toBe('replaced');
  });

  it('数组都带 code → 按 code 字段级合并，保留 base 顺序', () => {
    const base = [
      { code: 'a', label: 'A', required: true },
      { code: 'b', label: 'B' },
    ];
    const overlay = [
      { code: 'b', label: 'B-overridden', extra: 1 },
      { code: 'c', label: 'C' },
    ];
    expect(deepMerge(base, overlay)).toEqual([
      { code: 'a', label: 'A', required: true },
      { code: 'b', label: 'B-overridden', extra: 1 },
      { code: 'c', label: 'C' },
    ]);
  });

  it('数组都带 key → 同样支持', () => {
    expect(deepMerge(
      [{ key: 'x', value: 1 }, { key: 'y', value: 2 }],
      [{ key: 'x', value: 99 }],
    )).toEqual([
      { key: 'x', value: 99 },
      { key: 'y', value: 2 },
    ]);
  });

  it('数组元素无 stable key → 整数组替换', () => {
    expect(deepMerge([1, 2, 3], [9, 8])).toEqual([9, 8]);
    // 元素是对象但无 code/key/field
    expect(deepMerge(
      [{ x: 1 }, { x: 2 }],
      [{ x: 99 }],
    )).toEqual([{ x: 99 }]);
  });

  it('混合数组（部分有 key、部分没）→ 整数组替换', () => {
    expect(deepMerge(
      [{ code: 'a' }, { x: 1 }],
      [{ code: 'b' }],
    )).toEqual([{ code: 'b' }]);
  });

  it('嵌套：filter 数组内 source 对象字段级合并', () => {
    const base = [
      { code: 'time_range', label: '时间范围', source: { endpoint: '/old', supports_favorite: false } },
    ];
    const overlay = [
      { code: 'time_range', source: { endpoint: '/new' } },
    ];
    expect(deepMerge(base, overlay)).toEqual([
      { code: 'time_range', label: '时间范围', source: { endpoint: '/new', supports_favorite: false } },
    ]);
  });
});

describe('mergeAll (三层合并)', () => {
  it('rightmost wins', () => {
    expect(mergeAll(
      { a: 1, b: 1 },
      { a: 2, c: 2 },
      { a: 3 },
    )).toEqual({ a: 3, b: 1, c: 2 });
  });

  it('跳过 null / undefined 层', () => {
    expect(mergeAll(
      { a: 1 },
      null,
      undefined,
      { a: 99 },
    )).toEqual({ a: 99 });
  });

  it('全部 null/undefined → undefined', () => {
    expect(mergeAll(null, undefined)).toBeUndefined();
  });

  it('单层直接返回', () => {
    expect(mergeAll({ a: 1 })).toEqual({ a: 1 });
  });

  it('三层 ReportConfig 案例：default → user → api', () => {
    const defaultLayer = {
      meta: { report_type: 'industry', name: '默认名', version: 1 },
      toolbar: { show_refresh: true, show_compare: false },
      filters: [],
    };
    const userLayer = {
      toolbar: { show_compare: true, show_export: true },
    };
    const apiLayer = {
      meta: { report_type: 'industry', name: 'API 权威名', version: 2 },
      filters: [{ code: 'time_range', label: '时间范围', kind: 'date_range', param: {} }],
    };
    expect(mergeAll(defaultLayer, userLayer, apiLayer)).toEqual({
      meta: { report_type: 'industry', name: 'API 权威名', version: 2 },
      toolbar: { show_refresh: true, show_compare: true, show_export: true },
      filters: [{ code: 'time_range', label: '时间范围', kind: 'date_range', param: {} }],
    });
  });
});
