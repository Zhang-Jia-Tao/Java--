/**
 * 把「原稿里给了多种实现」的题，拆成 code.blocks
 *
 * 原则：
 * - code.source 一个字节都不动（默写自测 / 原文对照都读它）
 * - 只新增 code.blocks，供详情页按解法切换
 * - 数据全部来自 _review/Hot200.md 的代码围栏，顺序与原文一致
 *
 * 用法：node scripts/gen-hot200-blocks.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const MD = path.resolve(ROOT, '../_review/Hot200.md');
const DIR = path.join(ROOT, 'src/data/hot200');
const CHECK = process.argv.includes('--check');

/** 人工核对过的标签（对着代码确认过算法，不是照着标题瞎写） */
const LABELS = {
  42: ['双指针', '单调递减栈'],
  62: ['二维 DP', '一维 DP（滚动数组）'],
  200: ['DFS 深度优先', 'BFS 广度优先'],
  207: ['BFS 拓扑排序（入度）', 'DFS 三色标记'],
  695: ['BFS 广度优先', 'DFS 深度优先']
};

const lines = fs.readFileSync(MD, 'utf8').split('\n');
const isHead = (l) => /^#{1,2}\s/.test(l);

const sectionOf = (startLine) => {
  let end = lines.length;
  for (let k = startLine; k < lines.length; k++) {
    if (isHead(lines[k])) {
      end = k;
      break;
    }
  }
  return lines.slice(startLine - 1, end);
};

const fencesOf = (body) => {
  const out = [];
  for (let i = 0; i < body.length; i++) {
    if (!/^```\s*[Jj]ava\s*$/.test(body[i])) continue;
    const buf = [];
    let j = i + 1;
    while (j < body.length && !/^```\s*$/.test(body[j])) buf.push(body[j++]);
    out.push(buf.join('\n'));
    i = j;
  }
  return out;
};

/** 代码块自检：必须是从 class/接口开头、花括号配平 */
const looksComplete = (src) => {
  const open = (src.match(/\{/g) || []).length;
  const close = (src.match(/\}/g) || []).length;
  return open === close && /(class|interface)\s+\w+/.test(src);
};

const targets = Object.keys(LABELS).map(Number);
let changed = 0;
const report = [];

for (const lc of targets) {
  const file = path.join(DIR, `lc${lc}.json`);
  const q = JSON.parse(fs.readFileSync(file, 'utf8'));
  let blocks;

  if (lc === 62) {
    // 原稿同一围栏里用「----------一维优化---------」分隔
    const src = q.code.source.split('\n');
    const sep = src.findIndex((l) => /^-{5,}.*-{5,}$/.test(l.trim()));
    if (sep < 0) throw new Error('lc62 没找到分隔行');
    const a = src.slice(0, sep).join('\n').replace(/\s+$/, '');
    const b = src.slice(sep + 1).join('\n').replace(/^\s+/, '').replace(/\s+$/, '');
    blocks = [a, b];
  } else {
    blocks = fencesOf(sectionOf(q.sourceLine));
  }

  if (blocks.length !== LABELS[lc].length) {
    throw new Error(`lc${lc} 围栏数 ${blocks.length} ≠ 标签数 ${LABELS[lc].length}`);
  }
  const shaped = blocks.map((source, i) => {
    if (!looksComplete(source)) throw new Error(`lc${lc} 第 ${i + 1} 块不完整`);
    return { label: LABELS[lc][i], source, lines: source.split('\n').length };
  });

  if (CHECK) {
    report.push(`lc${lc}: ${shaped.map((b) => `${b.label} ${b.lines}行`).join(' | ')}${q.code.blocks ? '' : '  ← 未写入'}`);
    continue;
  }
  q.code.blocks = shaped;
  fs.writeFileSync(file, JSON.stringify(q, null, 2) + '\n', 'utf8');
  changed++;
  report.push(`lc${lc}: ${shaped.map((b) => `${b.label} ${b.lines}行`).join(' | ')}`);
}

console.log(report.join('\n'));
console.log(CHECK ? `\n（--check 模式，未写入）` : `\n已写入 ${changed} 个文件`);
