#!/usr/bin/env node
// 自检脚本：验证 Claude Code 在 app/ 目录下能否正常加载所有约束文档和 Skills。
// 使用：cd app && node scripts/check-setup.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

// 极简 YAML 字段解析器：支持单行 plain scalar 和 | / > 块标量。
// 我们只在自检里展示 description，不依赖 YAML 库；Claude Code 自己用真 YAML parser。
function parseYamlField(yaml, field) {
  const lines = yaml.split(/\r?\n/)
  const startRe = new RegExp(`^${field}:\\s*(.*)$`)
  const i = lines.findIndex(l => startRe.test(l))
  if (i < 0) return ''
  const first = lines[i].match(startRe)[1]
  // 块标量
  if (/^[|>][+-]?$/.test(first.trim())) {
    const buf = []
    let baseIndent = -1
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j]
      if (line.match(/^[a-zA-Z_-]+:\s/) && !line.startsWith(' ')) break
      if (line.trim() === '' && buf.length === 0) continue
      if (baseIndent < 0 && line.match(/^\s+/)) baseIndent = line.match(/^\s*/)[0].length
      buf.push(line.slice(baseIndent).trimEnd())
    }
    return buf.join(' ').replace(/\s+/g, ' ').trim()
  }
  // 单行 plain / quoted scalar
  return first.trim().replace(/^["']|["']$/g, '')
}

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', gray: '\x1b[90m',
}
const ok = (m) => console.log(`${c.green}✓${c.reset} ${m}`)
const warn = (m) => console.log(`${c.yellow}!${c.reset} ${m}`)
const err = (m) => console.log(`${c.red}✗${c.reset} ${m}`)
const sec = (m) => console.log(`\n${c.bold}== ${m} ==${c.reset}`)

let problems = 0

sec('约束文档')
for (const f of ['CLAUDE.md', 'AGENTS.md']) {
  const p = path.join(root, f)
  if (fs.existsSync(p)) {
    const lines = fs.readFileSync(p, 'utf-8').split('\n').length
    ok(`${f.padEnd(12)} (${lines} 行)`)
  } else {
    err(`${f} 缺失`)
    problems++
  }
}

sec('Cursor MDC 规则（备用，即使不用 Cursor 也保留）')
const rulesDir = path.join(root, '.cursor/rules')
const mdcs = fs.existsSync(rulesDir)
  ? fs.readdirSync(rulesDir).filter(f => f.endsWith('.mdc')).sort()
  : []
if (mdcs.length === 0) {
  warn('没有 .mdc 文件（不影响 Claude Code 使用）')
} else {
  mdcs.forEach(f => ok(f))
}

sec('Claude Code Skills（启动 claude 后自动识别）')
const skillsDir = path.join(root, '.claude/skills')
const skills = fs.existsSync(skillsDir)
  ? fs.readdirSync(skillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory()).map(d => d.name).sort()
  : []

if (skills.length === 0) {
  err('.claude/skills 下没有任何子目录')
  problems++
}

let loadable = 0
for (const s of skills) {
  const file = path.join(skillsDir, s, 'SKILL.md')
  if (!fs.existsSync(file)) {
    err(`${s}/  ${c.red}缺 SKILL.md${c.reset}`)
    problems++
    continue
  }
  const text = fs.readFileSync(file, 'utf-8')
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fm) {
    warn(`${s}  无 YAML frontmatter`)
    problems++
    continue
  }
  // 解析 description：逐行处理，支持单行 plain scalar 和 | / > 块标量
  const desc = parseYamlField(fm[1], 'description')

  const short = desc.slice(0, 80) + (desc.length > 80 ? '…' : '')
  ok(`/${s.padEnd(22)}${c.gray}${short}${c.reset}`)
  loadable++
}

sec('总结')
console.log(`项目根目录：${c.cyan}${root}${c.reset}`)
console.log(`可加载 Skill：${c.bold}${loadable}${c.reset} 个`)
console.log(`问题数：${problems > 0 ? c.red : c.green}${problems}${c.reset}`)

if (problems > 0) {
  console.log(`\n${c.yellow}⚠ 有 ${problems} 项需要处理，看上面 ✗/! 标记${c.reset}`)
  process.exit(1)
}

console.log(`
${c.bold}下一步${c.reset}
  1. 在本目录运行 ${c.cyan}claude${c.reset} 即可启动 Claude Code
  2. 在 Claude Code 里输入 ${c.cyan}"我要写一个 PingButton 组件"${c.reset}
     如果输出"规约表"，说明 component-spec Skill 已被自动触发，配置生效
  3. 也可以直接打 ${c.cyan}/frontend-design${c.reset} ${c.cyan}/a11y-vue${c.reset} 等斜杠命令手动测试
`)
