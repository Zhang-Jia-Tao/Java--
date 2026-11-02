/**
 * 资深评审数据校验：分片 schema + 质量门槛 + 覆盖率 + quote 溯源。
 * 用法：node scripts/validate-expert.mjs [--strict]
 *   --strict：覆盖率不满 516 条、或 quote 命中率 <96% 也算失败
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SD = path.join(ROOT, 'src/data/expert');
const strict = process.argv.includes('--strict');

const KINDS = new Set(['praise', 'risk', 'version', 'depth', 'production', 'provenance']);
const SCOPES = {
  hot: new Set(['statement', 'approach', 'code', 'walkthrough', 'complexity', 'pitfalls', 'whole']),
  java: new Set(['original', 'summary', 'checklist', 'followUps', 'improved', 'whole']),
  proj: new Set(['oneLine', 's60', 's180', 's600', 'points', 'pitfalls', 'followUps', 'metrics', 'variants', 'whole'])
};
const MIN_TXT = 60;
const MAX_TXT = 260;

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const norm = (s) =>
  String(s ?? '')
    .replace(/[\s\u3000]+/g, '')
    .replace(/[`*_>#]/g, '')
    .replace(/[「」『』“”"'’]/g, '');

/* ---------- 题库清单（516 条） ---------- */
const universe = new Map(); // id -> { area, corpus }
for (const f of fs.readdirSync(path.join(ROOT, 'src/data/questions')).filter((f) => /^\d+[ab]?-\d+\.json$/.test(f))) {
  const q = readJson(path.join(ROOT, 'src/data/questions', f));
  universe.set(q.id, { area: 'java', corpus: norm(JSON.stringify(q)), codeLines: 0 });
}
for (const f of fs.readdirSync(path.join(ROOT, 'src/data/hot200')).filter((f) => f.endsWith('.json') && f !== 'index.json')) {
  const q = readJson(path.join(ROOT, 'src/data/hot200', f));
  universe.set(q.slug, { area: 'hot', corpus: norm(JSON.stringify(q)), codeLines: String(q.code?.source || '').split('\n').length });
}
for (const f of fs.readdirSync(path.join(ROOT, 'src/data/project')).filter((f) => f.endsWith('.json'))) {
  const q = readJson(path.join(ROOT, 'src/data/project', f));
  universe.set(q.id, { area: 'proj', corpus: norm(JSON.stringify(q)), codeLines: 0 });
}

const errs = [];
const warns = [];
const stats = { entries: 0, comments: 0, byArea: {}, kinds: {}, roles: {} };
const seenText = new Map();
let quoteTotal = 0;
let quoteOk = 0;

const shards = fs.readdirSync(SD).filter((f) => /^part-.*\.json$/.test(f)).sort();
for (const f of shards) {
  let arr;
  try {
    arr = readJson(path.join(SD, f));
  } catch (e) {
    errs.push(`${f}: JSON 解析失败 — ${e.message}`);
    continue;
  }
  if (!Array.isArray(arr)) {
    errs.push(`${f}: 顶层不是数组`);
    continue;
  }
  for (const it of arr) {
    stats.entries++;
    const where = `${f} · ${it?.id ?? '?'}`;
    const u = universe.get(it?.id);
    if (!u) {
      errs.push(`${where}: id 不在 516 条题库里`);
      continue;
    }
    if (it.role !== 'java' && it.role !== 'ai') errs.push(`${where}: role 非法 ${it.role}`);
    stats.roles[it.role] = (stats.roles[it.role] ?? 0) + 1;
    stats.byArea[u.area] = (stats.byArea[u.area] ?? 0) + 1;
    const cs = Array.isArray(it.comments) ? it.comments : [];
    if (cs.length < 3 || cs.length > 5) errs.push(`${where}: 批注 ${cs.length} 条（要求 3–5）`);
    const kinds = new Set();
    for (const c of cs) {
      stats.comments++;
      stats.kinds[c.kind] = (stats.kinds[c.kind] ?? 0) + 1;
      if (!KINDS.has(c.kind)) errs.push(`${where}: kind 非法 ${c.kind}`);
      if (!SCOPES[u.area].has(c.scope)) errs.push(`${where}: scope=${c.scope} 不属于 ${u.area}`);
      kinds.add(c.kind);
      const t = String(c.text ?? '').trim();
      if (t.length < MIN_TXT || t.length > MAX_TXT) errs.push(`${where}: text 长度 ${t.length}（要求 ${MIN_TXT}–${MAX_TXT}）`);
      if (/[\r\n]/.test(t)) errs.push(`${where}: text 含裸换行`);
      if (/^(这条评论|本题|这题)/.test(t)) warns.push(`${where}: text 以「${t.slice(0, 4)}」开头`);
      if (seenText.has(t)) errs.push(`${where}: 与 ${seenText.get(t)} 批注文字完全重复`);
      else seenText.set(t, where);
      const q = String(c.quote ?? '').trim();
      if (q) {
        quoteTotal++;
        if (q.length > 60) errs.push(`${where}: quote ${q.length} 字（≤60）`);
        if (norm(u.corpus).includes(norm(q))) quoteOk++;
        else errs.push(`${where}: quote 在原文里找不到 —— 「${q}」`);
      }
      if (c.line != null) {
        const ln = Number(c.line);
        if (!Number.isFinite(ln) || ln < 1) errs.push(`${where}: line 非法 ${c.line}`);
        else if (u.area === 'hot' && ln > u.codeLines) errs.push(`${where}: line ${ln} 超出代码行数 ${u.codeLines}`);
      }
      if (c.scope === 'code' && u.area === 'hot' && !/L\d+/.test(t)) warns.push(`${where}: scope=code 但 text 里没有 L 行号`);
    }
    if (kinds.size < 2) errs.push(`${where}: kind 只覆盖 ${[...kinds].join(',')}（至少 2 种）`);
    if (cs.filter((c) => c.kind === 'praise').length > 1) errs.push(`${where}: praise 超过 1 条`);
  }
}

