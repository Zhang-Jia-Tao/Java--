#!/usr/bin/env node
/**
 * 解析 _review/项目经历.md → 内容单元清单（题目/章节/代码块/图片位置）
 *
 * 用法：node scripts/parse-project.mjs
 * 产出：_review/.cache/project-units.json
 *
 * 只做「切分与抽取」，不做内容加工——加工在 scaffold/content 阶段做。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const MD = path.join(ROOT, '_review/项目经历.md');
const OUT_DIR = path.join(ROOT, '_review/.cache');
const OUT = path.join(OUT_DIR, 'project-units.json');

/** 模块边界（按行号，含首尾）。依据文档的实际章节分布，改了文档要同步。 */
const MODULES = [
  { key: 'qigou', name: '券享购（非 OneCoupon）', from: 1, to: 238 },
  { key: 'merchant-admin', name: '后管服务', from: 239, to: 2228 },
  { key: 'engine', name: '券引擎', from: 2229, to: 6036 },
  { key: 'distribution', name: '分发服务', from: 6037, to: 7725 },
  { key: 'search', name: '搜索服务', from: 7726, to: 7852 },
  { key: 'settlement', name: '结算服务', from: 7853, to: 8618 },
  { key: 'resume-tech', name: '简历技术', from: 8619, to: 9628 },
  { key: 'core-tech', name: '核心技术文档', from: 9629, to: 999999 }
];

const moduleOf = (line) => MODULES.find((m) => line >= m.from && line <= m.to) ?? MODULES[MODULES.length - 1];

/** 清洗标题：去掉转义、加粗、题号、星标，留下可读标题 */
function cleanTitle(raw) {
  let t = raw
    .replace(/\\/g, '')
    .replace(/\*\*/g, '')
    .replace(/⭐+/g, '')
    .trim();
  t = t.replace(/^Q\d+[.、]?\s*/, '');
  t = t.replace(/^[.、\s]+/, '');
  return t.trim();
}

/** 星级：优先数标题里的 ⭐，其次按「高频」等关键词估 */
function stars(raw, title) {
  const n = (raw.match(/⭐/g) || []).length;
  if (n > 0) return Math.min(5, Math.max(1, n));
  if (/高频|必问|重点/.test(title)) return 4;
  return 3;
}

const text = fs.readFileSync(MD, 'utf8');
const lines = text.split('\n');

// ---------- 1. 代码围栏修复：识别未闭合/无语言围栏 ----------
const fenceState = new Array(lines.length).fill(null); // null | {lang, open}
let inFence = false;
let fenceLang = '';
for (let i = 0; i < lines.length; i++) {
  const m = /^\s*```(\w*)\s*$/.exec(lines[i]);
  if (m) {
    if (!inFence) {
      inFence = true;
      fenceLang = m[1] || '(none)';
    } else {
      inFence = false;
      fenceLang = '';
    }
  }
  fenceState[i] = inFence ? { lang: fenceLang, open: true } : null;
}
const unclosedFence = inFence;

// ---------- 2. 标题切分 ----------
// 飞书导出把代码围栏打乱过（裸 ``` 与 ```SQL 交错），全局 fence 状态会漂移，
// 导致 Q1~Q8 这种真标题被误判成「在代码块里」。用强特征兜底：带 ？/⭐/Q\d 的一律算标题。
const strongHeading = (s) => /[？?⭐]|Q\d/.test(s);
const heads = [];
let driftRepair = 0;
for (let i = 0; i < lines.length; i++) {
  const m = /^(#{1,6})\s+(.*)$/.exec(lines[i]);
  if (!m) continue;
  if (fenceState[i] && !strongHeading(m[2]) && m[1].length < 3) continue; // 代码块里的 # 注释不算标题
  if (fenceState[i] && strongHeading(m[2])) driftRepair++;
  heads.push({ line: i + 1, level: m[1].length, raw: m[2].trim(), title: cleanTitle(m[2]), star: stars(m[2], m[2]) });
}

// ---------- 3. 每个标题的内容体 ----------
const units = heads.map((h, i) => {
  const next = heads[i + 1];
  const end = next ? next.line - 1 : lines.length;
  const body = lines.slice(h.line, end);
  const bodyText = body.join('\n');
  const codeBlocks = [];
  let cur = null;
  for (const l of body) {
    const m = /^\s*```(\w*)\s*$/.exec(l);
    if (m) {
      if (!cur) cur = { lang: m[1] || '(none)', code: [] };
      else {
        codeBlocks.push({ lang: cur.lang, code: cur.code.join('\n') });
        cur = null;
      }
      continue;
    }
    if (cur) cur.code.push(l);
  }
  if (cur) codeBlocks.push({ lang: cur.lang || '(unclosed)', code: cur.code.join('\n'), warn: 'unclosed' });

  const images = (bodyText.match(/!\[[^\]]*\]\(/g) || []).length;
  const mod = moduleOf(h.line);

  return {
    id: `${mod.key}-${String(i).padStart(3, '0')}`,
    line: h.line,
    endLine: end,
    level: h.level,
    rawTitle: h.raw,
    title: h.title,
    star: h.star,
    module: mod.key,
    moduleName: mod.name,
    chars: bodyText.length,
    codeBlocks: codeBlocks.length,
    codeLangs: [...new Set(codeBlocks.map((c) => c.lang))],
    images,
    isQuestion: /^Q\d+/.test(h.raw) || h.star >= 4,
    firstLine: (body.find((l) => l.trim() && !l.trim().startsWith('![')) || '').slice(0, 80)
  };
});

const byModule = {};
for (const u of units) (byModule[u.module] ??= []).push(u.id);

const report = {
  source: '_review/项目经历.md',
  scannedAt: new Date().toISOString(),
  totalLines: lines.length,
  totalChars: text.length,
  headingCount: heads.length,
  questionUnits: units.filter((u) => u.isQuestion).length,
  codeBlocks: units.reduce((s, u) => s + u.codeBlocks, 0),
  images: units.reduce((s, u) => s + u.images, 0),
  unclosedFence,
  fenceDriftRepaired: driftRepair,
  modules: MODULES.map((m) => ({ ...m, units: (byModule[m.key] || []).length })),
  units
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 1), 'utf8');

console.log(`解析完成：${heads.length} 个标题，${report.questionUnits} 个题目单元，${report.codeBlocks} 个代码块，${report.images} 张图`);
console.log(`未闭合代码围栏：${unclosedFence ? '有（需修文档）' : '无'}`);
for (const m of report.modules) console.log(`  ${m.key.padEnd(15)} ${String(m.units).padStart(4)} 单元  ${m.name}`);
console.log(`→ ${path.relative(ROOT, OUT)}`);
