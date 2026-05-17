import { describe, it, expect } from 'vitest';
import { parsePageCsv, SAMPLE_CSV, SAMPLE_CSV_4L } from './csv-page-parser';

describe('parsePageCsv', () => {
  it('rejects empty input', () => {
    const r = parsePageCsv('');
    expect(r.ok).toBe(false);
    expect(r.data?.metrics.groups).toEqual([]);
    expect(r.data?.pilots.tabs).toEqual([]);
  });

  it('parses META/title', () => {
    const r = parsePageCsv(`##META\nkey,value\ntitle,我的页\n`);
    expect(r.data?.meta.title).toBe('我的页');
  });

  it('groups METRICS by group_key', () => {
    const csv = `##META
key,value
title,t

##METRICS
group_key,group_label,key,label,value,unit,mom,trend,description
g1,业务,m1,需求数,128,,+5%,up,desc
g1,业务,m2,缺陷数,42,,-3%,down,desc
g2,能力,m3,采纳率,62.8%,,-1.2pp,down,desc
`;
    const r = parsePageCsv(csv);
    expect(r.data?.metrics.groups).toHaveLength(2);
    expect(r.data?.metrics.groups[0]!.items.map(i => i.key)).toEqual(['m1', 'm2']);
    expect(r.data?.metrics.groups[1]!.items[0]!.key).toBe('m3');
  });

  it('handles parent column → children tree (2 levels)', () => {
    const r = parsePageCsv(SAMPLE_CSV);
    const cols = r.data?.pilots.tabs[0]?.columns ?? [];
    const design = cols.find(c => c.key === 'design');
    expect(design?.children?.length ?? 0).toBeGreaterThan(0);
    expect(design?.children?.map(c => c.key)).toContain('design-coverage');
  });

  it('handles parent column → children tree (4 levels)', () => {
    const r = parsePageCsv(SAMPLE_CSV_4L);
    const ops = r.data?.pilots.tabs[0]?.columns.find(c => c.key === 'ops');
    expect(ops?.children?.length ?? 0).toBeGreaterThan(0);
    const design = ops?.children?.find(c => c.key === 'design');
    expect(design?.children?.length ?? 0).toBeGreaterThan(0);
    const designReq = design?.children?.find(c => c.key === 'design-req');
    expect(designReq?.children?.length ?? 0).toBeGreaterThan(0);
  });

  it('treats values without parent as top-level', () => {
    const csv = `##COLUMNS\nkey,label\nindustry,产业\nowner,接口人\n##ROWS\nindustry,owner\n汽车,张三\n`;
    const r = parsePageCsv(csv);
    expect(r.data?.pilots.tabs[0]?.columns.map(c => c.key)).toEqual(['industry', 'owner']);
  });

  it('parses numeric ROWS values', () => {
    const csv = `##COLUMNS\nkey,label\ncount,数量\n##ROWS\ncount\n128\n`;
    const r = parsePageCsv(csv);
    expect(r.data?.pilots.tabs[0]?.rows[0]?.count).toBe(128);
  });

  it('keeps non-numeric ROWS values as string', () => {
    const csv = `##COLUMNS\nkey,label\ndept,部门\n##ROWS\ndept\n智能终端测试部\n`;
    const r = parsePageCsv(csv);
    expect(r.data?.pilots.tabs[0]?.rows[0]?.dept).toBe('智能终端测试部');
  });

  it('strips UTF-8 BOM', () => {
    const csv = '﻿' + `##META\nkey,value\ntitle,带 BOM\n`;
    const r = parsePageCsv(csv);
    expect(r.data?.meta.title).toBe('带 BOM');
  });

  it('records issue when parent reference missing', () => {
    const csv = `##COLUMNS\nkey,label,parent\nfoo,Foo,nope\n##ROWS\nfoo\n1\n`;
    const r = parsePageCsv(csv);
    expect(r.issues.length).toBeGreaterThan(0);
    expect(r.issues[0]!.message).toContain('parent');
  });
});
