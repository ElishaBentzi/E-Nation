/*
 * MANIFIESTO i18n DEL SITIO — ARCHIVO GENERADO, NO EDITAR A MANO.
 *
 * Generado por `tools/build-site-i18n.cjs` a partir de los GRUPOS DE TRADUCCION
 * de WPML extraidos del WordPress original (`reference/manifest.json`).
 *
 * Contiene, por pagina, su slug en cada idioma. Es la fuente de verdad para las
 * rutas, el hreflang, el selector de idioma y el sitemap. Astro no soporta slugs
 * traducidos por configuracion, asi que este mapa es imprescindible y se genera
 * en vez de escribirse a mano para no equivocarse con 7 paginas x 3 idiomas.
 *
 * Si cambia el sitio original, volver a correr el generador.
 */

export const LOCALES = ['en', 'es', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
};

export type PageId =
  | 'articles'
  | 'news'
  | 'privacy-policy'
  | 'terms-and-conditions'
  | 'presentation'
  | 'home'
;

export interface PageDef {
  /** Slug por idioma. Cadena vacia = vive en el indice de su idioma. */
  slugs: Partial<Record<Locale, string>>;
  /** 'elementor' = pagina construida con el page builder; 'plana' = contenido simple. */
  kind: 'elementor' | 'plana';
  /** Titulo SEO del original por idioma. Punto de partida, se revisa en la fase de SEO. */
  seo: Partial<Record<Locale, { titulo: string; keyword: string | null }>>;
}

export const PAGES: Record<PageId, PageDef> = {
  articles: {
    slugs: {
      en: 'articles',
      es: 'articulos',
      fr: 'articles',
    },
    kind: 'plana',
    seo: {
      en: { titulo: 'Articles | Mutual Welfare | For an Altruistic Society', keyword: 'Articles' },
      es: { titulo: 'Artículos | Bienestar Mutuo | Por una Sociedad Altruista', keyword: 'Artículos' },
      fr: { titulo: 'Articles', keyword: null },
    },
  },
  news: {
    slugs: {
      en: 'news',
      es: 'noticias',
      fr: 'nouvelles',
    },
    kind: 'plana',
    seo: {
      en: { titulo: 'News | Mutual Welfare | For an Altruistic Society', keyword: 'News' },
      es: { titulo: 'Noticias | Bienestar Mutuo | Por una Sociedad Altruista', keyword: 'Noticias' },
      fr: { titulo: 'Nouvelles', keyword: null },
    },
  },
  'privacy-policy': {
    slugs: {
      en: 'privacy-policy',
      es: 'politica-de-privacidad',
    },
    kind: 'plana',
    seo: {
      en: { titulo: 'Privacy Policy', keyword: null },
      es: { titulo: 'Política de Privacidad', keyword: null },
    },
  },
  'terms-and-conditions': {
    slugs: {
      en: 'terms-and-conditions',
      es: 'terminos-condiciones-del-servicio',
    },
    kind: 'plana',
    seo: {
      en: { titulo: 'Terms and Conditions', keyword: null },
      es: { titulo: 'Términos y Condiciones del Servicio', keyword: null },
    },
  },
  presentation: {
    slugs: {
      en: 'presentation',
      es: 'presentacion',
    },
    kind: 'elementor',
    seo: {
      en: { titulo: 'Presentation', keyword: null },
      es: { titulo: 'Presentacion', keyword: null },
    },
  },
  home: {
    slugs: {
      en: '',
      es: '',
    },
    kind: 'elementor',
    seo: {
      en: { titulo: 'Home', keyword: null },
      es: { titulo: 'Home', keyword: null },
    },
  },
};

/**
 * Ruta publica de una pagina en un idioma.
 *   rutaDe("presentation", "es") -> "/es/presentacion/"
 *   rutaDe("home", "en")         -> "/"
 * Devuelve null si esa pagina no existe en ese idioma: no todas las paginas
 * estan traducidas a todos los idiomas (el frances solo tiene 2).
 */
export function rutaDe(page: PageId, locale: Locale): string | null {
  const def = PAGES[page];
  const slug = def.slugs[locale];
  if (slug === undefined) return null;
  const prefijo = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  return slug === "" ? `${prefijo}/` : `${prefijo}/${slug}/`;
}

/**
 * Idiomas en los que existe una pagina, para el hreflang y el selector.
 * El x-default apunta al idioma predeterminado.
 */
export function idiomasDe(page: PageId): Locale[] {
  return LOCALES.filter((l) => PAGES[page].slugs[l] !== undefined);
}

/**
 * Paginas que existen en un idioma, para generar rutas y el sitemap.
 */
export function paginasDe(locale: Locale): PageId[] {
  return (Object.keys(PAGES) as PageId[]).filter((p) => PAGES[p].slugs[locale] !== undefined);
}
