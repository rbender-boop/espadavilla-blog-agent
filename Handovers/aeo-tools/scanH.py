import re, sys, pathlib
sys.stdout.reconfigure(encoding="utf-8")
ROOT = pathlib.Path(r"C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE")
t = (ROOT / "index.html").read_text(encoding="utf-8")
for m in re.finditer(r'"sameAs"\s*:\s*\[(.*?)\]', t, re.S):
    print("sameAs:", re.sub(r"\s+", " ", m.group(1)))
f = t[t.find("<footer"):]
print("footer links:", sorted(set(re.findall(r'href="([^"]+)"', f))))
# how many pages have a footer with /press
n = tot = 0
for p in ROOT.rglob("*.html"):
    if {".git", "docs", "_pdfsrc"} & set(p.parts): continue
    s = p.read_text(encoding="utf-8", errors="replace")
    if "<footer" not in s: continue
    tot += 1
    if re.search(r'href="/press"', s[s.find("<footer"):]): n += 1
print("pages with footer:", tot, "with /press in footer:", n)
for rel in ["about.html", "property-facts.html"]:
    s = (ROOT / rel).read_text(encoding="utf-8")
    print(rel, "Cuba" in s, "Caibari" in s)
