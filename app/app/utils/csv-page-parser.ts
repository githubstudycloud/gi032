/**
 * CSV → 页面数据 解析器
 *
 * 一个文件多段，段头形如 `##METRICS`。空行/`#` 注释行忽略。
 * 段内首行 = 表头，其余 = 数据行。
 *
 * 支持段：
 *   ##META       : key,value 两列；title / subtitle / footnote
 *   ##METRICS    : group_key,group_label,key,label,value,unit,mom,trend,description
 *   ##COLUMNS    : key,label,width,align,highlight (highlight: 1/0)
 *   ##ROWS       : 表头 = 列 key 列表；其余 = 数据行
 *
 * 兼容 Excel 另存的 CSV（UTF-8 BOM、CRLF、双引号转义）。
 */
import type {
  Metric,
  MetricGroup,
  OverviewMetrics,
  OverviewPilots,
  PilotTable,
  TableColumn,
  TableRow,
  TrendDir,
} from '~/types/overview-summary';

export interface ImportedPage {
  meta: {
    title: string;
    subtitle?: string;
    footnote?: string;
  };
  metrics: OverviewMetrics;
  pilots: OverviewPilots;
}

export interface ParseIssue {
  section: string;
  line: number;
  message: string;
}

export interface ParseResult {
  ok: boolean;
  data: ImportedPage | null;
  issues: ParseIssue[];
}

/* —— RFC4180 简化版 CSV 行解析 —— */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ',') {
        out.push(cur);
        cur = '';
      } else if (ch === '"' && cur === '') {
        inQuote = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out.map(s => s.trim());
}

/* —— 把整段 CSV 拆成 section → rows[] —— */
function splitSections(text: string): Record<string, { lineNo: number; cells: string[] }[]> {
  // 去掉 UTF-8 BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const lines = text.split(/\r?\n/);
  const sections: Record<string, { lineNo: number; cells: string[] }[]> = {};
  let cur: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('##')) {
      cur = trimmed.slice(2).trim().toUpperCase();
      sections[cur] = [];
      continue;
    }
    if (trimmed.startsWith('#')) continue; // 注释
    if (cur == null) continue; // section 之前的内容忽略
    sections[cur]!.push({ lineNo: i + 1, cells: parseCsvLine(raw) });
  }
  return sections;
}

function toTrend(v: string | undefined): TrendDir {
  const x = (v ?? '').toLowerCase().trim();
  if (x === 'down' || x === '↓' || x === '降') return 'down';
  if (x === 'flat' || x === '-' || x === '平') return 'flat';
  return 'up';
}

function toAlign(v: string | undefined): 'left' | 'center' | 'right' {
  const x = (v ?? '').toLowerCase().trim();
  if (x === 'left' || x === '左') return 'left';
  if (x === 'right' || x === '右') return 'right';
  return 'center';
}

function nonEmpty(s: string | undefined): string | undefined {
  if (s == null) return undefined;
  const t = s.trim();
  return t === '' ? undefined : t;
}

