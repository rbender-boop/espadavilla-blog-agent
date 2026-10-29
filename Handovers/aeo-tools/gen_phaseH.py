import json, pathlib
DIS = "Villa Espada is a private villa on Fairway 5 of Punta Espada Golf Course in Cap Cana, Dominican Republic. It is not affiliated with the Villa Espada guesthouse in Caibarién, Cuba."
rules = [
 {"files": ["about.html"], "old": "and golfed from the villa himself.</p>",
  "new": "and golfed from the villa himself.</p>\n<p class=\"facts-lede\">" + DIS + "</p>", "db": False, "expect": 1},
 {"files": ["property-facts.html"], "old": "This page is the single authoritative reference for the property's facts, inclusions, location, and rates.</p>",
  "new": "This page is the single authoritative reference for the property's facts, inclusions, location, and rates. It is not affiliated with the Villa Espada guesthouse in Caibarién, Cuba.</p>", "db": False, "expect": 1},
]
pathlib.Path(__file__).with_name("phaseH.json").write_text(json.dumps({"date": "2026-10-11", "bump": True, "rules": rules}, ensure_ascii=False), encoding="utf-8")
