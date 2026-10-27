import unicodedata, os, io, sys
base = r"C:\Users\zhangjiatao6\IdeaProjects\plug_zjt\Java终极笔记\_review"
raw = open(os.path.join(base,"raw.txt"), encoding="utf-8").read()
norm = unicodedata.normalize("NFKC", raw)
from collections import Counter
c = Counter(ch for ch in norm if 0x2E80 <= ord(ch) <= 0x2FDF)
lines = []
for ch,n in c.most_common():
    lines.append(f"U+{ord(ch):04X} {n} {unicodedata.name(ch,'?')}")
open(os.path.join(base,"oddchars.txt"),"w",encoding="utf-8").write("\n".join(lines))
print("count distinct", len(c))
