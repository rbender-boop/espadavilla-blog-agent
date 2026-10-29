"""peek.py rel regex [before] [after] : print raw text around each regex match"""
import re, sys, pathlib
sys.stdout.reconfigure(encoding="utf-8")
ROOT = pathlib.Path(r"C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE")
t = (ROOT / sys.argv[1]).read_bytes().decode("utf-8")
b = int(sys.argv[3]) if len(sys.argv) > 3 else 150
a = int(sys.argv[4]) if len(sys.argv) > 4 else 300
for m in re.finditer(sys.argv[2], t):
    print(repr(t[max(0, m.start() - b):m.end() + a])); print("-----")
