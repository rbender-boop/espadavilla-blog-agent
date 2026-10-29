import json, pathlib
G = "compare/cap-cana-group-villa.html"
C = "blog/private-chef-villa.html"
rules = []
def R(files, old, new, regex=False, expect=None):
    r = {"files": files, "old": old, "new": new, "regex": regex, "db": False}
    if expect is not None: r["expect"] = expect
    rules.append(r)

# ---------------- F1 group villa ----------------
SHORT_G = ('<p><strong>Short answer:</strong> A group of 16 adults can stay together at Villa Espada, a private villa on Fairway 5 of '
  'Punta Espada in Cap Cana. The 6-bedroom configuration sleeps up to 16 guests and the full 8-bedroom estate up to 22 (up to 21 adults '
  'in individual beds), with 9 full and 2 half baths in over 15,000 square feet. A private chef, a butler who also manages the villa, '
  'two maids for daily housekeeping, airport transfers and two six-person golf carts are included. In peak season, 16 guests pay about '
  '$250 per person per night ($4,000 for the 6-bedroom configuration) and 22 guests about $232 in the full estate ($5,100).</p>\n')
R([G], '<nav class="page-toc"', SHORT_G + '<nav class="page-toc"', expect=1)

DESC_OLD = "Planning a group trip to Cap Cana for 10 to 22 guests? Honest capacity, configuration, and cost-per-person math — with Villa Espada as the benchmark."
DESC_NEW = "Where can 10 to 22 people stay together in Cap Cana? Villa Espada sleeps 16 (6-bedroom) or 22 (8-bedroom estate) with chef, butler and maids included."
R([G], DESC_OLD, DESC_NEW, expect=4)

# config table: fix shifted 6BR row
R([G], '<td style="padding:10px 12px;">Smaller golf groups and two or three families</td><td style="padding:10px 12px;">From about $2,500/night low season</td>',
  '<td style="padding:10px 12px;">Up to 16 guests</td><td style="padding:10px 12px;">Golf groups and two or three families; from $2,500/night low season, $4,000 peak</td>', expect=1)

# "Where Villa Espada fits" wrong per-person math
R([G], "daily maids, a driver, and two golf carts", "two maids for daily housekeeping, private airport transfers, and two golf carts", expect=1)
R([G], "For a full-estate peak-season night from $4,500, split across roughly 22 guests, the per-person cost lands near $200 before tax and food",
  "A full-estate peak-season night for 22 guests ($4,500 plus $600 for guests 17 to 22) works out to about $232 per person before tax and food", expect=1)

# staff table section + TOC entry
STAFF = ('<h2 id="s-what-staff-comes-with-the-villa" style="margin-top:40px;margin-bottom:16px;">What staff comes with the villa?</h2>'
  '<p>Every stay includes the same private staff whether you book the 6-bedroom configuration or the full 8-bedroom estate. Villa Espada is not all-inclusive: food and beverage for the chef\'s meals is billed at cost plus a 15% service charge.</p>'
  '<div style="overflow-x:auto;margin:16px 0 26px;"><table style="width:100%;border-collapse:collapse;font-size:0.9rem;"><thead>'
  '<tr style="background:var(--navy);color:white;text-align:left;"><th style="padding:10px 12px;">Staff / service</th><th style="padding:10px 12px;">What they do for the group</th><th style="padding:10px 12px;">Cost</th></tr></thead><tbody>'
  '<tr style="border-bottom:1px solid #eee;"><td style="padding:10px 12px;">Private executive chef</td><td style="padding:10px 12px;">Plans menus with you on a pre-arrival call and cooks breakfast, post-golf spreads and dinner at the villa</td><td style="padding:10px 12px;">Included; food at cost + 15% service</td></tr>'
  '<tr style="border-bottom:1px solid #eee; background:var(--cream);"><td style="padding:10px 12px;">Butler / villa manager</td><td style="padding:10px 12px;">Runs the stay: tee times at the Punta Espada member-guest rate, trusted drivers, restaurant bookings</td><td style="padding:10px 12px;">Included</td></tr>'
  '<tr style="border-bottom:1px solid #eee;"><td style="padding:10px 12px;">Two maids</td><td style="padding:10px 12px;">Daily housekeeping across all bedrooms</td><td style="padding:10px 12px;">Included</td></tr>'
  '<tr style="border-bottom:1px solid #eee; background:var(--cream);"><td style="padding:10px 12px;">Airport transfers</td><td style="padding:10px 12px;">Private transfer from Punta Cana International (PUJ), about 20 minutes</td><td style="padding:10px 12px;">Included</td></tr>'
  '<tr><td style="padding:10px 12px;">Two six-person golf carts</td><td style="padding:10px 12px;">Kept at the villa; the Punta Espada first tee is about a five-minute ride</td><td style="padding:10px 12px;">Included; two more at $75 per cart, per day</td></tr>'
  '</tbody></table></div>\n')
