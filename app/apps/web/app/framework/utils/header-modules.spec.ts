/**
 * header_modules → 列树转换的单元测试。
 *
 * 验证：
 *  - 优先级：header_modules 存在时忽略 header_tree
 *  - module 包装：每个 module 变成一个顶层 column group
 *  - fallback：仅 header_tree 时直接返回 tree
 *  - 边界：两者都缺 → 空数组
 *  - module key 包前缀防撞
 */
import { describe, it, expect } from 'vitest';
import type { PrimaryViewTab } from '~/framework/types/report-config';
import {
  tabToColumns,
  moduleColumnKey,
  isModuleColumnKey,
} from './header-modules';

describe('tabToColumns', () => {
  it('仅 header_tree → 原样返回', () => {
    const tab: PrimaryViewTab = {
      key: 't',
      label: 'T',
      header_tree: [
        { key: 'a', label: 'A' },
        { key: 'b', label: 'B', children: [{ key: 'b1', label: 'B1' }] },
      ],
    };
    expect(tabToColumns(tab)).toEqual([
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B', children: [{ key: 'b1', label: 'B1' }] },
    ]);
  });

  it('header_modules 存在 → 每个 module 包装成顶层 group，忽略 header_tree', () => {
    const tab: PrimaryViewTab = {
      key: 't',
      label: 'T',
      header_tree: [{ key: 'should-be-ignored', label: '老树' }],
      header_modules: [
        {
          key: 'kpi',
          label: 'KPI 模块',
          columns: [
            { key: 'a', label: 'A' },
            { key: 'b', label: 'B' },
          ],
        },
        {
          key: 'trend',
          label: '趋势模块',
          columns: [{ key: 'c', label: 'C' }],
        },
      ],
    };
    expect(tabToColumns(tab)).toEqual([
      {
        key: '__module__:kpi',
        label: 'KPI 模块',
        children: [
          { key: 'a', label: 'A' },
          { key: 'b', label: 'B' },
        ],
      },
      {
        key: '__module__:trend',
        label: '趋势模块',
        children: [{ key: 'c', label: 'C' }],
      },
    ]);
  });

  it('module 内部多级表头保留', () => {
    const tab: PrimaryViewTab = {
      key: 't',
      label: 'T',
      header_modules: [
        {
          key: 'sdv',
          label: 'SDV',
          columns: [
            {
              key: 'design',
              label: '设计',
              children: [
                { key: 'design-eff', label: '效率' },
                { key: 'design-cov', label: '覆盖' },
              ],
            },
          ],
        },
      ],
    };
    const out = tabToColumns(tab);
    expect(out).toHaveLength(1);
    expect(out[0]!.children).toHaveLength(1);
    expect(out[0]!.children![0]!.children).toHaveLength(2);
  });

  it('两者都缺 → 空数组', () => {
    expect(tabToColumns({ key: 't', label: 'T' })).toEqual([]);
  });

  it('header_modules 空数组 → 退化到 header_tree', () => {
    const tab: PrimaryViewTab = {
      key: 't',
      label: 'T',
      header_modules: [],
      header_tree: [{ key: 'a', label: 'A' }],
    };
    expect(tabToColumns(tab)).toEqual([{ key: 'a', label: 'A' }]);
  });
});

describe('moduleColumnKey / isModuleColumnKey', () => {
  it('包前缀防撞业务列 key', () => {
    expect(moduleColumnKey('kpi')).toBe('__module__:kpi');
    expect(isModuleColumnKey('__module__:kpi')).toBe(true);
    expect(isModuleColumnKey('kpi')).toBe(false);
  });
});
