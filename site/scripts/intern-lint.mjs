#!/usr/bin/env node
/**
 * 实习经历数据校验
 *
 * 用法：node scripts/intern-lint.mjs [--strict]
 *
 * 校验项：
 *   1. tasks/*.json 可解析、id 与文件名一致、必填字段齐全
 *   2. 核心代码：每张卡 ≥1 段；每段必须有 title / ref / code / notes / quiz；
 *      code 8–120 行、notes ≥2 条且 at 必须是 code 里真实出现的一段原文、quiz ≥1 问
 *      （notes 是「为什么不是另一种写法」，不是逐行翻译，所以注解原文必须能在代码里定位到）
 *   3. decisions ≥2、followUps ≥3、metrics ≥3、commits 行数非负
 *   3b. 可背性：defects 为 0 的卡必须写 noDefectNote（≥30 字，说明为什么没有坑）；
 *      每张卡至少一段代码的注释里出现数字或数量词（面试里说不出数字就等于没讲）
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

// 核心代码一段的行数口径：太短讲不出取舍，太长现场念不完
const CODE_LINES = [8, 120];

const cjk = (s) => ((s || '').match(/[\u4e00-\u9fa5]/g) || []).length;

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
  for (const k of ['title', 'oneLiner', 'requirement', 'implementation', 'code', 'metrics', 'commits', 'followUps']) {
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

  // 可背性：核心代码的注释里必须有数字或数量词（行数、上限、超时、倍数都算）
  const codeText = (t.code ?? []).map((c) => c.notes.map((n) => n.text).join('')).join('');
  if (!/[0-9０-９]|[一二两三四五六七八九十百千万亿]|[%％‰]/.test(codeText)) {
    fails.push(`${f}：核心代码注释全篇没有数字/数量词，面试现场会讲空`);
  }

  // 核心代码：结构 + 行数 + 注释可定位
  const codes = t.code ?? [];
  if (!Array.isArray(codes) || codes.length === 0) fails.push(`${f}：没有核心代码（code 为空）`);
  codes.forEach((c, i) => {
    const tag = `code[${i}]`;
    if (!c.title) fails.push(`${f}：${tag} 缺 title`);
    if (!c.ref) fails.push(`${f}：${tag} 缺 ref（出处）`);
    // ref 的类名必须在 implementation.keyClasses 里：那张清单是面试时能报出来的真实类名，
    // 编出来的类名在现场一追问「这个类在哪」就露馅
    const cls = String(c.ref || '').split('#')[0].trim().split('.').pop();
    if (cls && !(t.implementation?.keyClasses ?? []).includes(cls)) {
      fails.push(`${f}：${tag} ref 的类 ${cls} 不在 keyClasses 里`);
    }
    // 源码可追溯性：源码不在本机、或不是本人提交的，必须写清楚，不能默认读者以为是逐字原文
    if (!c.disclosure || cjk(c.disclosure) < 10) {
      fails.push(`${f}：${tag} 缺 disclosure（源码出处说明，≥10 汉字）`);
    }
    const body = String(c.code ?? '');
    const n = body.split('\n').length;
    if (!body.trim()) fails.push(`${f}：${tag} code 为空`);
    else if (n < CODE_LINES[0] || n > CODE_LINES[1])
      fails.push(`${f}：${tag} 代码 ${n} 行，越界（${CODE_LINES[0]}–${CODE_LINES[1]}）`);
    const notes = c.notes ?? [];
    if (notes.length < 2) fails.push(`${f}：${tag} 注释少于 2 条（要讲清为什么不是另一种写法）`);
    for (const nt of notes) {
      if (!nt.text || cjk(nt.text) < 15) fails.push(`${f}：${tag} 注释过短：${String(nt.at ?? '').slice(0, 20)}`);
      if (nt.at && !body.includes(String(nt.at).trim())) {
        fails.push(`${f}：${tag} 注释锚点 ${JSON.stringify(nt.at)} 在代码里找不到`);
      }
    }
    if (!Array.isArray(c.quiz) || c.quiz.length < 1) fails.push(`${f}：${tag} 没有代码旁的追问（quiz）`);
    for (const q of c.quiz ?? []) {
      if (!q.q || !q.a) fails.push(`${f}：${tag} quiz 缺 q 或 a`);
    }
  });
  for (const c of t.commits ?? []) {
    if (c.add != null && c.add < 0) fails.push(`${f}：commits ${c.hash} add 为负`);
    if (!/^[0-9a-f]{6,40}$/.test(String(c.hash ?? ''))) fails.push(`${f}：commits hash 格式可疑 ${c.hash}`);
  }

  // 核心代码统计
  const codeTotal = (t.code ?? []).reduce((a, c) => a + String(c.code ?? '').split('\n').length, 0);
  const noteTotal = (t.code ?? []).reduce((a, c) => a + (c.notes ?? []).length, 0);
  const quizTotal = (t.code ?? []).reduce((a, c) => a + (c.quiz ?? []).length, 0);
  const cells = { code: `${(t.code ?? []).length} 段 / ${codeTotal} 行 / 注释 ${noteTotal} / 追问 ${quizTotal}` };

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

const totalCodeLines = rows.reduce((a, r) => a + Number(String(r.code).split('/')[1].replace(/[^0-9]/g, '')), 0);

console.table(
  rows.map((r) => ({
    seq: r.seq,
    id: r.id,
    '公司': r.co,
    '核心代码': r.code,
    '缺陷': r.def,
    '提交': r.commits
  }))
);

console.log(`\n任务卡 ${rows.length} 张，核心代码合计 ${totalCodeLines} 行；平台档案 ${platformRows.length} 份。`);

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
