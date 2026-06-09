-- espadavilla-blog-agent — seed topics (0002, replaces golfvilla 0002/0006).
-- Experience / destination / trip-planning angle (bottom-of-funnel), anchored to
-- the REAL Villa Espada + Cap Cana experience. All NET-NEW vs the ~60 posts
-- already live on espadavilla-com/blog (checked 2026-06-09). Money links point
-- INWARD; primary CTA is /contact. Idempotent: guarded by source tag + title.

insert into blog_topics (title, cluster, status, priority, target_internal_links, primary_keyword, secondary_keywords, geo_questions, notes, source)
select * from (values
  (
    'A Day at Villa Espada: What an On-Property Day Actually Looks Like',
    'stay', 'queued', 10,
    array['contact','villa','amenities'],
    'staying at villa espada',
    array['private villa cap cana','cap cana villa with chef','villa espada'],
    array['What''s included at Villa Espada?','Does Villa Espada come with a private chef and staff?'],
    'On-property experience: chef, butler, two golf carts, pools. Use facts.ts only for villa specifics.',
    'seed-espadavilla-2026-06-09'
  ),
  (
    'Tennis and Padel in Cap Cana: Courts, Coaching, and the Rafa Nadal Academy',
    'experience', 'queued', 20,
    array['contact','experiences','villa'],
    'tennis and padel cap cana',
    array['padel courts cap cana','rafa nadal tennis center','cap cana experiences'],
    array['What is there to do in Cap Cana beyond golf?','What''s included at Villa Espada?'],
    'Net-new; /experiences/tennis-padel page exists but no blog post. GSC: padel courts punta cana, rafa nadal tennis center.',
    'seed-espadavilla-2026-06-09'
  ),
  (
    'Equestrian and Polo at Cap Cana: Los Establos From Villa Espada',
    'experience', 'queued', 30,
    array['contact','experiences','villa'],
    'equestrian and polo cap cana',
    array['los establos cap cana','cap cana equestrian center','cap cana experiences'],
    array['What is there to do in Cap Cana beyond golf?','How far is Villa Espada from the Cap Cana stables?'],
    'Net-new; GSC shows strong demand (equestrian and polo, los establos). /experiences/equestrian page exists, no blog post.',
    'seed-espadavilla-2026-06-09'
  ),
  (
    'Caleton vs Eden Roc Beach Club: Which to Use From Villa Espada',
    'experience', 'queued', 40,
    array['contact','experiences','villa'],
    'caleton beach club cap cana',
    array['eden roc cap cana','juanillo beach','cap cana beach clubs'],
    array['What is there to do in Cap Cana beyond golf?','Which Cap Cana beaches can Villa Espada guests use?'],
    'Net-new; GSC: caleton beach club, eden roc beach club. facts.ts: private access to Eden Roc + Juanillo.',
    'seed-espadavilla-2026-06-09'
  ),
  (
    'Do You Need a Car at Cap Cana? Getting Around Without One',
    'logistics', 'queued', 50,
    array['contact','villa','faq'],
    'getting around cap cana',
    array['cap cana golf carts','cap cana private transportation','punta espada golf shuttle'],
    array['How do you get from PUJ to Cap Cana?','How far is Villa Espada from Punta Cana airport (PUJ)?'],
    'Net-new angle (existing getting-to-cap-cana covers arrival, not on-resort mobility). facts.ts: 2 golf carts + private transfers included.',
    'seed-espadavilla-2026-06-09'
  ),
  (
    'Planning a Group Golf Stay From Villa Espada: Tee Times, Carts, and Member Rates',
    'golf', 'queued', 60,
    array['contact','golf','punta-espada'],
    'group golf stay cap cana',
    array['punta espada tee times','las iguanas golf course cap cana','member rate golf cap cana'],
    array['What golf can I play from Villa Espada?','How do Villa Espada guests get member golf rates?'],
    'Differentiated from existing group-golf posts by the Villa-Espada-specific cart/member-rate logistics. facts.ts for golf specifics.',
    'seed-espadavilla-2026-06-09'
  ),
  (
    'Birthday and Milestone Celebrations at Villa Espada',
    'group_occasion', 'queued', 70,
    array['contact','villa','experiences'],
    'cap cana birthday villa',
    array['milestone celebration cap cana','private villa celebration','villa espada'],
    array['Can Villa Espada host a celebration or group event?','How many guests does Villa Espada sleep?'],
    'Net-new; /occasions/birthday page exists, no blog post. group_occasion cluster.',
    'seed-espadavilla-2026-06-09'
  ),
  (
    'Sargassum in Cap Cana: What Villa Guests Should Expect by Season',
    'logistics', 'queued', 80,
    array['contact','experiences','faq'],
    'sargassum cap cana',
    array['cap cana beaches seaweed','cap cana by month','juanillo beach'],
    array['When is the best time to visit Cap Cana?','What is there to do in Cap Cana beyond golf?'],
    'Net-new; timely facts (current sargassum conditions) MUST come from a cited web_search, never memory.',
    'seed-espadavilla-2026-06-09'
  )
) as t
where not exists (
  select 1 from blog_topics b where b.source = 'seed-espadavilla-2026-06-09' and b.title = t.column1
);
