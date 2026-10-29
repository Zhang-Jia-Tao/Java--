import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'src', 'data', 'doc');
fs.mkdirSync(OUT, { recursive: true });

const MAP = [
  { doc: '_review/Agent入门.md', title: 'Agent入门', module: 'foundation', ranges: {
    'ai-01': [3, 62], 'ai-02': [63, 155], 'ai-03': [156, 261], 'ai-04': [262, 401], 'ai-05': [402, 483],
    'ai-06': [484, 603], 'ai-07': [604, 707], 'ai-08': [708, 767], 'ai-09': [768, 915], 'ai-10': [916, 1001],
    'ai-11': [1002, 1057], 'ai-12': [1058, 1213], 'ai-13': [1214, 1505], 'ai-14': [1506, 99999] } },
  { doc: '_review/ZRagent.md', title: 'ZRagent', module: 'ragent', ranges: {
    'ra-01': [35, 218], 'ra-02': [219, 673], 'ra-03': [674, 1049], 'ra-04': [1050, 1833],
    'ra-05': [1834, 2159], 'ra-06': [2160, 2542], 'ra-07': [2543, 2882], 'ra-08': [2883, 3878],
    'ra-09': [3879, 4503], 'ra-10': [4504, 5043], 'ra-11': [5044, 5835], 'ra-12': [5836, 6458],
    'ra-13': [6459, 6910], 'ra-14': [6911, 7390], 'ra-15': [7391, 7847], 'ra-16': [7848, 99999] } },
  { doc: '_review/评测.md', title: '评测', module: 'eval', ranges: {
    'ev-01': [1, 135], 'ev-02': [136, 361], 'ev-03': [362, 700], 'ev-04': [701, 946],
    'ev-05': [947, 1323], 'ev-06': [1324, 1499], 'ev-07': [1500, 2518], 'ev-08': [2519, 99999] } }
];

const cleanTitle = (s) =>
  s.replace(/^#+\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/\\([.\-+*_`\[\]()#!~>|])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

const LIMIT = 3600;

/**
 * 超长小节切成阅读块：
 * - 优先在空行断开；
 * - 断点若在代码围栏内，补 ``` 闭合、下一块重新打开；
 * - 没有空行可用时退化为按行硬切，避免出现上万字的单块。
 */
function splitLong(md) {
  if (md.length <= LIMIT) return [md];
  const lines = md.split(/\r?\n/);
  const chunks = [];
  let buf = [];
  let len = 0;
  let inFence = false;
  let fenceMark = '```';

  const flush = (hard) => {
    if (!buf.length) return;
    let text = buf.join('\n').trim();
    if (inFence) text += '\n' + fenceMark;
    if (text) chunks.push(text);
    buf = inFence ? [fenceMark] : [];
    len = inFence ? fenceMark.length : 0;
  };

  for (const line of lines) {
    const f = line.match(/^\s*(```[\w\s+-]*)\s*$/);
    if (f) {
      inFence = !inFence;
      fenceMark = f[1].trim();
    }
    buf.push(line);
    len += line.length + 1;
    if (len < LIMIT) continue;
    if (!line.trim()) {
      buf.pop();
      flush();
    } else if (len >= LIMIT * 1.4) {
      // 很久没有空行：硬切
      flush(true);
    }
  }
  flush();
  return chunks.filter((c) => c.trim().length > 0);
}

const rows = [];
let total = 0;
for (const spec of MAP) {
  const lines = fs.readFileSync(path.join(ROOT, '..', spec.doc), 'utf8').split(/\r?\n/);
  for (const [id, [a, b]] of Object.entries(spec.ranges)) {
    const end = Math.min(b, lines.length);
    const seg = lines.slice(a - 1, end);
    const raw = seg.join('\n');
    const chars = raw.length;

    // 按 h1-h3 切小节；代码围栏内的 # 不算标题
    const sections = [];
    let cur = { level: 0, title: '导语', buf: [] };
    let inFence = false;
    for (const line of seg) {
      if (/^\s*```/.test(line)) inFence = !inFence;
      const m = !inFence && line.match(/^(#{1,3})\s+(.*)$/);
      if (m) {
        if (cur.buf.join('\n').trim() || cur.level > 0) sections.push(cur);
        cur = { level: m[1].length, title: cleanTitle(line), headingLen: line.length, buf: [] };
      } else {
        cur.buf.push(line);
      }
    }
    if (cur.buf.join('\n').trim() || cur.level > 0) sections.push(cur);

    const expanded = [];
    for (const s of sections) {
      const md = s.buf.join('\n').trim();
      const parts = md ? splitLong(md) : [''];
      parts.forEach((part, k) => {
        expanded.push({
          level: s.level,
          title: (s.title || (s.level ? '未命名小节' : '导语')) + (parts.length > 1 ? ` · ${k + 1}/${parts.length}` : ''),
          md: part,
          chars: part.length,
          headingLen: k === 0 ? (s.headingLen ?? 0) : 0
        });
      });
    }

    const cleaned = expanded.map((s, i) => ({ i, level: s.level, title: s.title, md: s.md, chars: s.chars, headingLen: s.headingLen }));
    // 保真度：小节正文 + 小节标题 覆盖原文的比例
    const visible = cleaned.reduce((acc, x) => acc + x.chars + (x.headingLen || 0), 0);
    const fidelity = +Math.min(100, visible / chars * 100).toFixed(2);
    const maxLen = Math.max(0, ...cleaned.map((s) => s.chars));

    const out = {
      id,
      module: spec.module,
      title: cleaned.find((s) => s.level > 0)?.title ?? id,
      doc: spec.doc,
      docTitle: spec.title,
      startLine: a,
      endLine: end,
      chars,
      sectionCount: cleaned.length,
      maxSectionChars: maxLen,
      fidelity,
      sections: cleaned,
      raw
    };
    fs.writeFileSync(path.join(OUT, `${id}.json`), JSON.stringify(out, null, 2) + '\n', 'utf8');
    rows.push({ id, chars, sections: cleaned.length, maxLen, fidelity });
    total++;
  }
}

const minF = Math.min(...rows.map((r) => r.fidelity));
const avgF = rows.reduce((a, r) => a + r.fidelity, 0) / rows.length;
const low = rows.filter((r) => r.fidelity < 90);
const long = rows.filter((r) => r.maxLen > 4200);
console.log(`生成原文数据 ${total} 篇 → src/data/doc`);
console.log(`保真度：最低 ${minF}% · 平均 ${avgF.toFixed(2)}% · ${low.length ? '未达标 ' + low.map((r) => `${r.id}(${r.fidelity}%)`).join(', ') : '全部 ≥ 90%'}`);
console.log(`超长小节（>4200 字）：${long.length ? long.map((r) => `${r.id}:${r.maxLen}`).join(', ') : '无'}`);
const sizes = fs.readdirSync(OUT).map((f) => ({ f, kb: fs.statSync(path.join(OUT, f)).size / 1024 }));
console.log(`体积 ${(sizes.reduce((a, s) => a + s.kb, 0) / 1024).toFixed(1)}MB · 最大 ${sizes.sort((a, b) => b.kb - a.kb).slice(0, 3).map((s) => s.f + ' ' + s.kb.toFixed(0) + 'KB').join(', ')}`);
