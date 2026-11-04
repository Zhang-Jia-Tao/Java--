/**
 * 生成「源码图谱」数据（牛券 oneCoupon）。
 *
 * 输入：<onecoupon>/.ua/knowledge-graph.json（/understand-anything 产出，AI 摘要）
 * 输出：
 *   site/src/data/graph/{meta.json, anchor-map.json}   构建期要用（很小，直接 import）
 *   site/public/data/graph/{layer-*.json, search.json} 运行时按需 fetch（不进 HTML）
 *
 * 为什么要分到 public：单层 183 个节点内联进页面会到 200 KB+，
 * 站里已经有 /project/sheet 371 KB 的教训；fetch + 浏览器 gzip 后约 25 KB。

 *
 * 设计要点：
 * 1. 生成物入库（src/data/graph/），不让站点构建依赖 E: 盘上的外部仓库；
 *    找不到源文件时沿用已有生成物并正常退出（CI / 换机器也能构建）。
 * 2. 773 KB 的原始图谱拆成「meta + 每层一份 + 搜索索引 + 锚点映射」，
 *    单页只吃自己那份，避免把整包塞进某个页面。
 * 3. 丢弃 exports / documents 这类弱语义边（306 条），只留结构、继承、调用、配置、依赖、相关。
 * 4. 节点按 contains 边归到层：层只登记了部分节点，其余沿父链上溯。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SITE = path.resolve(import.meta.dirname, '..');
const OUT = path.join(SITE, 'src', 'data', 'graph');
const PUB = path.join(SITE, 'public', 'data', 'graph');
const QUESTIONS = path.join(SITE, 'src', 'data', 'project');
const META_JSON = path.join(SITE, 'src', 'data', 'project-meta.json');

const SOURCE_CANDIDATES = [
  process.env.UA_GRAPH,
  'E:/Project/onecoupon/.ua/knowledge-graph.json',
  'E:\\Project\\onecoupon\\.ua\\knowledge-graph.json',
  path.join(SITE, '..', 'source-graph.json')
].filter(Boolean);

const KEEP_EDGE = new Set(['imports', 'contains', 'inherits', 'implements', 'calls', 'depends_on', 'configures', 'related']);
const LAYER_ORDER = ['engine', 'merchant-admin', 'distribution', 'settlement', 'search', 'framework', 'config', 'data-schema', 'documentation'];

const norm = (p) => String(p || '').replace(/\\/g, '/').replace(/^\.\//, '');
const key = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);
const short = (s, n) => (String(s || '').length > n ? String(s).slice(0, n) + '…' : String(s || ''));

function findSource() {
  for (const c of SOURCE_CANDIDATES) {
    try {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
    } catch {}
  }
  return null;
}

function log(msg) {
  console.log(msg);
}

// ---------- 题目锚点（站点 ↔ 图谱的连接点）----------
function readQuestionAnchors() {
  if (!fs.existsSync(QUESTIONS)) return { anchors: [], questions: 0, withAnchors: 0 };
  const meta = JSON.parse(fs.readFileSync(META_JSON, 'utf8'));
  const enOf = new Map(meta.modules.map((m) => [m.key, m.en]));
  const AI = new Set(['foundation', 'ragent', 'eval', 'llm', 'aiproj']);
  const files = fs.readdirSync(QUESTIONS).filter((f) => f.endsWith('.json'));
  const anchors = [];
  let withAnchors = 0;
  for (const f of files) {
    const q = JSON.parse(fs.readFileSync(path.join(QUESTIONS, f), 'utf8'));
    const list = Array.isArray(q.codeAnchors) ? q.codeAnchors : [];
    if (list.length) withAnchors++;
    const base = AI.has(q.module) ? '/ai' : '/project';
    const href = `${base}/${enOf.get(q.module) ?? q.module}/${q.id}`;
    for (const a of list) {
      anchors.push({
        file: norm(a.file),
        q: q.id,
        t: q.title,
        h: href,
        sym: a.symbol || '',
        line: a.line ?? null,
        why: a.why || ''
      });
    }
  }
  return { anchors, questions: files.length, withAnchors };
}

// ---------- 图谱瘦身 + 分层 ----------
function buildGraph(raw) {
  const parent = new Map();
  for (const e of raw.edges) if (e.type === 'contains') parent.set(e.target, e.source);

  const layerOf = new Map();
  for (const l of raw.layers) for (const id of l.nodeIds) layerOf.set(id, l.id);

  const resolveLayer = (id) => {
    let cur = id;
    for (let i = 0; i < 12 && cur; i++) {
      if (layerOf.has(cur)) return layerOf.get(cur);
      cur = parent.get(cur);
    }
    return null;
  };

  const nodes = raw.nodes.map((n) => {
    const layer = resolveLayer(n.id) || 'layer:misc';
    return {
      k: key(n.id),
      i: n.id,
      t: n.type,
      n: n.name,
      f: norm(n.filePath || ''),
      s: n.summary || '',
      g: Array.isArray(n.tags) ? n.tags.slice(0, 6) : [],
      c: n.complexity || 'simple',
      a: n.languageNotes ? short(n.languageNotes, 160) : '',
      l: layer.replace('layer:', ''),
      p: parent.get(n.id) || ''
    };
  });
  const byId = new Map(nodes.map((n) => [n.i, n]));

  // 边用短 key（8 位）而不是长节点 id：1209 条边里 id 会占掉一半体积
  const edges = raw.edges
    .filter((e) => KEEP_EDGE.has(e.type) && byId.has(e.source) && byId.has(e.target))
    .map((e) => [byId.get(e.source).k, byId.get(e.target).k, e.type, Math.round((e.weight ?? 0.5) * 100) / 100]);

  const keyOfId = new Map(nodes.map((n) => [n.i, n.k]));
  // 文件级归并：画布上「全图」只画 file 节点，class/function 折叠到它所属的文件里
  const fileOf = new Map();
  for (const n of nodes) {
    let cur = n;
    const guard = new Set();
    while (cur && cur.t !== 'file' && cur.p && !guard.has(cur.k)) {
      guard.add(cur.k);
      cur = nodes.find((x) => x.i === cur.p) || null;
    }
    fileOf.set(n.k, cur ? cur.k : n.k);
  }
  const keyToLayer = new Map(nodes.map((n) => [n.k, n.l]));
  const keyToNode = new Map(nodes.map((n) => [n.k, n]));
  const deg = new Map();
  for (const [a, b] of edges) {
    deg.set(a, (deg.get(a) || 0) + 1);
    deg.set(b, (deg.get(b) || 0) + 1);
  }
  for (const n of nodes) n.d = deg.get(n.k) || 0;
  return { nodes, edges, byId, raw, keyOfId, keyToLayer, keyToNode, fileOf };
}


// ---------- 主流程 ----------
const src = findSource();
const outMeta = path.join(OUT, 'meta.json');
if (!src) {
  if (fs.existsSync(outMeta)) {
    log('⚠ 没找到 knowledge-graph.json，沿用已有生成物（构建不受影响）');
    process.exit(0);
  }
  log('✗ 没找到 knowledge-graph.json，也没有历史生成物：写一个空占位，页面会提示未生成');
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(
    outMeta,
    JSON.stringify({ empty: true, generatedAt: new Date().toISOString(), sourcePath: null, layers: [], tour: [], counts: {}, coverage: {} }, null, 1),
    'utf8'
  );
  process.exit(0);
}

const raw = JSON.parse(fs.readFileSync(src, 'utf8'));
const { nodes, edges, byId, keyOfId, keyToLayer, keyToNode, fileOf } = buildGraph(raw);
const qa = readQuestionAnchors();

// 题目锚点 → 文件节点
const fileNodeByPath = new Map();
for (const n of nodes) if (n.t === 'file' && n.f) fileNodeByPath.set(n.f, n);
const nodeByPathAny = new Map();
for (const n of nodes) if (n.f) {
  const arr = nodeByPathAny.get(n.f) ?? [];
  arr.push(n);
  nodeByPathAny.set(n.f, arr);
}

const anchorByFile = new Map();
let matched = 0;
const matchedQuestions = new Set();
for (const a of qa.anchors) {
  const node = fileNodeByPath.get(a.file);
  if (!node) continue;
  matched++;
  matchedQuestions.add(a.q);
  const arr = anchorByFile.get(a.file) ?? [];
  arr.push({ q: a.q, t: a.t, h: a.h, sym: a.sym, line: a.line });
  anchorByFile.set(a.file, arr);
}

// 锚点 → 图谱跳转映射（题页用）
const anchorMap = {};
for (const [file, list] of anchorByFile) {
  const node = fileNodeByPath.get(file);
  anchorMap[file] = { l: node.l, k: node.k, n: node.n };
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'anchor-map.json'), JSON.stringify(anchorMap), 'utf8');

// 每层一份
const layerIds = [...new Set(nodes.map((n) => n.l))];
const orderOf = (id) => {
  const i = LAYER_ORDER.indexOf(id);
  return i < 0 ? 99 : i;
};
layerIds.sort((a, b) => orderOf(a) - orderOf(b));

const layerMetaList = [];
const written = new Set();
for (const layerId of layerIds) {
  const mine = nodes.filter((n) => n.l === layerId);
  const ids = new Set(mine.map((n) => n.k));
  const intra = edges.filter(([a, b]) => ids.has(a) && ids.has(b));
  const crossOut = new Map();
  const crossIn = new Map();
  for (const [a, b] of edges) {
    const inA = ids.has(a);
    const inB = ids.has(b);
    if (inA === inB) continue;
    const target = inA ? crossOut : crossIn;
    const other = inA ? keyToLayer.get(b) : keyToLayer.get(a);
    if (!other) continue;
    target.set(other, (target.get(other) || 0) + 1);
  }
  // 跨层边：带上目标 key 与所在层，详情面板里可以直接跳过去
  const outX = [];
  const inX = [];
  for (const [a, b, t] of edges) {
    const inA = ids.has(a);
    const inB = ids.has(b);
    if (inA && !inB) outX.push([a, b, keyToLayer.get(b) || '', t]);
    else if (!inA && inB) inX.push([a, keyToLayer.get(a) || '', b, t]);
  }

  // 跨层引用的名字表：详情面板要显示「结算层 / SettleService.java」而不是一串 key
  const xn = {};
  for (const [, b, layerOfB] of outX) {
    const n = keyToNode.get(b);
    if (n && !xn[b]) xn[b] = [n.n, layerOfB || n.l, n.t];
  }
  for (const [a] of inX) {
    const n = keyToNode.get(a);
    if (n && !xn[a]) xn[a] = [n.n, n.l, n.t];
  }

  const anchors = {};
  for (const n of mine) {
    const list = anchorByFile.get(n.f);
    if (list && list.length) anchors[n.k] = list;
  }
  const payload = {
    id: layerId,
    name: raw.layers.find((l) => l.id === `layer:${layerId}`)?.name ?? layerId,
    desc: raw.layers.find((l) => l.id === `layer:${layerId}`)?.description ?? '',
    nodes: mine.map((n) => ({ k: n.k, t: n.t, n: n.n, f: n.f, s: n.s, g: n.g, c: n.c, a: n.a, p: n.p ? keyOfId.get(n.p) || '' : '', l: layerId, d: n.d || 0 })),
    edges: intra,
    out: [...crossOut].sort((a, b) => b[1] - a[1]),
    in: [...crossIn].sort((a, b) => b[1] - a[1]),
    outX,
    inX,
    xn,
    anchors
  };
  const file = `layer-${layerId}.json`;
  fs.mkdirSync(PUB, { recursive: true });
  fs.writeFileSync(path.join(PUB, file), JSON.stringify(payload), 'utf8');
  written.add(file);
  layerMetaList.push({
    id: layerId,
    name: payload.name,
    desc: payload.desc,
    nodes: mine.length,
    files: mine.filter((n) => n.t === 'file').length,
    classes: mine.filter((n) => n.t === 'class').length,
    functions: mine.filter((n) => n.t === 'function').length,
    edges: intra.length,
    out: [...crossOut].sort((a, b) => b[1] - a[1]).slice(0, 4),
    in: [...crossIn].sort((a, b) => b[1] - a[1]).slice(0, 4),
    anchors: Object.values(anchors).reduce((s, l) => s + l.length, 0)
  });
}

// ---------- 全图（文件级）：291 个文件节点 + 折叠后的文件间依赖 ----------
// 画布上直接画 660 个节点会糊成毛线球，dashboard 的做法也是分容器/聚合；
// 这里把 class/function 折叠到所属文件，边按「文件对 + 类型」聚合。
const fileNode = new Map();
for (const n of nodes) if (n.t === 'file') fileNode.set(n.k, n);
const pairAgg = new Map();
for (const [a, b, t, w] of edges) {
  const fa = fileOf.get(a) || a;
  const fb = fileOf.get(b) || b;
  if (fa === fb) continue;
  const key2 = fa + '|' + fb;
  const cur = pairAgg.get(key2);
  if (!cur) pairAgg.set(key2, { a: fa, b: fb, types: { [t]: 1 }, w });
  else {
    cur.types[t] = (cur.types[t] || 0) + 1;
    cur.w = Math.max(cur.w, w);
  }
}
const overviewEdges = [...pairAgg.values()].map((e) => {
  const type = Object.entries(e.types).sort((x, y) => y[1] - x[1])[0][0];
  return [e.a, e.b, type, Math.round(e.w * 100) / 100];
});
const overviewNodes = [...fileNode.values()]
  .map((n) => ({ k: n.k, t: 'file', n: n.n, f: n.f, s: n.s, g: n.g, c: n.c, a: '', p: '', l: n.l, d: n.d || 0 }))
  .sort((a, b) => (a.l === b.l ? b.d - a.d : a.l.localeCompare(b.l)));
fs.mkdirSync(PUB, { recursive: true });
fs.writeFileSync(
  path.join(PUB, 'overview.json'),
  JSON.stringify({ nodes: overviewNodes, edges: overviewEdges, anchors: Object.fromEntries([...anchorByFile.entries()].map(([f, l]) => [fileNodeByPath.get(f)?.k || f, l])) }),
  'utf8'
);

// 搜索索引（名字 + 类型 + 层 + 标签 + 摘要前 40 字）
const search = nodes.map((n) => ({
  k: n.k,
  n: n.n,
  t: n.t,
  l: n.l,
  g: n.g.join(' '),
  s: short(n.s, 44),
  f: n.f.split('/').pop() || ''
}));
fs.mkdirSync(PUB, { recursive: true });
fs.writeFileSync(path.join(PUB, 'search.json'), JSON.stringify(search), 'utf8');

// meta + 14 步导读
const tour = (raw.tour || []).map((t) => {
  const steps = (t.nodeIds || []).map((id) => {
    const n = byId.get(id);
    return n ? { k: n.k, n: n.n, t: n.t, l: n.l } : null;
  }).filter(Boolean);
  return { o: t.order, t: t.title, d: t.description || '', steps };
});

const counts = {
  nodes: nodes.length,
  edges: edges.length,
  rawEdges: raw.edges.length,
  files: nodes.filter((n) => n.t === 'file').length,
  classes: nodes.filter((n) => n.t === 'class').length,
  functions: nodes.filter((n) => n.t === 'function').length,
  tables: nodes.filter((n) => n.t === 'table').length,
  complex: nodes.filter((n) => n.c === 'complex').length,
  fileEdges: overviewEdges.length
};

const meta = {
  generatedAt: new Date().toISOString(),
  sourcePath: src,
  sourceMtime: fs.statSync(src).mtime.toISOString(),
  collection: 'onecoupon',
  project: { name: raw.project?.name ?? 'onecoupon', frameworks: raw.project?.frameworks ?? [] },
  counts,
  layers: layerMetaList,
  tour,
  coverage: {
    questions: qa.questions,
    questionsWithAnchors: qa.withAnchors,
    anchorsTotal: qa.anchors.length,
    anchorsMatched: matched,
    questionsMatched: matchedQuestions.size,
    filesMatched: anchorByFile.size
  }
};
fs.writeFileSync(outMeta, JSON.stringify(meta, null, 1), 'utf8');

// 清掉过期分片
for (const dir of [OUT, PUB]) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith('layer-') && f.endsWith('.json') && !written.has(f)) fs.unlinkSync(path.join(dir, f));
  }
}

log(`✓ 源码图谱已生成：${path.relative(SITE, OUT)}`);
log(`  源文件 ${(fs.statSync(src).size / 1024).toFixed(0)} KB · 节点 ${counts.nodes} · 边 ${counts.edges}（丢 ${counts.rawEdges - counts.edges} 条 exports/documents）`);
log(`  层 ${layerMetaList.length} 个：` + layerMetaList.map((l) => `${l.name} ${l.nodes}`).join(' / '));
log(`  锚点：${matched}/${qa.anchors.length} 命中，覆盖 ${matchedQuestions.size} 道题（${anchorByFile.size} 个文件）`);
log(`  分片体积：` + layerMetaList.map((l) => `${l.id} ${(fs.statSync(path.join(PUB, `layer-${l.id}.json`)).size / 1024).toFixed(0)}KB`).join(' '));
