import pathlib, sys
sys.stdout.reconfigure(encoding="utf-8")
ROOT = pathlib.Path(r"C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE")
fix = {
 "blog/cap-cana-vs-punta-cana.html": "so you're met at arrivals and on property within 20 minutes.</p>",
 "blog/things-to-do-villa-espada-non-golf-family.html": "all arranged by the villa butler.</p>",
 "blog/cap-cana-with-kids.html": "someone else's job.</p>",
}
for rel, orig in fix.items():
    p = ROOT / rel
    t = p.read_bytes().decode("utf-8")
    n = t.count("\\1\n")
    i = t.find("\\1\n")
    print(rel, "literal \\1 count:", n, "| context:", repr(t[i-80:i+20]))
    if n == 1 and "apply" in sys.argv:
        p.write_bytes(t.replace("\\1\n", orig + "\n").encode("utf-8"))
