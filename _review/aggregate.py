# -*- coding: utf-8 -*-
"""汇总各章评分表：解析 score_*.md 中的总表行，校验 A+B+C+D+E == 总分，输出 all_scores.csv"""
import os, re, csv, glob

base = r"C:\Users\zhangjiatao6\IdeaProjects\plug_zjt\Java终极笔记\_review"
rows = []
files = sorted(glob.glob(os.path.join(base, "score_ch*.md")))
for f in files:
    txt = open(f, encoding="utf-8").read()
    name = os.path.basename(f)
    for line in txt.split("\n"):
        if "|" not in line:
            continue
        cells = [c.strip().strip("*").strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 9:
            continue
        # 期待: 编号 | 题目 | A | B | C | D | E | 总分 | 判定
        if not re.match(r"^\d", cells[0]):
            continue
        nums = cells[2:8]
        if not all(re.fullmatch(r"\d{1,3}", n or "") for n in nums):
            continue
        a, b, c, d, e, total = (int(x) for x in nums)
        rows.append({
            "file": name, "id": cells[0], "title": cells[1],
            "A": a, "B": b, "C": c, "D": d, "E": e,
            "total": total, "calc": a + b + c + d + e, "verdict": cells[8],
        })

with open(os.path.join(base, "all_scores.csv"), "w", encoding="utf-8-sig", newline="") as fp:
    w = csv.DictWriter(fp, fieldnames=["file", "id", "title", "A", "B", "C", "D", "E", "total", "calc", "verdict"])
    w.writeheader()
    for r in rows:
        w.writerow(r)

bad = [r for r in rows if r["total"] != r["calc"]]
print("parsed rows:", len(rows))
print("inconsistent:", len(bad))
for r in bad:
    print("  !!", r["file"], r["id"], r["total"], r["calc"])
for f in files:
    ids = [r["id"] for r in rows if r["file"] == os.path.basename(f)]
    print(os.path.basename(f), len(ids), ids)
