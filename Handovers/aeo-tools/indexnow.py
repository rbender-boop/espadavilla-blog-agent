"""List content-changed URLs between two git revs (ignoring footer-only/date-only changes) and optionally submit to IndexNow.
usage: python indexnow.py <base_rev> [<head_rev>=HEAD] [submit]"""
import re, sys, json, subprocess, pathlib, urllib.request
ROOT = pathlib.Path(r"C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE")
def git(*a): return subprocess.run(["git", *a], cwd=ROOT, capture_output=True).stdout.decode("utf-8", "replace")
base = sys.argv[1]; head = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != "submit" else "HEAD"
DATE = re.compile(r'("dateModified"\s*:\s*")[^"]*(")|(property="article:modified_time"\s+content=")[^"]*(")')
norm = lambda t: DATE.sub("D", t).replace("\r\n", "\n").replace("6- or 8-bedroom luxury villa", "8BR luxury villa")
urls = []
for f in git("diff", "--name-only", base, head).split("\n"):
    if not f.endswith(".html"):
        continue
    a, b = git("show", f"{base}:{f}"), git("show", f"{head}:{f}")
    if norm(a) == norm(b) or re.search(r'name="robots" content="noindex', b):
        continue
    urls.append("https://www.espadavilla.com/" + ("" if f == "index.html" else f[:-5].removesuffix("/index")))
for extra in ("llms.txt", "llms-full.txt"):
    if extra in git("diff", "--name-only", base, head):
        urls.append("https://www.espadavilla.com/" + extra)
print(len(urls), "URLs"); print(*urls, sep="\n")
if "submit" in sys.argv:
    body = {"host": "www.espadavilla.com", "key": "3348bc6a409522753cec189cdfca4c19",
            "keyLocation": "https://www.espadavilla.com/3348bc6a409522753cec189cdfca4c19.txt", "urlList": urls}
    r = urllib.request.Request("https://api.indexnow.org/indexnow", data=json.dumps(body).encode(), method="POST",
                               headers={"Content-Type": "application/json; charset=utf-8"})
    try:
        resp = urllib.request.urlopen(r); print("IndexNow HTTP", resp.status)
    except urllib.error.HTTPError as e:
        print("IndexNow HTTP", e.code, e.read()[:300])
