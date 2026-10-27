import re, unicodedata, os
base = r"C:\Users\zhangjiatao6\IdeaProjects\plug_zjt\Java终极笔记\_review"
raw = open(os.path.join(base,"raw.txt"), encoding="utf-8").read()
norm = unicodedata.normalize("NFKC", raw)
M = {0x2EC5:"\u89c1",0x2ED3:"\u957f",0x2EDA:"\u53f6",0x2ED4:"\u95e8",0x2EDB:"\u98ce",0x2ECB:"\u8f66",0x2EC9:"\u8d1d",0x2EE3:"\u9aa8",0x2EE5:"\u9c7c",0x2EC6:"\u89d2"}
norm = norm.translate(M)
norm = re.sub(r"\n=== PAGE (\d+) ===\n", lambda m: f"\n<!--p{m.group(1)}-->\n", norm)
norm = re.sub(r"[ \t]+", " ", norm)
norm = re.sub(r"\n{3,}", "\n\n", norm)
open(os.path.join(base,"normalized.txt"),"w",encoding="utf-8").write(norm)
import collections
print("len", len(norm))
for w in ["可见性","可观性","长","见"]:
    print(w, norm.count(w))
