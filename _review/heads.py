import re, os
base = r"C:\Users\zhangjiatao6\IdeaProjects\plug_zjt\Java终极笔记\_review"
t = open(os.path.join(base,"normalized.txt"), encoding="utf-8").read()
lines = t.split("\n")
out=[]
for i,l in enumerate(lines):
    s=l.strip()
    if not s: continue
    if re.match(r'^[0-9]+(\.[0-9]+)*\s*[\.、]?\s*\S', s) and len(s)<40:
        out.append(f"{i+1}\tCH?\t{s}")
    elif re.match(r'^Q\d+', s) and len(s)<120:
        out.append(f"{i+1}\tQ\t{s}")
    elif re.match(r'^第[一二三四五六七八九十]+[章部分]', s):
        out.append(f"{i+1}\tCH\t{s}")
open(os.path.join(base,"headings.txt"),"w",encoding="utf-8").write("\n".join(out))
print(len(out))
