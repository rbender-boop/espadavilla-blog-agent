/**
 * Blog translation languages (Rob, 2026-11-11): every published English post is
 * also published in these four languages. English stays the source of truth.
 *
 * - lang:     URL prefix and DB key  (/es/blog/<slug>)
 * - locale:   hreflang / og:locale / inLanguage value
 * - name:     language name used in the translation prompt
 * - label:    tab label on the /blog index
 */

export type LangCode = 'es' | 'fr' | 'de' | 'pt';

export type LanguageDef = {
  lang: LangCode;
  locale: 'es-419' | 'fr-FR' | 'de-DE' | 'pt-BR';
  name: string;
  label: string;
};

export const TRANSLATION_LANGUAGES: LanguageDef[] = [
  { lang: 'es', locale: 'es-419', name: 'Latin American Spanish', label: 'Español' },
  { lang: 'fr', locale: 'fr-FR', name: 'French (France)', label: 'Français' },
  { lang: 'de', locale: 'de-DE', name: 'German (Germany)', label: 'Deutsch' },
  { lang: 'pt', locale: 'pt-BR', name: 'Brazilian Portuguese', label: 'Português' },
];

export const ENGLISH = { lang: 'en', locale: 'en', label: 'English' } as const;

export function getLanguage(lang: string): LanguageDef {
  const def = TRANSLATION_LANGUAGES.find((l) => l.lang === lang);
  if (!def) throw new Error(`unsupported translation language: ${lang}`);
  return def;
}
