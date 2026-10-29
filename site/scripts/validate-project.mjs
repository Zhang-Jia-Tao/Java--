/**
 * 项目题结构校验 + 源码锚点回归
 *
 *   node scripts/validate-project.mjs            # 只做结构校验
 *   node scripts/validate-project.mjs --anchors  # 额外核对锚点文件/行号（需要 E:\Project\onecoupon）
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const QDIR = path.join(ROOT, 'src', 'data', 'project');
const META = path.join(ROOT, 'src', 'data', 'project-meta.json');
const REPO = 'E:/Project/onecoupon';
/** AI 专区的三个模块锚点在 Ragent 仓库 */
const REPO_BY_MODULE = {
  foundation: 'C:/Users/zhangjiatao6/IdeaProjects/Ragent',
  ragent: 'C:/Users/zhangjiatao6/IdeaProjects/Ragent',
  eval: 'C:/Users/zhangjiatao6/IdeaProjects/Ragent'
};
const repoOf = (moduleKey) => REPO_BY_MODULE[moduleKey] || REPO;
const checkAnchors = process.argv.includes('--anchors');
const skipArg = process.argv.find((a) => a.startsWith('--skip='));
const skipPrefixes = skipArg ? skipArg.slice('--skip='.length).split(',') : [];

const meta = JSON.parse(fs.readFileSync(META, 'utf8'));
const moduleKeys = new Set(meta.modules.map((m) => m.key));

const required = [
  'id', 'module', 'title', 'star', 'question', 'tags', 'status', 'oneLine',
  'speak', 'points', 'codeAnchors', 'flow', 'metrics', 'pitfalls', 'variants',
  'review', 'provenance', 'drill', 'source'
];

const issues = [];
const files = fs
  .readdirSync(QDIR)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => !skipPrefixes.some((p) => f.startsWith(p)))
  .sort();
const seen = new Set();
const counts = {};

for (const f of files) {
  const q = JSON.parse(fs.readFileSync(path.join(QDIR, f), 'utf8'));
  const at = (msg) => issues.push(`${f}: ${msg}`);
  const isDraft = q.status === 'draft' || q.status === 'pending';

  for (const k of required) if (!(k in q)) at(`缺字段 ${k}`);
  if (seen.has(q.id)) at(`id 重复 ${q.id}`);
  seen.add(q.id);
  if (!moduleKeys.has(q.module)) at(`module 不在 meta：${q.module}`);
  counts[q.module] = (counts[q.module] ?? 0) + 1;

  // 评分自洽
  const r = q.review ?? {};
  const sum = (r.A ?? 0) + (r.B ?? 0) + (r.C ?? 0) + (r.D ?? 0) + (r.E ?? 0);
  if (sum !== r.total) at(`评分和 ${sum} ≠ total ${r.total}`);
  const expect = r.total >= 90 ? 'excellent' : r.total >= 80 ? 'good' : r.total >= 70 ? 'fair' : 'weak';
  if (!isDraft && r.verdict !== expect) at(`verdict ${r.verdict} 与分数 ${r.total} 不符（应为 ${expect}）`);
  for (const h of r.hardErrors ?? []) {
    if (typeof h === 'string') at('hardErrors 含字符串（应为对象）');
    else if (!h.level || !h.wrong || !h.right) at('hardErrors 对象缺 level/wrong/right');
  }

  // 答题点
  for (const p of q.points ?? []) {
    if (!['done', 'partial', 'missing'].includes(p.state)) at(`points.state 非法：${p.state}`);
    if (p.state === 'missing' && !p.note) at(`missing 未带 note：${p.point}`);
  }

  // 口述稿
  for (const k of ['s60', 's180', 's600']) if (!isDraft && !q.speak?.[k]) at(`speak.${k} 为空`);
  const fence = (q.speak?.s600 ?? '').split('```').length - 1;
  if (fence % 2 !== 0) at('speak.s600 代码围栏未配对');

  // 锚点
  const anchors = q.codeAnchors ?? [];
  if (!isDraft && anchors.length < 2) at(`锚点仅 ${anchors.length} 条`);
  for (const a of anchors) {
    if (!a.file) at('锚点缺 file');
    if (a.line !== undefined && !(Number.isInteger(a.line) && a.line > 0)) at(`锚点行号非法：${a.symbol} ${a.line}`);
  }

  // 默写
  if (!isDraft && !(q.drill?.keywords ?? []).length) at('drill.keywords 为空');
  for (const b of q.drill?.blanks ?? []) if (!b.answer) at('blanks.answer 为空');

  // 锚点回归
  if (checkAnchors) {
    const repoRoot = repoOf(q.module);
    for (const a of anchors) {
      if (isDraft || /\.md$/i.test(a.file)) continue; // 抽取初稿的锚点指向 md 本身，不参与源码回归
      const p = path.join(repoRoot, a.file.replace(/^E:[\\/]Project[\\/]onecoupon[\\/]/i, '').replace(/^C:[\\/]Users[\\/]zhangjiatao6[\\/]IdeaProjects[\\/]Ragent[\\/]/i, ''));
      if (!fs.existsSync(p)) {
        at(`锚点文件不存在：${a.file}`);
        continue;
      }
      if (!a.snippet || !Number.isInteger(a.line)) continue;
      const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
      const first = a.snippet.split('\n')[0].trim();
      if (!first) continue;
      let hit = -1;
      for (let i = 0; i < lines.length; i++) if (lines[i].includes(first)) { hit = i + 1; break; }
      if (hit < 0) at(`代码片段未命中：${a.file} 「${first.slice(0, 50)}」`);
      else if (Math.abs(hit - a.line) > 8) at(`行号偏差 ${Math.abs(hit - a.line)}：${a.file}:${a.line} 实际 ${hit}`);
    }
  }
}

// meta 计数
for (const m of meta.modules) {
  if ((counts[m.key] ?? 0) !== m.count) issues.push(`project-meta 计数不符：${m.key} 实际 ${counts[m.key] ?? 0} / 记录 ${m.count}`);
}
if (Number(meta.total) !== files.length) issues.push(`project-meta total 不符：实际 ${files.length} / 记录 ${meta.total}`);

const avg = files.length
  ? Math.round(files.reduce((a, f) => a + (JSON.parse(fs.readFileSync(path.join(QDIR, f), 'utf8')).review?.total ?? 0), 0) / files.length)
  : 0;

console.log(`题目 ${files.length} 篇 · 模块 ${Object.keys(counts).length} 个 · 平均 ${avg} 分`);
console.log('模块分布：', JSON.stringify(counts));
if (issues.length) {
  console.log(`\n✗ ${issues.length} 个问题：`);
  for (const i of issues.slice(0, 80)) console.log('  -', i);
  if (issues.length > 80) console.log(`  … 其余 ${issues.length - 80} 条省略`);
  process.exit(1);
} else {
  console.log('\n✓ 结构校验全部通过' + (checkAnchors ? '（含锚点回归）' : ''));
}
