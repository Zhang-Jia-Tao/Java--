#!/usr/bin/env node
/**
 * 实习经历数据校验
 *
 * 用法：node scripts/intern-lint.mjs [--strict]
 *
 * 校验项：
 *   1. tasks/*.json 可解析、id 与文件名一致、必填字段齐全
 *   2. 三层口述稿汉字数与段落数落在口径内（s60 195–265 / s180 560–740 / s600 700–950）
 *   3. decisions ≥2、followUps ≥3、metrics ≥3、commits 行数非负
 *   3b. 可背性：defects 为 0 的卡必须写 noDefectNote（≥30 字，说明为什么没有坑）；s60 必须出现数字或数量词
 *      （「多个 / 若干 / 一些」不算——面试里说不出数字就等于没讲，这条挡住的是纯定性的稿子）
 *   4. 脱敏黑名单扫描（黑名单放在 site/.private-wordlist.json，被 gitignore；缺失则跳过）
 *   5. platforms/*.json 必填字段齐全、features 引用的 taskId 必须存在、同样过黑名单
 *   6. --strict 时把「段落数越界」也当失败
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const TASKS = path.join(ROOT, 'src', 'data', 'intern', 'tasks');
const PLATFORMS = path.join(ROOT, 'src', 'data', 'intern', 'platforms');
const PRIVATE = path.join(ROOT, '.private-wordlist.json');
const strict = process.argv.includes('--strict');

const RANGE = {
  s60: [195, 265, 3, 5],
  s180: [560, 740, 6, 8],
  s600: [700, 950, 5, 8]
};

const cjk = (s) => ((s || '').match(/[\u4e00-\u9fa5]/g) || []).length;
const paras = (s) => (s || '').split(/\n+/).filter((x) => x.trim()).length;
const est = (s) => {
  const c = cjk(s);
  const en = ((s || '').match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || []).join('').length;
  return Math.round(c / 4.3 + en / 12 + paras(s) * 0.6);
};

let blacklist = [];
if (fs.existsSync(PRIVATE)) {
  try {
    blacklist = JSON.parse(fs.readFileSync(PRIVATE, 'utf8')).words ?? [];
  } catch (e) {
    console.warn(`黑名单读取失败：${e.message}`);
  }
} else {
  console.log('提示：未找到 site/.private-wordlist.json，跳过脱敏扫描（该文件不进版本库）');
}

const files = fs.readdirSync(TASKS).filter((f) => f.endsWith('.json'));
const fails = [];
const warns = [];
const rows = [];

for (const f of files.sort()) {
  const id = f.replace(/\.json$/, '');
  let t;
  try {
    t = JSON.parse(fs.readFileSync(path.join(TASKS, f), 'utf8'));
  } catch (e) {
    fails.push(`${f}：JSON 解析失败 — ${e.message}`);
    continue;
  }

  if (t.id !== id) fails.push(`${f}：id(${t.id}) 与文件名不一致`);
  for (const k of ['title', 'oneLiner', 'requirement', 'implementation', 'speak', 'metrics', 'commits', 'followUps']) {
    if (t[k] === undefined) fails.push(`${f}：缺字段 ${k}`);
  }
  if (!['A', 'B'].includes(t.company)) fails.push(`${f}：company 非法 ${t.company}`);
  if (!t.requirement?.raw || !t.requirement?.why) fails.push(`${f}：requirement.raw/why 为空`);
  if (!Array.isArray(t.implementation?.decisions) || t.implementation.decisions.length < 2)
    fails.push(`${f}：decisions 少于 2 条`);
  if (!Array.isArray(t.followUps) || t.followUps.length < 3) fails.push(`${f}：followUps 少于 3 条`);
  if (!Array.isArray(t.metrics) || t.metrics.length < 3) fails.push(`${f}：metrics 少于 3 项`);

  // 可背性：缺陷为 0 的卡必须说明为什么没有坑
  const defCount = (t.defects ?? []).length;
  if (defCount === 0) {
    const note = (t.noDefectNote ?? '').trim();
    if (!note) fails.push(`${f}：没有缺陷也没有 noDefectNote（被问「踩过什么坑」会答不上来）`);
    else if (cjk(note) < 30) fails.push(`${f}：noDefectNote 只有 ${cjk(note)} 字，少于 30 字`);
  } else if ((t.noDefectNote ?? '').trim()) {
    warns.push(`${f}：有 ${defCount} 起缺陷却写了 noDefectNote`);
  }

  // 可背性：60 秒稿必须有数字或数量词
  const s60Text = t.speak?.s60 ?? '';
  if (!/[0-9０-９]|[一二两三四五六七八九十百千万亿]|[%％‰]|[0-9]+\s*(ms|s|分钟|小时|天|倍)/.test(s60Text)) {
    fails.push(`${f}：s60 全篇没有数字/数量词，面试现场会讲空`);
  }
  for (const c of t.commits ?? []) {
    if (c.add != null && c.add < 0) fails.push(`${f}：commits ${c.hash} add 为负`);
    if (!/^[0-9a-f]{6,40}$/.test(String(c.hash ?? ''))) fails.push(`${f}：commits hash 格式可疑 ${c.hash}`);
  }

  // 三层口述稿
  const cells = {};
  for (const [k, [lo, hi, pLo, pHi]] of Object.entries(RANGE)) {
    const text = t.speak?.[k] ?? '';
    const c = cjk(text);
    const p = paras(text);
    cells[k] = `${c}字/${p}段/${est(text)}s`;
    if (c < lo || c > hi) fails.push(`${f}：${k} 汉字 ${c} 越界（${lo}–${hi}）`);
    if (p < pLo || p > pHi) {
      const msg = `${f}：${k} 段落 ${p} 越界（${pLo}–${pHi}）`;
      strict ? fails.push(msg) : warns.push(msg);
    }
  }

  // 脱敏：id 是 slug，不参与扫描
  const body = JSON.stringify({ ...t, id: undefined });
  for (const w of blacklist) {
    const acronym = /^[A-Z]{2,8}$/.test(w);
    const hay = acronym ? body : body.toLowerCase();
    const needle = acronym ? w : w.toLowerCase();
    if (hay.includes(needle)) fails.push(`${f}：命中黑名单词「${w}」`);
  }

  rows.push({
    id,
    seq: t.seq,
    co: t.company,
    title: t.title,
    ...cells,
    def: (t.defects ?? []).length,
    commits: (t.commits ?? []).length
  });
}

// ---- 平台档案（platforms/*.json）：字段齐全 + taskId 必须存在 + 同样过黑名单 ----
const platformRows = [];
if (fs.existsSync(PLATFORMS)) {
  const taskIds = new Set(rows.map((r) => r.id));
  for (const f of fs.readdirSync(PLATFORMS).filter((x) => x.endsWith('.json')).sort()) {
    let p;
    try {
      p = JSON.parse(fs.readFileSync(path.join(PLATFORMS, f), 'utf8'));
    } catch (e) {
      fails.push(`platforms/${f}：JSON 解析失败 — ${e.message}`);
      continue;
    }

    for (const k of ['key', 'alias', 'code', 'tagline', 'oneLiner', 'purpose', 'users', 'scale', 'domains', 'chain', 'features', 'config']) {
      if (p[k] === undefined) fails.push(`platforms/${f}：缺字段 ${k}`);
    }
    if (!Array.isArray(p.features) || p.features.length < 3) fails.push(`platforms/${f}：features 少于 3 条`);

    for (const ft of p.features ?? []) {
      for (const k of ['title', 'kind', 'period', 'service', 'what', 'delivered']) {
        if (!ft[k]) fails.push(`platforms/${f}：feature「${ft.title ?? '?'}」缺 ${k}`);
      }
      if (!Array.isArray(ft.commits)) fails.push(`platforms/${f}：feature「${ft.title}」commits 不是数组`);
      if (ft.taskId && !taskIds.has(ft.taskId)) {
        fails.push(`platforms/${f}：feature「${ft.title}」引用了不存在的任务卡 ${ft.taskId}`);
      }
    }

    for (const k of ['dbPool', 'middleware', 'threadPools', 'traps']) {
      if (!p.config?.[k]) fails.push(`platforms/${f}：config 缺 ${k}`);
    }

    const body = JSON.stringify(p);
    for (const w of blacklist) {
      const acronym = /^[A-Z]{2,8}$/.test(w);
      const hay = acronym ? body : body.toLowerCase();
      const needle = acronym ? w : w.toLowerCase();
      if (hay.includes(needle)) fails.push(`platforms/${f}：命中黑名单词「${w}」`);
    }

    platformRows.push({
      key: p.key,
      名称: p.alias,
      需求缺陷: String((p.features ?? []).length),
      中间件: String((p.config?.middleware ?? []).length),
      线程池: String((p.config?.threadPools ?? []).length),
      隐患: String((p.config?.traps ?? []).length)
    });
  }
  if (platformRows.length) console.table(platformRows);
}

const totalCjk = rows.reduce((a, r) => {
  return (
    a +
    ['s60', 's180', 's600'].reduce((x, k) => x + Number(String(r[k]).split('字')[0]), 0)
  );
}, 0);

console.table(
  rows.map((r) => ({
    seq: r.seq,
    id: r.id,
    '公司': r.co,
    '60秒': r.s60,
    '主答': r.s180,
    '深挖': r.s600,
    '缺陷': r.def,
    '提交': r.commits
  }))
);

console.log(`\n任务卡 ${rows.length} 张，三层口述稿合计 ${totalCjk} 汉字；平台档案 ${platformRows.length} 份。`);

if (warns.length) {
  console.log(`\n⚠ 警告 ${warns.length} 条：`);
  for (const w of warns) console.log('  ' + w);
}
if (fails.length) {
  console.log(`\n✗ 失败 ${fails.length} 条：`);
  for (const x of fails) console.log('  ' + x);
  process.exit(1);
}
console.log('\n✓ 全部校验通过');
