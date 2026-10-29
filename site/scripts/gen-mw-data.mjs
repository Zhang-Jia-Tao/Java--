/**
 * 从 _review/MySQL_Redis_RocketMQ.md 抽取题库骨架。
 * 只做「抽取 + 重排」，不改写事实；评分为 0（未评分），页面显示「初稿」。
 * 用法：node scripts/gen-mw-data.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "..", "_review", "MySQL_Redis_RocketMQ.md");
const OUT = path.join(ROOT, "src", "data", "project");
const META = path.join(ROOT, "src", "data", "project-meta.json");
const DOC = "_review/MySQL_Redis_RocketMQ.md";
const NL2 = String.fromCharCode(10, 10);

const lines = fs.readFileSync(SRC, "utf8").split(/\r?\n/);

const clean = (s) =>
  s
    .replace(/~~[\s\S]*?~~/g, "")
    .replace(/\\([.\-+*_`[\]()#!~>|&<>])/g, "$1")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+$/gm, "");

const plain = (s) =>
  clean(s)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`{1,3}/g, "")
    .replace(/\*\*|__/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();

const firstSentence = (s, max = 150) => {
  const t = plain(s);
  const m = t.match(/^[\s\S]{10,}?[。！？!?；;]/);
  const one = m ? m[0] : t;
  return one.length > max ? one.slice(0, max) + "…" : one;
};

const bullets = (body) => {
  const out = [];
  for (const line of body.split("\n")) {
    const m = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (!m) continue;
    if (m[1].length >= 4) continue;
    const t = plain(m[3]);
    if (t.length < 6) continue;
    if (out.includes(t)) continue;
    out.push(t);
  }
  return out;
};

const codeBlocks = (body) => {
  const out = [];
  const re = /```([\w+-]*)\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(body))) {
    const content = m[2].trim();
    if (!content) continue;
    const before = body.slice(Math.max(0, m.index - 400), m.index);
    const prevLine = before.split("\n").filter((x) => x.trim()).pop() || "";
    const pathHit = before.match(/[\w.\-/]+\.(java|sql|xml|yml|yaml|properties|conf)/);
    out.push({
      file: pathHit ? pathHit[0] : DOC,
      symbol: "",
      snippet: content.slice(0, 900),
      why: plain(prevLine).slice(0, 120)
    });
  }
  return out.slice(0, 4);
};

const quoteFollowUps = (body) => {
  const groups = [];
  let cur = null;
  for (const line of body.split("\n")) {
    if (!/^>\s?/.test(line)) {
      if (cur) {
        groups.push(cur);
        cur = null;
      }
      continue;
    }
    if (!cur) cur = [];
    cur.push(line.replace(/^>\s?/, ""));
  }
  if (cur) groups.push(cur);

  const out = [];
  for (const g of groups) {
    const text = g.join("\n").trim();
    if (!text) continue;
    const qm = text.match(/^\*\*[“"「](.+?)[”"」]\*\*|^\*\*(.+?)\*\*/);
    if (!qm) continue;
    const q = plain(qm[1] || qm[2] || "");
    const rest = text.replace(qm[0], "").trim();
    const a = plain(rest);
    if (q && a && a.length > 20) out.push({ q: q.replace(/[？?]$/, "？"), a: a.slice(0, 600), star: 4 });
  }
  return out.slice(0, 5);
};

const TOPIC = {
  MySQL: { key: "mysql", cn: "MySQL", prefix: "mysql" },
  Redis: { key: "redis", cn: "Redis", prefix: "redis" },
  RocketMQ: { key: "rocketmq", cn: "RocketMQ", prefix: "mq" }
};

