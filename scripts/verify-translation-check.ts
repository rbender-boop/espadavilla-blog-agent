import { checkTranslation, extractNumbers } from '../src/lib/i18n/translation-check';

const en = {
  h1: 'Villa Espada Rates', meta_title: 'Rates at Villa Espada', meta_description: 'Peak season is $4,000 per night.',
  summary: 'Sleeps up to 22 guests on Fairway 5 of Punta Espada.',
  body_markdown: '## Rates\nPeak season is $4,000 per night; guests 17–22 add $100. Food at cost plus 15%.\n## Golf\nSee [rates](https://www.espadavilla.com/rates). Opened in 2006.',
  faq: [{ q: 'How much?', a: 'From $2,500 per night, minimum four nights.' }],
};
const good = {
  h1: 'Tarifas de Villa Espada', meta_title: 'Tarifas en Villa Espada', meta_description: 'La temporada alta cuesta $4.000 por noche.',
  summary: 'Hasta 22 huéspedes en el Fairway 5 de Punta Espada.',
  body_markdown: '## Tarifas\nLa temporada alta cuesta $4.000 por noche; los huéspedes 17–22 pagan $100 más. Comida al costo más 15 %.\n## Golf\nVea las [tarifas](https://www.espadavilla.com/rates). Inaugurado en 2006.',
  faq: [{ q: '¿Cuánto cuesta?', a: 'Desde $2.500 por noche, mínimo cuatro noches.' }],
};
const bad = { ...good, body_markdown: good.body_markdown.replace('$4.000', '$4.500').replace('https://www.espadavilla.com/rates', 'https://www.espadavilla.com/es/tarifas'), summary: good.summary.replace('Punta Espada', 'Punta Espadas') };

let fail = 0;
const t = (name: string, cond: boolean) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${name}`); if (!cond) fail++; };
t('extract $4.000 = 4000', extractNumbers('$4.000')[0] === '4000');
t('extract 4 000 (fr) = 4000', extractNumbers('4\u202f000 $')[0] === '4000');
t('extract 2,5 = 2.5', extractNumbers('2,5 km')[0] === '2.5');
const g = checkTranslation(en, good); t('good translation passes', g.ok); if (!g.ok) console.log(g.problems);
const b = checkTranslation(en, bad); t('bad translation fails', !b.ok); console.log('  bad problems:', b.problems);
process.exit(fail ? 1 : 0);
