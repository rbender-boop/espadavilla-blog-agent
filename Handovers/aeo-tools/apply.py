"""Apply text patches to the espadavilla site AND matching Supabase rows.
usage: python apply.py <patch.json> [apply]
patch.json: {"date":"2026-10-11","bump":true,
  "rules":[{"files":["blog/x.html",...] or "*", "old":"...", "new":"...", "regex":false, "expect":N(optional, per-file min),
            "db":true(default)}]}
Without 'apply' = dry run (prints counts only)."""
import json, re, sys, pathlib, urllib.request, urllib.parse
ROOT = pathlib.Path(r"C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE")
ENV = pathlib.Path(r"C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent\.env.local")
DB_SLUGS = """staying-at-villa-espada-day-on-property tennis-and-padel-cap-cana equestrian-and-polo-cap-cana
caleton-beach-club-cap-cana getting-around-cap-cana group-golf-stay-cap-cana-member-rates-tee-times
cap-cana-birthday-villa-milestone-celebrations sargassum-cap-cana punta-espada-golf-course-playing-from-villa-espada
punta-espada-restaurant-eden-roc-playing-from-villa-espada cap-cana-vs-casa-de-campo-comparison staying-at-villa-espada
golf-course-cap-cana-transportation-villa-espada-playbook cap-cana-vs-punta-cana how-far-is-cap-cana-from-punta-cana
cap-cana-casa-de-campo-golf-base punta-espada-golf-villa-luxury-group cap-cana-direct-booking-villa-espadavilla
things-to-do-villa-espada-non-golf-family cap-cana-golf-residences-villa-espada-playbook""".split()
TEXT_FIELDS = ["meta_title", "meta_description", "h1", "body_markdown", "edited_content", "summary"]
JSON_FIELDS = ["faq", "sources"]

patch = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
APPLY = len(sys.argv) > 2 and sys.argv[2] == "apply"
date = patch.get("date", "2026-10-11")

def all_files():
    for p in ROOT.rglob("*"):
        if p.suffix in (".html", ".txt", ".json") and not {".git", "_pdfsrc", "docs", "node_modules"} & set(p.parts):
            yield p

def sub(rule, text):
    if rule.get("regex"):
        return re.subn(rule["old"], rule["new"], text)
    return text.replace(rule["old"], rule["new"]), text.count(rule["old"])

# ---- files
changed = {}
problems = []
for i, r in enumerate(patch["rules"]):
    if "faq_add" in r or r.get("db_only"):
        continue
    targets = [] if r["files"] == "db" else list(all_files()) if r["files"] == "*" else [ROOT / f for f in r["files"]]
    total = 0
    for p in targets:
        t = changed.get(p) or p.read_bytes().decode("utf-8")
        t2, n = sub(r, t)
        if r["files"] not in ("*", "db") and n == 0:
            problems.append(f"rule {i}: 0 hits in {p.relative_to(ROOT)}")
        if n:
            changed[p] = t2
            total += n
    if "expect" in r and total != r["expect"]:
        problems.append(f"rule {i}: expected {r['expect']} file hits, got {total}")
    print(f"rule {i}: {total} file hits  [{r['old'][:60]!r}]")

bumped = []
if patch.get("bump", True):
    sm = ROOT / "sitemap.xml"
    smt = changed.get(sm) or sm.read_bytes().decode("utf-8")
    for p, t in list(changed.items()):
        if p.suffix != ".html":
            continue
        if any(str(p.relative_to(ROOT)).replace("\\", "/") == nb for nb in patch.get("nobump", [])):
            continue
        t = re.sub(r'("dateModified"\s*:\s*")[^"]*(")', rf"\g<1>{date}\g<2>", t)
        t = re.sub(r'(property="article:modified_time"\s+content=")[^"]*(")', rf"\g<1>{date}\g<2>", t)
        changed[p] = t
        rel = str(p.relative_to(ROOT)).replace("\\", "/")
        url = "https://www.espadavilla.com/" + ("" if rel == "index.html" else rel[:-5].removesuffix("/index"))
        smt2, n = re.subn(rf"(<loc>{re.escape(url)}</loc>\s*<lastmod>)[^<]*(</lastmod>)", rf"\g<1>{date}\g<2>", smt)
        if n:
            smt = smt2
        else:
            problems.append(f"sitemap: no <loc> for {url}")
        bumped.append(url)
    changed[sm] = smt

if APPLY:
    for p, t in changed.items():
        p.write_bytes(t.encode("utf-8"))
print("FILES CHANGED:", len(changed))
for p in sorted(changed):
    print("  ", p.relative_to(ROOT))

# ---- DB
env = dict(l.split("=", 1) for l in ENV.read_text(encoding="utf-8").splitlines() if "=" in l and not l.startswith("#"))
URL, KEY = env["SUPABASE_URL"].strip().strip('"'), env["SUPABASE_SERVICE_ROLE_KEY"].strip().strip('"')
H = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"}
def req(method, path, body=None):
    r = urllib.request.Request(URL + "/rest/v1/" + path, method=method, headers={**H, "Prefer": "return=representation"},
                               data=json.dumps(body).encode() if body is not None else None)
    return json.loads(urllib.request.urlopen(r).read() or "null")

for slug in DB_SLUGS:
    rules = [r for r in patch["rules"] if (r.get("db", True) or "faq_add" in r) and (r["files"] in ("*", "db") or f"blog/{slug}.html" in [f.replace("\\", "/") for f in r["files"]])]
    if not rules:
        continue
    rows = req("GET", "blog_post_drafts?status=eq.published&slug=eq." + slug + "&select=id," + ",".join(TEXT_FIELDS + JSON_FIELDS))
    for row in rows:
        upd, hits = {}, 0
        for f in TEXT_FIELDS:
            if row.get(f):
                v = row[f]
                for r in rules:
                    if "faq_add" in r: continue
                    v, n = sub(r, v); hits += n
                if v != row[f]: upd[f] = v
        for f in JSON_FIELDS:
            if row.get(f) is not None:
                s = json.dumps(row[f], ensure_ascii=False)
                s2 = s
                for r in rules:
                    if "faq_add" in r: continue
                    rr = dict(r)
                    if not r.get("regex"):
                        rr["old"] = json.dumps(r["old"], ensure_ascii=False)[1:-1]; rr["new"] = json.dumps(r["new"], ensure_ascii=False)[1:-1]
                    s2, n = sub(rr, s2); hits += n
                if s2 != s: upd[f] = json.loads(s2)
        for r in rules:
            if "faq_add" in r:
                cur = upd.get("faq", row.get("faq")) or []
                if not any(x.get("q") == r["faq_add"]["q"] for x in cur):
                    upd["faq"] = cur + [r["faq_add"]]; hits += 1
        print(f"DB {slug}: {hits} hits, fields {list(upd)}")
        if APPLY and upd:
            import time
            bk = pathlib.Path(__file__).parent / "backups"; bk.mkdir(exist_ok=True)
            (bk / f"{slug}-{int(time.time()*1000)}.json").write_text(json.dumps(row, ensure_ascii=False), encoding="utf-8")
            req("PATCH", "blog_post_drafts?id=eq." + row["id"], upd)

print("PROBLEMS:" if problems else "NO PROBLEMS", *problems, sep="\n  ")
print("BUMPED URLS:", *bumped, sep="\n  ")
