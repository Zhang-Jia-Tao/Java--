/**
 * 给「文档没有对应章节」的框架题补一份可读的补充章节。
 *
 * 内容不自创：全部来自该题已有的笔记字段——一句话、s600 展开、要点、源码锚点、
 * 陷阱、追问，重排成 doc 风格的章节，方便原文阅读器统一展示。
 * 产物：_review/框架补充.md（读器里标注「补充章节 · 按源码整理」）
 *
 * 用法：node scripts/gen-fw-doc.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PROJ = path.join(ROOT, 'src', 'data', 'project');
const OUT = path.join(ROOT, '..', '_review', '框架补充.md');
const AI_MODULES = ['foundation', 'ragent', 'eval'];

const files = fs.readdirSync(PROJ).filter((f) => f.endsWith('.json'));
const targets = [];
for (const f of files) {
  const q = JSON.parse(fs.readFileSync(path.join(PROJ, f), 'utf8'));
  if (AI_MODULES.includes(q.module)) continue;
  if (/#L\d+-L\d+/.test(String(q.source?.raw || ''))) continue; // 已有原文
  targets.push(q);
}
targets.sort((a, b) => a.id.localeCompare(b.id));

const chapters = [];
for (const q of targets) {
  const lines = [];
  lines.push(`## ${q.id} · ${q.title}`, '');
  lines.push(`### 一句话`, '', q.oneLine || '（略）', '');
  if (q.speak?.s600) lines.push(`### 展开`, '', q.speak.s600, '');
  if (q.speak?.s180 && !q.speak?.s600) lines.push(`### 展开`, '', q.speak.s180, '');

  const anchors = q.codeAnchors || [];
  if (anchors.length) {
    lines.push(`### 源码依据`, '');
    for (const a of anchors) {
      lines.push(`- \`${a.file}\` · ${a.symbol || ''}（L${a.line}）—— ${a.why || ''}`);
      if (a.snippet) {
        lines.push('', '```Java', a.snippet, '```', '');
      }
    }
    lines.push('');
  }

  const points = (q.points || []).map((p) => p.point).filter(Boolean);
  if (points.length) {
    lines.push(`### 要点`, '');
    points.forEach((p, i) => lines.push(`${i + 1}. ${p}`));
    lines.push('');
  }

  const pitfalls = q.pitfalls || [];
  if (pitfalls.length) {
    lines.push(`### 坑与边界`, '');
    pitfalls.forEach((p) => lines.push(`- ${p}`));
    lines.push('');
  }

  const metrics = q.metrics || [];
  if (metrics.length) {
    lines.push(`### 关键数字`, '');
    metrics.forEach((m) => lines.push(`- ${m.k}：${m.v}`));
    lines.push('');
  }

  const followUps = q.followUps || [];
  if (followUps.length) {
    lines.push(`### 追问`, '');
    followUps.forEach((f) => lines.push(`**${f.q}**`, '', f.a, ''));
  }

  chapters.push({ id: q.id, text: lines.join('\n') });
}

const header = [
  '# 框架补充（按源码整理）',
  '',
  '> 这一章是给「原始文档没有对应章节」的框架题补的阅读材料，**不是原始 md 的一部分**。',
  '> 内容全部来自项目源码与已有题目笔记（一句话 / 展开 / 要点 / 源码锚点 / 陷阱 / 追问），只做重排，不新增事实。',
  '> 阅读器里会标注为「补充章节 · 按源码整理」。',
  ''
].join('\n');

fs.writeFileSync(OUT, header + '\n' + chapters.map((c) => c.text).join('\n\n') + '\n', 'utf8');

// 计算每章行区间，供 gen-doc-data.mjs 复用
const text = fs.readFileSync(OUT, 'utf8').split(/\r?\n/);
const heads = text.map((l, i) => ({ i: i + 1, l })).filter((x) => /^##\s/.test(x.l));
const ranges = heads.map((h, k) => {
  const id = h.l.replace(/^##\s*/, '').split(' · ')[0].trim();
  const end = k + 1 < heads.length ? heads[k + 1].i - 1 : text.length;
  return { id, a: h.i, b: end };
});
fs.writeFileSync(path.join(ROOT, 'src', 'data', 'doc-ranges-fw.json'), JSON.stringify(ranges, null, 2) + '\n', 'utf8');
console.log(`生成 ${_reviewHack()} → ${OUT}`);
console.log(`补 ${chapters.length} 章：${chapters.map((c) => c.id).join(', ')}`);
console.log(`行区间写进 src/data/doc-ranges-fw.json`);

function _reviewHack() {
  return '_review/框架补充.md';
}
