/**
 * user-data 覆盖层回归测试。
 *
 * 两组验收：
 *   1. `looksLikeOverlayJson` 的 SPA-fallback 识别逻辑 ——
 *      Nuxt dev 静态 404 会返回 200+text/html，ofetch 解析为字符串；
 *      只有真正的 JSON object/array 才能算"覆盖命中"。
 *   2. `public/user-data/_examples/**\/*.json` 必须与同路径的 mock 文件
 *      保持顶层 schema 兼容 —— 防止 mock 迭代后示例文件悄悄失效，
 *      用户拷贝后整页崩。
 *
 * 详见 README：apps/web/public/user-data/README.md。
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { looksLikeOverlayJson } from '../app/composables/use-data-source';

describe('looksLikeOverlayJson — SPA fallback 识别', () => {
  it('真正的 JSON object 应当命中', () => {
    expect(looksLikeOverlayJson({ foo: 1 })).toBe(true);
    expect(looksLikeOverlayJson({})).toBe(true);
  });

  it('JSON 数组也算命中（顶层可以是 array）', () => {
    expect(looksLikeOverlayJson([1, 2, 3])).toBe(true);
    expect(looksLikeOverlayJson([])).toBe(true);
  });

  it('SPA fallback HTML 字符串当作缺失', () => {
    expect(looksLikeOverlayJson('<!DOCTYPE html><html>...</html>')).toBe(false);
    expect(looksLikeOverlayJson('')).toBe(false);
  });

  it('null / undefined / 数字 / boolean 都当作缺失', () => {
    expect(looksLikeOverlayJson(null)).toBe(false);
    expect(looksLikeOverlayJson(undefined)).toBe(false);
    expect(looksLikeOverlayJson(0)).toBe(false);
    expect(looksLikeOverlayJson(false)).toBe(false);
  });
});

/* —— examples 与 mock 顶层 schema 平衡检查 —— */

const PUBLIC_DIR = join(process.cwd(), 'public');
const EXAMPLES_DIR = join(PUBLIC_DIR, 'user-data', '_examples');
const MOCK_DIR = join(PUBLIC_DIR, 'mock');

function listJsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listJsonFiles(full));
    else if (entry.endsWith('.json')) out.push(full);
  }
  return out;
}

const exampleFiles = listJsonFiles(EXAMPLES_DIR);

describe('user-data/_examples 与 mock 顶层结构对齐', () => {
  it('至少存在一个示例文件（说明上下文是正确的）', () => {
    expect(exampleFiles.length).toBeGreaterThan(0);
  });

  for (const examplePath of exampleFiles) {
    const rel = relative(EXAMPLES_DIR, examplePath).replace(/\\/g, '/');
    const mockPath = join(MOCK_DIR, rel);

    describe(`_examples/${rel}`, () => {
      it('能 parse 为 JSON object', () => {
        const raw = JSON.parse(readFileSync(examplePath, 'utf-8'));
        expect(raw && typeof raw === 'object' && !Array.isArray(raw)).toBe(true);
      });

      it('mock 端必须存在同路径文件（拷过去才能生效）', () => {
        expect(existsSync(mockPath), `mock 缺失：${mockPath}`).toBe(true);
      });

      it('顶层字段在 mock 里都存在（_NOTE 等元字段除外）', () => {
        const exampleObj = JSON.parse(readFileSync(examplePath, 'utf-8')) as Record<string, unknown>;
        const mockObj = JSON.parse(readFileSync(mockPath, 'utf-8')) as Record<string, unknown>;
        for (const k of Object.keys(exampleObj)) {
          if (k.startsWith('_')) continue; // _NOTE / _meta 是示例说明用，不要求 mock 也有
          expect(k in mockObj, `示例字段 "${k}" 在 mock 里不存在 —— 拷过去会被 UI 当成多余字段`).toBe(true);
        }
      });
    });
  }
});