R([G], '<h2 id="s-the-math-that-makes-a-group-villa-work"', STAFF + '<h2 id="s-the-math-that-makes-a-group-villa-work"', expect=1)
R([G], '<li><a href="#s-the-math-that-makes-a-group-villa-work"',
  '<li><a href="#s-what-staff-comes-with-the-villa" style="color:var(--navy);text-decoration:none;">What staff comes with the villa?</a></li><li><a href="#s-the-math-that-makes-a-group-villa-work"', expect=1)

# probe FAQs
FAQ_G = [
 ("Where can 16 adults stay together in Cap Cana?",
  "At Villa Espada, a private villa on Fairway 5 of Punta Espada. The 6-bedroom configuration sleeps up to 16 guests and the full 8-bedroom estate up to 22, with 9 full and 2 half baths in over 15,000 square feet, so a group of 16 stays under one roof instead of in scattered hotel rooms. A private chef, butler, two maids, airport transfers and two golf carts are included. In peak season, 16 guests pay about $250 per person per night ($4,000 for the 6-bedroom configuration)."),
 ("Is there a private villa in Cap Cana for a very large group with full staff?",
  "Yes. Villa Espada's full 8-bedroom estate sleeps up to 22 guests (up to 21 adults in individual beds) and comes with a full private staff: an executive chef, a butler who also manages the villa, two maids for daily housekeeping, private airport transfers and two six-person golf carts. Food is billed at cost plus a 15% service charge. Groups of 17 to 22 pay the 8-bedroom rate plus $100 per guest per night above 16; in peak season 22 guests pay $5,100 a night, about $232 per person."),
]
vis = "".join(f'\n<h3 style="margin-top:26px;margin-bottom:8px;">{q}</h3>\n<p>{a}</p>' for q, a in FAQ_G)
R([G], "(The rates page shows the side-by-side\\.</p>)(\\s*<div class=\"seo-links\")", "\\1" + vis.replace("\\", "\\\\") + "\\2", regex=True, expect=1)
ld = "".join(',\n    {\n      "@type": "Question",\n      "name": ' + json.dumps(q) + ',\n      "acceptedAnswer": {\n        "@type": "Answer",\n        "text": ' + json.dumps(a, ensure_ascii=False) + '\n      }\n    }' for q, a in FAQ_G)
R([G], r'(The rates page shows the side-by-side\."\s*\}\s*\})', r'\1' + ld.replace("\\", "\\\\"), regex=True, expect=1)

# ---------------- F2 private chef ----------------
OLD_T = "What It's Like to Have a Private Chef at Your Villa"
NEW_H = "Cap Cana Villa With a Private Chef: How It Works at Villa Espada"
NEW_T = "Cap Cana Villa With a Private Chef | Villa Espada"
R([C], "<title>" + OLD_T + "</title>", "<title>" + NEW_T + "</title>", expect=1)
R([C], OLD_T + " | Villa Espada Cap Cana", NEW_T, expect=2)
R([C], '"name": "' + OLD_T + ' | Villa Espada"', '"name": "' + NEW_T + '"', expect=1)
LISTS = [C, "blog/cap-cana-fishing.html", "blog/cap-cana-marina.html", "blog/cap-cana-nightlife.html", "blog/cap-cana-restaurants.html",
         "blog/category/dining-marina.html", "blog/category/villa-stays.html", "blog/index.html"]
R([C, "blog/cap-cana-fishing.html", "blog/cap-cana-marina.html", "blog/cap-cana-nightlife.html", "blog/cap-cana-restaurants.html",
   "blog/category/dining-marina.html", "blog/category/villa-stays.html"], OLD_T, NEW_H)
