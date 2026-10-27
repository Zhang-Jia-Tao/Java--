# -*- coding: utf-8 -*-
import os
base = r"C:\Users\zhangjiatao6\IdeaProjects\plug_zjt\Java终极笔记\_review"
lines = open(os.path.join(base,"normalized.txt"), encoding="utf-8").read().split("\n")
def sec(a,b): return "\n".join(lines[a-1:b-1])
parts = {
 "ch3_notes.md": (543, 783),
 "ch3_q0.md": (783, 815),
 "ch3_q2.md": (815, 841),
 "ch3_q3.md": (841, 891),
 "ch3_q4.md": (891, 941),
 "ch3_q5.md": (941, 984),
 "ch3_q6.md": (984, 1033),
 "ch3_q7.md": (1033, 1104),
 "ch3_q8.md": (1104, 1170),
 "ch3_q9.md": (1170, 1224),
}
for k,(a,b) in parts.items():
    body = sec(a,b)
    open(os.path.join(base,k),"w",encoding="utf-8").write("<!-- 抽取自 Java基础问题.pdf 第3章；行号残留/错字为抽取产物 -->\n\n"+body+"\n")
    print(k, len(body))