/* ---------- 覆盖率：合并后的 expert 字段 ---------- */
const covered = new Set();
const scan = (dir, filter, idOf) => {
  for (const f of fs.readdirSync(path.join(ROOT, 'src/data', dir)).filter(filter)) {
    const q = readJson(path.join(ROOT, 'src/data', dir, f));
    if (q.expert?.comments?.length) covered.add(idOf(q));
  }
};
scan('questions', (f) => /^\d+[ab]?-\d+\.json$/.test(f), (q) => q.id);
scan('hot200', (f) => f.endsWith('.json') && f !== 'index.json', (q) => q.slug);
scan('project', (f) => f.endsWith('.json'), (q) => q.id);

const missing = [...universe.keys()].filter((id) => !covered.has(id));
const areaOf = (id) => universe.get(id).area;
const missByArea = { java: 0, hot: 0, proj: 0 };
for (const id of missing) missByArea[areaOf(id)]++;

console.log(`分片 ${shards.length} 个 · ${stats.entries} 题 · ${stats.comments} 条批注`);
console.log(`kind 分布：${Object.entries(stats.kinds).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
console.log(`角色：java ${stats.roles.java ?? 0} · ai ${stats.roles.ai ?? 0}`);
console.log(`quote 溯源命中：${quoteOk}/${quoteTotal}${quoteTotal ? `（${((quoteOk / quoteTotal) * 100).toFixed(1)}%）` : ''}`);
console.log(`覆盖：${covered.size}/${universe.size} 题（Java ${58 - missByArea.java}/58 · Hot200 ${103 - missByArea.hot}/103 · 项目族 ${355 - missByArea.proj}/355）`);
if (missing.length && missing.length <= 40) console.log(`  未覆盖：${missing.join(', ')}`);
else if (missing.length) console.log(`  未覆盖前 40：${missing.slice(0, 40).join(', ')} …`);

if (warns.length) {
  console.log(`\n提示 ${warns.length} 条：`);
  warns.slice(0, 15).forEach((w) => console.log('  · ' + w));
  if (warns.length > 15) console.log(`  …另有 ${warns.length - 15} 条`);
}

if (errs.length) {
  console.log(`\n✗ 错误 ${errs.length} 条：`);
  errs.slice(0, 40).forEach((e) => console.log('  · ' + e));
  if (errs.length > 40) console.log(`  …另有 ${errs.length - 40} 条`);
} else {
  console.log('\n✓ schema 与质量门禁全部通过');
}

const quoteRate = quoteTotal ? quoteOk / quoteTotal : 1;
const full = missing.length === 0;
if (strict) {
  if (!full) {
    console.log(`✗ 覆盖率未满：还缺 ${missing.length} 题`);
    process.exit(1);
  }
  if (quoteRate < 0.96) {
    console.log(`✗ quote 溯源命中率 ${(quoteRate * 100).toFixed(1)}% < 96%`);
    process.exit(1);
  }
}
process.exit(errs.length ? 1 : 0);
