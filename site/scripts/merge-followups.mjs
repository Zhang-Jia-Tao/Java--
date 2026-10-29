/**
 * 合并「可能追问 · 满分回答」（由分片子任务写到 src/data/followups/part-*.json）
 * 到 src/data/project/<id>.json 的 followUps 字段。
 *
 * 规则：作者写的追排放前面（star 4，篇幅 >= 80 字），原有从原文引用块抽的追排保留在后面；
 * 按问句前 12 字去重；每题最多 4 条。
 *
 * 用法：node scripts/merge-followups.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PATCH = path.join(ROOT, 'src', 'data', 'followups');
const QDIR = path.join(ROOT, 'src', 'data', 'project');

if (!fs.existsSync(PATCH)) {
  console.error('没有 src/data/followups/ 目录');
  process.exit(1);
}

const key = (s) => String(s || '').replace(/[？?！!。，,、\s]/g, '').slice(0, 12);

let files = fs.readdirSync(PATCH).filter((f) => f.endsWith('.json'));
const merged = {};
let total = 0;
const warnings = [];

for (const f of files) {
  const raw = fs.readFileSync(path.join(PATCH, f), 'utf8').replace(/^\uFEFF/, '').trim();
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    // 常见问题：尾随逗号 / 注释。先做保守清理再试一次
    const fixed = raw
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/,\s*([}\]])/g, '$1');
    try {
      data = JSON.parse(fixed);
      warnings.push(`${f}: JSON 有语法瑕疵，已自动修复后解析`);
    } catch (e2) {
      warnings.push(`${f}: JSON 解析失败，已跳过（${e2.message.slice(0, 80)}）`);
      continue;
    }
  }
  for (const [id, list] of Object.entries(data)) {
    if (!Array.isArray(list)) {
      warnings.push(`${id}: 不是数组，跳过`);
      continue;
    }
    const clean = list
      .filter((x) => x && typeof x.q === 'string' && typeof x.a === 'string')
      .map((x) => ({ q: x.q.trim().replace(/\s+/g, ' '), a: x.a.trim().replace(/\s+/g, ' '), star: 4 }))
      .filter((x) => x.q.length >= 6 && x.a.length >= 60);
    if (!clean.length) continue;
    merged[id] = clean;
    total += clean.length;
  }
}

console.log(`读取 ${files.length} 个分片，覆盖 ${Object.keys(merged).length} 题 / ${total} 条追问`);
for (const w of warnings) console.log('⚠', w);

let changed = 0;
for (const [id, authored] of Object.entries(merged)) {
  const p = path.join(QDIR, `${id}.json`);
  if (!fs.existsSync(p)) {
    console.log('⚠ 题目不存在：', id);
    continue;
  }
  const q = JSON.parse(fs.readFileSync(p, 'utf8'));
  const existing = Array.isArray(q.followUps) ? q.followUps : [];
  const seen = new Set(authored.map((x) => key(x.q)));
  const keep = existing.filter((x) => x && x.q && !seen.has(key(x.q)));
  const list = [...authored, ...keep].slice(0, 4);
  q.followUps = list;
  fs.writeFileSync(p, JSON.stringify(q, null, 2) + '\n', 'utf8');
  changed++;
}

console.log(`已写入 ${changed} 道题的 followUps`);
const all = fs
  .readdirSync(QDIR)
  .filter((f) => /^(mysql|redis|mq)-\d\d\.json$/.test(f))
  .map((f) => ({ id: f.replace('.json', ''), fu: JSON.parse(fs.readFileSync(path.join(QDIR, f), 'utf8')).followUps.length }));
const none = all.filter((x) => x.fu === 0);
console.log(`题库跟进覆盖：${all.length - none.length}/${all.length} 题有追问`);
if (none.length) console.log('仍无追问：', none.map((x) => x.id).join(', '));
const avg = (all.reduce((a, x) => a + x.fu, 0) / all.length).toFixed(1);
console.log(`平均每题 ${avg} 条追问`);
