import json, pathlib
F = ["bedrooms.html", "cap-cana-videos.html", "sitemap.xml"]
rules = [
 {"files": F, "old": "2RGDetxMxkY", "new": "gV_Tt1GUwv0", "db": False},
 {"files": ["bedrooms.html"], "old": "seventy-five hundred over the holidays", "new": "ten thousand over the holidays", "db": False},
 {"files": ["bedrooms.html"], "old": "forty-five hundred, and eighty-five hundred", "new": "forty-five hundred, and twelve thousand", "db": False},
 {"files": ["bedrooms.html"], "old": "\"uploadDate\": \"2026-09-10T12:10:37Z\"", "new": "\"uploadDate\": \"2026-10-12T01:40:00Z\"", "db": False, "expect": 1},
]
pathlib.Path(__file__).with_name("video2.json").write_text(json.dumps({"date": "2026-10-12", "bump": True, "nobump": ["cap-cana-videos.html"], "rules": rules}, ensure_ascii=False), encoding="utf-8")
