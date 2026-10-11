"""For changed html files whose diff (vs HEAD) is ONLY dateModified/modified_time/footer, restore the old dates
and the old sitemap lastmod. usage: python unbump.py"""
import re, subprocess, pathlib
ROOT = pathlib.Path(r"C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE")
def git(*a): return subprocess.run(["git", *a], cwd=ROOT, capture_output=True).stdout.decode("utf-8", "replace")
files = [f for f in git("diff", "--name-only").split("\n") if f.endswith(".html")]
DATE = re.compile(r'("dateModified"\s*:\s*")[^"]*(")|(property="article:modified_time"\s+content=")[^"]*(")')
norm = lambda t: DATE.sub("D", t).replace("\r\n", "\n").replace("6- or 8-bedroom luxury villa", "8BR luxury villa")
sm = ROOT / "sitemap.xml"; smt = sm.read_bytes().decode("utf-8"); smh = git("show", "HEAD:sitemap.xml")
fixed = []
for f in files:
    cur = (ROOT / f).read_bytes().decode("utf-8"); old = git("show", f"HEAD:{f}")
    if norm(cur) != norm(old) or cur == old:
        continue
    olds = DATE.findall(old); it = iter([m.group(0) for m in DATE.finditer(old)])
    cur = DATE.sub(lambda m: next(it), cur)
    (ROOT / f).write_bytes(cur.encode("utf-8"))
    url = "https://www.espadavilla.com/" + ("" if f == "index.html" else f[:-5].removesuffix("/index"))
    m = re.search(rf"<loc>{re.escape(url)}</loc>\s*<lastmod>([^<]*)</lastmod>", smh)
    if m:
        smt = re.sub(rf"(<loc>{re.escape(url)}</loc>\s*<lastmod>)[^<]*(</lastmod>)", rf"\g<1>{m.group(1)}\g<2>", smt)
    fixed.append(f)
sm.write_bytes(smt.encode("utf-8"))
print("unbumped:", *fixed, sep="\n  ")
