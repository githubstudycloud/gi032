/**
 * 协议契约测试 —— 把所有 mock fixture 喂给 Zod 严格校验。
 *
 * 与 services/report-query/tests/test_contract.py 一一对应：两边都用同一份 mock
 * fixture 喂各自的 schema，任何漂移在 CI 上会先被这两个测试中的一个抓住。
 *
 * 这里只校验"是否能通过 schema 解析"；引用一致性（config.tabs.key ↔ data.tabs.key
 * 等业务一致性）在 mock-fixtures.spec.ts 里覆盖，本测试与之互补。
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ReportConfigSchema,
  ReportDataSchema,
} from '../app/types/report-schemas';

const REPORTS_DIR = join(process.cwd(), 'public', 'mock', 'reports');

const reportTypes = readdirSync(REPORTS_DIR).filter((f) => {
  return existsSync(join(REPORTS_DIR, f, 'config.json'));
});

describe('Zod 协议契约 (前端为后端 Pydantic 的镜像)', () => {
  it('至少发现一个 report type', () => {
    expect(reportTypes.length).toBeGreaterThan(0);
  });

  for (const rt of reportTypes) {
    describe(`reports/${rt}`, () => {
      it('config.json 通过 ReportConfigSchema 严格校验', () => {
        const raw = JSON.parse(
          readFileSync(join(REPORTS_DIR, rt, 'config.json'), 'utf-8'),
        );
        const result = ReportConfigSchema.safeParse(raw);
        if (!result.success) {
          // 把前 5 条错误打到控制台，便于定位漂移位置
          console.error(
            `${rt}/config.json Zod issues:`,
            result.error.issues.slice(0, 5),
          );
        }
        expect(result.success, `${rt}/config.json 与 ReportConfigSchema 漂移`).toBe(true);
      });

      it('data.json 通过 ReportDataSchema 严格校验', () => {
        const dataPath = join(REPORTS_DIR, rt, 'data.json');
        if (!existsSync(dataPath)) return;
        const raw = JSON.parse(readFileSync(dataPath, 'utf-8'));
        const result = ReportDataSchema.safeParse(raw);
        if (!result.success) {
          console.error(
            `${rt}/data.json Zod issues:`,
            result.error.issues.slice(0, 5),
          );
        }
        expect(result.success, `${rt}/data.json 与 ReportDataSchema 漂移`).toBe(true);
      });
    });
  }
});
