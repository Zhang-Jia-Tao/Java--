/**
 * 合并满分口语版分片：src/data/perfect/part-*.json
 * 每项：{ id, perfect: { short:{s[]}, deep:{s[]}, hook, hookLabel, why, diff[] } }
 * 写回 src/data/questions/<id>.json 的 perfect 字段；seconds 由语速公式统一计算。
 *
 * 用法：node scripts/merge-perfect.mjs [--dry]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src", "data", "perfect");
const Q = path.join(ROOT, "src", "data", "questions");
const DRY = process.argv.includes("--dry");

/** 口播时长：汉字 4.3 字/秒；英文 12 字符/秒；每段停 0.6 秒 */
export const estSeconds = (paras) => {
  const text = (paras ?? []).join("");
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const en = (text.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || []).join("").length;
  return Math.round(cjk / 4.3 + en / 12 + (paras ?? []).length * 0.6);
};
const cjkLen = (paras) => ((paras ?? []).join("").match(/[\u4e00-\u9fa5]/g) || []).length;

const FORBIDDEN = ["加分点", "拉开差距", "最容易丢分", "但注意", "整个推翻"];

const files = fs.readdirSync(SRC).filter((f) => /^part-.*\.json$/.test(f));
let ok = 0, skip = 0, bad = 0;
const rows = [];

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
    const target = path.join(Q, `${it.id}.json`);
    const p = it.perfect;
    if (!fs.existsSync(target) || !p?.short?.s?.length || !p?.deep?.s?.length) {
      console.log("跳过（缺目标或缺档）", it.id);
      skip++;
      continue;
    }
    const short = p.short.s.map((x) => String(x).trim()).filter(Boolean);
    const deep = p.deep.s.map((x) => String(x).trim()).filter(Boolean);
    const all = [...short, ...deep].join("");
    const hit = FORBIDDEN.filter((w) => all.includes(w));
    if (hit.length) console.log("⚠ 含禁用表达", it.id, hit.join("/"));

    const doc = JSON.parse(fs.readFileSync(target, "utf8"));
    doc.perfect = {
      title: "满分口语版",
      voice: "研三应届生 · 秋招/春招现场口吻",
      short: { seconds: estSeconds(short), s: short },
      deep: { seconds: estSeconds(deep), s: deep },
      ...(p.hook ? { hook: String(p.hook).trim(), hookLabel: p.hookLabel || "钩子" } : {}),
      why: String(p.why ?? "").trim(),
      diff: (p.diff ?? []).map((x) => String(x).trim()).filter(Boolean)
    };
    if (!DRY) fs.writeFileSync(target, JSON.stringify(doc, null, 2) + "\n", "utf8");
    ok++;
    rows.push({
      id: it.id,
      short: `${estSeconds(short)}s/${cjkLen(short)}字`,
      deep: `${estSeconds(deep)}s/${cjkLen(deep)}字`,
      hook: !!p.hook
    });
  }
}

const tooLong = rows.filter((r) => parseInt(r.short) > 95);
const tooShort = rows.filter((r) => parseInt(r.short) < 55);
console.log(`写回 ${ok} 题；跳过 ${skip}；坏 ${bad}${DRY ? "（dry run）" : ""}`);
if (tooLong.length) console.log("⚠ 短版超过 95 秒：", tooLong.map((r) => r.id + "(" + r.short + ")").join(" "));
if (tooShort.length) console.log("⚠ 短版不足 55 秒：", tooShort.map((r) => r.id + "(" + r.short + ")").join(" "));
console.log(rows.map((r) => `${r.id} ${r.short}/${r.deep}`).join("\n"));
