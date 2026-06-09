-- Seed the additive topics from docs/golfvilla-keyword-strategy.md ("First 12
-- Blog Posts"), minus #9 (exact duplicate of the already-published
-- "Cap Cana vs. Casa de Campo"). Priorities 110+ so the existing 6-topic queue
-- (priority 50–100, picked ascending) drafts first and nothing is reordered.
-- All primary_keywords were deduped against existing rows; two adjacency risks
-- are noted for the upcoming dedup guard. Idempotent: title-existence guarded.
-- source = 'strategy-doc-2026-06-09' tags provenance (column added in 0005).

insert into blog_topics (title, cluster, status, priority, primary_keyword, secondary_keywords, geo_questions, target_internal_links, notes, source)
select
  'Punta Cana Golf Packages: Private Villa vs All-Inclusive Resort',
  'packages', 'queued', 110,
  'punta cana golf packages',
  array['cap cana golf packages','punta espada stay and play','private villa vs all inclusive resort punta cana'],
  array['Where should a group stay for a golf trip to Punta Espada?','What golf courses can you play from a Cap Cana villa?'],
  array['golf-villa-packages','cap-cana-golf-villa','book'],
  'Strategy cluster 1 (golf packages) — high commercial intent. Confirm current package/green-fee figures via web_search.',
  'strategy-doc-2026-06-09'
where not exists (select 1 from blog_topics where title = 'Punta Cana Golf Packages: Private Villa vs All-Inclusive Resort');

insert into blog_topics (title, cluster, status, priority, primary_keyword, secondary_keywords, geo_questions, target_internal_links, notes, source)
select
  'Punta Espada Stay and Play: Hotel Package vs Private Golf Villa',
  'packages', 'queued', 120,
  'punta espada stay and play',
  array['punta espada golf packages','punta espada villa rentals','golf villa punta espada cap cana'],
  array['Where should a group stay for a golf trip to Punta Espada?','What golf courses can you play from a Cap Cana villa?'],
  array['golf-villa-packages','cap-cana-golf-villa','book'],
  'Strategy cluster 1/2. Distinct from "Punta Espada Golf Trip Guide" (course guide) — this is stay-and-play package economics.',
  'strategy-doc-2026-06-09'
where not exists (select 1 from blog_topics where title = 'Punta Espada Stay and Play: Hotel Package vs Private Golf Villa');

insert into blog_topics (title, cluster, status, priority, primary_keyword, secondary_keywords, geo_questions, target_internal_links, notes, source)
select
  'Punta Espada Villa Rentals: What Golf Groups Should Know',
  'punta_espada', 'queued', 130,
  'punta espada villa rentals',
  array['punta espada golf villa','golf villa punta espada cap cana','where to stay near punta espada golf club'],
  array['Where should a group stay for a golf trip to Punta Espada?','Can you get a private chef and butler with a golf villa rental?'],
  array['cap-cana-golf-villa','golf-villa-rental','book'],
  'Strategy cluster 2. ADJACENCY RISK: near existing "Punta Espada Golf Trip Guide" (primary punta espada golf villa) — keep angle on rental logistics, not the course. Dedup guard should review.',
  'strategy-doc-2026-06-09'
where not exists (select 1 from blog_topics where title = 'Punta Espada Villa Rentals: What Golf Groups Should Know');

insert into blog_topics (title, cluster, status, priority, primary_keyword, secondary_keywords, geo_questions, target_internal_links, notes, source)
select
  'Cap Cana Golf Packages: Punta Espada, Las Iguanas, Villas, and Costs',
  'packages', 'queued', 140,
  'cap cana golf packages',
  array['punta cana golf packages','cap cana golf trip','golf villa punta espada cap cana'],
  array['What golf courses can you play from a Cap Cana villa?','How much does it cost to rent a luxury golf villa in the Dominican Republic?'],
  array['golf-villa-packages','cap-cana-golf-villa','book'],
  'Strategy cluster 1. 36 holes of Nicklaus golf per CANONICAL-FACTS; confirm green fees via web_search.',
  'strategy-doc-2026-06-09'
where not exists (select 1 from blog_topics where title = 'Cap Cana Golf Packages: Punta Espada, Las Iguanas, Villas, and Costs');

insert into blog_topics (title, cluster, status, priority, primary_keyword, secondary_keywords, geo_questions, target_internal_links, notes, source)
select
  'Best Punta Cana Golf Villas for Groups',
  'category', 'queued', 150,
  'punta cana golf villas',
  array['cap cana golf villa','large group villa punta cana','caribbean golf villas'],
  array['What''s the best luxury golf villa in Cap Cana for a group?','What golf courses can you play from a Cap Cana villa?'],
  array['cap-cana-golf-villa','caribbean-golf-villa','book'],
  'Strategy cluster 3 (category authority). Steer generic intent to Cap Cana.',
  'strategy-doc-2026-06-09'
where not exists (select 1 from blog_topics where title = 'Best Punta Cana Golf Villas for Groups');

