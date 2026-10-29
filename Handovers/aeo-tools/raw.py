"""Print raw lines of a site file matching a regex (with line numbers). usage: raw.py rel regex [maxlen]"""
import re, sys, pathlib
ROOT = pathlib.Path(r"C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE")
sys.stdout.reconfigure(encoding="utf-8")
lines = (ROOT / sys.argv[1]).read_bytes().decode("utf-8").split("\n")
pat = re.compile(sys.argv[2], re.I)
n = int(sys.argv[3]) if len(sys.argv) > 3 else 400
for i, l in enumerate(lines, 1):
    if pat.search(l):
        print(f"{i}: {l.strip()[:n]}")
