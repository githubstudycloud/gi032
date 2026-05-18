/**
 * 业务层 —— 每个 report type 的 default-config 注册表。
 *
 * Phase 4 (framework/business 全量拆分) 之前的过渡形态：
 * - `apps/web/app/business/reports/<type>/` 是新业务层的入口
 * - 现阶段先放 default-config（Phase 5）和 style.css（Phase 7），后续 Phase 4
 *   会把更多框架内代码挪到 `apps/web/app/framework/`
 *
 * 不在注册表里的 report type，默认层为 `null`（即三层合并退化为 user + API 两层）。
 */
import type { ReportConfig } from '~/types/report-config';
import { defaultConfig as industryDefault } from './industry/default-config';
import { defaultConfig as summaryDefault } from './summary/default-config';

const REGISTRY: Record<string, Partial<ReportConfig>> = {
  industry: industryDefault,
  summary: summaryDefault,
};

/** 返回指定 report type 的内置默认配置，若未注册则返回 null。 */
export function getDefaultConfig(reportType: string): Partial<ReportConfig> | null {
  return REGISTRY[reportType] ?? null;
}

/** 当前已注册的 report type 列表（测试 / 调试用）。 */
export function listRegisteredReportTypes(): string[] {
  return Object.keys(REGISTRY);
}
