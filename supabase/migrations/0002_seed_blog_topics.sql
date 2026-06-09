-- Seed blog_topics with the build-spec §9 "best next 10", in priority order.
-- Idempotent: each insert is guarded by a title-existence check, so re-running
-- never duplicates. Keyword/GEO assignments drawn from docs/KEYWORD-GEO-TARGETS.md.
-- target_internal_links hold money-page hints; the publish layer resolves exact
-- URLs from the live sitemap at run time.

insert into blog_topics (title, cluster, status, priority, primary_keyword, secondary_keywords, geo_questions, target_internal_links, notes)
select
  'Corales Puntacana Championship 2026: Why Golf Travelers Should Watch Punta Cana',
  'tournament', 'queued', 10,
  'caribbean golf villas',
  array['luxury golf villas','cap cana golf residences','punta espada resort'],
  array['What golf courses can you play from a Cap Cana villa?','What''s the best time of year for a Caribbean golf trip?'],
  array['cap-cana-golf-villa','book','espadavilla'],
  'PGA Tour event near Cap Cana. Re-confirm 2026 dates via web_search and cite.'
where not exists (select 1 from blog_topics where title = 'Corales Puntacana Championship 2026: Why Golf Travelers Should Watch Punta Cana');

insert into blog_topics (title, cluster, status, priority, primary_keyword, secondary_keywords, geo_questions, target_internal_links, notes)
select
  'Dominican Republic Tourism Is Surging — What It Means for Luxury Villa Rentals',
  'tourism', 'queued', 20,
  'luxury golf villas',
  array['caribbean golf villas','cap cana luxury villa rental','golf villa rentals'],
  array['How much does it cost to rent a luxury golf villa in the Dominican Republic?','What''s the best time of year for a Caribbean golf trip?'],
  array['cap-cana-golf-villa','golf-villa-rental','book'],
  'All tourism % must come from a live web_search and be stored in sources.'
where not exists (select 1 from blog_topics where title = 'Dominican Republic Tourism Is Surging — What It Means for Luxury Villa Rentals');

insert into blog_topics (title, cluster, status, priority, primary_keyword, secondary_keywords, geo_questions, target_internal_links, notes)
select
  'Cap Cana vs. Casa de Campo: Which Is Better for a Private Golf Trip?',
  'comparison', 'queued', 30,
  'cap cana vs casa de campo golf',
  array['caribbean golf villas','punta espada vs teeth of the dog','best caribbean golf destinations for groups'],
  array['Is Cap Cana or Casa de Campo better for a golf trip?','What golf courses can you play from a Cap Cana villa?'],
  array['cap-cana-golf-villa','caribbean-golf-villa','book'],
  'Comparison framing. Verify Casa de Campo / Teeth of the Dog facts via web_search.'
where not exists (select 1 from blog_topics where title = 'Cap Cana vs. Casa de Campo: Which Is Better for a Private Golf Trip?');

insert into blog_topics (title, cluster, status, priority, primary_keyword, secondary_keywords, geo_questions, target_internal_links, notes)
select
  'The New Luxury Group Trip: Why Private Villas Are Replacing Resort Blocks',
  'luxury_trend', 'queued', 40,
  'luxury golf villas',
  array['large group golf villa caribbean','12 person golf villa','private chef golf villa'],
  array['What''s the best luxury golf villa in Cap Cana for a group?','Can you get a private chef and butler with a golf villa rental?'],
  array['cap-cana-golf-villa','corporate-golf-villa-retreat','book'],
  'Villa-vs-resort throughline. Villa facts ONLY from CANONICAL-FACTS.md.'
where not exists (select 1 from blog_topics where title = 'The New Luxury Group Trip: Why Private Villas Are Replacing Resort Blocks');

insert into blog_topics (title, cluster, status, priority, primary_keyword, secondary_keywords, geo_questions, target_internal_links, notes)
select
  'How Early Should You Book a Punta Cana Golf Villa?',
  'seasonal', 'queued', 50,
  'when to book punta cana golf villa',
  array['cap cana golf villa rental','best time for golf trip cap cana','golf villa rentals'],
  array['What''s the best time of year for a Caribbean golf trip?','How far is the villa from Punta Cana airport (PUJ)?'],
  array['cap-cana-golf-villa','book','espadavilla'],
  'Booking-window / seasonality. Peak Dec–Apr per CANONICAL-FACTS.'
