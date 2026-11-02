/**
 * 生成「资深评审」输入包：把某一批题的真实内容导出成一份 Markdown，
 * 交给评审子代理逐题写批注（只读不改原文）。
 *
 * 用法：
 *   node scripts/expert-input.mjs hot                  # 列出 hot 的分包号
 *   node scripts/expert-input.mjs hot 3                # 只打印第 3 包（1 起）
 *   node scripts/expert-input.mjs hot 3 --write        # 写成 .expert-in/hot-03.md
 *   node scripts/expert-input.mjs all --write          # 全量分包写盘
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, '.expert-in');
const SIZE = 10;

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const cut = (s, n) => {
  const t = String(s ?? '').replace(/\r\n/g, '\n');
  return t.length > n ? t.slice(0, n) + `…（后略，原长 ${t.length} 字）` : t;
};
const list = (arr, n = 1400) => (Array.isArray(arr) ? arr.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join('\n') : '');
const trim_ = (s, n) => cut(list(s, n), n);

/* ---------------- 三个模块的取材 ---------------- */
function hotBlock(q) {
  const lines = [];
  const code = q.code?.source ? String(q.code.source).split('\n') : [];
  lines.push(`## ${q.slug} · ${q.title}`);
  lines.push(`角色：AI 资深工程师（算法工程视角也要覆盖）。分类 ${q.category || '—'} · 难度 ${q.difficulty || '—'} · 来源行 ${q.sourceLine || '—'}`);
  lines.push('');
  lines.push('### 题面 statement');
  lines.push(cut(Array.isArray(q.statement) ? q.statement.join('\n') : q.statement, 900));
  if (q.examples?.length) {
    lines.push('');
    lines.push('### 示例');
    lines.push(
      q.examples
        .map((e) => `${e.label || ''} 输入 ${e.in || ''} → 输出 ${e.out || ''}${e.why ? '  // ' + e.why : ''}`)
        .join('\n')
    );
  }
  lines.push('');
  lines.push('### 代码 code（左侧是真实行号，批注 scope=code 时用 `L7：…` 指行）');
  lines.push('```java');
  code.forEach((l, i) => lines.push(`${String(i + 1).padStart(3)}| ${l}`));
  lines.push('```');
  const ex = q.explain || {};
  lines.push('');
  lines.push('### 讲解 explain');
  lines.push(`- oneLiner：${cut(ex.oneLiner, 300)}`);
  if (ex.analogy) lines.push(`- analogy（类比）：${cut(ex.analogy, 500)}`);
  if (ex.walkthrough?.length) {
    lines.push('- walkthrough（走查）：');
    lines.push(cut(ex.walkthrough.map((w) => `  ${w.step}. ${w.input}${w.state ? ' → ' + w.state : ''}`).join('\n'), 1200));
  }
  if (ex.codeWalkthrough?.length) {
    lines.push('- codeWalkthrough（逐行）：');
    lines.push(
      cut(
        ex.codeWalkthrough.map((w) => `  L${w.line} \`${w.code}\`｜${w.q}`).join('\n'),
        1400
      )
    );
  }
  if (ex.pitfalls?.length) {
    lines.push('- pitfalls（翻车点）：');
    lines.push(cut(ex.pitfalls.map((p) => `  · ${p}`).join('\n'), 800));
  }
  if (ex.complexity) {
    const c = ex.complexity;
    lines.push(`- complexity：时间 ${c.time || '—'} / 空间 ${c.space || '—'}｜${cut(c.why, 500)}`);
  }
  if (q.approach && String(q.approach).length > 1) lines.push(`- approach：${cut(q.approach, 600)}`);
  lines.push('');
  lines.push('### 已有评分结论（这些是评分口径，不要重复，资深批注是另一层）');
  lines.push(`评语：${cut(q.notes?.[0] || '（无）', 400)}`);
  lines.push(`状态：${q.status} · 行数 ${code.length}`);
  return lines.join('\n');
}

