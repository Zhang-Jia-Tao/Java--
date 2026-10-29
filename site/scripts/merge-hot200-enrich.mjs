/**
 * 合并「算法讲解增强」分片：src/data/hot200-enrich/part-*.json
 * 每项：{ slug, analogy, walkthrough[], codeWalkthrough[], pitfalls[], complexity{time,space,why} }
 * 写回 src/data/hot200/<slug>.json 的 explain 字段（保留 oneLiner/variants）。
 *
 * 用法：node scripts/merge-hot200-enrich.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src", "data", "hot200-enrich");
const OUT = path.join(ROOT, "src", "data", "hot200");

if (!fs.existsSync(SRC)) {
  console.log("没有 hot200-enrich 目录，退出");
  process.exit(0);
}
const files = fs.readdirSync(SRC).filter((f) => /^part-.*\.json$/.test(f));
if (!files.length) {
  console.log("没有分片，退出");
  process.exit(0);
}

let patched = 0;
const seen = new Set();
for (const f of files) {
  const raw = fs.readFileSync(path.join(SRC, f), "utf8").replace(/^\uFEFF/, "").trim();
  const arr = JSON.parse(raw);
  for (const it of arr) {
    const p = path.join(OUT, `${it.slug}.json`);
    if (!fs.existsSync(p)) {
      console.log("缺题目", it.slug);
      continue;
    }
    const doc = JSON.parse(fs.readFileSync(p, "utf8"));
    if (seen.has(it.slug)) continue;
    seen.add(it.slug);
    doc.explain = {
      oneLiner: doc.explain?.oneLiner ?? "",
      analogy: String(it.analogy ?? "").trim(),
      walkthrough: Array.isArray(it.walkthrough) ? it.walkthrough : [],
      codeWalkthrough: Array.isArray(it.codeWalkthrough) ? it.codeWalkthrough : [],
      pitfalls: Array.isArray(it.pitfalls) ? it.pitfalls : [],
      complexity: it.complexity ?? { time: "", space: "", why: "" },
      variants: doc.explain?.variants ?? []
    };
    fs.writeFileSync(p, JSON.stringify(doc, null, 2) + "\n", "utf8");
    patched++;
  }
}
console.log(`增强 ${patched} 题（来源 ${files.length} 个分片）`);
