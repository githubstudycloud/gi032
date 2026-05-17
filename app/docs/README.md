# 文档索引

按"我现在想干什么"分组找：

## 入门

| 文档 | 用途 |
|---|---|
| [REQUIREMENTS.md](REQUIREMENTS.md) | 项目要做什么、给谁用、有哪些功能 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 技术架构 / 服务交互 / 数据流 / 端口 |
| [FILE-MAP.md](FILE-MAP.md) | 全仓目录结构和每个目录的职责 |

## 开发

| 文档 | 用途 |
|---|---|
| [report-platform-v2.md](report-platform-v2.md) | 报表平台 V2 协议（config / data 分离详细规范） |
| [report-platform-redesign.md](report-platform-redesign.md) | V1 原始设计稿 / 决策回溯 |
| [api-split-plan.md](api-split-plan.md) | 查询 / 生成两服务拆分的原始方案 |
| [../shared/contracts/envelope.md](../shared/contracts/envelope.md) | 统一响应信封规范 |
| [../shared/contracts/report-protocol-v2.md](../shared/contracts/report-protocol-v2.md) | 前后端协议同步规则 |

## 测试 / 核验

| 文档 | 用途 |
|---|---|
| [TEST-PLAN.md](TEST-PLAN.md) | 测试金字塔 + 用例矩阵 + 覆盖目标 |
| [VERIFICATION.md](VERIFICATION.md) | 一键自检 + 手工核验清单 + 失败处理 |

## 部署

| 文档 | 用途 |
|---|---|
| [deploy-server.md](deploy-server.md) | ubuntu@192.168.0.132 离线 Docker 部署 |

## 规则 / 约定

| 文档 | 用途 |
|---|---|
| [../CLAUDE.md](../CLAUDE.md) | Monorepo 根硬规则 + Python 通用约束 |
| [../apps/web/CLAUDE.md](../apps/web/CLAUDE.md) | Vue / Nuxt 4 项目规则 |
| [../services/report-query/CLAUDE.md](../services/report-query/CLAUDE.md) | 查询服务规则（只读 / fallback / 性能） |
| [../services/report-generation/CLAUDE.md](../services/report-generation/CLAUDE.md) | 生成服务规则（写 / 调度 / 鉴权） |

## 历史

| 文档 | 用途 |
|---|---|
| [../apps/web/PROMPT-LOG.md](../apps/web/PROMPT-LOG.md) | 每次对话决策记录（时间倒序） |
| [../apps/web/SETUP-LOG.md](../apps/web/SETUP-LOG.md) | 安装坑（Node 24 / Windows / Nuxt 4） |
| [../apps/web/STYLE-GUIDE.md](../apps/web/STYLE-GUIDE.md) | 样式风格档案（OKLCH 色阶 / 字体 / 阴影 token） |
