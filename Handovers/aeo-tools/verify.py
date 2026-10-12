"""Verify pages: every ld+json parses; every FAQPage Q/A appears verbatim in the visible HTML. usage: verify.py rel1 rel2 ..."""
import re, sys, json, html, pathlib
ROOT = pathlib.Path(r"C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE")
bad = 0
for rel in sys.argv[1:]:
    t = (ROOT / rel).read_bytes().decode("utf-8")
    body = t.split("</head>", 1)[-1]
    vis = html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", re.sub(r"</?(a|strong|em|b|i|span)\b[^>]*>", "", re.sub(r"<script.*?</script>", " ", body, flags=re.S)))))
    vis_n = re.sub(r"\s+", " ", vis).replace("’", "'")
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', t, re.S)
    nq = 0; miss = []
    for b in blocks:
        try:
            d = json.loads(b)
        except Exception as e:
            print(f"{rel}: JSON-LD PARSE ERROR {e}"); bad += 1; continue
        items = d.get("@graph", [d]) if isinstance(d, dict) else d
        for it in items:
            if isinstance(it, dict) and it.get("@type") == "FAQPage":
                for q in it.get("mainEntity", []):
                    nq += 1
                    for s in (q["name"], q["acceptedAnswer"]["text"]):
                        s2 = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s))).replace("’", "'").strip()
                        if s2 not in vis_n:
                            miss.append(s2[:80])
    dm = re.findall(r'"dateModified"\s*:\s*"([^"]+)"', t)
    print(f"{rel}: {len(blocks)} ld+json ok, FAQ Qs={nq}, not-visible={len(miss)}, dateModified={dm}")
    for m in miss: print("   MISSING:", m)
    bad += len(miss)
print("RESULT:", "OK" if not bad else f"{bad} problems")
