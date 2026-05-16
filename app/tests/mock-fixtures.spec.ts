/**
 * mock fixture 健康检查 —— 每个 public/mock/pages/*.json 都得过 OverviewSummaryResponseSchema。
 * 防止：未来加字段 / 改字段名时 mock 与 schema 走偏，UI 跑通但生产真接 API 反而炸。
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { OverviewSummaryResponseSchema, NavResponseSchema } from '../app/types/schemas';

const PAGES_DIR = join(process.cwd(), 'public', 'mock', 'pages');

describe('mock fixtures', () => {
  const files = readdirSync(PAGES_DIR).filter(f => f.endsWith('.json'));

  it('has at least one mock page', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const f of files) {
    it(`${f} matches OverviewSummaryResponseSchema`, () => {
      const raw = JSON.parse(readFileSync(join(PAGES_DIR, f), 'utf-8'));
      const result = OverviewSummaryResponseSchema.safeParse(raw);
      if (!result.success) {
        console.error(`Schema mismatch in ${f}:`, result.error.issues.slice(0, 5));
      }
      expect(result.success, `${f}: ${result.success ? '' : result.error.issues[0]?.message}`).toBe(true);
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
