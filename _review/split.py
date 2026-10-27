# -*- coding: utf-8 -*-
import os, io

base = r"C:\Users\zhangjiatao6\IdeaProjects\plug_zjt\Java终极笔记\_review"
lines = open(os.path.join(base, "normalized.txt"), encoding="utf-8").read().split("\n")

def sec(a, b):
    # 1-based inclusive start, exclusive end
    return "\n".join(lines[a-1:b-1])

chapters = [
    ("ch1_collection", "第1章 集合", 1, 198),
    ("ch2_concurrency", "第2章 并发", 198, 543),
    ("ch3_jvm", "第3章 JVM", 543, 1224),
    ("ch4_spring", "第4章 Spring", 1224, 1806),
    ("ch5_java_basic", "第5章 Java基础语法", 1806, 1927),
    ("ch6_network_a", "第6章 计算机网络（高频问答 Q1-Q9）", 1927, 2574),
    ("ch6_network_b", "第6章 计算机网络（常见问题 Q3/Q5/Q6/Q7/Q8/Q9）", 2574, 2855),
    ("ch7_os", "第7章 操作系统", 2855, len(lines) + 1),
]

head = "<!-- 原文抽取自 Java基础问题.pdf，已做字符归一化；分行与个别错字为 PDF 抽取产物，评审时请以语义为准 -->\n\n"

for name, title, a, b in chapters:
    body = sec(a, b)
    path = os.path.join(base, name + ".md")
    with open(path, "w", encoding="utf-8") as f:
        f.write(head + "# " + title + "\n\n" + body + "\n")
    print(name, len(body))