function javaBlock(q) {
  const lines = [];
  lines.push(`## ${q.id} · ${q.title}`);
  lines.push(`角色：Java 资深工程师。章节 ${q.chapterName || q.chapter} · ${q.chapterSub || ''} · 星级 ${q.star}`);
  lines.push('');
  lines.push('### 原文 original（逐字，quote 从这里摘）');
  lines.push(cut(trim_(q.original, 2200), 2200));
  lines.push('');
  lines.push('### 摘要 summary');
  lines.push(cut(q.summary, 600));
  lines.push('');
  lines.push('### 必答点 checklist');
  lines.push(cut(trim_((q.checklist || []).map((c) => (typeof c === 'string' ? c : `${c.state === 'done' ? '✓' : '·'} ${c.point}`)), 1600), 1600));
  if (q.followUps?.length) {
    lines.push('');
    lines.push('### 追问 followUps');
    lines.push(cut(trim_(q.followUps.map((f) => `Q: ${f.q}\nA: ${f.a}`), 1400), 1400));
  }
  if (q.improved) {
    lines.push('');
    lines.push('### 改法 improved');
    lines.push(cut(q.improved, 700));
  }
  lines.push('');
  lines.push('### 已有评分结论（不要重复）');
  lines.push(`- 硬伤：${trim_(q.hardErrors, 700) || '无'}`);
  lines.push(`- 扣分点：${trim_(q.deductions, 900) || '无'}`);
  lines.push(`- 加分点：${trim_(q.bonus, 500) || '无'}`);
  return lines.join('\n');
}

function projBlock(q) {
  const lines = [];
  const area = q.module;
  lines.push(`## ${q.id} · ${q.title}`);
  lines.push(`角色：模块 ${area} · 星级 ${q.star} · 状态 ${q.status}`);
  lines.push('');
  lines.push('### 一句话 oneLine');
  lines.push(cut(q.oneLine, 400));
  const s = q.speak || {};
  lines.push('');
  lines.push('### 口述 speak');
  if (s.s60) lines.push(`- **s60（60 秒版）**：${cut(s.s60, 900)}`);
  if (s.s180) lines.push(`- **s180（3 分钟版）**：${cut(s.s180, 1600)}`);
  if (s.s600) lines.push(`- **s600（深挖版）**：${cut(s.s600, 2200)}`);
  if (q.points?.length) {
    lines.push('');
    lines.push('### 必答点 points');
    lines.push(cut(q.points.map((p) => `· ${p.state === 'done' ? '✓' : '·'} ${p.point}`).join('\n'), 1800));
  }
  if (q.pitfalls?.length) {
    lines.push('');
    lines.push('### 翻车点 pitfalls');
    lines.push(cut(q.pitfalls.map((p) => `· ${typeof p === 'string' ? p : JSON.stringify(p)}`).join('\n'), 1100));
  }
  if (q.followUps?.length) {
    lines.push('');
    lines.push('### 追问 followUps');
    lines.push(cut(q.followUps.map((f) => `Q: ${f.q}\nA: ${f.a}`).join('\n'), 1600));
  }
  if (q.metrics?.length) {
    lines.push('');
    lines.push('### 数字 metrics');
    lines.push(cut(q.metrics.map((m) => `· ${m.k} = ${m.v}${m.source ? '（' + m.source + '）' : ''}`).join('\n'), 700));
  }
  if (q.variants?.length) {
    lines.push('');
    lines.push('### 换方案 variants');
    lines.push(cut(trim_(q.variants, 700), 700));
  }
  const r = q.review || {};
  lines.push('');
  lines.push('### 已有评分结论（不要重复）');
  lines.push(`- 分数：${r.total ?? '—'}（${r.verdict ?? ''}）`);
  if (r.hardErrors?.length) lines.push(`- 硬伤：${cut(r.hardErrors.map((h) => `[L${h.level}] ${h.wrong} → ${h.right}`).join('；'), 900)}`);
  if (r.deductions?.length) lines.push(`- 扣分：${cut(r.deductions.join('；'), 900)}`);
  if (q.provenance) lines.push(`- 溯源：${cut(JSON.stringify(q.provenance), 400)}`);
  return lines.join('\n');
}

/* ---------------- 分包 ---------------- */
const hasExpert = (q) => Array.isArray(q.expert?.comments) && q.expert.comments.length > 0;

function collect(area, missingOnly = false) {
  const items = [];
  if (area === 'hot') {
    for (const f of fs.readdirSync(path.join(ROOT, 'src/data/hot200')).filter((f) => f.endsWith('.json') && f !== 'index.json')) {
      const q = readJson(path.join(ROOT, 'src/data/hot200', f));
      if (missingOnly && hasExpert(q)) continue;
      items.push({ id: q.slug, md: hotBlock(q) });
    }
  } else if (area === 'java') {
    for (const f of fs.readdirSync(path.join(ROOT, 'src/data/questions')).filter((f) => /^\d+[ab]?-\d+\.json$/.test(f))) {
      const q = readJson(path.join(ROOT, 'src/data/questions', f));
      if (missingOnly && hasExpert(q)) continue;
      items.push({ id: q.id, md: javaBlock(q) });
    }
  } else {
    for (const f of fs.readdirSync(path.join(ROOT, 'src/data/project'))) {
      if (!f.endsWith('.json')) continue;
      const q = readJson(path.join(ROOT, 'src/data/project', f));
      if (missingOnly && hasExpert(q)) continue;
      items.push({ id: q.id, md: projBlock(q) });
    }
  }
  // hot200 按 lc 序号、java 按章节、project 按 id 稳定排序
  items.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  const packs = [];
  for (let i = 0; i < items.length; i += SIZE) packs.push(items.slice(i, i + SIZE));
  return packs;
}