insert into blog_topics (title, cluster, status, priority, primary_keyword, secondary_keywords, geo_questions, target_internal_links, notes, source)
select
  'Cap Cana Luxury Villa Rentals With Chef, Butler, and Golf Access',
  'staffed', 'queued', 160,
  'cap cana luxury villa rentals',
  array['punta cana villa rental with chef','fully staffed villas punta cana','cap cana private villas'],
  array['Can you get a private chef and butler with a golf villa rental?','What''s the best luxury golf villa in Cap Cana for a group?'],
  array['cap-cana-golf-villa','luxury-golf-villa','book'],
  'Strategy clusters 4/5. Strong Villa Espada staffed-model fit (chef, butler, two maids per CANONICAL-FACTS).',
  'strategy-doc-2026-06-09'
where not exists (select 1 from blog_topics where title = 'Cap Cana Luxury Villa Rentals With Chef, Butler, and Golf Access');

insert into blog_topics (title, cluster, status, priority, primary_keyword, secondary_keywords, geo_questions, target_internal_links, notes, source)
select
  '8-Bedroom Villas in Cap Cana: Group Planner''s Guide',
  'large_group', 'queued', 170,
  '8 bedroom villa cap cana',
  array['8 bedroom villa punta cana','large group villa punta cana','20 person villa punta cana'],
  array['What''s the best luxury golf villa in Cap Cana for a group?','How much does it cost to rent a luxury golf villa in the Dominican Republic?'],
  array['cap-cana-golf-villa','luxury-golf-villa','book'],
  'Strategy cluster 6. Matches Villa Espada 8BR / up to 22 guests per CANONICAL-FACTS.',
  'strategy-doc-2026-06-09'
where not exists (select 1 from blog_topics where title = '8-Bedroom Villas in Cap Cana: Group Planner''s Guide');

insert into blog_topics (title, cluster, status, priority, primary_keyword, secondary_keywords, geo_questions, target_internal_links, notes, source)
select
  'Bachelor Party Villa in Punta Cana: Golf, Chef, Privacy, and Nightlife',
  'group_event', 'queued', 180,
  'bachelor party villa punta cana',
  array['punta cana bachelor party villa','golf bachelor party punta cana','fully staffed villas punta cana'],
  array['How do you plan a golf bachelor party in Punta Cana?','Can you get a private chef and butler with a golf villa rental?'],
  array['golf-bachelor-party-villa','cap-cana-golf-villa','book'],
  'Strategy cluster 7. ADJACENCY RISK: near existing "Golf Bachelor Parties Are Getting More Luxurious" (primary golf bachelor party punta cana) — this targets the "bachelor party villa" head term. Dedup guard should review.',
  'strategy-doc-2026-06-09'
where not exists (select 1 from blog_topics where title = 'Bachelor Party Villa in Punta Cana: Golf, Chef, Privacy, and Nightlife');

insert into blog_topics (title, cluster, status, priority, primary_keyword, secondary_keywords, geo_questions, target_internal_links, notes, source)
select
  'Punta Espada vs Teeth of the Dog: Which Course Should You Build a Trip Around?',
  'comparison', 'queued', 190,
  'punta espada vs teeth of the dog',
  array['cap cana vs casa de campo','punta espada vs corales','best caribbean golf destinations for groups'],
  array['Is Cap Cana or Casa de Campo better for a golf trip?','What golf courses can you play from a Cap Cana villa?'],
  array['cap-cana-golf-villa','caribbean-golf-villa','book'],
  'Strategy cluster 8. Verify course facts/rankings via web_search; Teeth of the Dog ~1 hr west per CANONICAL-FACTS.',
  'strategy-doc-2026-06-09'
where not exists (select 1 from blog_topics where title = 'Punta Espada vs Teeth of the Dog: Which Course Should You Build a Trip Around?');

insert into blog_topics (title, cluster, status, priority, primary_keyword, secondary_keywords, geo_questions, target_internal_links, notes, source)
select
  'Punta Espada Green Fees, Tee Times, and Member Rates',
  'planning', 'queued', 200,
  'punta espada green fees',
  array['punta espada rates','punta espada tee times','punta espada golf course review'],
  array['What golf courses can you play from a Cap Cana villa?','Where should a group stay for a golf trip to Punta Espada?'],
  array['cap-cana-golf-villa','golf-villa-rental','book'],
  'Strategy cluster 9 (informational). Green fees/tee times CHANGE — must come from a live web_search and be stored in sources. Villa carts/member-rate access from CANONICAL-FACTS.',
  'strategy-doc-2026-06-09'
where not exists (select 1 from blog_topics where title = 'Punta Espada Green Fees, Tee Times, and Member Rates');

insert into blog_topics (title, cluster, status, priority, primary_keyword, secondary_keywords, geo_questions, target_internal_links, notes, source)
select
  'Best Caribbean Golf Villas for Private Group Trips',
  'caribbean', 'queued', 210,
  'best caribbean golf villas',
  array['caribbean golf villas','best caribbean golf trips','luxury golf villas'],
  array['What''s the best time of year for a Caribbean golf trip?','What''s the best luxury golf villa in Cap Cana for a group?'],
  array['caribbean-golf-villa','luxury-golf-villa','book'],
  'Strategy cluster 10 (broad authority). Lower priority than Cap Cana/Punta Espada terms per the strategy doc; steer to Cap Cana.',
  'strategy-doc-2026-06-09'
where not exists (select 1 from blog_topics where title = 'Best Caribbean Golf Villas for Private Group Trips');
