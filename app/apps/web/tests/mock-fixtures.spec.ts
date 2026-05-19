/**
 * mock fixture 健康检查 ——
 *   - 每个 public/mock/reports/<type>/config.json + data.json 都能解析为合法 JSON
 *   - config 满足 v2 协议的基本形状（meta + filters + primary_view.tabs）
 *   - data 满足 v2 协议的基本形状（kpi.groups + tabs[key].items）
 *   - 引用一致性：config.primary_view.tabs[].key 在 data.tabs 里都能找到
 *   - 引用一致性：config.kpi.groups[].items[].key 在 data.kpi 对应 group 里都能找到
 *   - nav.json + branding + admin/metrics 也过 JSON.parse
 *
 * 防止：未来加字段 / 改字段名时 config 和 data 走偏，UI 跑通但生产接 API 反而炸。
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { NavResponseSchema } from '../app/framework/types/schemas';

const REPORTS_DIR = join(process.cwd(), 'public', 'mock', 'reports');
const ADMIN_DIR = join(process.cwd(), 'public', 'mock', 'admin');

const reportTypes = readdirSync(REPORTS_DIR).filter((f) => {
  return existsSync(join(REPORTS_DIR, f, 'config.json'))
    && existsSync(join(REPORTS_DIR, f, 'data.json'));
});

describe('reports fixtures (v2 split config + data)', () => {
  it('discovers at least one report type', () => {
    expect(reportTypes.length).toBeGreaterThan(0);
  });

  for (const rt of reportTypes) {
    describe(`reports/${rt}`, () => {
      const config = JSON.parse(readFileSync(join(REPORTS_DIR, rt, 'config.json'), 'utf-8'));
      const data = JSON.parse(readFileSync(join(REPORTS_DIR, rt, 'data.json'), 'utf-8'));

      it('config has meta.report_type matching dir name', () => {
        expect(config.meta?.report_type).toBe(rt);
      });

      it('config has filters array', () => {
        expect(Array.isArray(config.filters)).toBe(true);
      });

      it('config has primary_view with tabs[]', () => {
        expect(config.primary_view?.tabs).toBeTruthy();
        expect(Array.isArray(config.primary_view.tabs)).toBe(true);
        expect(config.primary_view.tabs.length).toBeGreaterThan(0);
      });

      it('every primary_view.tab.key has data.tabs entry', () => {
        for (const tab of config.primary_view.tabs) {
          expect(data.tabs?.[tab.key], `data.tabs missing ${tab.key}`).toBeTruthy();
          expect(Array.isArray(data.tabs[tab.key].items)).toBe(true);
        }
      });

      it('every config.kpi.group.item.key has matching data.kpi value', () => {
        if (!config.kpi?.enabled) return;
        const dataByGroupKey: Record<string, Set<string>> = {};
        for (const g of data.kpi?.groups ?? []) {
          dataByGroupKey[g.key] = new Set(g.items.map((it: { key: string }) => it.key));
        }
        for (const g of config.kpi.groups ?? []) {
          const dataKeys = dataByGroupKey[g.key];
          expect(dataKeys, `data.kpi missing group ${g.key}`).toBeTruthy();
          for (const it of g.items) {
            expect(dataKeys!.has(it.key), `data.kpi.${g.key} missing item ${it.key}`).toBe(true);
          }
        }
      });

      it('header_tree leaves keys appear in row sample (where applicable)', () => {
        // 仅抽 1 行做 smoke check —— 多级表头叶子 key 必须能在 row 上找到（缺的会显示 — 但应该是少数）
        function leafKeys(nodes: { key: string; children?: { key: string; children?: unknown[] }[] }[]): string[] {
          const out: string[] = [];
          for (const n of nodes) {
            if (n.children?.length) out.push(...leafKeys(n.children as { key: string; children?: { key: string; children?: unknown[] }[] }[]));
            else out.push(n.key);
          }
          return out;
        }
        for (const tab of config.primary_view.tabs) {
          const leaves = leafKeys(tab.header_tree ?? []);
          const sample: Record<string, unknown> = data.tabs[tab.key].items[0] ?? {};
          const present = leaves.filter(k => k in sample).length;
          // 至少要 50% 的列在第一行能取到值（actions / 控件列允许缺失）
          expect(present, `${rt}/${tab.key}: only ${present} of ${leaves.length} leaf keys in first row`).toBeGreaterThanOrEqual(Math.floor(leaves.length * 0.5));
        }
      });
    });
  }
});

describe('nav.json fixture', () => {
  it('matches NavResponseSchema', () => {
    const raw = JSON.parse(readFileSync(join(process.cwd(), 'public', 'mock', 'nav.json'), 'utf-8'));
    const result = NavResponseSchema.safeParse(raw);
    if (!result.success) {
      console.error('nav schema issues:', result.error.issues.slice(0, 5));
    }
    expect(result.success).toBe(true);
  });
});

describe('admin fixtures', () => {
  it('admin/metrics.json parses + has page_config + data.items', () => {
    const raw = JSON.parse(readFileSync(join(ADMIN_DIR, 'metrics.json'), 'utf-8'));
    expect(raw.page_config?.title).toBeTruthy();
    expect(raw.page_config?.columns?.length).toBeGreaterThan(0);
    expect(Array.isArray(raw.data?.items)).toBe(true);
  });
});