const AREAS = ['hot', 'java', 'proj'];
const args = process.argv.slice(2);
const target = args[0];
const write = args.includes('--write');
const missingOnly = args.includes('--missing');
const only = args.find((a) => /^\d+$/.test(a));

const HEADER = (area, no, ids) => `# 资深评审输入包 · ${area} · 第 ${no} 包
本包 ${ids.length} 题：${ids.join('、')}

## 任务
对**每一题**写 3–5 条评审批注，输出一个 JSON 数组，元素：
{"id":"<题目 id>","role":"java|ai","comments":[{"scope":"...","kind":"...","quote":"...","text":"..."}]}

### 硬性要求
1. \`role\`：hot / java → \`java\`；proj → 按模块判断（redis/rocketmq/kafka/es/mysql/ai 系 → 与模块匹配者；AI 类模块用 \`ai\`，其余 \`java\`）。
2. \`scope\` 只能取该题类型允许的值：
   - hot：statement / approach / code / walkthrough / complexity / pitfalls / whole
   - java：original / summary / checklist / followUps / improved / whole
   - proj：oneLine / s60 / s180 / s600 / points / pitfalls / followUps / metrics / variants / whole
3. \`kind\` 六选一：praise 亮点 / risk 风险 / version 版本口径 / depth 深度补强 / production 生产现实 / provenance 溯源。每题至少覆盖 2 种，praise 每题最多 1 条。
4. \`quote\`：**从该题上方给出的内容里逐字复制**一段 ≤60 字的片段（渲染端要对上位置）。找不到合适片段就用空字符串 ""。禁止自己改写、拼接、加省略号。
5. \`text\`：80–220 字中文。必须说清「为什么这么判 + 面试现场会怎样 + 怎么讲更好」。禁止「讲得不错」「可以更深入」这类空话。**不要重复「已有评分结论」里的内容**——那是评分口径，批注是另一层：资深面试官听完会怎么想、版本是否过时、生产上哪里不成立、数字经不经得起追问。
6. hot 的 \`scope:"code"\` 批注若指向具体行，在 text 里用 \`L7：…\` 的格式写行号（渲染端做行跳转）。
7. 字符串内不要裸换行（要分层用 \\n 转义）。JSON 必须能被 JSON.parse 解析，顶层是数组，元素个数 = 本包题数，不增不减。

### 质量锚点
- 每条批注都要「具体到能被追问」：点出确切的方法名/字段名/版本号/数字，而不是「要注意并发」这种。
- 版本类批注要给出确切版本边界（JDK 8/17/21、Redis 6/7、RocketMQ 4.9/5.x、ES 7/8、MySQL 5.7/8.0 等）。
- 生产类批注要给出具体数字或故障形态（连接数、延迟量级、内存放大倍数、超时链路）。
---

`;

for (const area of AREAS) {
  if (target !== 'all' && target !== area) continue;
  const packs = collect(area, missingOnly);
  if (!write) {
    packs.forEach((p, i) => console.log(`${area} 第 ${i + 1} 包（${p.length} 题）：${p.map((x) => x.id).join(' ')}`));
    continue;
  }
  fs.mkdirSync(OUT, { recursive: true });
  // 清掉该 area 的旧分包，避免 --missing 后残留过期包
  for (const f of fs.readdirSync(OUT)) {
    if (f.startsWith(`${area}-`) && f.endsWith('.md')) fs.unlinkSync(path.join(OUT, f));
  }
  packs.forEach((p, i) => {
    const no = String(i + 1).padStart(2, '0');
    const body = HEADER(area, no, p.map((x) => x.id)) + '\n' + p.map((x) => x.md).join('\n\n---\n\n') + '\n';
    fs.writeFileSync(path.join(OUT, `${area}-${no}.md`), body, 'utf8');
  });
  console.log(`${area}: ${packs.length} 包 → .expert-in/${area}-NN.md（共 ${packs.reduce((a, p) => a + p.length, 0)} 题）`);
}
