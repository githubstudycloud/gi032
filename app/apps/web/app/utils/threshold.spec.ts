import { describe, it, expect } from 'vitest';
import { parseNumeric, thresholdClass, thresholdPillClass } from './threshold';

describe('parseNumeric', () => {
  it('extracts plain integer', () => {
    expect(parseNumeric('128')).toBe(128);
  });
  it('strips commas', () => {
    expect(parseNumeric('1,284')).toBe(1284);
  });
  it('handles percent', () => {
    expect(parseNumeric('62.4%')).toBe(62.4);
  });
  it('handles signed', () => {
    expect(parseNumeric('+8.1%')).toBe(8.1);
    expect(parseNumeric('-1.2pp')).toBe(-1.2);
  });
  it('returns number prop directly', () => {
    expect(parseNumeric(42)).toBe(42);
  });
  it('returns null on non-numeric', () => {
    expect(parseNumeric('—')).toBeNull();
    expect(parseNumeric('abc')).toBeNull();
    expect(parseNumeric(undefined)).toBeNull();
    expect(parseNumeric(null)).toBeNull();
  });
  it('rejects Infinity/NaN', () => {
    expect(parseNumeric(Infinity)).toBeNull();
    expect(parseNumeric(NaN)).toBeNull();
  });
});

describe('thresholdClass', () => {
  it('returns empty when no threshold', () => {
    expect(thresholdClass('62%', undefined)).toBe('');
  });
  it('returns empty when value not numeric', () => {
    expect(thresholdClass('—', { min: 50, goodColor: 'emerald', badColor: 'rose' })).toBe('');
  });
  it('applies good color when in range', () => {
    const c = thresholdClass('70%', { min: 60, goodColor: 'emerald', badColor: 'rose' });
    expect(c).toContain('text-emerald-600');
    expect(c).toContain('font-medium');
  });
  it('applies bad color when out of range', () => {
    const c = thresholdClass('40%', { min: 60, goodColor: 'emerald', badColor: 'rose' });
    expect(c).toContain('text-rose-600');
  });
  it('respects max bound', () => {
    expect(thresholdClass('120', { max: 100, goodColor: 'emerald', badColor: 'rose' })).toContain('text-rose');
    expect(thresholdClass('80', { max: 100, goodColor: 'emerald', badColor: 'rose' })).toContain('text-emerald');
  });
});

describe('thresholdPillClass', () => {
  it('returns text + bg + ring when good', () => {
    const c = thresholdPillClass('80', { min: 60, goodColor: 'emerald', badColor: 'rose' });
    expect(c).toContain('text-emerald-600');
    expect(c).toContain('bg-emerald-50');
    expect(c).toContain('ring-1');
  });
  it('falls back to empty if value non-numeric', () => {
    expect(thresholdPillClass('—', { min: 60, goodColor: 'emerald' })).toBe('');
  });
});
