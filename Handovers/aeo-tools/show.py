import re, sys, pathlib
# usage: show.py <specfile>  ; spec lines: relfile|regex|ctx   -> writes <specfile>.out (utf-8)
root = pathlib.Path(r"C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE")
out = []
for line in pathlib.Path(sys.argv[1]).read_text(encoding="utf-8").splitlines():
    if not line.strip():
        continue
    f, rest = line.split("|", 1); rx, ctx = rest.rsplit("|", 1)
    t = (root / f).read_text(encoding="utf-8")
    ctx = int(ctx)
    hits = list(re.finditer(rx, t, re.I))
    out.append(f"=== {f} /{rx}/ hits={len(hits)}")
    for m in hits:
        out.append(f"@line {t.count(chr(10),0,m.start())+1}: " + repr(t[max(0,m.start()-ctx):m.end()+ctx]))
pathlib.Path(sys.argv[1] + ".out").write_text("\n".join(out), encoding="utf-8")
print("done", len(out))
