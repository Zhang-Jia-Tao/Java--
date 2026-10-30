/**
 * 合并 MySQL / 中间件口述稿分片：src/data/speak/part-db-*.json
 * 每项：{ id, speak: { s60, s180, s600 } }
 * 写回 src/data/project/<id>.json 的 speak 字段。
 *
 * 用法：node scripts/merge-speak.mjs [--dry]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src", "data", "speak");
const P = path.join(ROOT, "src", "data", "project");
const DRY = process.argv.includes("--dry");

const cjk = (t) => ((t || "").match(/[\u4e00-\u9fa5]/g) || []).length;
const est = (t) => {
  const s = t || "";
  const c = (s.match(/[\u4e00-\u9fa5]/g) || []).length;
  const en = (s.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || []).join("").length;
  const paras = s.split(/\n+/).filter((x) => x.trim()).length;
  return Math.round(c / 4.3 + en / 12 + paras * 0.6);
};
const RANGE = { s60: [195, 265], s180: [560, 740], s600: [700, 950] };

const files = fs.readdirSync(SRC).filter((f) => /^part-db-.*\.json$/.test(f)).sort();
let ok = 0, skip = 0;
const rows = [];
for (const f of files) {
  let arr;
  try {
    arr = JSON.parse(fs.readFileSync(path.join(SRC, f), "utf8").replace(/^\uFEFF/, "").trim());
  } catch (e) {
    console.log("解析失败", f, e.message);
    continue;
  }
  for (const it of arr) {
    const target = path.join(P, `${it.id}.json`);
    if (!fs.existsSync(target) || !it.speak?.s60) {
      console.log("跳过", it.id);
      skip++;
      continue;
    }
    const doc = JSON.parse(fs.readFileSync(target, "utf8"));
    doc.speak = {
      s60: String(it.speak.s60).trim(),
      s180: String(it.speak.s180 ?? "").trim(),
      s600: String(it.speak.s600 ?? "").trim()
    };
    if (!DRY) fs.writeFileSync(target, JSON.stringify(doc, null, 2) + "\n", "utf8");
    ok++;
    rows.push({ id: it.id, s60: cjk(doc.speak.s60), s180: cjk(doc.speak.s180), s600: cjk(doc.speak.s600), t60: est(doc.speak.s60), t180: est(doc.speak.s180), t600: est(doc.speak.s600) });
  }
}
const bad = [];
for (const r of rows) {
  for (const k of ["s60", "s180", "s600"]) {
    const [lo, hi] = RANGE[k];
    if (r[k] < lo || r[k] > hi) bad.push(`${r.id}.${k}=${r[k]}`);
  }
}
console.log(`写回 ${ok} 题，跳过 ${skip}${DRY ? "（dry）" : ""}`);
if (bad.length) console.log("⚠ 超出区间:", bad.join(" "));
console.log(rows.map((r) => `${r.id} ${r.s60}/${r.s180}/${r.s600}字 (${r.t60}s/${r.t180}s/${r.t600}s)`).join("\n"));