let topicKey = "MySQL";
let sub = "";
const found = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const h1 = line.match(/^#\s+(.*)$/);
  const h2 = line.match(/^##\s+(.*)$/);
  const h3 = line.match(/^###\s+(.*)$/);
  if (h1) {
    const name = h1[1].trim();
    if (TOPIC[name]) topicKey = name;
    sub = "";
    continue;
  }
  if (h2) {
    const t = h2[1].trim();
    if (!/^(Q|前言|目录)/.test(t)) sub = t;
    continue;
  }
  if (!h3) continue;
  const raw = h3[1].trim();
  const m = raw.match(/^Q\w*\d*\\?\.?\s*(.+)$/);
  if (!m) continue;
  let end = lines.length;
  for (let j = i + 1; j < lines.length; j++) {
    if (/^#{1,3}\s/.test(lines[j])) {
      end = j;
      break;
    }
  }
  found.push({ topic: topicKey, sub, title: m[1].trim(), start: i + 1, end });
}

const seen = {};
const written = [];
for (const f of found) {
  const t = TOPIC[f.topic];
  seen[t.prefix] = (seen[t.prefix] ?? 0) + 1;
  const id = `${t.prefix}-${String(seen[t.prefix]).padStart(2, "0")}`;
  const bodyRaw = lines.slice(f.start, f.end).join("\n");
  const body = clean(bodyRaw).trim();
  const paras = body.split(/\n\s*\n/).filter((p) => p.trim() && !/^```/.test(p.trim()));
  const first = paras[0] ?? "";
  const second = paras[1] ?? "";
  const bl = bullets(body).slice(0, 8);
  const pts = bl.length ? bl : paras.slice(1, 4).map((p) => firstSentence(p, 100));
  const pitfalls = paras
    .filter((p) => /坑|注意|易错|误区|不要|避免|风险|切忌/.test(p) && plain(p).length < 300)
    .map((p) => firstSentence(p, 160))
    .slice(0, 4);
  const fps = quoteFollowUps(body);
  const anchors = codeBlocks(body);
  const star = Math.min(5, Math.max(3, (f.title.match(/⭐/g) || []).length || 3));
  const short = plain(body).length < 120;

  const s60 = plain(first || bl[0] || second).slice(0, 320);
  let s180 = (bl.length ? bl.slice(0, 6).join(NL2) : plain(second)).slice(0, 700);
  if (!s180 || s180 === s60) {
    const rest = paras.slice(1, 4).map((p) => plain(p)).filter(Boolean).join(NL2);
    s180 = (rest || plain(first) || bl[0] || "").slice(0, 700);
  }

  const q = {
    id,
    module: t.key,
    title: f.title.replace(/^⭐+\s*/, "").trim(),
    star,
    question: f.title.replace(/^⭐+\s*/, "").trim(),
    tags: [f.sub || t.cn].filter(Boolean),
    status: short || !plain(body).replace(/!\[[^\]]*\]\([^)]*\)/g, "").trim() ? "pending" : "draft",
    oneLine:
      firstSentence(first || bl[0] || second, 150) ||
      "原文主体是一张图（流程图 / 结构图），文字很少，建议直接看原文层或下方展开。",
    speak: { s60, s180, s600: body.slice(0, 6000) },
    points: pts.slice(0, 8).map((p) => ({ point: p, state: "done" })),
    codeAnchors: anchors,
    flow: [],
    diagram: null,
    metrics: [],
    pitfalls,
    followUps: fps,
    variants: [],
    review: {
      A: 0, B: 0, C: 0, D: 0, E: 0, total: 0, verdict: "draft",
      hardErrors: [], deductions: [], bonus: [], srcCheck: { checked: 0, ok: 0, mismatch: [] }
    },
    provenance: { doc: [`${DOC} L${f.start}-L${f.end}`], code: [], supplement: [] },
    drill: { keywords: [], blanks: [] },
    source: { raw: `${DOC}#L${f.start}-L${f.end}`, startLine: f.start, endLine: f.end, docTitle: f.title }
  };
  fs.writeFileSync(path.join(OUT, `${id}.json`), JSON.stringify(q, null, 2) + "\n", "utf8");
  written.push({ id, module: t.key, title: q.title, chars: body.length, points: q.points.length });
}

const meta = JSON.parse(fs.readFileSync(META, "utf8"));
const counts = { mysql: 0, redis: 0, rocketmq: 0 };
for (const w of written) counts[w.module]++;
const mwDefs = [
  { key: "mysql", name: "MySQL", en: "mysql", desc: "基础 / 索引 / 事务 / 锁 / 日志 / 性能调优", order: 21, area: "mw" },
  { key: "redis", name: "Redis", en: "redis", desc: "数据结构 / 持久化 / 高可用 / 缓存三大问题 / 集群", order: 22, area: "mw" },
  { key: "rocketmq", name: "RocketMQ", en: "rocketmq", desc: "消息模型 / 可靠性 / 顺序消息与事务消息", order: 23, area: "mw" }
];
for (const d of mwDefs) {
  const existing = meta.modules.find((m) => m.key === d.key);
  if (existing) Object.assign(existing, d, { count: counts[d.key] });
  else meta.modules.push({ ...d, count: counts[d.key] });
}
for (const m of meta.modules) if (!m.area) m.area = "project";
meta.modules.sort((a, b) => a.order - b.order);
fs.writeFileSync(META, JSON.stringify(meta, null, 2) + "\n", "utf8");

console.log(`抽取 ${written.length} 道题 → src/data/project/`);
for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v} 题`);
const weak = written.filter((w) => w.chars < 120);
if (weak.length) console.log("⚠ 正文过短（标 pending）：", weak.map((w) => `${w.id}(${w.chars})`).join(", "));
const noPts = written.filter((w) => w.points === 0);
if (noPts.length) console.log("⚠ 无要点：", noPts.map((w) => w.id).join(", "));