/* —— 主入口 —— */
export function parsePageCsv(text: string): ParseResult {
  const issues: ParseIssue[] = [];
  const sections = splitSections(text);

  /* META */
  const meta = { title: '导入的页面', subtitle: undefined as string | undefined, footnote: undefined as string | undefined };
  for (const row of sections.META ?? []) {
    const [k, v] = row.cells;
    if (!k) continue;
    if (k === 'key' && (v ?? '').toLowerCase() === 'value') continue; // 跳过表头
    if (k === 'title') meta.title = v ?? meta.title;
    else if (k === 'subtitle') meta.subtitle = nonEmpty(v);
    else if (k === 'footnote') meta.footnote = nonEmpty(v);
  }

  /* METRICS */
  const metricsRows = sections.METRICS ?? [];
  const groupMap = new Map<string, MetricGroup>();
  if (metricsRows.length > 0) {
    const [header, ...rest] = metricsRows;
    const cols = header!.cells.map(c => c.toLowerCase());
    const idx = (name: string): number => cols.indexOf(name);
    const iGk = idx('group_key');
    const iGl = idx('group_label');
    const iK = idx('key');
    const iL = idx('label');
    const iV = idx('value');
    const iU = idx('unit');
    const iM = idx('mom');
    const iT = idx('trend');
    const iD = idx('description');
    if (iGk < 0 || iK < 0 || iL < 0 || iV < 0) {
      issues.push({ section: 'METRICS', line: header!.lineNo, message: '缺少必需列 group_key/key/label/value' });
    } else {
      for (const row of rest) {
        const c = row.cells;
        const gk = c[iGk] ?? '';
        if (!gk) continue;
        if (!groupMap.has(gk)) {
          groupMap.set(gk, { key: gk, label: c[iGl] ?? gk, items: [] });
        }
        const metric: Metric = {
          key: c[iK] ?? '',
          label: c[iL] ?? '',
          value: c[iV] ?? '',
          unit: iU >= 0 ? nonEmpty(c[iU]) : undefined,
          mom: (iM >= 0 ? c[iM] : '') ?? '',
          trend: toTrend(iT >= 0 ? c[iT] : undefined),
          description: iD >= 0 ? (c[iD] ?? '') : '',
        };
        if (!metric.key) {
          issues.push({ section: 'METRICS', line: row.lineNo, message: '指标 key 为空，已跳过' });
          continue;
        }
        groupMap.get(gk)!.items.push(metric);
      }
    }
  }
  const metrics: OverviewMetrics = {
    groups: Array.from(groupMap.values()),
    footnote: meta.footnote ?? '数据来源：本地 CSV 导入',
  };

  /* COLUMNS — 支持多级表头：通过 parent 列引用父列 key */
  const colsRows = sections.COLUMNS ?? [];
  const columns: TableColumn[] = [];
  if (colsRows.length > 0) {
    const [header, ...rest] = colsRows;
    const ch = header!.cells.map(c => c.toLowerCase());
    const iK = ch.indexOf('key');
    const iL = ch.indexOf('label');
    const iP = ch.indexOf('parent');
    const iW = ch.indexOf('width');
    const iA = ch.indexOf('align');
    const iH = ch.indexOf('highlight');
    const iS = ch.indexOf('sortable');
    if (iK < 0 || iL < 0) {
      issues.push({ section: 'COLUMNS', line: header!.lineNo, message: '缺少必需列 key/label' });
    } else {
      const colMap = new Map<string, TableColumn>();
      const hasChild = new Set<string>();
      // 先扫一遍标记哪些 key 是父
      if (iP >= 0) {
        for (const row of rest) {
          const p = row.cells[iP];
          if (p && p.trim()) hasChild.add(p.trim());
        }
      }
      for (const row of rest) {
        const c = row.cells;
        const k = c[iK] ?? '';
        if (!k) continue;
        const parentKey = iP >= 0 ? (c[iP] ?? '').trim() : '';
        const isParent = hasChild.has(k);
        const col: TableColumn = {
          key: k,
          label: c[iL] ?? k,
          width: iW >= 0 ? nonEmpty(c[iW]) : undefined,
          align: toAlign(iA >= 0 ? c[iA] : undefined),
          highlight: !isParent && iH >= 0 ? (c[iH] === '1' || (c[iH] ?? '').toLowerCase() === 'true') : undefined,
          sortable: !isParent && iS >= 0 ? (c[iS] === '1' || (c[iS] ?? '').toLowerCase() === 'true') : undefined,
        };
        // 根级叶子的 rowspan 由 MultiLevelTable 按 maxDepth 自动计算, 无需在此设定
        colMap.set(k, col);
        if (parentKey) {
          const parent = colMap.get(parentKey);
          if (!parent) {
            issues.push({ section: 'COLUMNS', line: row.lineNo, message: `parent="${parentKey}" 不存在或未在本行之前定义` });
            columns.push(col);
            continue;
          }
          (parent.children ??= []).push(col);
        } else {
          columns.push(col);
        }
      }
    }
  }

  /* ROWS */
  const rowsSection = sections.ROWS ?? [];
  const rows: TableRow[] = [];
  if (rowsSection.length > 0) {
    const [header, ...rest] = rowsSection;
    const keys = header!.cells;
    for (const row of rest) {
      const r: TableRow = {};
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (!k) continue;
        const v = row.cells[i] ?? '';
        // 数字尝试解析（保持字符串若包含非数字字符）
        const num = Number(v.replace(/,/g, ''));
        r[k] = v !== '' && Number.isFinite(num) && /^[-+0-9.,]+$/.test(v) ? num : v;
      }
      rows.push(r);
    }
  }

  const pilots: OverviewPilots = {
    tabs: columns.length > 0 || rows.length > 0
      ? [{
          key: 'main',
          label: meta.title,
          columns,
          rows,
          pagination: { page: 1, pageSize: Math.max(rows.length, 10), total: rows.length },
        } satisfies PilotTable]
      : [],
  };

  return {
    ok: issues.length === 0 && (metrics.groups.length > 0 || pilots.tabs.length > 0),
    data: { meta, metrics, pilots },
    issues,
  };
}