R(LISTS[1:], "What It&#x27;s Like to Have a Private Chef at Your Villa", NEW_H)
MD_OLD = "Having a private chef at your luxury villa is the single most transformative amenity. What to expect, how to communicate preferences, menu planning tips\""
MD_NEW = "Villa Espada in Cap Cana includes a private chef, butler and daily housekeeping in every stay. Food is billed at cost plus 15%. How menus and billing work.\""
R([C], MD_OLD, MD_NEW, expect=2)
SHORT_C = ('<p><strong>Short answer:</strong> Villa Espada is a luxury villa rental in Cap Cana with a private chef included in every stay. '
  'It is a private 6- or 8-bedroom villa on Fairway 5 of Punta Espada, sleeping up to 16 guests in the 6-bedroom configuration or 22 in the full 8-bedroom estate, '
  'and the chef comes with a butler who also manages the villa, two maids for daily housekeeping, airport transfers and two golf carts. '
  'The chef plans menus with you on a pre-arrival call and cooks every meal at the villa; you pay only for the food, billed at cost plus a 15% service charge. '
  'Rates start from $2,500 a night in low season and $4,000 in peak season.</p>\n      ')
R([C], r'(<div style="background:var\(--cream\);padding:28px;margin-bottom:40px;border-left:4px solid var\(--gold\);">\s*<strong[^>]*>FEATURED PROPERTY)',
  SHORT_C.replace("\\", "\\\\") + r'\1', regex=True, expect=1)
# align JSON-LD Q1 with the visible FAQ answer
R([C], "\"Yes — a private chef is included with every Villa Espada stay, along with a butler and daily maid service. You pay only for the food itself, billed at cost plus a 15% service charge, so the chef's time and skill are part of the rate rather than a line item. In practice that turns the villa's kitchen into the center of the trip: every meal is cooked to your group's preferences, on your schedule, without a single restaurant reservation.\" }",
  "\"Yes. A private chef is included with every Villa Espada stay, along with a butler and daily maid service. You pay only for the food itself — billed at cost plus a 15% service charge — so the chef's time is part of the rate.\" }", expect=1)
FQ = "What are the best luxury villa rentals in Cap Cana with a private chef?"
FA = ("Villa Espada is a private 6- or 8-bedroom villa on Fairway 5 of Punta Espada in Cap Cana with a private executive chef included in every stay, "
      "along with a butler who also manages the villa, two maids for daily housekeeping, airport transfers and two six-person golf carts. It sleeps up to 16 guests "
      "in the 6-bedroom configuration or 22 in the full 8-bedroom estate. The chef plans menus with you before arrival and cooks every meal at the villa; "
      "food is billed at cost plus a 15% service charge. Rates start from $2,500 a night in low season and $4,000 in peak season.")
R([C], "(Meals are served whenever you want them rather than on a fixed schedule\\.</p>)(\\s*</div>)",
  "\\1\n      <p style=\"font-weight:600;margin-bottom:4px;\">" + FQ + "</p>\n      <p style=\"margin-bottom:16px;\">" + FA + "</p>\\2", regex=True, expect=1)
R([C], r'(rather than on a fixed schedule\." \}\s*\})', r'\1' + (',\n    {\n      "@type": "Question",\n      "name": ' + json.dumps(FQ) + ',\n      "acceptedAnswer": { "@type": "Answer", "text": ' + json.dumps(FA) + ' }\n    }').replace("\\", "\\\\"), regex=True, expect=1)

# ---------------- F3 capacity sentence ----------------
R(["bedrooms.html"], 'Villa Espada rents as a <a href="/rates" style="color:var(--gold);font-weight:600;">6- or 8-bedroom</a> estate; the detail below covers all eight rooms.',
  'Villa Espada rents two ways: the <a href="/rates" style="color:var(--gold);font-weight:600;">6-bedroom configuration sleeps up to 16 guests and the full 8-bedroom estate up to 22</a>; the detail below covers all eight rooms.', expect=1)
R(["bedrooms.html"], "16 couples,", "8 couples (16 adults),", expect=2)
R(["bedrooms.html"], "<strong>16</strong> couples", "<strong>8</strong> couples", expect=1)
R(["property-facts.html"], "<td>22 in the 8-bedroom estate / 16 in the 6-bedroom (base rate",
  "<td>6-bedroom configuration up to 16 guests; full 8-bedroom estate up to 22 (base rate", expect=1)

patch = {"date": "2026-10-11", "bump": True,
         "nobump": ["blog/cap-cana-fishing.html", "blog/cap-cana-marina.html", "blog/cap-cana-nightlife.html", "blog/cap-cana-restaurants.html",
                    "blog/category/dining-marina.html", "blog/category/villa-stays.html", "blog/index.html"],
         "rules": rules}
pathlib.Path(__file__).with_name("phaseF.json").write_text(json.dumps(patch, ensure_ascii=False), encoding="utf-8")
print(len(rules), "rules")
