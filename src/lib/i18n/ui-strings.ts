/** Fixed UI text on translated blog pages (post template + language index). */
import type { LangCode } from './languages';

export type UiStrings = {
  home: string; blog: string; published: string; updated: string;
  inThisArticle: string; faq: string; sources: string;
  inquire: string; viewRates: string; checkAvailability: string;
  indexTitle: string; indexDesc: string; indexOverline: string; indexH1: string; indexH2: string;
  languages: string;
};

export const UI: Record<'en' | LangCode, UiStrings> = {
  en: {
    home: 'Home', blog: 'Blog', published: 'Published', updated: 'Updated',
    inThisArticle: 'In this article', faq: 'Frequently Asked Questions', sources: 'Sources',
    inquire: 'Inquire & Book', viewRates: 'View Rates', checkAvailability: 'Check Availability',
    indexTitle: 'Blog & Travel Guides', indexDesc: 'Travel guides to Cap Cana, Punta Espada golf, beaches, dining and private villa stays in the Dominican Republic.',
    indexOverline: 'Expert Travel Guides', indexH1: 'Blog & Guides', indexH2: 'Expert Travel Guides', languages: 'Languages',
  },
  es: {
    home: 'Inicio', blog: 'Blog', published: 'Publicado', updated: 'Actualizado',
    inThisArticle: 'En este artículo', faq: 'Preguntas frecuentes', sources: 'Fuentes',
    inquire: 'Consultar y reservar', viewRates: 'Ver tarifas', checkAvailability: 'Ver disponibilidad',
    indexTitle: 'Blog y guías de viaje', indexDesc: 'Guías de viaje sobre Cap Cana, el golf en Punta Espada, playas, gastronomía y estancias en villas privadas en República Dominicana.',
    indexOverline: 'Guías de viaje', indexH1: 'Blog y guías', indexH2: 'Guías de viaje', languages: 'Idiomas',
  },
  fr: {
    home: 'Accueil', blog: 'Blog', published: 'Publié le', updated: 'Mis à jour le',
    inThisArticle: 'Dans cet article', faq: 'Questions fréquentes', sources: 'Sources',
    inquire: 'Demander et réserver', viewRates: 'Voir les tarifs', checkAvailability: 'Voir les disponibilités',
    indexTitle: 'Blog et guides de voyage', indexDesc: 'Guides de voyage sur Cap Cana, le golf de Punta Espada, les plages, la gastronomie et les séjours en villa privée en République dominicaine.',
    indexOverline: 'Guides de voyage', indexH1: 'Blog et guides', indexH2: 'Guides de voyage', languages: 'Langues',
  },
  de: {
    home: 'Startseite', blog: 'Blog', published: 'Veröffentlicht am', updated: 'Aktualisiert am',
    inThisArticle: 'In diesem Artikel', faq: 'Häufige Fragen', sources: 'Quellen',
    inquire: 'Anfragen & buchen', viewRates: 'Preise ansehen', checkAvailability: 'Verfügbarkeit prüfen',
    indexTitle: 'Blog & Reiseführer', indexDesc: 'Reiseführer zu Cap Cana, Golf in Punta Espada, Stränden, Restaurants und Aufenthalten in privaten Villen in der Dominikanischen Republik.',
    indexOverline: 'Reiseführer', indexH1: 'Blog & Reiseführer', indexH2: 'Reiseführer', languages: 'Sprachen',
  },
  pt: {
    home: 'Início', blog: 'Blog', published: 'Publicado em', updated: 'Atualizado em',
    inThisArticle: 'Neste artigo', faq: 'Perguntas frequentes', sources: 'Fontes',
    inquire: 'Consultar e reservar', viewRates: 'Ver tarifas', checkAvailability: 'Ver disponibilidade',
    indexTitle: 'Blog e guias de viagem', indexDesc: 'Guias de viagem sobre Cap Cana, golfe em Punta Espada, praias, gastronomia e hospedagem em villas privativas na República Dominicana.',
    indexOverline: 'Guias de viagem', indexH1: 'Blog e guias', indexH2: 'Guias de viagem', languages: 'Idiomas',
  },
};

/** "November 11, 2026" in the page language (UTC, no day shift). */
export function formatDate(iso: string, locale: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : locale, { dateStyle: 'long', timeZone: 'UTC' }).format(d);
}
