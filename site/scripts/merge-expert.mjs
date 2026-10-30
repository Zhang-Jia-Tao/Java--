/**
 * 合并资深评审批注分片：src/data/expert/part-*.json
 * 每项：{ id, role: "java"|"ai", comments: [{ scope, kind, quote, text }] }
 * 按 id 路由写回三处：
 *   - /^lc/            → src/data/hot200/<id>.json
 *   - 数字章节号（1-1、6a-1 等）→ src/data/questions/<id>.json
 *   - 其余             → src/data/project/<id>.json
 * 只新增 expert 字段，不改题目正文（原文保留原则）。
 *
 * 用法：node scripts/merge-expert.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src", "data", "expert");
const HOT = path.join(ROOT, "src", "data", "hot200");
const Q = path.join(ROOT, "src", "data", "questions");
const P = path.join(ROOT, "src", "data", "project");

const KINDS = new Set(["praise", "risk", "version", "depth", "production", "provenance"]);
const SCOPES = new Set([
  "oneLine", "s60", "s180", "s600", "points", "pitfalls", "followUps", "metrics", "variants", "whole",
  "statement", "approach", "code", "walkthrough", "complexity",
  "original", "summary", "checklist", "improved"
]);

const files = fs.readdirSync(SRC).filter((f) => /^part-.*\.json$/.test(f));
let merged = 0,
  skipped = 0,
  bad = 0;
const stats = { java: 0, ai: 0, comments: 0 };

const targetOf = (id) => {
  if (/^lc[\d]/.test(id)) return path.join(HOT, `${id}.json`);
  if (/^\d+[ab]?-\d+$/.test(id)) return path.join(Q, `${id}.json`);
  return path.join(P, `${id}.json`);
};

for (const f of files) {
  let arr;
  try {
    arr = JSON.parse(fs.readFileSync(path.join(SRC, f), "utf8").replace(/^\uFEFF/, "").trim());
  } catch (e) {
    console.log("解析失败", f, e.message);
    bad++;
    continue;
  }
  for (const it of arr) {
    const t = targetOf(it.id);
    if (!fs.existsSync(t)) {
      console.log("缺目标", it.id);
      bad++;
      continue;
    }
    const doc = JSON.parse(fs.readFileSync(t, "utf8"));
    const comments = (it.comments ?? [])
      .filter((c) => c && c.text && KINDS.has(c.kind) && SCOPES.has(c.scope))
      .map((c) => ({
        scope: c.scope,
        kind: c.kind,
        quote: String(c.quote ?? "").slice(0, 80),
        text: String(c.text ?? "").trim(),
        ...(c.line && Number.isFinite(Number(c.line)) ? { line: Math.trunc(Number(c.line)) } : {})
      }))
      .filter((c) => c.text.length >= 40);
    if (!comments.length) {
      skipped++;
      continue;
    }
    doc.expert = { role: it.role === "ai" ? "ai" : "java", comments };
    fs.writeFileSync(t, JSON.stringify(doc, null, 2) + "\n", "utf8");
    merged++;
    stats[doc.expert.role]++;
    stats.comments += comments.length;
  }
  console.log(f, arr.length, "题");
}
console.log(`写回 ${merged} 题 / ${stats.comments} 条批注（java ${stats.java} · ai ${stats.ai}）；空 ${skipped}，坏 ${bad}`);
