import re, sys, pathlib, collections
sys.stdout.reconfigure(encoding="utf-8")
ROOT = pathlib.Path(r"C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE")
c = collections.Counter(); ex = {}
for p in ROOT.rglob("*.html"):
    if {".git", "docs", "_pdfsrc"} & set(p.parts): continue
    s = p.read_text(encoding="utf-8", errors="replace")
    i = s.find("<footer")
    if i < 0: continue
    f = s[i:]
    m = re.search(r'<li><a href="/privacy"[^>]*>[^<]*</a></li>', f)
    key = m.group(0) if m else "NO-PRIVACY-LI"
    c[key] += 1; ex.setdefault(key, str(p.relative_to(ROOT)))
for k, v in c.most_common(): print(v, k[:150], ex[k])
