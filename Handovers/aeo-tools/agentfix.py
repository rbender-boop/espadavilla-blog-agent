import re, pathlib
B = pathlib.Path(r"C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent\src\lib")
NEW = [
 "'- 17-22 GUESTS (HARD): Groups of 17-22 must book the full 8-bedroom estate, so price them from the 8-bedroom rate ($3,000 low / $4,500 peak / $12,000 holiday) plus $100 per guest above 16. Example: 20 guests in peak season = $4,500 + 4 x $100 = $4,900 per night, about $245 per person. Never add the $100 upcharge to a 6-bedroom rate.',",
 "'- CART TIME & TAXIS (HARD): The Punta Espada clubhouse / first tee is about 5 minutes by golf cart from the villa (never 3 minutes). Never state a taxi fare; say the butler arranges a trusted driver.',",
]
for name in ("drafting/generate-post.ts", "drafting/pipeline.ts"):
    p = B / name
    raw = p.read_bytes().decode("utf-8")
    nl = "\r\n" if "\r\n" in raw else "\n"
    lines = raw.split(nl)
    i = next(k for k, l in enumerate(lines) if "OCCUPANCY & UPCHARGE (HARD)" in l)
    if "17-22 GUESTS (HARD)" not in raw:
        ind = re.match(r"\s*", lines[i]).group(0)
        lines[i+1:i+1] = [ind + s for s in NEW]
    raw = nl.join(lines)
    raw, n = re.subn(r"\$7,500.{1,3}\$8,500 holiday\)", "$10,000 holiday for the 6-bedroom configuration; $3,000 / $4,500 / $12,000 for the full 8-bedroom estate)", raw)
    p.write_bytes(raw.encode("utf-8"))
    print(name, "inserted at", i + 1, "holiday fixes", n)
f = B / "facts.ts"
raw = f.read_bytes().decode("utf-8")
old = 'Punta Espada clubhouse is about 3 minutes by golf cart from the villa (never "steps away", "90 seconds", or "2 minutes")'
new = 'Punta Espada clubhouse is about 5 minutes by golf cart from the villa (never "steps away", "90 seconds", "2 minutes" or "3 minutes")'
print("facts.ts", raw.count(old))
f.write_bytes(raw.replace(old, new).encode("utf-8"))