/* —— 模板（多级表头示例） —— */
export const SAMPLE_CSV: string = `##META
key,value
title,AI 辅助测试覆盖度（多级表头示例）
subtitle,COLUMNS 段加 parent 列即可生成二级表头；同一 parent 下的列会合并成一组
footnote,数据仅作示例，全部可在 Excel/CSV 中修改

##METRICS
group_key,group_label,key,label,value,unit,mom,trend,description
quality,质量指标,total-cases,用例总数,"3,560",,+9.4%,up,本月新增的测试用例总数（含 AI 与人工）
quality,质量指标,ai-ratio,AI生成占比,60.3%,,+5.2pp,up,公式：AI 生成有效用例数 ÷ 用例总数
quality,质量指标,defect-found,缺陷发现数,128,,-3.1%,down,本月发现的全部缺陷数
capability,能力指标,ai-generated,AI生成用例数,"3,420",,+22.5%,up,AI 系统本月生成的全部候选用例
capability,能力指标,adoption-rate,采纳率,62.8%,,-1.2pp,down,AI 采纳用例数 ÷ AI 生成用例数
capability,能力指标,avg-interactions,平均交互次数,4.6,,-0.3,down,每个需求的平均交互轮数

##COLUMNS
key,label,parent,width,align,highlight,sortable
industry,产业,,120px,left,0,0
owner,接口人,,90px,left,0,0
design,测试设计阶段,,,center,0,0
design-coverage,覆盖人数,design,,center,0,1
design-landed,落地需求,design,,center,0,1
design-adoption,采纳率,design,,center,1,1
exec,测试执行阶段,,,center,0,0
exec-cases,执行用例,exec,,center,0,1
exec-passrate,通过率,exec,,center,1,1
exec-defects,发现缺陷,exec,,right,0,1
result,缺陷分析,,,center,0,0
result-ai,AI识别,result,,center,0,1
result-manual,人工补充,result,,center,0,1

##ROWS
industry,owner,design-coverage,design-landed,design-adoption,exec-cases,exec-passrate,exec-defects,result-ai,result-manual
智能汽车,张三,42,18,68%,1280,92.4%,52,38,14
云计算,李四,38,15,72%,1120,94.1%,41,31,10
工业互联,王五,29,11,55%,820,88.7%,27,16,11
智能终端,赵六,55,22,64%,1560,91.2%,63,47,16
网络产品,孙七,33,14,70%,980,93.8%,35,26,9
`;

/* —— 4 级表头 + 重点列示例 —— */
export const SAMPLE_CSV_4L: string = `##META
key,value
title,测试运营全链路指标（4 级表头 + 重点列示例）
subtitle,COLUMNS 段支持任意层嵌套；highlight=1 列在表头与单元格统一高亮（亮色底+品牌色文）
footnote,带高亮的列为 KPI 重点列，可直接定位；多级表头由 parent 链自动推断

##METRICS
group_key,group_label,key,label,value,unit,mom,trend,description
kpi,关键指标,total-passrate,综合通过率,93.2%,,+1.4pp,up,各产业用例执行通过率加权平均
kpi,关键指标,total-fix-rate,缺陷修复率,87.5%,,+2.1pp,up,本月缺陷修复 ÷ 本月发现
kpi,关键指标,total-adoption,用例采纳率,71.4%,,+3.5pp,up,AI 生成且被采纳的用例占比
volume,规模指标,total-cases,执行用例,"5,760",,+12.3%,up,本月全部产业执行的用例总数
volume,规模指标,total-defects,发现缺陷,218,,+5.8%,up,本月全部产业发现缺陷数

##COLUMNS
key,label,parent,width,align,highlight,sortable
industry,产业,,110px,left,0,0
owner,接口人,,90px,left,0,0
ops,测试运营全链路,,,center,0,0
design,测试设计,ops,,center,0,0
design-req,需求阶段,design,,center,0,0
d-req-in,接入需求,design-req,,center,0,1
d-req-conv,转化率,design-req,,center,1,1
design-case,用例阶段,design,,center,0,0
d-case-review,评审中,design-case,,center,0,1
d-case-pass,采纳率,design-case,,center,1,1
exec,测试执行,ops,,center,0,0
exec-run,用例执行,exec,,center,0,0
e-run-total,执行数,exec-run,,center,0,1
e-run-pass,通过率,exec-run,,center,1,1
exec-defect,缺陷情况,exec,,center,0,0
e-def-found,发现数,exec-defect,,center,0,1
e-def-fix,修复率,exec-defect,,center,1,1

##ROWS
industry,owner,d-req-in,d-req-conv,d-case-review,d-case-pass,e-run-total,e-run-pass,e-def-found,e-def-fix
智能汽车,张三,128,82%,46,71%,1280,92.4%,52,88.5%
云计算,李四,96,78%,38,75%,1120,94.1%,41,90.2%
工业互联,王五,72,65%,29,58%,820,88.7%,27,77.8%
智能终端,赵六,156,85%,55,68%,1560,91.2%,63,85.7%
网络产品,孙七,84,76%,33,72%,980,93.8%,35,82.9%
`;

