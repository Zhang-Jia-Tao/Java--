/**
 * 从 _review/Hot200.md 抽取尚未入库的算法题（第一期 36 题之外的全部），
 * 生成 src/data/hot200/lcXXX[-解法].json。
 * 用法：node scripts/gen-hot200-extra.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MD = path.join(ROOT, "..", "_review", "Hot200.md");
const OUT = path.join(ROOT, "src", "data", "hot200");

const lines = fs.readFileSync(MD, "utf8").split(/\r?\n/);
const existing = new Set(fs.readdirSync(OUT).filter((f) => /^lc.*\.json$/.test(f)).map((f) => f.replace(".json", "")));
const existingLc = new Set([...existing].map((s) => s.match(/^lc(\d+)/)?.[1]).filter(Boolean));

const heads = [];
let cat = "未分类";
lines.forEach((l, i) => {
  const m = l.match(/^#{1,4}\s+(.*)$/);
  if (!m) return;
  const raw = m[1].trim();
  const lcMatch = raw.match(/^LeetCode(\d+)\b\.?\s*(.*)$/i);
  if (lcMatch) heads.push({ line: i, raw, lc: Number(lcMatch[1]), title: lcMatch[2], category: cat });
  else cat = raw.replace(/\\/g, "").trim();
});

const DIFF = {
  滑动窗口: "medium", 双指针: "medium", 数组: "medium", 字符串: "easy", 链表: "medium",
  动态规划: "medium", 回溯: "medium", 二叉树: "medium", 二分: "easy", 栈: "medium",
  堆: "medium", 图: "medium", 哈希: "easy", 贪心: "medium", 排序: "medium"
};

function parse(p) {
  const body = lines.slice(p.line + 1, p.end);
  const tags = [];
  let t = p.title.replace(/\\/g, "");
  const tagMatch = t.match(/【(.+?)】/);
  if (tagMatch) {
    tags.push(...tagMatch[1].split(/[、,，/]/).map((x) => x.trim()).filter(Boolean));
    t = t.replace(/【.+?】/g, "").trim();
  }
  t = t.replace(/⭐/g, "").trim();
  const parts = t.split("-").map((x) => x.trim()).filter(Boolean);
  const approach = parts.length > 1 ? parts.slice(1).join("-") : null;
  const title = parts[0] || t;

  const statement = [];
  let cur = null;
  for (const raw of body) {
    if (/^>\s?/.test(raw)) {
      const sub = raw.replace(/^>\s?/, "").replace(/\\([.\-+*_`[\]()#!~>|&<>])/g, "$1").trim();
      if (!sub) continue;
      if (!cur) cur = [];
      cur.push(sub);
    } else if (cur) {
      statement.push(cur.join(" "));
      cur = null;
    }
  }
  if (cur) statement.push(cur.join(" "));

  const examples = [];
  let ex = null;
  for (const raw of body) {
    const s = raw.replace(/\\([.\-+*_`[\]()#!~>|&<>])/g, "$1").replace(/\*\*/g, "").trim();
    if (/^示例/.test(s)) {
      if (ex) examples.push(ex);
      ex = { label: s, in: "", out: "", explain: [] };
      continue;
    }
    if (!ex) continue;
    if (/^输入/.test(s)) ex.in = s.replace(/^输入[:：]\s*/, "").trim();
    else if (/^输出/.test(s)) ex.out = s.replace(/^输出[:：]\s*/, "").trim();
    else if (/^解释/.test(s)) ex.explain.push(s.replace(/^解释[:：]\s*/, "").trim());
  }
  if (ex) examples.push(ex);

  let idea = null;
  for (const raw of body) {
    const s = raw.replace(/\\([.\-+*_`[\]()#!~>|&<>])/g, "$1");
    const m = s.match(/^\*\*思路(?:解析|分析)[:：]?\**\s*(.*)$/);
    if (m && m[1].trim()) { idea = m[1].replace(/\*\*/g, "").trim(); break; }
  }

  let inFence = false;
  const buf = [];
  for (const raw of body) {
    const m = raw.match(/^```(\w*)/);
    if (m) {
      if (!inFence) { inFence = true; buf.length = 0; continue; }
      inFence = false;
      if (buf.length) break;
      continue;
    }
    if (inFence) buf.push(raw);
  }
  const code = buf.join("\n").trim();

  return { title, tags, approach, statement, examples, idea, code };
}

const slugify = (lc, approach) => {
  let base = `lc${lc}`;
  if (approach) base += "-" + approach.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let s = base;
  let i = 2;
  while (existing.has(s) || fs.existsSync(path.join(OUT, s + ".json"))) s = `${base}-${i++}`;
  return s;
};

const created = [];
for (let k = 0; k < heads.length; k++) {
  const h = heads[k];
  const end = k + 1 < heads.length ? heads[k + 1].line : lines.length;
  if (existingLc.has(String(h.lc)) && !/\\?-/.test(h.title)) continue;
  const parsed = parse({ ...h, end });
  if (!parsed.code) continue;
  const slug = slugify(h.lc, parsed.approach);
  const codeLines = parsed.code.split("\n").length;
  const doc = {
    slug, lc: h.lc, title: parsed.title, approach: parsed.approach, category: h.category,
    tags: parsed.tags, difficulty: DIFF[h.category] ?? null, sourceLine: h.line + 1,
    statement: parsed.statement.length ? parsed.statement : [parsed.title],
    examples: parsed.examples, figures: [], sourceIdea: parsed.idea, notes: [],
    code: { lang: "java", source: parsed.code, lines: codeLines },
    explain: {
      oneLiner: parsed.idea ? parsed.idea.replace(/[。.!！]$/, "。") : "思路见代码注释与上方原题描述。",
      analogy: "", walkthrough: [], codeWalkthrough: [], pitfalls: [],
      complexity: { time: "", space: "", why: "" }, variants: []
    },
    drill: { fingerprint: [], blanks: [], keyTokens: [], accepted: [] },
    status: parsed.idea ? "written" : "skeleton"
  };
  fs.writeFileSync(path.join(OUT, `${slug}.json`), JSON.stringify(doc, null, 2) + "\n", "utf8");
  created.push({ slug, lc: h.lc, title: parsed.title, category: h.category, lines: codeLines });
}

const idxPath = path.join(OUT, "index.json");
const idx = fs.existsSync(idxPath) ? JSON.parse(fs.readFileSync(idxPath, "utf8")) : { items: [] };
const items = Array.isArray(idx.items) ? idx.items : [];
for (const c of created) {
  if (!items.some((x) => x.slug === c.slug)) {
    items.push({ slug: c.slug, lc: c.lc, title: c.title, category: c.category, tags: [], difficulty: DIFF[c.category] ?? null, lines: c.lines, status: "skeleton" });
  }
}
idx.items = items;
idx.generatedAt = new Date().toISOString();
idx.phase1Categories = [...new Set(items.map((x) => x.category))];
fs.writeFileSync(idxPath, JSON.stringify(idx, null, 2) + "\n", "utf8");

console.log(`新增算法题 ${created.length} 道`);
const byCat = {};
for (const c of created) byCat[c.category] = (byCat[c.category] ?? 0) + 1;
console.log("分类：", JSON.stringify(byCat));
