#!/usr/bin/env node
/**
 * 把页面上的编辑回写进数据源
 *
 * 用法：
 *   node scripts/intern-apply.mjs                  # 读取 server-data/intern-edits.json 并回写
 *   node scripts/intern-apply.mjs --dry            # 只看会改哪些字段
 *   node scripts/intern-apply.mjs --from a.json    # 用导出的 JSON 回写
 *   node scripts/intern-apply.mjs --clear          # 回写后清空编辑存储（默认保留，便于回滚）
 *
 * 存储结构：
 *   { tasks: { "<taskId>": { "<dot.path>": { value, updatedAt, history } } } }
 * dot.path 支持数组下标，例如 implementation.decisions.0.chose、defects.1.fix、speak.s60
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const TASKS_DIR = path.join(ROOT, 'src', 'data', 'intern', 'tasks');
const STORE = path.join(ROOT, 'server-data', 'intern-edits.json');

const argv = process.argv.slice(2);
const dry = argv.includes('--dry');
const clear = argv.includes('--clear');
const fromIdx = argv.indexOf('--from');
const fromFile = fromIdx >= 0 ? argv[fromIdx + 1] : null;

const file = fromFile ? path.resolve(process.cwd(), fromFile) : STORE;
if (!fs.existsSync(file)) {
  console.error(`找不到编辑存储：${file}`);
  console.error('先起服务 node scripts/anno-server.mjs 并在页面上改几处，或指定 --from 导出文件。');
  process.exit(1);
}

const store = JSON.parse(fs.readFileSync(file, 'utf8'));
const tasks = store.tasks ?? {};
const ids = Object.keys(tasks);
if (!ids.length) {
  console.log('没有待回写的编辑。');
  process.exit(0);
}

/** 按 dot path 取值/写值 */
const readPath = (obj, segs) => segs.reduce((cur, s) => (cur == null ? undefined : cur[s]), obj);
const writePath = (obj, segs, value) => {
  let cur = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i];
    if (cur[seg] == null) {
      cur[seg] = /^\d+$/.test(segs[i + 1]) ? [] : {};
    }
    cur = cur[seg];
  }
  cur[segs[segs.length - 1]] = value;
};

let changedFields = 0;
let changedFiles = 0;
const report = [];

for (const id of ids) {
  const target = path.join(TASKS_DIR, `${id}.json`);
  if (!fs.existsSync(target)) {
    report.push(`✗ ${id}：数据文件不存在，跳过`);
    continue;
  }
  const data = JSON.parse(fs.readFileSync(target, 'utf8'));
  const fields = tasks[id] ?? {};
  let dirty = 0;
  for (const [dotPath, entry] of Object.entries(fields)) {
    if (!entry || entry.value === undefined) continue;
    const segs = dotPath.split('.');
    const before = readPath(data, segs);
    const same = JSON.stringify(before) === JSON.stringify(entry.value);
    if (same) continue;
    writePath(data, segs, entry.value);
    dirty++;
    const preview =
      typeof entry.value === 'string'
        ? entry.value.slice(0, 40).replace(/\n/g, ' ')
        : JSON.stringify(entry.value).slice(0, 60);
    report.push(`  ${id}.${dotPath} → ${preview}…`);
  }
  if (dirty === 0) {
    report.push(`· ${id}：无变化`);
    continue;
  }
  changedFields += dirty;
  changedFiles++;
  if (!dry) {
    fs.writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  }
  report.push(`✓ ${id}：回写 ${dirty} 个字段${dry ? '（dry-run 未落盘）' : ''}`);
}

console.log(report.join('\n'));
console.log(`\n合计：${changedFiles} 个文件、${changedFields} 个字段${dry ? '（dry-run）' : ''}`);

if (!dry && changedFields > 0) {
  if (clear) {
    fs.writeFileSync(file, JSON.stringify({ tasks: {}, updatedAt: Date.now() }, null, 1), 'utf8');
    console.log(`已清空编辑存储：${file}`);
  } else {
    console.log('编辑存储保留（可重复回写；确认无误后可加 --clear 清空）。');
  }
  console.log('\n下一步：cd site && node ./node_modules/astro/astro.js build');
}
