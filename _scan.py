# -*- coding: utf-8 -*-
import os, re
root = r"C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent"
SKIP = ("node_modules", ".git", ".next", "dist")
PATS = {
 "November 2025": re.compile(r"November 2025", re.I),
 "36 hole(s)": re.compile(r"36[ -]hole", re.I),
 "oceanside/ocean holes": re.compile(r"ocean[- ]?side hole|ocean holes", re.I),
 "brand new": re.compile(r"brand[ -]new", re.I),
 "now open/opened 2025": re.compile(r"now open|opened (in )?(november |)2025|opened its doors", re.I),
 "#1 Caribbean (bare)": re.compile(r"#1[^.<\n]{0,40}Caribbean|number one[^.<\n]{0,40}Caribbean", re.I),
 "Las Iguanas": re.compile(r"Las Iguanas", re.I),
}
hits={k:[] for k in PATS}
for dp,dn,fn in os.walk(root):
    if any(s in dp for s in SKIP): continue
    for f in fn:
        if not f.lower().endswith((".md",".ts",".tsx",".js",".cjs",".mjs",".json",".txt",".mdx")): continue
        p=os.path.join(dp,f)
        try: t=open(p,encoding="utf-8",errors="ignore").read()
        except: continue
        for k,rx in PATS.items():
            n=len(rx.findall(t))
            if n: hits[k].append((os.path.relpath(p,root), n))
for k in PATS:
    print("\n###", k, "-- files:", len(hits[k]))
    for rel,n in sorted(hits[k], key=lambda x:-x[1])[:20]:
        print("  ", n, rel)
