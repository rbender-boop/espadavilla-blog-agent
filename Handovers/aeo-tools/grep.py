import re, sys, pathlib, html
# usage: grep.py <regex> [ctx] [exclude_regex]
root = pathlib.Path(r"C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE")
pat = re.compile(sys.argv[1], re.I)
ctx = int(sys.argv[2]) if len(sys.argv) > 2 else 90
excl = re.compile(sys.argv[3], re.I) if len(sys.argv) > 3 and sys.argv[3] else None
n = 0
for p in sorted(root.rglob("*")):
    if p.suffix not in (".html", ".txt", ".json", ".xml") or ".git" in p.parts or "_pdfsrc" in p.parts or "docs" in p.parts:
        continue
    t = p.read_text(encoding="utf-8", errors="replace")
    for m in pat.finditer(t):
        s = t[max(0, m.start()-ctx):m.end()+ctx]
        s = re.sub(r"\s+", " ", re.sub(r"<[^>]{0,200}>", "", s))
        if excl and excl.search(s):
            continue
        n += 1
        print(f"{p.relative_to(root)}:{t.count(chr(10),0,m.start())+1}: {s}")
print("TOTAL", n)
