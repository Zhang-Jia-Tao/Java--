import sys
from pypdf import PdfReader
p = r"C:\Users\zhangjiatao6\IdeaProjects\plug_zjt\Java终极笔记\_review\Java基础问题.pdf"
r = PdfReader(p)
print("pages:", len(r.pages))
texts=[]
for i,pg in enumerate(r.pages):
    t = pg.extract_text() or ""
    texts.append(t)
full = "\n\n=== PAGE %d ===\n\n".join([])
combined=""
for i,t in enumerate(texts):
    combined += f"\n\n=== PAGE {i+1} ===\n\n" + t
open(r"C:\Users\zhangjiatao6\IdeaProjects\plug_zjt\Java终极笔记\_review\raw.txt","w",encoding="utf-8").write(combined)
print("chars:", len(combined))
print(combined[:3000])
