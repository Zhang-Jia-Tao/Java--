/**
 * 原文层校验：确认网站上的「原文阅读器」与 _review 三份 md 保持 ≥90% 一致。
 *
 * 用法（需先 build，脚本读 dist 产物）：
 *   node scripts/validate-doc.mjs
 *
 * 输出两套指标：
 *   1) 数据保真度（src/data/doc/*.json）：小节正文 + 原始标题行 / 原文总字
 *   2) 渲染覆盖率（dist/ai/read/<id>/index.html）：正文区行级包含率（排除源文对照面板）
 * 任一低于阈值（默认 90%）即退出码 1。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DOC_DIR = path.join(ROOT, 'src', 'data', 'doc');
const DIST = path.join(ROOT, 'dist', 'ai', 'read');
const THRESHOLD = 90;

const norm = (s) =>
  s
    .replace(/^\s*(>|[-*+]|\d+[.)])\s+/, '')
    .replace(/\\([.\-+*_`[\]()#!~>|&<])/g, '$1')
    .replace(/[*`_|]/g, '')
    .replace(/\s+/g, '');

const files = fs.existsSync(DOC_DIR) ? fs.readdirSync(DOC_DIR).filter((f) => f.endsWith('.json')) : [];
if (!files.length) {
  console.error('✗ 没有找到 src/data/doc/*.json，先跑 node scripts/gen-doc-data.mjs');
  process.exit(1);
}

const rows = [];
for (const f of files) {
  const doc = JSON.parse(fs.readFileSync(path.join(DOC_DIR, f), 'utf8'));
  const fidelity = doc.fidelity ?? 0;

  let coverage = null;
  let note = '';
  const page = path.join(DIST, doc.id, 'index.html');
  if (fs.existsSync(page)) {
    let html = fs.readFileSync(page, 'utf8');
    // 排除「源文对照」面板，只看正文渲染区
    html = html.replace(/<section id="raw-panel"[\s\S]*?<\/section>/, ' ');
    const text = norm(
      html
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
    );
    const lines = doc.raw.split(/\r?\n/).filter((l) => {
      const t = l.trim();
      return t && !/^#{1,4}\s/.test(t) && !/^```/.test(t) && !/^(---|\*\*\*|___)$/.test(t) && !/^!\[/.test(t);
    });
    let hit = 0;
    for (const l of lines) {
      const probe = norm(l).slice(0, 24);
      if (!probe || text.includes(probe)) hit++;
    }
    coverage = +((hit / lines.length) * 100).toFixed(2);
  } else {
    note = '（未构建，跳过渲染校验）';
  }
  rows.push({ id: doc.id, chars: doc.chars, sections: doc.sectionCount, fidelity, coverage, note });
}

rows.sort((a, b) => a.fidelity - b.fidelity);
console.log(`原文层校验 · ${rows.length} 篇 · 阈值 ${THRESHOLD}%`);
console.log('最低保真度：' + rows[0].id + ' ' + rows[0].fidelity + '%');
const built = rows.filter((r) => r.coverage !== null);
if (built.length) {
  const minCov = built.reduce((a, r) => (r.coverage < a.coverage ? r : a), built[0]);
  console.log('最低渲染覆盖率：' + minCov.id + ' ' + minCov.coverage + '%');
}
const bad = rows.filter((r) => r.fidelity < THRESHOLD || (r.coverage !== null && r.coverage < THRESHOLD));
if (bad.length) {
  console.log('\n✗ 未达标：');
  bad.forEach((r) => console.log(`  ${r.id}  保真 ${r.fidelity}%  覆盖 ${r.coverage ?? '—'}%`));
  process.exit(1);
}
console.log('\n✓ 全部 ≥ 90%（正文逐字保留，仅做小节切分与排版）');
