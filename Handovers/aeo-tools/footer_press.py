"""Add a footer link to /press on every page whose footer lacks one (no dateModified bump: footer-only).
usage: footer_press.py [apply]"""
import re, sys, pathlib, collections
sys.stdout.reconfigure(encoding="utf-8")
ROOT = pathlib.Path(r"C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE")
APPLY = "apply" in sys.argv
PATS = [
    ('<li><a href="/privacy">Privacy Policy</a></li>', '<li><a href="/press">Press</a></li><li><a href="/privacy">Privacy Policy</a></li>'),
    ('<li><a href="/about">About the Authors</a></li></ul>', '<li><a href="/about">About the Authors</a></li><li><a href="/press">Press</a></li></ul>'),
]
c = collections.Counter(); miss = []
for p in ROOT.rglob("*.html"):
    if {".git", "docs", "_pdfsrc", "node_modules"} & set(p.parts): continue
    s = p.read_bytes().decode("utf-8")
    i = s.find("<footer")
    if i < 0: c["no-footer"] += 1; continue
    head, foot = s[:i], s[i:]
    if 'href="/press"' in foot: c["already"] += 1; continue
    for old, new in PATS:
        if foot.count(old) == 1:
            foot = foot.replace(old, new); c[old[:30]] += 1; break
    else:
        miss.append(str(p.relative_to(ROOT))); continue
    if APPLY: p.write_bytes((head + foot).encode("utf-8"))
print(dict(c)); print("unmatched:", len(miss), miss[:40])
