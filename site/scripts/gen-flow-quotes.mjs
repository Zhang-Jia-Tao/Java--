/**
 * 给每条流程的每个步骤补上「原文摘录」。
 *
 *   node scripts/gen-flow-quotes.mjs
 *
 * 依据 step.anchor 的 `_review/项目经历.md L起-L止`，把原文逐字取出来写进 step.quote，
 * 页面里原文用 renderMarkdown 渲染，step.detail 只留我自己的补充说明。
 * 这一步是幂等的：重复跑只会按 anchor 重算 quote，不改其它字段。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const FLOWS = path.join(ROOT, 'src', 'data', 'project-flows.json');
const DOCS = {};

const readDoc = (rel) => {
  if (!DOCS[rel]) {
    const abs = path.join(ROOT, '..', rel);
    DOCS[rel] = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
  }
  return DOCS[rel];
};

/** 方框图画（架构图/时序图）单独成块：行首对齐靠等宽字体，普通段落会散架 */
const BOX = /[│├└┌┐┘┬┴┼─→←]/;

const clean = (lines) => {
  const out = lines.map((l) => l.replace(/\s+$/, ''));
  while (out.length && !out[0].trim()) out.shift();
  while (out.length && !out[out.length - 1].trim()) out.pop();
  return out;
};

const parseAnchor = (anchor) => {
  const m = String(anchor).match(/(_review\/[^\s#]+\.md)\s*L(\d+)(?:\s*[-–]\s*L?(\d+))?/);
  if (!m) return null;
  return { doc: m[1], start: +m[2], end: m[3] ? +m[3] : +m[2] };
};

const flows = JSON.parse(fs.readFileSync(FLOWS, 'utf8'));
let quoted = 0;
let missing = 0;
const stats = [];

for (const f of flows) {
  for (const s of f.steps) {
    const a = parseAnchor(s.anchor);
    if (!a) { missing++; continue; }
    const lines = readDoc(a.doc);
    let end = a.end;
    // EXPAND：锚点只框住两三行短句时向后多取几行，避免「原文」块只有 17 个字
    let slice = clean(lines.slice(a.start - 1, end));
    let guard = 0;
    while (slice.join('').replace(/\s/g, '').length < 80 && end < lines.length && guard < 6) {
      end += 1;
      guard += 1;
      slice = clean(lines.slice(a.start - 1, end));
    }
    let quote = slice.join('\n');

    // 图片行：原文里的图外链，渲染时会是占位符，这里换成明确的文字标注
    // 外链图片：飞书的图在站内加载不出来，换成明确的占位说明，措辞保持中性
    quote = quote.replace(/!\[([^\]]*)\]\((https?:[^)\s]+)\)/g, (_m, alt) =>
      `[图] ${alt && alt !== 'Image' ? alt : '原文配图'}（外链图片，站内不加载）`
    );

    // 整块是方框图时用代码块包住，保住行首对齐
    const bodyLines = quote.split('\n').filter((l) => l.trim());
    const boxLines = bodyLines.filter((l) => BOX.test(l)).length;
    if (bodyLines.length >= 4 && boxLines / bodyLines.length > 0.5) {
      quote = '```text\n' + quote + '\n```';
    }

    s.quote = quote.trim();
    if (s.quote) quoted++;
    stats.push({ id: f.id, n: s.n, chars: s.quote.length });
  }
}

fs.writeFileSync(FLOWS, JSON.stringify(flows, null, 2) + '\n', 'utf8');

const chars = stats.map((s) => s.chars).sort((a, b) => a - b);
const q = (p) => chars[Math.min(chars.length - 1, Math.floor(chars.length * p))];
const over = stats.filter((s) => s.chars > 1800);
console.log(`✓ 原文摘录 ${quoted} 段（缺 anchor ${missing} 段）`);
console.log(`  字数：中位 ${q(0.5)} · 90 分位 ${q(0.9)} · 最长 ${chars[chars.length - 1]}`);
console.log(`  >1800 字：${over.length} 段${over.length ? ' —— ' + over.map((s) => `${s.id}#${s.n}(${s.chars})`).join(', ') : ''}`);
