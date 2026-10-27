# -*- coding: utf-8 -*-
"""基于 all_scores.csv 生成汇总表（Markdown 片段），供最终报告使用"""
import csv, os, collections

base = r"C:\Users\zhangjiatao6\IdeaProjects\plug_zjt\Java终极笔记\_review"
rows = list(csv.DictReader(open(os.path.join(base, "all_scores.csv"), encoding="utf-8-sig")))
for r in rows:
    for k in ("A", "B", "C", "D", "E", "total"):
        r[k] = int(r[k])

chap_order = ["score_ch1.md", "score_ch2.md", "score_ch3_a.md", "score_ch3_b.md", "score_ch3_c.md", "score_ch3_d.md",
              "score_ch4.md", "score_ch5.md", "score_ch6a.md", "score_ch6b.md", "score_ch7.md"]
chap_name = {
    "score_ch1.md": "第1章 集合", "score_ch2.md": "第2章 并发",
    "score_ch3_a.md": "第3章 JVM（A：Q0/Q2/Q3）", "score_ch3_b.md": "第3章 JVM（B：Q4/Q5/Q6）",
    "score_ch3_c.md": "第3章 JVM（C：Q7）", "score_ch3_d.md": "第3章 JVM（D：Q8/Q9）",
    "score_ch4.md": "第4章 Spring", "score_ch5.md": "第5章 Java基础",
    "score_ch6a.md": "第6章 网络（高频 Q1-Q9）", "score_ch6b.md": "第6章 网络（常见问题）",
    "score_ch7.md": "第7章 操作系统",
}
# 第3章合并视图
CH3 = {"score_ch3_a.md", "score_ch3_b.md", "score_ch3_c.md", "score_ch3_d.md"}

def idsort(i):
    m = i.split("-")
    ch = m[0]
    chnum = int("".join(c for c in ch if c.isdigit()))
    sub = 0 if "a" in ch else (1 if "b" in ch else 0)
    return (chnum, sub, int(m[1]))

rows.sort(key=lambda r: idsort(r["id"]))

out = []
out.append("## 全量评分总表\n")
out.append("| 编号 | 题目 | 准确 A/40 | 完整 B/25 | 深度 C/20 | 表达 D/10 | 亮点 E/5 | 总分 | 判定 |")
out.append("|---|---|---|---|---|---|---|---|---|")
for r in rows:
    out.append(f"| {r['id']} | {r['title']} | {r['A']} | {r['B']} | {r['C']} | {r['D']} | {r['E']} | **{r['total']}** | {r['verdict']} |")
out.append("")

out.append("\n## 分章统计\n")
out.append("| 章节 | 题数 | 平均分 | 最高 | 最低 | ≥90 | ≥96（满分） | A均 | B均 | C均 | D均 | E均 |")
out.append("|---|---|---|---|---|---|---|---|---|---|---|---|")
def stat_line(name, sub):
    n = len(sub)
    return "| {name} | {n} | **{avg:.1f}** | {mx} | {mn} | {g90} | {g96} | {a:.1f} | {b:.1f} | {c:.1f} | {d:.1f} | {e:.1f} |".format(
        name=name, n=n, avg=sum(r["total"] for r in sub) / n,
        mx=max(r["total"] for r in sub), mn=min(r["total"] for r in sub),
        g90=sum(1 for r in sub if r["total"] >= 90), g96=sum(1 for r in sub if r["total"] >= 96),
        a=sum(r["A"] for r in sub) / n, b=sum(r["B"] for r in sub) / n, c=sum(r["C"] for r in sub) / n,
        d=sum(r["D"] for r in sub) / n, e=sum(r["E"] for r in sub) / n)

for f in chap_order:
    sub = [r for r in rows if r["file"] == f]
    if not sub:
        continue
    if f == "score_ch4.md":
        ch3 = [r for r in rows if r["file"] in CH3]
        if ch3:
            out.append(stat_line("**第3章 JVM（合计 9 题）**", ch3))
    out.append(stat_line(chap_name.get(f, f), sub))

out.append("")

n = len(rows)
tot = sum(r["total"] for r in rows)
out.append("\n## 总体\n")
out.append(f"- 题目总数：**{n}**")
out.append(f"- 总平均分：**{tot / n:.1f}**")
out.append(f"- 最高分：**{max(r['total'] for r in rows)}**（{'、'.join(r['id'] for r in rows if r['total'] == max(x['total'] for x in rows))}）")
out.append(f"- 最低分：**{min(r['total'] for r in rows)}**（{'、'.join(r['id'] for r in rows if r['total'] == min(x['total'] for x in rows))}）")
out.append(f"- ≥96（真·满分）：**{sum(1 for r in rows if r['total'] >= 96)}** 题")
out.append(f"- 90-95（优秀/准满分）：**{sum(1 for r in rows if 90 <= r['total'] <= 95)}** 题")
out.append(f"- 80-89（良好）：**{sum(1 for r in rows if 80 <= r['total'] <= 89)}** 题")
out.append(f"- 70-79（及格）：**{sum(1 for r in rows if 70 <= r['total'] <= 79)}** 题")
out.append(f"- <70（不合格）：**{sum(1 for r in rows if r['total'] < 70)}** 题")
out.append("")
out.append("各维度得分率：")
for k, mx in (("A", 40), ("B", 25), ("C", 20), ("D", 10), ("E", 5)):
    s = sum(r[k] for r in rows) / n
    out.append(f"- {k}（{mx} 分制）平均 {s:.1f} → **{s / mx * 100:.0f}%**")
out.append("")

text = "\n".join(out)
open(os.path.join(base, "summary_tables.md"), "w", encoding="utf-8").write(text)
print(text)
