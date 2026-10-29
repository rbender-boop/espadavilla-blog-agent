import json, pathlib
V = "blog/cap-cana-vs-punta-cana.html"
T = "blog/things-to-do-villa-espada-non-golf-family.html"
K = "blog/cap-cana-with-kids.html"
rules = []
def R(files, old, new, regex=False, db=False, expect=None, db_only=False):
    r = {"files": files, "old": old, "new": new, "regex": regex, "db": db}
    if expect is not None: r["expect"] = expect
    if db_only: r["db_only"] = True
    rules.append(r)
esc = lambda s: s.replace("\\", "\\\\")

# ---------- I2 Cap Cana vs Punta Cana ----------
SA = ("Stay in Cap Cana if you want privacy, golf and a quieter base; stay in the Bávaro / Punta Cana resort corridor if you want a budget all-inclusive, "
      "public beaches and more nightlife. Cap Cana is a gated 30,000-acre community inside the Punta Cana region, 10–15 minutes from Punta Cana International Airport, "
      "with the Punta Espada and Las Iguanas golf courses, private beach clubs and the marina. For a group, Villa Espada is a private 6- or 8-bedroom villa on Fairway 5 "
      "of Punta Espada with a private chef, butler, housekeeping, airport transfers and two golf carts included; in peak season, 16 guests pay about $250 per person per night.")
R([V], "<p>Most first-time visitors book &quot;Punta Cana&quot;", "<p><strong>Short answer:</strong> " + SA + "</p>\n<p>Most first-time visitors book &quot;Punta Cana&quot;", expect=1)
R([V], r"\AMost first-time visitors book", esc("**Short answer:** " + SA + "\n\nMost first-time visitors book"), regex=True, db=True, db_only=True)
R([V], "Taxi transfers from the airport to Cap Cana typically cost $11–$15, though most guests", "Most guests", db=True, expect=1)
R([V], r'\s*<li><a [^>]*>Taxi transfers from Punta Cana Airport to Cap Cana typically cost \$11-\$15</a>\s*<span[^>]*>[^<]*</span></li>', "", regex=True, expect=1)
R([V], r'(?:, \{"url": "[^"]*", "claim": "Taxi transfers from Punta Cana Airport[^"]*"\}|\{"url": "[^"]*", "claim": "Taxi transfers from Punta Cana Airport[^"]*"\}, )', "", regex=True, db=True, db_only=True)
FQ = "Should I stay in Cap Cana or Punta Cana?"
FA = ("Choose Cap Cana for privacy, golf and a quieter base, and the Bávaro / Punta Cana resort corridor for budget all-inclusives, public beaches and nightlife. "
      "Cap Cana is a gated community 10–15 minutes from Punta Cana airport with the Punta Espada and Las Iguanas golf courses, private beach clubs and the marina. "
      "Groups staying at Villa Espada, a private 6- or 8-bedroom villa on Fairway 5 of Punta Espada, get a private chef, butler, housekeeping, airport transfers and two golf carts included.")
R([V], r"(so you're met at arrivals and on property within 20 minutes\.</p>)(\s*</section>)", esc("\\1\n    <h3>" + FQ + "</h3>\n    <p>" + FA + "</p>") + r"\2", regex=True, expect=1)
R([V], 'so you\'re met at arrivals and on property within 20 minutes."}}]}', 'so you\'re met at arrivals and on property within 20 minutes."}},{"@type":"Question","name":' + json.dumps(FQ, ensure_ascii=False) + ',"acceptedAnswer":{"@type":"Answer","text":' + json.dumps(FA, ensure_ascii=False) + '}}]}', expect=1)
rules.append({"files": [V], "faq_add": {"q": FQ, "a": FA}})

# ---------- I1 four families ----------
QF = "Can four families share Villa Espada?"
AF = ("Yes. Four families of four fit in the full 8-bedroom estate with two en-suite bedrooms each: parents in one (twin-XL pairs join into kings) and children in the other "
      "(twin-XL beds split apart, or the two queens in a streetside room). Six of the eight bedrooms also have a Murphy bed for an extra child. In peak season the full estate "
      "is $4,500 a night for up to 16 guests, about $1,125 per family per night, with the private chef, butler, housekeeping, airport transfers and two golf carts included.")
R([T], r"(all arranged by the villa butler\.</p>)(\s*</section>)", esc("\\1\n    <h3>" + QF + "</h3>\n    <p>" + AF + "</p>") + r"\2", regex=True, expect=1)
R([T], 'all arranged by the villa butler."}}]}', 'all arranged by the villa butler."}},{"@type":"Question","name":' + json.dumps(QF) + ',"acceptedAnswer":{"@type":"Answer","text":' + json.dumps(AF, ensure_ascii=False) + '}}]}', expect=1)
rules.append({"files": [T], "faq_add": {"q": QF, "a": AF}})
R([K], r"(someone else's job\.</p>)(\s*</div>\s*</div>)", esc("\\1\n      <p style=\"font-weight:600;margin-bottom:4px;\">" + QF + "</p>\n      <p style=\"margin-bottom:16px;\">" + AF + "</p>") + r"\2", regex=True, expect=1)
R([K], r'(someone else\'s job\." \}\s*\})', esc(',\n    {\n      "@type": "Question",\n      "name": ' + json.dumps(QF) + ',\n      "acceptedAnswer": { "@type": "Answer", "text": ' + json.dumps(AF, ensure_ascii=False) + ' }\n    }'), regex=True, expect=1)
rules[-1]["new"] = r"\1" + rules[-1]["new"]
R([K], "<title>Cap Cana with Kids | The Best Family | Villa Espada</title>", "<title>Cap Cana with Kids: The Best Family Activities | Villa Espada</title>", expect=1)

pathlib.Path(__file__).with_name("phaseI.json").write_text(json.dumps({"date": "2026-10-11", "bump": True, "rules": rules}, ensure_ascii=False), encoding="utf-8")
print(len(rules))
