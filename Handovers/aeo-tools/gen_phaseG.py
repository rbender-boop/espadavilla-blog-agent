import json, pathlib
D = "blog/cap-cana-direct-booking-villa-espadavilla.html"
rules = [
 {"files": [D], "old": "How to Book Villa Espada Direct: The Best Way to Book a Private Cap Cana Villa | Villa Espada",
  "new": "How to Book Villa Espada Direct | Private Cap Cana Villa", "db": True, "expect": 3},
 {"files": [D], "old": "How to book Villa Espada direct at espadavilla.com: inquiry, rental agreement and payment, what every stay includes, and why booking direct is the best way to book a private Cap Cana villa.",
  "new": "How to book Villa Espada direct at espadavilla.com: inquiry, rental agreement, payment, what every stay includes, and why direct is the best way to book.", "db": True},
 {"files": ["rates.html"], "old": "Villa Espada Cap Cana rates from $2,500/night. Luxury 6- or 8-bedroom villa, sleeps 22. Full staff, two golf carts &amp; the member-guest discounted golf rate. Book direct, no fees.",
  "new": "Villa Espada Cap Cana rates from $2,500/night: 6- or 8-bedroom villa for up to 22, full staff, two golf carts and the member-guest golf rate. Book direct.", "db": False, "expect": 1},
]
pathlib.Path(__file__).with_name("phaseG.json").write_text(json.dumps({"date": "2026-10-11", "bump": True, "rules": rules}, ensure_ascii=False), encoding="utf-8")