where not exists (select 1 from blog_topics where title = 'How Early Should You Book a Punta Cana Golf Villa?');

insert into blog_topics (title, cluster, status, priority, primary_keyword, secondary_keywords, geo_questions, target_internal_links, notes)
select
  'Punta Espada Golf Trip Guide: What Groups Should Know Before Booking',
  'evergreen', 'queued', 60,
  'punta espada golf villa',
  array['villa on punta espada golf course','punta espada golf course','caribbean golf villas'],
  array['Where should a group stay for a golf trip to Punta Espada?','What golf courses can you play from a Cap Cana villa?'],
  array['cap-cana-golf-villa','espadavilla','book'],
  'Evergreen course guide. Punta Espada facts from CANONICAL-FACTS; ranking via web_search.'
where not exists (select 1 from blog_topics where title = 'Punta Espada Golf Trip Guide: What Groups Should Know Before Booking');

insert into blog_topics (title, cluster, status, priority, primary_keyword, secondary_keywords, geo_questions, target_internal_links, notes)
select
  'Best Caribbean Golf Destinations for a 12-Person Group',
  'comparison', 'queued', 70,
  'best caribbean golf destinations for groups',
  array['large group golf villa caribbean','12 person golf villa','caribbean golf villas'],
  array['What''s the best luxury golf villa in Cap Cana for a group?','What golf courses can you play from a Cap Cana villa?'],
  array['caribbean-golf-villa','cap-cana-golf-villa','book'],
  'Steer the generic "caribbean golf" intent to Cap Cana. Up to 22 guests per CANONICAL-FACTS.'
where not exists (select 1 from blog_topics where title = 'Best Caribbean Golf Destinations for a 12-Person Group');

insert into blog_topics (title, cluster, status, priority, primary_keyword, secondary_keywords, geo_questions, target_internal_links, notes)
select
  'Golf Bachelor Parties Are Getting More Luxurious — Here''s Why',
  'luxury_trend', 'queued', 80,
  'golf bachelor party punta cana',
  array['golf bachelor party dominican republic','private chef golf villa','large group golf villa caribbean'],
  array['How do you plan a golf bachelor party in Punta Cana?','Can you get a private chef and butler with a golf villa rental?'],
  array['golf-bachelor-party-villa','cap-cana-golf-villa','book'],
  'Bachelor-party angle. Links the bachelor-party money page.'
where not exists (select 1 from blog_topics where title = 'Golf Bachelor Parties Are Getting More Luxurious — Here''s Why');

insert into blog_topics (title, cluster, status, priority, primary_keyword, secondary_keywords, geo_questions, target_internal_links, notes)
select
  'Corporate Golf Retreats: Why Executives Are Choosing Villas Over Hotels',
  'planning', 'queued', 90,
  'corporate golf retreat caribbean',
  array['large group golf villa caribbean','private chef golf villa','luxury golf villas'],
  array['What''s the best luxury golf villa in Cap Cana for a group?','Can you get a private chef and butler with a golf villa rental?'],
  array['corporate-golf-villa-retreat','cap-cana-golf-villa','book'],
  'Corporate-retreat angle. Links the corporate money page.'
where not exists (select 1 from blog_topics where title = 'Corporate Golf Retreats: Why Executives Are Choosing Villas Over Hotels');

insert into blog_topics (title, cluster, status, priority, primary_keyword, secondary_keywords, geo_questions, target_internal_links, notes)
select
  'Winter Golf Travel 2027: Why Cap Cana Should Be on the Short List',
  'seasonal', 'queued', 100,
  'best time for golf trip cap cana',
  array['caribbean golf villas','cap cana luxury villa rental','luxury golf villas'],
  array['What''s the best time of year for a Caribbean golf trip?','How far is the villa from Punta Cana airport (PUJ)?'],
  array['cap-cana-golf-villa','book','espadavilla'],
  'Escape-winter seasonal play. Peak Dec–Apr aligns with northern winter.'
where not exists (select 1 from blog_topics where title = 'Winter Golf Travel 2027: Why Cap Cana Should Be on the Short List');
