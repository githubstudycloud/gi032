import { describe, expect, it } from 'vitest';
import { isEnvelope, unwrapEnvelope } from './envelope';

describe('isEnvelope', () => {
  it('returns true for {code, data} object', () => {
    expect(isEnvelope({ code: 0, data: { x: 1 } })).toBe(true);
  });

  it('returns true even when message / trace_id missing', () => {
    expect(isEnvelope({ code: 1, data: null })).toBe(true);
  });

  it('returns false for plain data without code field', () => {
    expect(isEnvelope({ items: [] })).toBe(false);
  });

  it('returns false for array (mock JSON may be top-level array)', () => {
    expect(isEnvelope([{ value: 'a' }])).toBe(false);
  });

  it('returns false for null / primitives', () => {
    expect(isEnvelope(null)).toBe(false);
    expect(isEnvelope(undefined)).toBe(false);
    expect(isEnvelope('string')).toBe(false);
    expect(isEnvelope(0)).toBe(false);
  });

  it('returns false when only code present (no data field)', () => {
    expect(isEnvelope({ code: 0 })).toBe(false);
  });
});

describe('unwrapEnvelope', () => {
  it('unwraps successful envelope to .data', () => {
    const resp = { code: 0, message: 'ok', trace_id: 'a'.repeat(32), data: { foo: 1 } };
    expect(unwrapEnvelope<{ foo: number }>(resp)).toEqual({ foo: 1 });
  });

  it('throws on envelope with code != 0', () => {
    const resp = { code: 40001, message: 'bad input', data: null };
    expect(() => unwrapEnvelope(resp)).toThrow(/api error 40001/);
  });

  it('throws includes message', () => {
    const resp = { code: 500, message: 'kaboom', data: null };
    expect(() => unwrapEnvelope(resp)).toThrow(/kaboom/);
  });

  it('passes through non-envelope JSON (json fixture mode)', () => {
    const fixture = { meta: { report_type: 'summary' }, tabs: {} };
    expect(unwrapEnvelope(fixture)).toEqual(fixture);
  });

  it('passes through array (dropdown fixture top-level)', () => {
    const list = [{ value: 'a', label: 'A' }];
    expect(unwrapEnvelope(list)).toEqual(list);
  });

  it('passes through null and primitives', () => {
    expect(unwrapEnvelope(null)).toBeNull();
    expect(unwrapEnvelope(undefined)).toBeUndefined();
    expect(unwrapEnvelope(42)).toBe(42);
  });

  it('unwraps deeply nested envelope', () => {
    const resp = {
      code: 0,
      message: 'ok',
      trace_id: 'x',
      data: { items: [{ value: 'a' }, { value: 'b' }], total: 2 },
    };
    const out = unwrapEnvelope<{ items: Array<{ value: string }>; total: number }>(resp);
    expect(out.total).toBe(2);
    expect(out.items).toHaveLength(2);
  });
});
